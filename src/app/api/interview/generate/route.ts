// app/api/interview/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate Limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10; // 10分間に10回まで（ヒアリング生成は制限を厳しく）
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

function checkRateLimit(clientIP: string): { allowed: boolean; remainingRequests: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remainingRequests: RATE_LIMIT_REQUESTS - 1 };
  }
  
  if (clientData.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remainingRequests: 0 };
  }
  
  clientData.count += 1;
  rateLimitMap.set(clientIP, clientData);
  
  return { allowed: true, remainingRequests: RATE_LIMIT_REQUESTS - clientData.count };
}

// 業界特化型フォールバック質問生成（高速）- 重複削除済み
function generateIndustrySpecificFallback(industry: string, userProfile: any) {
  const industryQuestions: { [key: string]: any[] } = {
    manufacturer: [
      {
        id: 'mfg_fb_01',
        category: 'challenges',
        question: '製造現場で最も課題に感じているのは、生産効率・品質管理・人材確保のどれですか？具体的な状況を教えてください。',
        context: 'メーカー特有の課題（生産効率・品質・人材）の特定',
        priority: 'high'
      },
      {
        id: 'mfg_fb_02',
        category: 'organization',
        question: '稟議制度や意思決定プロセスで、スピードアップしたいと感じる場面はありますか？',
        context: 'メーカー特有の組織課題（稟議制・意思決定）の把握',
        priority: 'medium'
      },
      {
        id: 'mfg_fb_03',
        category: 'goals',
        question: 'DX推進において、最も期待している効果や改善点は何ですか？',
        context: 'メーカーのDX推進における期待と課題',
        priority: 'medium'
      }
    ],
    real_estate: [
      {
        id: 're_fb_01',
        category: 'challenges',
        question: '営業メンバーの成績にバラツキがある場合、その主な原因は何だと考えますか？',
        context: '不動産営業特有の課題（スキルバラツキ）の把握',
        priority: 'high'
      },
      {
        id: 're_fb_02',
        category: 'workflow',
        question: '顧客対応で最も時間がかかっている業務は何ですか？効率化できそうな部分はありますか？',
        context: '不動産業務の効率化ポイント特定',
        priority: 'medium'
      },
      {
        id: 're_fb_03',
        category: 'goals',
        question: '売上目標達成のために、チーム全体で改善したい点は何ですか？',
        context: '不動産営業チームの目標達成戦略',
        priority: 'high'
      }
    ],
    it: [
      {
        id: 'it_fb_01',
        category: 'challenges',
        question: 'エンジニアとビジネスサイドの連携で、最も改善したい点は何ですか？',
        context: 'IT業界特有の課題（エンジニア×ビジネス連携）',
        priority: 'high'
      },
      {
        id: 'it_fb_02',
        category: 'workflow',
        question: 'プロジェクトでスコープが曖昧になる主な原因は何だと考えますか？',
        context: 'IT業界特有の課題（スコープ管理）',
        priority: 'high'
      },
      {
        id: 'it_fb_03',
        category: 'goals',
        question: '開発効率を向上させるために、最も重要だと思う改善点は何ですか？',
        context: 'IT業界の開発効率向上戦略',
        priority: 'medium'
      }
    ]
  };

  // 汎用質問
  const universalQuestions = [
    {
      id: 'univ_fb_01',
      category: 'challenges',
      question: '現在抱えている課題の中で、解決すると最もインパクトが大きいものは何ですか？',
      context: '課題の優先順位と影響度の特定',
      priority: 'high'
    },
    {
      id: 'univ_fb_02',
      category: 'goals',
      question: '3ヶ月後に「大きく前進した」と感じるための最重要目標は何ですか？',
      context: '短期目標の明確化と達成基準設定',
      priority: 'high'
    },
    {
      id: 'univ_fb_03',
      category: 'workflow',
      question: '日々の業務で「これがもっと効率的になれば」と感じる作業は何ですか？',
      context: '業務効率化の具体的ポイント特定',
      priority: 'medium'
    }
  ];

  // 業界特化質問があれば優先、なければ汎用質問
  const industrySpecific = industryQuestions[industry] || [];
  const selectedQuestions = industrySpecific.length > 0 
    ? [...industrySpecific.slice(0, 2), ...universalQuestions.slice(0, 2)]
    : universalQuestions.slice(0, 4);

  return selectedQuestions.slice(0, 4);
}

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'ヒアリング質問生成の利用制限に達しました。10分後に再度お試しください。' },
        { status: 429 }
      );
    }

    const { userProfile, industry, challenges, goals } = await request.json();
    
    if (!userProfile || !industry) {
      return NextResponse.json(
        { error: 'ユーザープロフィールと業界情報が必要です。' },
        { status: 400 }
      );
    }

    console.log('🎤 AI質問生成開始（高速化版） - 業界:', industry, 'ユーザー:', userProfile.name);

    // 高速化のため、より簡潔なプロンプトを使用
    const quickPrompt = `
業界: ${industry}
役職: ${userProfile.position}
課題: ${challenges?.join('、') || '未設定'}
目標: ${goals?.join('、') || '未設定'}

上記クライアント向けの効果的な追加ヒアリング質問を3個生成してください。
業界特性を踏まえ、実践的で具体的な回答を引き出せる質問にしてください。

JSON形式で回答:
{
  "questions": [
    {"id": "q1", "category": "challenges", "question": "質問内容", "context": "簡潔な説明", "priority": "high"}
  ]
}
`;

    // 30秒タイムアウト付きでAI呼び出し
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたは効率的な質問を生成する専門家です。簡潔で実用的な質問をJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: quickPrompt
          }
        ],
        max_tokens: 800, // トークン数を削減して高速化
        temperature: 0.5, // 温度を下げて一貫性を重視
      }, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseContent = completion.choices[0].message.content;
      console.log('🤖 AI質問生成結果（高速版）:', responseContent);

      try {
        // JSONパース
        const parsedResponse = JSON.parse(responseContent || '{}');
        const questions = parsedResponse.questions || [];
        
        // 質問をバリデーション・クリーンアップ
        const validatedQuestions = questions
          .filter((q: any) => q.question && q.category && q.context)
          .slice(0, 4) // 最大4問に制限
          .map((q: any, index: number) => ({
            id: `generated_${String(index + 1).padStart(2, '0')}`,
            category: q.category,
            question: q.question,
            context: q.context,
            priority: q.priority || 'medium'
          }));

        // 有効な質問が1個以上あれば成功
        if (validatedQuestions.length > 0) {
          console.log('✅ 高速生成成功 - 質問数:', validatedQuestions.length);
          return NextResponse.json({ 
            questions: validatedQuestions,
            total: validatedQuestions.length,
            generatedBy: 'ai'
          });
        } else {
          throw new Error('No valid questions generated');
        }

      } catch (parseError) {
        console.error('JSON解析エラー:', parseError);
        throw new Error('Parse failed');
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.log('⏰ 30秒タイムアウト - フォールバックに切り替え');
      } else {
        console.error('💥 AI生成エラー:', error);
      }
      
      // タイムアウトまたはエラー時は即座にフォールバック
      const fallbackQuestions = generateIndustrySpecificFallback(industry, userProfile);
      
      return NextResponse.json({ 
        questions: fallbackQuestions,
        total: fallbackQuestions.length,
        fallback: true,
        reason: error.name === 'AbortError' ? 'timeout' : 'ai_error'
      });
    }

  } catch (error: any) {
    console.error('💥 API全体エラー:', error);
    
    // 最終フォールバック
    const emergencyQuestions = [
      {
        id: 'emergency_01',
        category: 'challenges',
        question: '現在最も優先して解決したい課題は何ですか？その課題によってどのような影響が出ていますか？',
        context: '優先課題の特定と影響度の把握',
        priority: 'high'
      },
      {
        id: 'emergency_02',
        category: 'goals',
        question: '3ヶ月以内に達成したい最も重要な目標を1つ教えてください。',
        context: '短期目標の明確化',
        priority: 'high'
      }
    ];
    
    return NextResponse.json({ 
      questions: emergencyQuestions,
      total: emergencyQuestions.length,
      fallback: true,
      error: 'システムエラーが発生したため、基本質問を使用しています'
    });
  }
}