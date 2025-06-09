// app/api/interview/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate Limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 10; // 10分間に10回まで
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

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'ヒアリング分析の利用制限に達しました。10分後に再度お試しください。' },
        { status: 429 }
      );
    }

    const { userProfile, questions, answers } = await request.json();
    
    if (!userProfile || !questions || !answers) {
      return NextResponse.json(
        { error: 'ユーザープロフィール、質問、回答データが必要です。' },
        { status: 400 }
      );
    }

    console.log('📊 AIヒアリング分析開始 - 回答数:', answers.length);

    // 質問と回答のペアを作成
    const qaData = questions.map((question: any) => {
      const answer = answers.find((ans: any) => ans.questionId === question.id);
      return {
        category: question.category,
        question: question.question,
        answer: answer ? answer.answer : '回答なし',
        context: question.context
      };
    }).filter((qa: any) => qa.answer !== '回答なし');

    // AI分析プロンプト
    const analysisPrompt = `
あなたは経験豊富なビジネスコーチ・組織コンサルタントです。以下のクライアントのヒアリング結果を分析し、効果的なコーチングのためのインサイトを抽出してください。

【クライアント基本情報】
名前: ${userProfile.name}
会社: ${userProfile.company}
役職: ${userProfile.position}
業界: ${userProfile.industry}
会社規模: ${userProfile.companySize}
組織文化: ${userProfile.organizationCulture?.join('、') || '未設定'}

【ヒアリング結果】
${qaData.map((qa: any, index: number) => `
質問${index + 1} [${qa.category}]: ${qa.question}
回答: ${qa.answer}
`).join('\n')}

【分析の観点】
1. クライアントの強み・リソースの特定
2. 優先すべき課題の特定と根本原因の推測
3. 業界・組織特性を踏まえた課題の背景分析
4. 実現可能な改善アプローチの方向性
5. コーチングで重点的に取り組むべきテーマ

以下のJSON形式で回答してください：
{
  "insights": [
    "インサイト1: 具体的で実用的な分析結果",
    "インサイト2: 具体的で実用的な分析結果"
  ],
  "strengths": [
    "強み1",
    "強み2"
  ],
  "priorityChallenges": [
    "優先課題1",
    "優先課題2"
  ],
  "coachingFocus": [
    "コーチング重点テーマ1",
    "コーチング重点テーマ2"
  ],
  "actionableAdvice": [
    "実行可能なアドバイス1",
    "実行可能なアドバイス2"
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富なビジネスコーチ・組織コンサルタントで、クライアントのヒアリング結果から実用的なインサイトを抽出する専門家です。JSON形式で回答してください。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    console.log('🧠 AI分析結果:', responseContent);

    try {
      // JSONパース
      const parsedResponse = JSON.parse(responseContent || '{}');
      
      // レスポンスのバリデーション・クリーンアップ
      const validatedResponse = {
        insights: Array.isArray(parsedResponse.insights) ? parsedResponse.insights.slice(0, 8) : [],
        strengths: Array.isArray(parsedResponse.strengths) ? parsedResponse.strengths.slice(0, 5) : [],
        priorityChallenges: Array.isArray(parsedResponse.priorityChallenges) ? parsedResponse.priorityChallenges.slice(0, 5) : [],
        coachingFocus: Array.isArray(parsedResponse.coachingFocus) ? parsedResponse.coachingFocus.slice(0, 5) : [],
        actionableAdvice: Array.isArray(parsedResponse.actionableAdvice) ? parsedResponse.actionableAdvice.slice(0, 5) : []
      };

      // メインのインサイトを統合
      const mainInsights = [
        ...validatedResponse.insights,
        ...validatedResponse.coachingFocus.map((focus: string) => `重点テーマ: ${focus}`),
        ...validatedResponse.actionableAdvice.map((advice: string) => `推奨アクション: ${advice}`)
      ].slice(0, 10);

      console.log('✅ 分析完了 - インサイト数:', mainInsights.length);

      return NextResponse.json({
        insights: mainInsights,
        detailedAnalysis: validatedResponse,
        analysisCompletedAt: new Date().toISOString(),
        qaCount: qaData.length
      });

    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.log('原文:', responseContent);
      
      // フォールバック分析
      const fallbackInsights = generateFallbackAnalysis(userProfile, qaData);
      
      return NextResponse.json({
        insights: fallbackInsights,
        analysisCompletedAt: new Date().toISOString(),
        qaCount: qaData.length,
        fallback: true
      });
    }

  } catch (error: any) {
    console.error('💥 AIヒアリング分析エラー:', error);
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'AIサービスが混雑しています。少し時間をおいて再度お試しください。' },
        { status: 429 }
      );
    }
    
    // フォールバック分析を返す
    const fallbackInsights = [
      'ヒアリングが正常に完了しました',
      'より詳細な情報を収集できたため、パーソナライズされたコーチングが提供できます',
      '今後のセッションでは、お答えいただいた内容を踏まえたアドバイスを行います'
    ];
    
    return NextResponse.json({
      insights: fallbackInsights,
      analysisCompletedAt: new Date().toISOString(),
      fallback: true,
      error: 'AI分析に失敗したため、基本的な分析結果を提供しています'
    });
  }
}

// フォールバック分析生成
function generateFallbackAnalysis(userProfile: any, qaData: any[]): string[] {
  const insights: string[] = [];
  
  // 基本的な分析
  insights.push(`${qaData.length}項目について詳細な情報を収集しました`);
  
  // 業界別フォールバック
  if (userProfile.industry === 'manufacturer') {
    insights.push('製造業特有の組織課題について理解を深めました');
    insights.push('年功序列や稟議制度の影響を考慮したアドバイスが可能になります');
  } else if (userProfile.industry === 'real_estate') {
    insights.push('不動産業界の営業環境について具体的な情報を得られました');
    insights.push('体育会系組織での成果向上に焦点を当てたサポートが提供できます');
  } else if (userProfile.industry === 'it') {
    insights.push('IT業界特有のプロジェクト管理課題について深掘りできました');
    insights.push('エンジニアとビジネスサイドの連携改善に重点を置いたコーチングが可能です');
  }
  
  // 役職別フォールバック
  if (userProfile.position?.includes('部長') || userProfile.position?.includes('課長')) {
    insights.push('管理職としてのリーダーシップ課題に焦点を当てたサポートが提供できます');
  }
  
  // 組織文化別フォールバック
  if (userProfile.organizationCulture?.includes('年功序列が強い')) {
    insights.push('年功序列組織での若手・中堅層の活躍推進について具体的なアドバイスが可能です');
  }
  
  if (userProfile.organizationCulture?.includes('トップダウン')) {
    insights.push('トップダウン組織での効果的な提案・実行戦略についてサポートできます');
  }
  
  insights.push('今後のコーチングセッションでは、より具体的で実行可能なアドバイスを提供します');
  
  return insights.slice(0, 8);
}