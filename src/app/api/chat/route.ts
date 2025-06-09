import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 簡易Rate Limiting用のメモリストレージ
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = 30; // 10分間に30回まで
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10分（ミリ秒）

// プリセットコーチのシステムプロンプト定義
const coachPrompts = {
  tanaka: 'あなたは経験豊富なビジネス戦略コーチ田中健一です。論理的思考と結果重視のアプローチで、具体的で実行可能なアクションプランを提案します。経営戦略、事業開発、リーダーシップの分野が専門です。常に「田中です」と自己紹介し、相手を「さん」付けで呼びます。',
  sato: 'あなたは優秀なキャリア・コミュニケーションコーチ佐藤美咲です。共感力が高く、相手の気持ちに寄り添いながら、キャリア開発、人間関係、プレゼンテーションスキルの向上をサポートします。常に「佐藤です」と自己紹介し、温かい口調で話します。',
  yamada: 'あなたは実績豊富な営業・マーケティングコーチ山田雄介です。実践的で行動重視のアプローチで、営業戦略、顧客対応、マーケティングで成果に直結するアドバイスを提供します。常に「山田です」と自己紹介し、エネルギッシュな口調で話します。',
  suzuki: 'あなたは優しい働き方・メンタルヘルスコーチ鈴木智子です。包容力があり心のケアを重視し、ワークライフバランス、ストレス管理、チームワーク向上をサポートします。常に「鈴木です」と自己紹介し、優しく丁寧な口調で話します。'
};

// 業界別知見データベース（引き継ぎ資料から抽出）
const industryKnowledgeBase = {
  manufacturer: {
    culturalTraits: [
      '年功序列の傾向が強い（企業の歴史・規模に比例）',
      '稟議制中心の意思決定（同族オーナー企業はトップダウン）',
      '階層重視の直接コミュニケーション、メール文化',
      '製品アップデート・プロトタイプ生産サイクルが早く変化対応力がある'
    ],
    commonChallenges: [
      'B2B大規模商品：直接営業・担当営業制で新規開拓が困難',
      'B2B小規模製品：販売代理店経由、代理店向け営業が主流',
      '製品ライフサイクルが早く生産ライン対応が頻繁',
      'ミドル層不足が顕著：高齢ベテラン×経験不足若手の二極化',
      '高齢層の研修効果著しく低下、DX・システム化の妨げ'
    ],
    successPatterns: [
      '埼玉トヨペット手法：トップダウンを利かせた組織風土変化（成果差2.25倍）',
      '浸透計画：役員→エリア別営業本部長→エリアマネージャー→店長→全社員の順番',
      'ミドル層不足対応：採用企画全面見直しによる採用強化',
      '高齢層対応：研修ではなく、彼らの持つ資産活用に注力',
      'DX推進：CDXO設定、抵抗勢力の関与度減少、直接的メリット提示'
    ]
  },
  real_estate: {
    culturalTraits: [
      '売買・賃貸：営業は実績優先、体育会系・ペースセッター型リーダーシップ',
      'ゼネコン：メーカーに近い文化、稟議制',
      'ディベロッパー：商社傾向、デジタルツール導入進行でIT系に近い'
    ],
    commonChallenges: [
      '売買・賃貸：個人営業スキルバラツキ大、KPI設計を飛ばしたアクション管理',
      'ゼネコン：組織的営業、技術分野との激論、役職高位者が全権',
      'ディベロッパー：大規模案件、個人業務範囲限定',
      '円安・原価高によるコスト管理困難（ゼネコン・ディベロッパー国内）'
    ],
    successPatterns: [
      'キーエンス手法活用：トップ営業マン分析→商談パターン徹底分析→業務型化',
      '研修&OJT：店長クラスから下への段階的落とし込み',
      'KPI設計：定量データ紐付けマネジメント仕組み構築',
      'ビジネススキル研修：ステークホルダーマネジメント、プロジェクトマネジメント',
      '新卒育成：コンサル業界近似の思考トレーニング導入'
    ]
  },
  it: {
    culturalTraits: [
      '2000年以前設立：メーカーに近いレベルの年功序列、体育会系文化',
      '2000年以降設立：非常にフラット、GAFAM模倣組織風土',
      'ジョブホッパー文化：個人スキル・年収アップ重視、様々環境での知見蓄積'
    ],
    commonChallenges: [
      'エンジニア×ビジネス組織の価値観ギャップ：品質重視vs納期重視',
      'プロジェクトスコープ曖昧：営業提案時→開発開始後の大幅拡大',
      '人材定着困難：常駐後の会社帰属意識形成困難→高離職率',
      'スコープ強制拡大・期間短縮→想定上リソース→残業過多'
    ],
    successPatterns: [
      '頭×こころのギャップ解消：ロジカルシンキング活用（理解）×コーチング・リーダーシップ論（共感）',
      'ECRSフレームワーク：案件ごとにスコープ決定軸を定める→言語化し顧客と合意',
      '営業力強化：目標/目的設定明確化×WBS（Work Breakdown Structure）クオリティ向上',
      '未解決課題：ジョブホッパー文化の中での優秀人材定着は明確な解決策未発見'
    ]
  },
  automotive: {
    culturalTraits: ['自動車業界特有の品質管理文化', 'サプライチェーン重視'],
    commonChallenges: ['EV化対応', 'グローバル競争激化'],
    successPatterns: ['トヨタ生産方式', 'カイゼン文化']
  },
  retail: {
    culturalTraits: ['顧客第一主義', '店舗オペレーション重視'],
    commonChallenges: ['EC化対応', '人手不足', 'オムニチャネル'],
    successPatterns: ['データドリブン経営', '店舗DX']
  },
  consulting: {
    culturalTraits: ['実力主義', 'アウトプット重視', '論理思考'],
    commonChallenges: ['人材流出', 'スケーラビリティ', 'ナレッジ蓄積'],
    successPatterns: ['メソドロジー体系化', 'パートナーシップ構築']
  },
  advertising: {
    culturalTraits: ['クリエイティブ重視', 'スピード感', 'トレンド敏感'],
    commonChallenges: ['デジタル化対応', 'ROI測定', 'クリエイター確保'],
    successPatterns: ['データドリブンクリエイティブ', 'アジャイル制作']
  },
  education: {
    culturalTraits: ['教育効果重視', '長期視点', '個別対応'],
    commonChallenges: ['DX推進', '個別最適化', 'エンゲージメント'],
    successPatterns: ['適応学習', 'LMS活用', 'コミュニティ形成']
  },
  other: {
    culturalTraits: ['業界固有の特性を持つ'],
    commonChallenges: ['業界特有の課題'],
    successPatterns: ['ベストプラクティスの横展開']
  }
};

// 職種別KSF（Key Success Factor）
const jobFunctionKSF = {
  sales: {
    営業: [
      '顧客ニーズの深掘りヒアリングスキル',
      'プレゼンテーション・提案力',
      '継続的な関係構築力',
      'KPI管理と行動計画立案'
    ],
    スタッフ: [
      '営業支援体制の構築',
      'CRM・SFA活用によるデータ管理',
      '提案資料・ツール整備',
      'マーケティング連携'
    ],
    オペレーション: [
      '受注から納品までのプロセス管理',
      '品質管理・顧客満足度向上',
      'コスト管理・効率化',
      'チーム連携・情報共有'
    ]
  }
};

// IPアドレス取得関数
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Rate Limit チェック関数
function checkRateLimit(clientIP: string): { allowed: boolean; remainingRequests: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  
  // クライアントデータが存在しない、または時間ウィンドウが過ぎている場合
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remainingRequests: RATE_LIMIT_REQUESTS - 1 };
  }
  
  // 制限に達している場合
  if (clientData.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remainingRequests: 0 };
  }
  
  // カウントを増加
  clientData.count += 1;
  rateLimitMap.set(clientIP, clientData);
  
  return { allowed: true, remainingRequests: RATE_LIMIT_REQUESTS - clientData.count };
}

// 業界知見を活用したシステムプロンプト生成
function generateEnhancedSystemPrompt(coachId: string, userProfile: any, industryInsights: any): string {
  let systemPrompt = coachPrompts[coachId as keyof typeof coachPrompts] || coachPrompts.tanaka;
  
  // プロフィール情報を組み込む
  if (userProfile && userProfile.name) {
    systemPrompt += `\n\n【クライアント情報】`;
    systemPrompt += `\nお名前: ${userProfile.name}さん`;
    if (userProfile.company) systemPrompt += `\n会社: ${userProfile.company}`;
    if (userProfile.position) systemPrompt += `\n役職: ${userProfile.position}`;
    if (userProfile.department) systemPrompt += `\n部署: ${userProfile.department}`;
    
    // 業界・規模情報
    if (userProfile.industry) {
      const industryData = industryKnowledgeBase[userProfile.industry as keyof typeof industryKnowledgeBase];
      if (industryData) {
        systemPrompt += `\n業界: ${getIndustryLabel(userProfile.industry)}`;
        if (userProfile.companySize) {
          systemPrompt += `\n規模: ${getCompanySizeLabel(userProfile.companySize)}`;
        }
      }
    }
    
    // 組織文化情報
    if (userProfile.organizationCulture && userProfile.organizationCulture.length > 0) {
      systemPrompt += `\n組織文化: ${userProfile.organizationCulture.join('、')}`;
    }
    
    // 主な課題
    if (userProfile.mainChallenges && userProfile.mainChallenges.length > 0) {
      systemPrompt += `\n現在の課題: ${userProfile.mainChallenges.join('、')}`;
    }
    
    // 目標
    if (userProfile.goals && userProfile.goals.length > 0) {
      systemPrompt += `\n目標: ${userProfile.goals.join('、')}`;
    }
  }
  
  // 業界知見を活用した専門的アドバイス強化
  if (industryInsights && userProfile?.industry) {
    const insights = industryKnowledgeBase[userProfile.industry as keyof typeof industryKnowledgeBase];
    if (insights) {
      systemPrompt += `\n\n【業界専門知識】`;
      systemPrompt += `\n${userProfile.name}さんの業界（${getIndustryLabel(userProfile.industry)}）の特徴を踏まえてアドバイスしてください：`;
      
      // 組織文化の特徴
      if (insights.culturalTraits && insights.culturalTraits.length > 0) {
        systemPrompt += `\n\n＜組織文化の傾向＞`;
        insights.culturalTraits.forEach((trait, index) => {
          systemPrompt += `\n${index + 1}. ${trait}`;
        });
      }
      
      // 典型的な課題パターン
      if (insights.commonChallenges && insights.commonChallenges.length > 0) {
        systemPrompt += `\n\n＜この業界でよくある課題＞`;
        insights.commonChallenges.forEach((challenge, index) => {
          systemPrompt += `\n${index + 1}. ${challenge}`;
        });
      }
      
      // 成功パターン・解決手法
      if (insights.successPatterns && insights.successPatterns.length > 0) {
        systemPrompt += `\n\n＜実績のある解決手法・成功パターン＞`;
        insights.successPatterns.forEach((pattern, index) => {
          systemPrompt += `\n${index + 1}. ${pattern}`;
        });
      }
      
      systemPrompt += `\n\nこれらの業界知見を参考に、${userProfile.name}さんの具体的な状況に応じた実践的で実行可能なアドバイスを提供してください。`;
    }
  }
  
  // コーチング品質向上のための追加指示
  systemPrompt += `\n\n【コーチング方針】`;
  systemPrompt += `\n・${userProfile?.name || 'お客様'}の背景を考慮し、親しみやすくパーソナライズされた対応を心がけてください`;
  systemPrompt += `\n・抽象的なアドバイスではなく、具体的で実行可能なアクションプランを提示してください`;
  systemPrompt += `\n・業界特有の課題については、実績のある解決手法を積極的に活用してください`;
  systemPrompt += `\n・相手の立場や気持ちに共感しながら、前向きで建設的な提案を行ってください`;
  
  return systemPrompt;
}

// 業界ラベル取得
function getIndustryLabel(industry: string): string {
  const labels: { [key: string]: string } = {
    manufacturer: 'メーカー・製造業',
    real_estate: '不動産・建設業', 
    it: 'IT・情報通信業',
    automotive: '自動車業界',
    retail: '小売・流通業',
    consulting: 'コンサルティング',
    advertising: '広告・マーケティング',
    education: '教育・研修業',
    other: 'その他'
  };
  return labels[industry] || 'その他';
}

// 会社規模ラベル取得
function getCompanySizeLabel(size: string): string {
  const labels: { [key: string]: string } = {
    '1-9': '1-9名（スタートアップ・個人事業）',
    '10-50': '10-50名（小規模企業・ベンチャー）',
    '51-200': '51-200名（中小企業）',
    '201-1000': '201-1000名（中堅企業）',
    '1000+': '1000名以上（大企業）'
  };
  return labels[size] || size;
}

// メモリクリーンアップ（古いエントリを削除）
function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// 定期的なクリーンアップ（メモリリーク防止）
setInterval(cleanupRateLimitMap, 5 * 60 * 1000); // 5分ごと

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting チェック
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    console.log(`🛡️ Rate Limit Check - IP: ${clientIP}, Allowed: ${rateLimitResult.allowed}, Remaining: ${rateLimitResult.remainingRequests}`);
    
    if (!rateLimitResult.allowed) {
      console.log(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { 
          error: '利用制限に達しました。10分後に再度お試しください。',
          rateLimitExceeded: true 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + RATE_LIMIT_WINDOW / 1000).toString()
          }
        }
      );
    }

    const { messages, mode, userProfile, industryInsights } = await request.json();
    
    // 入力検証
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '有効なメッセージが必要です。' },
        { status: 400 }
      );
    }
    
    // coachIdの取得（後方互換性のためmodeも確認）
    const coachId = mode || 'tanaka';
    
    console.log('🤖 Enhanced OpenAI API呼び出し開始');
    console.log('📝 Messages count:', messages.length);
    console.log('👨‍💼 Coach ID:', coachId);
    console.log('👤 User Profile:', userProfile?.name || 'No profile');
    console.log('🏢 Industry:', userProfile?.industry || 'Not specified');
    console.log('📊 Profile Completeness:', userProfile?.profileCompleteness || 0, '%');

    // 業界知見を活用した拡張システムプロンプト生成
    const enhancedSystemPrompt = generateEnhancedSystemPrompt(coachId, userProfile, industryInsights);
    
    console.log('💡 Enhanced System Prompt Generated:', enhancedSystemPrompt.length, 'characters');
    
    const systemMessage = {
      role: 'system',
      content: enhancedSystemPrompt
    };

    const openaiMessages = [systemMessage, ...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }))];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: openaiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    console.log('✅ Enhanced OpenAI Response received successfully');
    console.log('📊 Response length:', response?.length || 0, 'characters');

    return NextResponse.json({ 
      choices: [{ 
        message: { 
          content: response 
        } 
      }] 
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
      }
    });

  } catch (error: any) {
    console.error('💥 Enhanced API Error:', error);
    
    // OpenAI API制限エラーの場合
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'AIサービスが混雑しています。少し時間をおいて再度お試しください。' },
        { status: 429 }
      );
    }
    
    // その他のOpenAI APIエラー
    if (error?.status >= 400 && error?.status < 500) {
      return NextResponse.json(
        { error: 'リクエストに問題があります。入力内容を確認してください。' },
        { status: 400 }
      );
    }
    
    // サーバーエラー
    return NextResponse.json(
      { error: 'AIサービスに接続できませんでした。しばらく後にお試しください。' },
      { status: 500 }
    );
  }
}