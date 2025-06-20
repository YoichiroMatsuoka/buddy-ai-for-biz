'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ProjectModal } from '@/components/ProjectModal';
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from './providers/AuthProvider'
import { User } from '@supabase/supabase-js'
import { ProjectInfoDisplay } from '@/components/ProjectInfoDisplay';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: File;
}

// プロジェクトカルテ関連のインターフェース
interface Project {
  id: string;
  project_name: string;
  objectives: string;
  project_period?: any;
  project_purpose?: string;
  project_goals?: string;
  user_role?: string;
  user_personal_goals?: any;
  kpis?: any;
  important_decisions?: any;
  ai_auto_update_enabled?: boolean;
  created_at: string;
  updated_at: string;
  project_stakeholders?: any[];
  project_documents?: any[];
}

// 拡張UserProfile interface
interface EnhancedUserProfile {
  name: string;
  company: string;
  position: string;
  department: string;
  
  // 新規追加フィールド
  industry: 'manufacturer' | 'real_estate' | 'it' | 'automotive' | 'retail' | 'consulting' | 'advertising' | 'education' | 'other';
  industryDetail?: string;
  companySize: '1-9' | '10-50' | '51-200' | '201-1000' | '1000+';
  businessType?: string;
  organizationCulture?: string[];
  dailyTasks?: string[];
  mainChallenges: string[];
  goals: string[];
  preferredCoach: CoachId;
  
  // 新追加フィールド
  joinDate?: string; // 入社年月
  jobDescription?: string; // 業務内容
  industrySelectionMethod?: 'free' | 'classification'; // 業界選択方法
  customOrganizationCulture?: string[]; // カスタム組織文化
  selectedJobCategories?: string[]; // 選択された職種カテゴリ（複数選択）
  jobCategoryDetails?: {[key: string]: string}; // 職種カテゴリごとの具体的業務内容
  customJobCategories?: string[]; // カスタム職種カテゴリ
  customPersonalValues?: string[]; // カスタム価値観
  
  // 価値観関連の新フィールド
  personalValues?: string[];
  companyPersonalMatch?: number; // 0-100の数値
  
  // AIヒアリング関連
  interviewCompletedAt?: Date;
  interviewInsights?: string[];
  interviewAnswers?: any[];
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  profileCompleteness: number; // 0-100%
}

// プリセットコーチの定義
const presetCoaches = {
  tanaka: {
    id: 'tanaka',
    name: '田中 健一',
    title: 'ビジネス戦略コーチ',
    specialty: '経営戦略・事業開発・リーダーシップ',
    description: '論理的で結果重視。具体的なアクションプランが得意',
    avatar: '👨‍💼',
    color: 'bg-blue-500',
    initialMessage: 'こんにちは！田中です。今日はどのようなビジネス課題についてお話ししましょうか？',
    systemPrompt: 'あなたは経験豊富なビジネス戦略コーチ田中健一です。論理的思考と結果重視のアプローチで、具体的で実行可能なアクションプランを提案します。経営戦略、事業開発、リーダーシップの分野が専門です。'
  },
  sato: {
    id: 'sato', 
    name: '佐藤 美咲',
    title: 'キャリア・コミュニケーションコーチ',
    specialty: 'キャリア開発・人間関係・プレゼンテーション',
    description: '共感力が高く、相手の気持ちに寄り添う',
    avatar: '👩‍💼',
    color: 'bg-pink-500',
    initialMessage: 'こんにちは、佐藤美咲です。今日はキャリアや人間関係について、一緒に考えていきましょう。',
    systemPrompt: 'あなたは優秀なキャリア・コミュニケーションコーチ佐藤美咲です。共感力が高く、相手の気持ちに寄り添いながら、キャリア開発、人間関係、プレゼンテーションスキルの向上をサポートします。'
  },
  yamada: {
    id: 'yamada',
    name: '山田 雄介', 
    title: '営業・マーケティングコーチ',
    specialty: '営業戦略・顧客対応・マーケティング',
    description: '実践的で行動重視、成果に直結するアドバイス',
    avatar: '🧑‍💻',
    color: 'bg-green-500',
    initialMessage: 'お疲れ様です！山田です。営業やマーケティングの課題、一緒に解決していきましょう！',
    systemPrompt: 'あなたは実績豊富な営業・マーケティングコーチ山田雄介です。実践的で行動重視のアプローチで、営業戦略、顧客対応、マーケティングで成果に直結するアドバイスを提供します。'
  },
  suzuki: {
    id: 'suzuki',
    name: '鈴木 智子',
    title: '働き方・メンタルヘルスコーチ', 
    specialty: 'ワークライフバランス・ストレス管理・チームワーク',
    description: '優しく包容力があり、心のケアも重視',
    avatar: '👩‍⚕️',
    color: 'bg-purple-500',
    initialMessage: 'こんにちは、鈴木智子です。お仕事の調子はいかがですか？何でもお気軽にお話しくださいね。',
    systemPrompt: 'あなたは優しい働き方・メンタルヘルスコーチ鈴木智子です。包容力があり心のケアを重視し、ワークライフバランス、ストレス管理、チームワーク向上をサポートします。'
  }
};

type CoachId = keyof typeof presetCoaches;

// 業界マスターデータ
const industryMaster = {
  manufacturer: {
    label: 'メーカー・製造業',
    description: '自動車、電機、化学、食品等の製造業',
    percentage: '24.1%',
    insights: {
      culturalTraits: ['年功序列が強い', '稟議制中心', '階層重視', '変化への対応が早い'],
      commonChallenges: ['新規開拓困難', '生産ライン対応頻繁', '人材高年齢化', 'DX推進の妨げ'],
      successPatterns: ['埼玉トヨペット手法', 'トップダウン組織変革', 'ミドル層採用強化', 'CDXO設定']
    }
  },
  real_estate: {
    label: '不動産・建設業',
    description: '売買・賃貸、ゼネコン、ディベロッパー',
    percentage: '19.0%',
    insights: {
      culturalTraits: ['体育会系文化', 'ペースセッター型リーダーシップ', 'トップダウン', 'デジタル化進行'],
      commonChallenges: ['個人営業スキルバラツキ', '円安・原価高', '技術分野との激論', '大規模案件管理'],
      successPatterns: ['キーエンス手法活用', 'KPI設計強化', 'ビジネススキル研修', '優秀人材早期育成']
    }
  },
  it: {
    label: 'IT・情報通信業',
    description: 'ソフトウェア開発、SI、スタートアップ',
    percentage: '15.2%',
    insights: {
      culturalTraits: ['フラット組織', 'GAFAM模倣', 'ジョブホッパー文化', '設立年代で大きく異なる'],
      commonChallenges: ['エンジニア×ビジネス価値観ギャップ', 'プロジェクトスコープ曖昧', '人材定着困難', 'スコープ強制拡大'],
      successPatterns: ['頭×こころのギャップ解消', 'ECRSフレームワーク', '目標設定×WBS向上', 'コミュニケーション研修']
    }
  },
  automotive: { label: '自動車業界', description: '自動車メーカー、部品メーカー、販売店', percentage: '8.3%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } },
  retail: { label: '小売・流通業', description: '百貨店、スーパー、EC、専門店', percentage: '7.9%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } },
  consulting: { label: 'コンサルティング', description: '戦略・IT・業務コンサルティング', percentage: '6.2%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } },
  advertising: { label: '広告・マーケティング', description: '広告代理店、PR、デジタルマーケティング', percentage: '4.8%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } },
  education: { label: '教育・研修業', description: '学校法人、研修会社、eラーニング', percentage: '3.7%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } },
  other: { label: 'その他', description: 'その他の業界', percentage: '10.8%', insights: { culturalTraits: [], commonChallenges: [], successPatterns: [] } }
};

// 総務省業種分類（簡易版）
const governmentIndustryClassification = {
  '01': { label: '農業、林業', subcategories: ['農業', '林業'] },
  '02': { label: '漁業', subcategories: ['漁業（水産養殖業を除く）', '水産養殖業'] },
  '03': { label: '鉱業、採石業、砂利採取業', subcategories: ['鉱業', '採石業、砂利採取業'] },
  '04': { label: '建設業', subcategories: ['総合工事業', '職別工事業（設備工事業を除く）', '設備工事業'] },
  '05': { label: '製造業', subcategories: ['食料品製造業', '繊維工業', '化学工業', '鉄鋼業', '機械器具製造業', '輸送用機械器具製造業'] },
  '06': { label: '電気・ガス・熱供給・水道業', subcategories: ['電気業', 'ガス業', '熱供給業', '水道業'] },
  '07': { label: '情報通信業', subcategories: ['通信業', '放送業', '情報サービス業', 'インターネット附随サービス業'] },
  '08': { label: '運輸業、郵便業', subcategories: ['鉄道業', '道路旅客運送業', '道路貨物運送業', '水運業', '航空運輸業', '倉庫業', '郵便業'] },
  '09': { label: '卸売業、小売業', subcategories: ['卸売業', '各種商品小売業', '飲食料品小売業', '機械器具小売業', 'その他の小売業'] },
  '10': { label: '金融業、保険業', subcategories: ['銀行業', '協同組織金融業', '貸金業', '証券業', '保険業'] },
  '11': { label: '不動産業、物品賃貸業', subcategories: ['不動産取引業', '不動産賃貸業・管理業', '物品賃貸業'] },
  '12': { label: '学術研究、専門・技術サービス業', subcategories: ['学術・開発研究機関', '専門サービス業', '広告業', '技術サービス業'] },
  '13': { label: '宿泊業、飲食サービス業', subcategories: ['宿泊業', '飲食店', '持ち帰り・配達飲食サービス業'] },
  '14': { label: '生活関連サービス業、娯楽業', subcategories: ['洗濯・理容・美容・浴場業', 'その他の生活関連サービス業', '娯楽業'] },
  '15': { label: '教育、学習支援業', subcategories: ['学校教育', 'その他の教育、学習支援業'] },
  '16': { label: '医療、福祉', subcategories: ['医療業', '保健衛生', '社会保険・社会福祉・介護事業'] },
  '17': { label: '複合サービス事業', subcategories: ['郵便局', '協同組合'] },
  '18': { label: 'サービス業（他に分類されないもの）', subcategories: ['廃棄物処理業', '自動車整備業', '機械等修理業', '職業紹介・労働者派遣業', 'その他の事業サービス業', '政治・経済・文化団体', '宗教', 'その他のサービス業'] },
  '19': { label: '公務（他に分類されるものを除く）', subcategories: ['国家公務', '地方公務'] }
};

// 従業員規模マスターデータ
const companySizeMaster = {
  '1-9': {
    label: '1-9名',
    description: 'スタートアップ・個人事業',
    characteristics: ['フラット組織', '迅速な意思決定', '多役割']
  },
  '10-50': {
    label: '10-50名',
    description: '小規模企業・ベンチャー',
    characteristics: ['成長期組織', '部門形成期', '制度構築期']
  },
  '51-200': {
    label: '51-200名',
    description: '中小企業',
    characteristics: ['部門分化', '中間管理職登場', '制度整備']
  },
  '201-1000': {
    label: '201-1000名',
    description: '中堅企業',
    characteristics: ['階層組織', '専門分化', '規程整備']
  },
  '1000+': {
    label: '1000名以上',
    description: '大企業',
    characteristics: ['複雑な組織', '稟議制', '年功序列']
  }
};

// 価値観マスターデータ（30個）
const personalValuesMaster = [
  { id: 'achievement', label: '成果・達成', description: '目標達成と結果にこだわる' },
  { id: 'growth', label: '成長・向上', description: '自己啓発とスキル向上を重視' },
  { id: 'stability', label: '安定・安心', description: '確実性と予測可能性を好む' },
  { id: 'innovation', label: '革新・創造', description: '新しいアイデアと変革を追求' },
  { id: 'teamwork', label: 'チームワーク', description: '協調と連携を大切にする' },
  { id: 'leadership', label: 'リーダーシップ', description: '指導力と影響力を発揮したい' },
  { id: 'autonomy', label: '自律・独立', description: '自由度と裁量権を重要視' },
  { id: 'efficiency', label: '効率・最適化', description: '無駄を省き最短距離を追求' },
  { id: 'quality', label: '品質・完璧', description: '高品質と完成度にこだわる' },
  { id: 'relationship', label: '人間関係', description: '良好な関係性を重視' },
  { id: 'competition', label: '競争・勝利', description: '競争心が強く勝利を追求' },
  { id: 'balance', label: 'バランス', description: 'ワークライフバランスを重視' },
  { id: 'service', label: 'サービス・貢献', description: '他者や社会への貢献を重視' },
  { id: 'knowledge', label: '知識・学習', description: '学ぶことと知的好奇心を大切に' },
  { id: 'recognition', label: '承認・評価', description: '他者からの認識と評価を重視' },
  { id: 'challenge', label: 'チャレンジ', description: '困難な課題に挑戦することを好む' },
  { id: 'tradition', label: '伝統・継承', description: '既存の価値と伝統を尊重' },
  { id: 'flexibility', label: '柔軟性', description: '変化に対応し適応することを重視' },
  { id: 'responsibility', label: '責任・義務', description: '責任感が強く義務を重んじる' },
  { id: 'creativity', label: '創造性', description: 'クリエイティブな表現と発想を大切に' },
  { id: 'honesty', label: '誠実・正直', description: '誠実さと透明性を重要視' },
  { id: 'diversity', label: '多様性', description: '多様な価値観と個性を尊重' },
  { id: 'speed', label: 'スピード', description: '迅速な行動と素早い判断を重視' },
  { id: 'detail', label: '詳細・正確', description: '細かい部分と正確性にこだわる' },
  { id: 'vision', label: 'ビジョン・理想', description: '将来像と理想の実現を追求' },
  { id: 'practical', label: '実用・現実', description: '実用性と現実的なソリューションを重視' },
  { id: 'communication', label: 'コミュニケーション', description: '対話と情報共有を大切にする' },
  { id: 'profit', label: '利益・成果', description: '経済的成果と収益性を重視' },
  { id: 'ethics', label: '倫理・道徳', description: '倫理的な行動と道徳的価値を重要視' },
  { id: 'experience', label: '経験・体験', description: '新しい経験と多様な体験を求める' }
];

// 職種カテゴリマスターデータ
const jobCategoryMaster = [
  { id: 'sales', label: '営業・販売', description: '顧客開拓、商談、契約、顧客フォロー' },
  { id: 'marketing', label: 'マーケティング・企画', description: '市場分析、広告企画、商品企画、ブランディング' },
  { id: 'administration', label: '管理・事務', description: '総務、人事、経理、庶務、データ管理' },
  { id: 'engineering', label: '技術・開発', description: 'システム開発、研究開発、設計、技術サポート' },
  { id: 'production', label: '製造・生産', description: '製造オペレーション、品質管理、生産管理' },
  { id: 'service', label: 'サービス・接客', description: '顧客サービス、カスタマーサポート、店舗運営' },
  { id: 'management', label: '経営・管理職', description: 'チームマネジメント、戦略立案、組織運営' },
  { id: 'specialist', label: '専門職', description: '法務、会計、コンサルティング、専門技術' }
];

// マイページ機能用のinterface定義
interface SessionRecord {
  id: string;
  date: Date;
  coachId: CoachId;
  duration: number;
  messageCount: number;
  topics: string[];
  summary: string;
  satisfaction: number;
  nextActions: string[];
}

interface MedicalRecord {
  userProfile: EnhancedUserProfile | null;
  sessions: SessionRecord[];
  totalSessions: number;
  favoriteCoach: CoachId | null;
  achievements: string[];
  currentGoals: string[];
}

// プロジェクト選択モーダルコンポーネント
const ProjectSelectionModal = ({ 
  isOpen, 
  onClose, 
  projects,
  onStartSession
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onStartSession: (projectIds: string[], action: 'existing' | 'new' | 'none') => void;
}) => {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [action, setAction] = useState<'existing' | 'new' | 'none'>('none');

  useEffect(() => {
    if (projects.length > 0) {
      setAction('existing');
    }
  }, [projects]);

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleStart = () => {
    if (action === 'existing' && selectedProjects.length === 0) {
      alert('プロジェクトを選択してください');
      return;
    }
    onStartSession(selectedProjects, action);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">どのプロジェクトについて相談しますか？</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* 既存プロジェクトの選択 */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                既存のプロジェクトから選択（複数選択可）
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={project.id}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      disabled={action !== 'existing'}
                      className="mt-1"
                    />
                    <label 
                      htmlFor={project.id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {project.objectives}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* その他のオプション */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="new"
                checked={action === 'new'}
                onChange={(e) => setAction(e.target.value as any)}
              />
              <span>プロジェクトを新規作成してセッション開始</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="none"
                checked={action === 'none'}
                onChange={(e) => setAction(e.target.value as any)}
              />
              <span>プロジェクトを設定しないままセッション開始</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              セッション開始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 選択中プロジェクトカルテモーダルコンポーネント
const SelectedProjectsModal = ({ 
  isOpen, 
  onClose, 
  projectIds,
  projects,
  onEdit
}: {
  isOpen: boolean;
  onClose: () => void;
  projectIds: string[];
  projects: Project[];
  onEdit: (project: Project) => void;
}) => {
  const selectedProjects = projects.filter(p => projectIds.includes(p.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📁 選択中のプロジェクトカルテ</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {selectedProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            プロジェクトが選択されていません
          </div>
        ) : (
          <div className="space-y-4">
            {selectedProjects.map((project, index) => (
              <div key={project.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{project.project_name}</h3>
                      {index === 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">メインプロジェクト</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={() => onEdit(project)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    編集
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">セッションで叶えたいこと</h4>
                    <p className="text-gray-600">{project.objectives}</p>
                  </div>

                  {project.project_purpose && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">プロジェクトの目的</h4>
                      <p className="text-gray-600">{project.project_purpose}</p>
                    </div>
                  )}

                  {project.project_goals && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">プロジェクトのゴール</h4>
                      <p className="text-gray-600">{project.project_goals}</p>
                    </div>
                  )}

                  {project.user_role && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">あなたの役割</h4>
                      <p className="text-gray-600">{project.user_role}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-500 pt-2">
                    <span>最終更新: {new Date(project.updated_at).toLocaleDateString('ja-JP')}</span>
                    {project.ai_auto_update_enabled && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        AI自動更新有効
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// プロジェクト一覧コンポーネント
const ProjectList = ({ 
  projects,
  onEdit,
  onDelete,
  onStartSession
}: {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onStartSession: (projectId: string) => void;
}) => {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-lg mb-2">プロジェクトがまだありません</p>
        <p className="text-gray-400 text-sm">新規プロジェクトを作成して、AIコーチと継続的な相談を始めましょう</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {project.project_name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {project.objectives}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>最終更新: {new Date(project.updated_at).toLocaleDateString('ja-JP')}</span>
                {project.ai_auto_update_enabled && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                    AI自動更新ON
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onStartSession(project.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                セッション開始
              </button>
              <button
                onClick={() => onEdit(project)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                編集
              </button>
              <button
                onClick={() => onDelete(project.id)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 拡張プロフィール設定モーダルコンポーネント
const EnhancedProfileModal = ({ 
  isOpen, 
  onClose, 
  currentProfile, 
  onSave,
  user  // 追加
}: {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: EnhancedUserProfile | null;
  onSave: (profile: Partial<EnhancedUserProfile>) => void;
  user: User | null;  // 追加
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    position: '',
    department: '',
    joinDate: '',
    industry: 'manufacturer' as EnhancedUserProfile['industry'],
    industryDetail: '',
    industrySelectionMethod: 'classification' as 'free' | 'classification',
    companySize: '51-200' as EnhancedUserProfile['companySize'],
    jobDescription: '',
    organizationCulture: [] as string[],
    customOrganizationCulture: [] as string[],
    newCustomCulture: '',
    dailyTasks: [] as string[],
    selectedJobCategories: [] as string[],
    jobCategoryDetails: {} as {[key: string]: string},
    customJobCategories: [] as string[],
    newCustomJobCategory: '',
    mainChallenges: [] as string[],
    goals: [] as string[],
    personalValues: [] as string[],
    customPersonalValues: [] as string[],
    newCustomValue: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // 初期値設定
  // 初期値設定
  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || '',
        company: currentProfile.company || '',
        position: currentProfile.position || '',
        department: currentProfile.department || '',
        joinDate: currentProfile.joinDate || '',
        industry: currentProfile.industry || 'manufacturer',
        industryDetail: currentProfile.industryDetail || '',
        industrySelectionMethod: currentProfile.industrySelectionMethod || 'classification',
        companySize: currentProfile.companySize || '51-200',
        jobDescription: currentProfile.jobDescription || '',
        organizationCulture: currentProfile.organizationCulture || [],
        customOrganizationCulture: currentProfile.customOrganizationCulture || [],
        newCustomCulture: '',
        dailyTasks: currentProfile.dailyTasks || [],
        selectedJobCategories: currentProfile.selectedJobCategories || [],
        jobCategoryDetails: currentProfile.jobCategoryDetails || {},
        customJobCategories: currentProfile.customJobCategories || [],
        newCustomJobCategory: '',
        mainChallenges: currentProfile.mainChallenges || [],
        goals: currentProfile.goals || [],
        personalValues: currentProfile.personalValues || [],
        customPersonalValues: currentProfile.customPersonalValues || [],
        newCustomValue: ''
      });
    } else if (isOpen && user) {
      // プロフィールがない場合は、ユーザーのメタデータから名前を設定
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.name || ''
      }));
    }
  }, [currentProfile, isOpen, user]);

  // 組織文化選択肢（20個に拡張）
  const organizationCultureOptions = [
    '年功序列が強い',
    'フラットな組織',
    '実力主義',
    '体育会系',
    'トップダウン',
    'ボトムアップ',
    '稟議制が中心',
    '迅速な意思決定',
    'チームワーク重視',
    '個人成果重視',
    '安定志向',
    'チャレンジ志向',
    '伝統的な文化',
    '革新的な文化',
    'リモートワーク推進',
    '在宅勤務を重視',
    '国際的な環境',
    'スタートアップ文化',
    '品質第一主義',
    'コンプライアンス重視'
  ];

  // 業界自由記述時の推論機能（改善版）
  const analyzeIndustryDescription = async (description: string) => {
    if (!description.trim()) return;
    
    // キーワードベースの推論ロジック（大幅改善）
    const keywords = description.toLowerCase();
    const suggestions: string[] = [];
    
    // より詳細なキーワードマッピング
    const keywordMapping = {
      // 建設・不動産関連
      '建設|工事|建築|住宅|マンション|戸建|分譲|賃貸|不動産|建物|施工|土木|ゼネコン|ディベロッパー|設計|リフォーム': [
        '04-総合工事業', '04-職別工事業（設備工事業を除く）', '04-設備工事業',
        '11-不動産取引業', '11-不動産賃貸業・管理業'
      ],
      // 製造業関連  
      '製造|工場|生産|メーカー|自動車|電機|機械|化学|食品|繊維|鉄鋼|金属|プラスチック|部品|組立': [
        '05-食料品製造業', '05-繊維工業', '05-化学工業', 
        '05-鉄鋼業', '05-機械器具製造業', '05-輸送用機械器具製造業'
      ],
      // IT・情報通信関連
      'it|システム|ソフトウェア|プログラム|web|アプリ|データ|ai|クラウド|インターネット|通信|放送|情報': [
        '07-情報サービス業', '07-インターネット附随サービス業', 
        '07-通信業', '07-放送業'
      ],
      // 販売・小売関連
      '販売|小売|店舗|ec|通販|百貨店|スーパー|コンビニ|専門店|卸売|商社|流通|物販': [
        '09-卸売業', '09-各種商品小売業', '09-飲食料品小売業', 
        '09-機械器具小売業', '09-その他の小売業'
      ],
      // 金融・保険関連
      '銀行|金融|保険|証券|投資|ファイナンス|クレジット|貸金|信用金庫|証券会社': [
        '10-銀行業', '10-協同組織金融業', '10-貸金業', 
        '10-証券業', '10-保険業'
      ],
      // 教育関連
      '教育|学校|研修|eラーニング|塾|予備校|大学|専門学校|語学|資格|人材育成': [
        '15-学校教育', '15-その他の教育、学習支援業'
      ],
      // サービス業関連
      'コンサル|広告|マーケティング|pr|デザイン|清掃|警備|人材派遣|アウトソーシング': [
        '12-専門サービス業', '12-広告業', '12-技術サービス業',
        '18-職業紹介・労働者派遣業', '18-その他の事業サービス業'
      ],
      // 医療・福祉関連
      '医療|病院|診療所|薬局|介護|福祉|老人ホーム|デイサービス|リハビリ|健康': [
        '16-医療業', '16-保健衛生', '16-社会保険・社会福祉・介護事業'
      ],
      // 運輸・物流関連
      '運輸|物流|配送|宅配|倉庫|トラック|鉄道|航空|船舶|郵便': [
        '08-道路貨物運送業', '08-倉庫業', '08-鉄道業', 
        '08-航空運輸業', '08-郵便業'
      ],
      // 飲食・宿泊関連
      '飲食|レストラン|カフェ|居酒屋|ホテル|旅館|宿泊|フード|料理': [
        '13-飲食店', '13-持ち帰り・配達飲食サービス業', '13-宿泊業'
      ]
    };
    
    // キーワードマッチング
    for (const [keywordPattern, categories] of Object.entries(keywordMapping)) {
      const regex = new RegExp(keywordPattern);
      if (regex.test(keywords)) {
        suggestions.push(...categories.slice(0, 3)); // 最大3個まで
        break; // 最初にマッチしたパターンのみ使用
      }
    }
    
    // マッチしなかった場合のデフォルト
    if (suggestions.length === 0) {
      suggestions.push(
        '18-その他の事業サービス業', 
        '12-専門サービス業', 
        '09-卸売業'
      );
    }
    
    // 重複を削除して最大3個に制限
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 3);
    

  };

  // カスタム組織文化追加
  const addCustomCulture = () => {
    if (formData.newCustomCulture.trim()) {
      setFormData(prev => ({
        ...prev,
        customOrganizationCulture: [...prev.customOrganizationCulture, prev.newCustomCulture.trim()],
        newCustomCulture: ''
      }));
    }
  };

  // カスタム職種カテゴリ追加
  const addCustomJobCategory = () => {
    if (formData.newCustomJobCategory.trim()) {
      setFormData(prev => ({
        ...prev,
        customJobCategories: [...prev.customJobCategories, prev.newCustomJobCategory.trim()],
        newCustomJobCategory: ''
      }));
    }
  };

  // カスタム価値観追加
  const addCustomValue = () => {
    if (formData.newCustomValue.trim()) {
      setFormData(prev => ({
        ...prev,
        customPersonalValues: [...prev.customPersonalValues, prev.newCustomValue.trim()],
        newCustomValue: ''
      }));
    }
  };

  // 職種カテゴリ選択の切り替え
  const toggleJobCategory = (categoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedJobCategories.includes(categoryId);
      const newSelected = isSelected 
        ? prev.selectedJobCategories.filter(id => id !== categoryId)
        : [...prev.selectedJobCategories, categoryId];
      
      // カテゴリが選択解除された場合、そのカテゴリの詳細も削除
      const newDetails = { ...prev.jobCategoryDetails };
      if (isSelected) {
        delete newDetails[categoryId];
      }
      
      return {
        ...prev,
        selectedJobCategories: newSelected,
        jobCategoryDetails: newDetails
      };
    });
  };

  // 職種カテゴリ詳細の更新
  const updateJobCategoryDetail = (categoryId: string, detail: string) => {
    setFormData(prev => ({
      ...prev,
      jobCategoryDetails: {
        ...prev.jobCategoryDetails,
        [categoryId]: detail
      }
    }));
  };

  // プロフィール完成度計算
  const calculateCompleteness = () => {
    const fields = [
      formData.name, formData.company, formData.position, 
      formData.department, formData.industry, formData.companySize
    ];
    const basicScore = fields.filter(f => f).length * 10;
    const advancedScore = (formData.organizationCulture.length * 2) + 
                         (formData.customOrganizationCulture.length * 3) +
                         (formData.dailyTasks.length * 2) + 
                         (formData.mainChallenges.length * 3) + 
                         (formData.goals.length * 3) +
                         (formData.personalValues.length * 2) +
                         (formData.customPersonalValues.length * 3) +
                         (formData.selectedJobCategories.length * 3) +
                         (Object.keys(formData.jobCategoryDetails).length * 2) +
                         (formData.joinDate ? 5 : 0) +
                         (formData.jobDescription ? 5 : 0);
    return Math.min(100, basicScore + advancedScore);
  };

  const handleSave = () => {
    const profileData = {
      ...formData,
      profileCompleteness: calculateCompleteness(),
      updatedAt: new Date()
    };
    onSave(profileData);
    
    // 保存確認メッセージを表示
    setShowSaveConfirmation(true);
    
    // 3秒後にモーダルを閉じる
    setTimeout(() => {
      setShowSaveConfirmation(false);
      onClose();
    }, 3000);
  };

  // タブクリック機能
  const handleTabClick = (step: number) => {
    setCurrentStep(step);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col relative">
        {/* 固定ヘッダー */}
        <div className="p-6 border-b bg-gray-50 rounded-t-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🏢 ベースカルテ設定</h2>
              <p className="text-gray-600">Step {currentStep} of {totalSteps}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
              >
                💾 入力を保存する
              </button>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-center text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
              💡 記載しづらいものやセッションへの反映が不要なものはスキップして大丈夫です！
            </p>
          </div>

          {/* タブナビゲーション（アンダーライン式） */}
          <div className="mb-4">
            <div className="flex justify-between border-b border-gray-200">
              {['基本情報', '業界・規模', '組織文化', '価値観', '目標・課題'].map((tab, index) => (
                <button
                  key={index}
                  onClick={() => handleTabClick(index + 1)}
                  className={`px-2 py-3 text-sm transition-colors border-b-2 ${
                    currentStep === index + 1 
                      ? 'text-blue-700 font-semibold border-blue-500' 
                      : 'text-gray-600 hover:text-gray-800 border-transparent hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: 基本情報 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">👤 基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    placeholder="山田太郎"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    placeholder="株式会社サンプル"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">役職 *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    placeholder="営業部長"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">部署 *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    placeholder="営業部"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">現所属会社の入社年月</label>
                  <input 
                    type="month" 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 業界・規模 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🏢 業界・規模情報</h3>
              
              {/* 業界選択（総務省業種分類のみ） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">総務省業種分類 *</label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {Object.entries(governmentIndustryClassification).map(([code, classification]) => (
                    <div key={code} className="space-y-1">
                      <div className="font-semibold text-gray-900 text-sm">{classification.label}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {classification.subcategories.map((subcat, index) => (
                          <div
                            key={index}
                            className={`p-2 border rounded cursor-pointer text-sm transition-all ${
                              formData.industryDetail === `${code}-${subcat}`
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-800'
                            }`}
                            onClick={() => setFormData({...formData, industryDetail: `${code}-${subcat}`, industry: 'other'})}
                          >
                            {subcat}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 従業員規模選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">従業員規模 *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(companySizeMaster).map(([key, size]) => (
                    <div 
                      key={key}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.companySize === key 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData({...formData, companySize: key as EnhancedUserProfile['companySize']})}
                    >
                      <div className="font-semibold text-gray-900">{size.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{size.description}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {size.characteristics.map((char, index) => (
                          <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 業務内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業務内容（ざっくり簡単にで結構です！）</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                  placeholder="例：法人営業、新規開拓、既存顧客フォロー、企画提案書作成など"
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({...formData, jobDescription: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: 組織文化 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🏛️ 組織文化・日常業務</h3>
              
              {/* 組織文化 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  組織文化の特徴（複数選択可）
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {organizationCultureOptions.map((option) => (
                    <div 
                      key={option}
                      className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                        formData.organizationCulture.includes(option)
                          ? 'border-purple-500 bg-purple-50 text-purple-700' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                      onClick={() => {
                        const newCulture = formData.organizationCulture.includes(option)
                          ? formData.organizationCulture.filter(c => c !== option)
                          : [...formData.organizationCulture, option];
                        setFormData({...formData, organizationCulture: newCulture});
                      }}
                    >
                      <span className="text-sm">{option}</span>
                    </div>
                  ))}
                </div>

                {/* カスタム組織文化 */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">その他自由設定</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                      placeholder="独自の組織文化を追加"
                      value={formData.newCustomCulture}
                      onChange={(e) => setFormData({...formData, newCustomCulture: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomCulture()}
                    />
                    <button
                      onClick={addCustomCulture}
                      className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      追加
                    </button>
                  </div>
                  {formData.customOrganizationCulture.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.customOrganizationCulture.map((culture, index) => (
                        <span 
                          key={index} 
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm flex items-center space-x-2"
                        >
                          <span>{culture}</span>
                          <button
                            onClick={() => {
                              const newCustom = formData.customOrganizationCulture.filter((_, i) => i !== index);
                              setFormData({...formData, customOrganizationCulture: newCustom});
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 職種カテゴリ選択（改善版） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  職種カテゴリ（複数選択可）
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {jobCategoryMaster.map((category) => (
                    <div 
                      key={category.id}
                      className={`p-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.selectedJobCategories.includes(category.id)
                          ? 'border-orange-500 bg-orange-50 text-orange-700' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                      onClick={() => toggleJobCategory(category.id)}
                    >
                      <div className="font-semibold text-xs">{category.label}</div>
                      <div className="text-xs mt-1 opacity-75">{category.description}</div>
                    </div>
                  ))}
                </div>

                {/* 選択された職種カテゴリの具体的業務内容 */}
                {formData.selectedJobCategories.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">選択した職種カテゴリの具体的な業務内容</h4>
                    {formData.selectedJobCategories.map((categoryId) => {
                      const category = jobCategoryMaster.find(c => c.id === categoryId);
                      return category ? (
                        <div key={categoryId} className="bg-gray-50 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {category.label} の具体的業務内容
                          </label>
                          <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                            placeholder={`${category.label}での具体的な業務を記載してください`}
                            value={formData.jobCategoryDetails[categoryId] || ''}
                            onChange={(e) => updateJobCategoryDetail(categoryId, e.target.value)}
                            rows={2}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                {/* カスタム職種カテゴリ */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">その他自由設定</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                      placeholder="独自の職種カテゴリを追加"
                      value={formData.newCustomJobCategory}
                      onChange={(e) => setFormData({...formData, newCustomJobCategory: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomJobCategory()}
                    />
                    <button
                      onClick={addCustomJobCategory}
                      className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      追加
                    </button>
                  </div>
                  {formData.customJobCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.customJobCategories.map((category, index) => (
                        <span 
                          key={index} 
                          className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm flex items-center space-x-2"
                        >
                          <span>{category}</span>
                          <button
                            onClick={() => {
                              const newCustom = formData.customJobCategories.filter((_, i) => i !== index);
                              setFormData({...formData, customJobCategories: newCustom});
                            }}
                            className="text-orange-500 hover:text-orange-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 価値観 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">💎 仕事に対するあなたの価値観</h3>
              <p className="text-gray-600 mb-6">以下の価値観の中から、あなたにとって重要なものを選択してください（複数選択可）</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {personalValuesMaster.map((value) => (
                  <div 
                    key={value.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.personalValues.includes(value.id)
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                    onClick={() => {
                      const newValues = formData.personalValues.includes(value.id)
                        ? formData.personalValues.filter(v => v !== value.id)
                        : [...formData.personalValues, value.id];
                      setFormData({...formData, personalValues: newValues});
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">{value.label}</div>
                    <div className="text-xs opacity-75">{value.description}</div>
                  </div>
                ))}
              </div>

              {/* カスタム価値観 */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">その他自由設定</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                    placeholder="独自の価値観を追加"
                    value={formData.newCustomValue}
                    onChange={(e) => setFormData({...formData, newCustomValue: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomValue()}
                  />
                  <button
                    onClick={addCustomValue}
                    className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    追加
                  </button>
                </div>
                {formData.customPersonalValues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.customPersonalValues.map((value, index) => (
                      <span 
                        key={index} 
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm flex items-center space-x-2"
                      >
                        <span>{value}</span>
                        <button
                          onClick={() => {
                            const newCustom = formData.customPersonalValues.filter((_, i) => i !== index);
                            setFormData({...formData, customPersonalValues: newCustom});
                          }}
                          className="text-green-500 hover:text-green-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <strong>選択済み:</strong> {formData.personalValues.length + formData.customPersonalValues.length}個の価値観
                  {(formData.personalValues.length + formData.customPersonalValues.length) >= 3 && (
                    <span className="ml-2 text-green-600">✓ 十分な価値観が選択されています</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: 目標・課題 */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 目標・課題設定</h3>
              
              {/* 現在の課題 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  現在抱えている主な課題（3つまで）
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <input 
                      key={index}
                      type="text" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                      placeholder={`課題 ${index + 1}（例：チームメンバーのモチベーション向上）`}
                      value={formData.mainChallenges[index] || ''}
                      onChange={(e) => {
                        const newChallenges = [...formData.mainChallenges];
                        newChallenges[index] = e.target.value;
                        setFormData({...formData, mainChallenges: newChallenges.filter(c => c)});
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 目標 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  達成したい目標（3つまで）
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <input 
                      key={index}
                      type="text" 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#0E2841]"
                      placeholder={`目標 ${index + 1}（例：売上前年比120%達成）`}
                      value={formData.goals[index] || ''}
                      onChange={(e) => {
                        const newGoals = [...formData.goals];
                        newGoals[index] = e.target.value;
                        setFormData({...formData, goals: newGoals.filter(g => g)});
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* プロフィール完成度 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">ベースカルテ完成度</span>
                  <span className="text-sm font-bold text-blue-600">{calculateCompleteness()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${calculateCompleteness()}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  より詳細な情報を入力することで、AIコーチがより適切なアドバイスを提供できます
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 固定フッター */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 前へ
            </button>

            <button
              onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
              disabled={currentStep === totalSteps}
              className={`px-6 py-2 rounded-lg ${
                currentStep === totalSteps
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              次へ →
            </button>
          </div>
        </div>

        {/* 保存確認オーバーレイ */}
        {showSaveConfirmation && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">入力お疲れさまでした</h3>
              <p className="text-gray-600">内容はいつでも編集できます！</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// AIヒアリング機能のReactコンポーネント
const AIInterviewModal = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  onComplete 
}: {
  isOpen: boolean;
  onClose: () => void;
  userProfile: EnhancedUserProfile;
  onComplete: (insights: string[], answers: any[]) => void;
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [showAnswerHistory, setShowAnswerHistory] = useState(false);
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
  const [editingAnswerContent, setEditingAnswerContent] = useState('');

  // 質問生成（30秒制限）
  const generateQuestions = useCallback(async () => {
    if (!userProfile) return;
    
    setIsGeneratingQuestions(true);
    
    // 30秒のタイムアウト設定
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    );
    
    try {
      const requestPromise = fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: userProfile,
          industry: userProfile.industry,
          challenges: userProfile.mainChallenges,
          goals: userProfile.goals
        })
      });

      const response = await Promise.race([requestPromise, timeoutPromise]) as Response;
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error('API_ERROR');
      }
    } catch (error: any) {
      console.error('質問生成エラー:', error);
      
      // タイムアウトまたはエラー時のフォールバック質問（業界特化）
      const fallbackQuestions = generateQuickFallbackQuestions(userProfile);
      setQuestions(fallbackQuestions);
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [userProfile]);

  // 高速フォールバック質問生成（業界特化）
  const generateQuickFallbackQuestions = (profile: EnhancedUserProfile) => {
    const industryQuestions: { [key: string]: any[] } = {
      manufacturer: [
        {
          id: 'fb_mfg_01',
          category: 'challenges',
          question: '製造業において、現在最も課題と感じているのは生産効率、品質管理、人材確保のどれですか？具体的に教えてください。',
          context: 'メーカー特有の課題を特定',
          priority: 'high'
        },
        {
          id: 'fb_mfg_02',
          category: 'organization',
          question: '意思決定において稟議制が原因で機会損失を感じたことはありますか？',
          context: 'メーカー特有の組織課題',
          priority: 'high'
        }
      ],
      real_estate: [
        {
          id: 'fb_re_01',
          category: 'challenges',
          question: '不動産業界において、営業成績のバラツキや顧客対応で最も改善したい点は何ですか？',
          context: '不動産特有の営業課題',
          priority: 'high'
        }
      ],
      it: [
        {
          id: 'fb_it_01',
          category: 'challenges',
          question: 'IT業界において、エンジニアとビジネスサイドの連携で最も改善したい点は何ですか？',
          context: 'IT業界特有の組織課題',
          priority: 'high'
        }
      ]
    };

    const baseQuestions = [
      {
        id: 'fb_base_01',
        category: 'goals',
        question: '3ヶ月以内に達成したい最重要目標と、その達成を妨げている最大の障壁は何ですか？',
        context: '短期目標と障壁の特定',
        priority: 'high'
      },
      {
        id: 'fb_base_02',
        category: 'workflow',
        question: '1日の業務で最も時間を取られている作業は何で、それは本当に必要な作業だと思いますか？',
        context: '業務効率化ポイントの特定',
        priority: 'medium'
      }
    ];

    const industrySpecific = industryQuestions[profile.industry] || [];
    return [...industrySpecific.slice(0, 2), ...baseQuestions].slice(0, 4);
  };

  // 過去の回答を初期値として設定（修正）
  useEffect(() => {
    if (isOpen && userProfile && userProfile.interviewAnswers) {
      setAnswers(userProfile.interviewAnswers);
    }
  }, [isOpen, userProfile]);

  // 現在の回答欄に過去の回答を設定（修正）
  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length && answers.length > 0) {
      const existingAnswer = answers.find(answer => 
        answer.questionId === questions[currentQuestion].id
      );
      if (existingAnswer) {
        setCurrentAnswer(existingAnswer.answer);
      } else {
        setCurrentAnswer('');
      }
    }
  }, [currentQuestion, questions, answers]);

  // 回答処理
  const handleAnswerSubmit = () => {
    if (!currentAnswer.trim()) return;
    
    const answer = {
      questionId: questions[currentQuestion].id,
      question: questions[currentQuestion].question,
      answer: currentAnswer.trim(),
      timestamp: new Date()
    };
    
    // 既存の回答を更新するか、新しく追加
    const existingIndex = answers.findIndex(a => a.questionId === answer.questionId);
    let updatedAnswers;
    if (existingIndex >= 0) {
      updatedAnswers = [...answers];
      updatedAnswers[existingIndex] = answer;
    } else {
      updatedAnswers = [...answers, answer];
    }
    
    setAnswers(updatedAnswers);
    setCurrentAnswer('');
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      analyzeResponses(updatedAnswers);
    }
  };

  // 回答履歴編集
  const handleEditAnswer = (index: number) => {
    setEditingAnswerIndex(index);
    setEditingAnswerContent(answers[index].answer);
  };

  const saveEditedAnswer = () => {
    if (editingAnswerIndex !== null) {
      const updatedAnswers = [...answers];
      updatedAnswers[editingAnswerIndex].answer = editingAnswerContent;
      setAnswers(updatedAnswers);
      setEditingAnswerIndex(null);
      setEditingAnswerContent('');
    }
  };

  // 回答分析
  const analyzeResponses = async (allAnswers: any[]) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          questions,
          answers: allAnswers
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
        onComplete(data.insights || [], allAnswers);
      } else {
        const fallbackInsights = generateFallbackInsights(allAnswers);
        setInsights(fallbackInsights);
        onComplete(fallbackInsights, allAnswers);
      }
    } catch (error) {
      console.error('回答分析エラー:', error);
      const fallbackInsights = generateFallbackInsights(allAnswers);
      setInsights(fallbackInsights);
      onComplete(fallbackInsights, allAnswers);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // フォールバック分析
  const generateFallbackInsights = (allAnswers: any[]): string[] => {
    return [
      `${allAnswers.length}項目について詳細なヒアリングが完了しました`,
      '個別の状況に応じたパーソナライズドコーチングが提供できます',
      '今後のセッションでは、より具体的で実行可能なアドバイスを行います'
    ];
  };

  // スキップ機能
  const handleSkip = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      analyzeResponses(answers);
    }
  };

  // 初期化
  useEffect(() => {
    if (isOpen && userProfile) {
      generateQuestions();
      setCurrentQuestion(0);
      // 過去の回答がある場合は保持
      if (!userProfile.interviewAnswers || userProfile.interviewAnswers.length === 0) {
        setAnswers([]);
      }
      setCurrentAnswer('');
      setInsights([]);
      setShowAnswerHistory(false);
    }
  }, [isOpen, userProfile, generateQuestions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🎤 AIヒアリング</h2>
            <p className="text-gray-600">より良いコーチングのための詳細情報収集</p>
          </div>
          <div className="flex items-center space-x-2">
            {answers.length > 0 && (
              <button
                onClick={() => setShowAnswerHistory(!showAnswerHistory)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
              >
                📋 過去の質問・回答一覧 ({answers.length})
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* 回答履歴表示 */}
        {showAnswerHistory && answers.length > 0 && (
          <div className="mb-6 bg-gray-50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-4">📝 過去の質問・回答一覧（編集可能）</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {answers.map((answer, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Q{index + 1}: {answer.question}
                  </div>
                  {editingAnswerIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingAnswerContent}
                        onChange={(e) => setEditingAnswerContent(e.target.value)}
                        className="w-full p-2 border rounded text-[#0E2841]"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={saveEditedAnswer}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingAnswerIndex(null)}
                          className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-gray-600 flex-1">{answer.answer}</div>
                      <button
                        onClick={() => handleEditAnswer(index)}
                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                      >
                        ✏️ 編集
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 質問生成中 */}
        {isGeneratingQuestions && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AIが質問を準備中...</h3>
            <p className="text-gray-600">あなたのベースカルテに基づいて最適な質問を生成しています</p>
            <div className="mt-4 flex justify-center">
              <div className="w-32 bg-gray-200 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">最大30秒でご用意します</p>
          </div>
        )}

        {/* 分析中 */}
        {isAnalyzing && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">回答を分析中...</h3>
            <p className="text-gray-600">あなたの回答からインサイトを抽出しています</p>
          </div>
        )}

        {/* 分析結果表示 */}
        {insights.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ヒアリング完了！</h3>
              <p className="text-gray-600">以下のインサイトが得られました</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4">💡 分析結果</h4>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 font-semibold"
              >
                🚀 コーチングを開始する
              </button>
            </div>
          </div>
        )}

        {/* 質問表示 */}
        {questions.length > 0 && currentQuestion < questions.length && !isAnalyzing && insights.length === 0 && (
          <div className="space-y-6">
            {/* プログレス */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>質問 {currentQuestion + 1} / {questions.length}</span>
                <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% 完了</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 質問カード */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">❓</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {questions[currentQuestion].question}
                  </h3>
                  <p className="text-sm text-gray-600 bg-white bg-opacity-70 rounded-lg p-3">
                    💡 {questions[currentQuestion].context}
                  </p>
                </div>
              </div>
            </div>

            {/* 回答入力 */}
            <div className="space-y-4">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="できるだけ具体的にお答えください..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-[#0E2841]"
                rows={4}
              />
              
              <div className="flex justify-between space-x-3">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  ⏭️ スキップ
                </button>
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  className="px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {currentQuestion < questions.length - 1 ? '次へ →' : '完了 ✅'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function HomeComponent() {
  // State管理
  const [conversation, setConversation] = useState<Message[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<CoachId>('tanaka');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const { user, signOut } = useAuth();

  // 画面遷移管理用のState
  const [currentPage, setCurrentPage] = useState<'home' | 'session' | 'projects'>('home');
  const [selectedCoachForSession, setSelectedCoachForSession] = useState<CoachId>('tanaka');

  // プロジェクトカルテ関連のState
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectSelectionModal, setShowProjectSelectionModal] = useState(false);
  const [showSelectedProjectsModal, setShowSelectedProjectsModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'session'>('home');
  const [aiAutoUpdateEnabled, setAiAutoUpdateEnabled] = useState(true);

  // マイページ機能用のState
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord>({
    userProfile: null,
    sessions: [],
    totalSessions: 0,
    favoriteCoach: null,
    achievements: [],
    currentGoals: []
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showMedicalRecord, setShowMedicalRecord] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
  const [hasInitialMessage, setHasInitialMessage] = useState(false);

  // Rate Limit関連のState
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // クライアントサイドでの初期化
  useEffect(() => {
    // ローカルストレージからデータを読み込む
    const loadMedicalRecord = (): MedicalRecord => {
      try {
        // ブラウザ環境かどうかを確認
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          const saved = localStorage.getItem('buddyai-medical-record');
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.sessions = parsed.sessions.map((session: any) => ({
              ...session,
              date: new Date(session.date)
            }));
            if (parsed.userProfile?.createdAt) {
              parsed.userProfile.createdAt = new Date(parsed.userProfile.createdAt);
              parsed.userProfile.updatedAt = new Date(parsed.userProfile.updatedAt);
              if (parsed.userProfile.interviewCompletedAt) {
                parsed.userProfile.interviewCompletedAt = new Date(parsed.userProfile.interviewCompletedAt);
              }
            }
            return parsed;
          }
        }
      } catch (error) {
        console.error('マイページ読み込みエラー:', error);
      }
      
      return {
        userProfile: null,
        sessions: [],
        totalSessions: 0,
        favoriteCoach: null,
        achievements: [],
        currentGoals: []
      };
    };

    const savedRecord = loadMedicalRecord();
    setMedicalRecord(savedRecord);
    
    // プロジェクト一覧を取得
    fetchProjects();
  }, []);

  // プロジェクト一覧取得
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'user-id': 'test-user-id' // TODO: 実際のユーザーIDを使用
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
    }
  };

  // Rate Limitカウントダウン用のuseEffect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRateLimited && rateLimitResetTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((rateLimitResetTime - now) / 1000));
        
        setRateLimitCountdown(remaining);
        
        if (remaining <= 0) {
          setIsRateLimited(false);
          setRateLimitResetTime(null);
          setRateLimitCountdown(null);
          setErrorMessage('');
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRateLimited, rateLimitResetTime]);

  // ローカルストレージ管理
  const saveMedicalRecord = (record: MedicalRecord) => {
    try {
      // ブラウザ環境かどうかを確認
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.setItem('buddyai-medical-record', JSON.stringify(record));
      }
    } catch (error) {
      console.error('マイページ保存エラー:', error);
    }
  };

  // セッション開始時の処理（プロジェクトカルテ統合版）
  const handleStartSession = async (projectIds: string[], action: 'existing' | 'new' | 'none') => {
    if (action === 'new') {
      // 新規プロジェクト作成モーダルを開く
      setShowProjectModal(true);
      return;
    }

    // セッションを開始
    const newSessionId = `session_${Date.now()}`;
    
    // プロジェクトとセッションを紐付け
    if (action === 'existing' && projectIds.length > 0) {
      for (const projectId of projectIds) {
        await fetch('/api/session-projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: newSessionId,
            project_id: projectId,
            is_primary: projectIds[0] === projectId // 最初のプロジェクトを主とする
          })
        });
      }
      
      // 選択されたプロジェクト情報を状態に保存
      setSelectedProjects(projectIds);
    }

    // セッション画面に遷移
    setCurrentScreen('session');
    setSessionId(newSessionId);
    setCurrentPage('session');
    setConversation([]);
    setHasInitialMessage(false);
    setCurrentSessionStart(null);
    setTimeout(() => showInitialMessage(), 100);
  };

  // 企業と個人のマッチ度計算
  const calculateCompanyPersonalMatch = (organizationCulture: string[], personalValues: string[]): number => {
    if (!organizationCulture || !personalValues || organizationCulture.length === 0 || personalValues.length === 0) {
      return 50; // デフォルト値
    }

    // 組織文化と個人価値観のマッチングロジック
    const cultureValueMapping: { [key: string]: string[] } = {
      '年功序列が強い': ['stability', 'tradition', 'responsibility'],
      'フラットな組織': ['autonomy', 'flexibility', 'communication'],
      '実力主義': ['achievement', 'competition', 'recognition'],
      '体育会系': ['teamwork', 'competition', 'challenge'],
      'トップダウン': ['responsibility', 'leadership', 'efficiency'],
      'ボトムアップ': ['autonomy', 'creativity', 'diversity'],
      '稟議制が中心': ['stability', 'detail', 'ethics'],
      '迅速な意思決定': ['speed', 'flexibility', 'efficiency'],
      'チームワーク重視': ['teamwork', 'relationship', 'service'],
      '個人成果重視': ['achievement', 'autonomy', 'recognition'],
      '安定志向': ['stability', 'tradition', 'balance'],
      'チャレンジ志向': ['challenge', 'innovation', 'growth'],
      '伝統的な文化': ['tradition', 'responsibility', 'stability'],
      '革新的な文化': ['innovation', 'creativity', 'challenge']
    };

    let matchPoints = 0;
    let totalPoints = 0;

    organizationCulture.forEach(culture => {
      const relatedValues = cultureValueMapping[culture] || [];
      relatedValues.forEach(value => {
        totalPoints += 1;
        if (personalValues.includes(value)) {
          matchPoints += 1;
        }
      });
    });

    // 基本マッチ度 + ボーナス計算
    const baseMatch = totalPoints > 0 ? (matchPoints / totalPoints) * 70 : 50;
    
    // 価値観の多様性ボーナス（3つ以上選択で+10）
    const diversityBonus = personalValues.length >= 3 ? 10 : 0;
    
    // 特定の価値観組み合わせボーナス
    let combinationBonus = 0;
    if (personalValues.includes('teamwork') && personalValues.includes('leadership')) combinationBonus += 5;
    if (personalValues.includes('growth') && personalValues.includes('challenge')) combinationBonus += 5;
    if (personalValues.includes('efficiency') && personalValues.includes('quality')) combinationBonus += 5;

    return Math.min(100, Math.round(baseMatch + diversityBonus + combinationBonus));
  };

  // プロフィール管理関数
  const saveUserProfile = (profileData: Partial<EnhancedUserProfile>) => {
    const calculatedMatch = calculateCompanyPersonalMatch(
      profileData.organizationCulture || [],
      profileData.personalValues || []
    );

    const newProfile: EnhancedUserProfile = {
      name: profileData.name || '',
      company: profileData.company || '',
      position: profileData.position || '',
      department: profileData.department || '',
      industry: profileData.industry || 'manufacturer',
      industryDetail: profileData.industryDetail || '',
      companySize: profileData.companySize || '51-200',
      businessType: profileData.businessType || '',
      organizationCulture: profileData.organizationCulture || [],
      dailyTasks: profileData.dailyTasks || [],
      mainChallenges: profileData.mainChallenges || [],
      goals: profileData.goals || [],
      personalValues: profileData.personalValues || [],
      companyPersonalMatch: calculatedMatch,
      preferredCoach: profileData.preferredCoach || selectedCoach,
      profileCompleteness: profileData.profileCompleteness || 0,
      joinDate: profileData.joinDate || '',
      jobDescription: profileData.jobDescription || '',
      industrySelectionMethod: profileData.industrySelectionMethod || 'classification',
      customOrganizationCulture: profileData.customOrganizationCulture || [],
      selectedJobCategories: profileData.selectedJobCategories || [],
      jobCategoryDetails: profileData.jobCategoryDetails || {},
      customJobCategories: profileData.customJobCategories || [],
      customPersonalValues: profileData.customPersonalValues || [],
      interviewCompletedAt: profileData.interviewCompletedAt,
      interviewInsights: profileData.interviewInsights,
      interviewAnswers: profileData.interviewAnswers,
      createdAt: medicalRecord.userProfile?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    const updatedRecord = {
      ...medicalRecord,
      userProfile: newProfile
    };
    
    setMedicalRecord(updatedRecord);
    saveMedicalRecord(updatedRecord);
    console.log('✅ 拡張プロフィール保存完了:', newProfile);
  };

  // AIヒアリング完了処理
  const handleInterviewComplete = (insights: string[], answers: any[]) => {
    if (!medicalRecord.userProfile) return;
    
    const updatedProfile = {
      ...medicalRecord.userProfile,
      interviewInsights: insights,
      interviewAnswers: answers,
      interviewCompletedAt: new Date(),
      profileCompleteness: Math.min(100, (medicalRecord.userProfile.profileCompleteness || 0) + (answers.length * 2))
    };
    
    const updatedRecord = {
      ...medicalRecord,
      userProfile: updatedProfile
    };
    
    setMedicalRecord(updatedRecord);
    saveMedicalRecord(updatedRecord);
    setShowInterview(false);
    
    console.log('✅ AIヒアリング結果統合完了:', insights.length, 'insights,', answers.length, 'answers');
  };

  // OpenAI API呼び出し関数
  const getAIResponseParallel = async (messages: Message[], coachId: CoachId) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          mode: coachId,
          userProfile: medicalRecord.userProfile,
          industryInsights: medicalRecord.userProfile ? industryMaster[medicalRecord.userProfile.industry]?.insights : null,
          selectedProjects: selectedProjects,
          sessionId: sessionId
        }),
      });
      
      if (response.status === 429) {
        const errorData = await response.json();
        
        if (errorData.rateLimitExceeded) {
          const resetHeader = response.headers.get('X-RateLimit-Reset');
          const resetTime = resetHeader ? parseInt(resetHeader) * 1000 : Date.now() + 10 * 60 * 1000;
          
          setIsRateLimited(true);
          setRateLimitResetTime(resetTime);
          setErrorMessage('');
          
          throw new Error('RATE_LIMIT_EXCEEDED');
        } else {
          throw new Error('AI_SERVICE_BUSY');
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.content || data.choices?.[0]?.message?.content;
      
      return aiContent;
    } catch (error: any) {
      console.error('💥 Error calling OpenAI API:', error);
      throw error;
    }
  };

  // セッション記録関数
  const startSession = () => {
    setCurrentSessionStart(new Date());
    setErrorMessage('');
  };

  const calculateFavoriteCoach = (sessions: SessionRecord[]): CoachId => {
    if (sessions.length === 0) return 'tanaka';
    
    const coachCounts = sessions.reduce((acc, session) => {
      acc[session.coachId] = (acc[session.coachId] || 0) + 1;
      return acc;
    }, {} as Record<CoachId, number>);
    
    return Object.entries(coachCounts).reduce((a, b) => 
      coachCounts[a[0] as CoachId] > coachCounts[b[0] as CoachId] ? a : b
    )[0] as CoachId;
  };

  // 初回メッセージ表示関数
  const showInitialMessage = () => {
    if (hasInitialMessage) return;
    
    const initialMessage: Message = {
      role: 'assistant',
      content: presetCoaches[selectedCoach].initialMessage,
      timestamp: new Date()
    };
    
    setConversation([initialMessage]);
    setHasInitialMessage(true);
    
    if (!currentSessionStart) {
      startSession();
    }
  };

  // セッション更新関数
  const updateCurrentSession = (messageCount: number, topics: string[]) => {
    if (!currentSessionStart) return;
    
    const currentTime = new Date();
    const duration = Math.round((currentTime.getTime() - currentSessionStart.getTime()) / (1000 * 60));
    
    const updatedSession: SessionRecord = {
      id: currentSessionStart.getTime().toString(),
      date: currentSessionStart,
      coachId: selectedCoach,
      duration: Math.max(1, duration),
      messageCount,
      topics,
      summary: `${presetCoaches[selectedCoach].name}とのセッション（${messageCount}メッセージ）`,
      satisfaction: 0,
      nextActions: []
    };
    
    setMedicalRecord(prev => {
      const existingIndex = prev.sessions.findIndex(s => s.id === updatedSession.id);
      let newSessions;
      
      if (existingIndex >= 0) {
        newSessions = [...prev.sessions];
        newSessions[existingIndex] = updatedSession;
      } else {
        newSessions = [...prev.sessions, updatedSession];
      }
      
      const newRecord = {
        ...prev,
        sessions: newSessions,
        totalSessions: newSessions.length,
        favoriteCoach: calculateFavoriteCoach(newSessions)
      };
      
      saveMedicalRecord(newRecord);
      return newRecord;
    });
  };

  // 会話処理関数
  const processConversation = async (newMessage: Message) => {
    if (isRateLimited) return;
    
    if (!currentSessionStart) {
      startSession();
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const updatedConversation = [...conversation, newMessage];
      setConversation(updatedConversation);
      
      const aiResponse = await getAIResponseParallel(updatedConversation, selectedCoach);
      
      if (aiResponse && aiResponse.trim()) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };
        
        setConversation(prev => {
          const newConv = [...prev, assistantMessage];
          
          if (currentSessionStart) {
            const messageCount = newConv.length;
            const topics = newConv
              .filter(msg => msg.role === 'user')
              .map(msg => msg.content.substring(0, 50))
              .slice(-3);
            
            updateCurrentSession(messageCount, topics);
          }
          
          return newConv;
        });
        
        // プロジェクトカルテのAI自動更新
        if (aiAutoUpdateEnabled && selectedProjects.length > 0) {
          selectedProjects.forEach(async (projectId) => {
            await fetch(`/api/projects/${projectId}/ai-update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                conversation: updatedConversation.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                sessionId: sessionId
              })
            });
          });
        }
      } else {
        setErrorMessage('すみません、もう一度お話しいただけますか？');
      }
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        // 既に処理済み
      } else if (error.message === 'AI_SERVICE_BUSY') {
        setErrorMessage('AIサービスが混雑しています。少し時間をおいて再度お試しください。');
      } else {
        setErrorMessage('すみません、もう一度お話しいただけますか？');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 音声認識機能
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.status === 429) {
        const errorData = await response.json();
        
        if (errorData.rateLimitExceeded) {
          const resetHeader = response.headers.get('X-RateLimit-Reset');
          const resetTime = resetHeader ? parseInt(resetHeader) * 1000 : Date.now() + 10 * 60 * 1000;
          
          setIsRateLimited(true);
          setRateLimitResetTime(resetTime);
          setErrorMessage('');
          
          return 'RATE_LIMIT_EXCEEDED';
        } else {
          return '音声認識サービスが混雑しています。少し時間をおいて再度お試しください。';
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.text || 'テキストを認識できませんでした。';
    } catch (error) {
      console.error('音声認識エラー:', error);
      return 'テキストを認識できませんでした。';
    }
  };

  // 録音機能
  const startRecording = async () => {
    if (isRateLimited) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const transcribedText = await transcribeAudio(audioBlob);
        
        if (transcribedText === 'RATE_LIMIT_EXCEEDED') {
          // 既に処理済み
        } else if (transcribedText && transcribedText !== 'テキストを認識できませんでした。') {
          const newMessage: Message = {
            role: 'user',
            content: transcribedText,
            timestamp: new Date(),
          };
          await processConversation(newMessage);
        } else {
          setErrorMessage('音声を認識できませんでした。もう一度お試しください。');
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
      setErrorMessage('マイクへのアクセスが許可されていません。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // メッセージ送信
  const sendTextMessage = async () => {
    if (!textInput.trim() && !attachedFile) return;
    if (isRateLimited) return;

    const newMessage: Message = {
      role: 'user',
      content: textInput.trim(),
      timestamp: new Date(),
      attachment: attachedFile || undefined,
    };

    setTextInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    await processConversation(newMessage);
  };

  // ファイル添付
  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  // メッセージ編集
  const startEditingMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditingContent(conversation[index].content);
  };

  const saveEditedMessage = () => {
    if (editingMessageIndex !== null) {
      const updatedConversation = [...conversation];
      updatedConversation[editingMessageIndex].content = editingContent;
      setConversation(updatedConversation);
      setEditingMessageIndex(null);
      setEditingContent('');
    }
  };

  const cancelEditing = () => {
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  // 初回メッセージの表示（セッション画面でのみ）
  useEffect(() => {
    if (currentPage === 'session' && !hasInitialMessage && conversation.length === 0) {
      showInitialMessage();
    }
  }, [selectedCoach, hasInitialMessage, conversation.length, currentPage]);

  // プロジェクト削除
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('このプロジェクトを削除してもよろしいですか？')) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'user-id': 'test-user-id' // TODO: 実際のユーザーIDを使用
        }
      });
      
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('プロジェクト削除エラー:', error);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        background: 'linear-gradient(135deg, #FDFEF0 0%, #F8F6F0 25%, #F0EBE5 50%, #E8DFD8 75%, #CCBEB8 100%)'
      }}
      suppressHydrationWarning={true}
    >
      {currentPage === 'home' ? (
        // 🎨 トップページ
        <>
          {/* 固定ヘッダー */}
          <header className="fixed top-0 left-0 right-0 bg-white bg-opacity-90 backdrop-blur-md shadow-sm border-b z-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {/* ロゴ */}
                  <img 
                    src="/logo-buddyai-for-biz.png" 
                    alt="Buddy AI for Biz" 
                    className="h-16 w-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  {/* ロゴ読み込み失敗時のフォールバック */}
                  <div className="hidden flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">Buddy AI for Biz</h1>
                      <p className="text-gray-600 text-sm">Your AI Business Coach</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {user && (
                    <div className="text-right text-gray-800">
                      <div className="font-semibold">
                        {medicalRecord.userProfile?.name || user.user_metadata?.name || 'ユーザー'}さん
                      </div>
                      {medicalRecord.userProfile && (
                        <>
                          <div className="text-sm text-gray-600">
                            {medicalRecord.userProfile.company || '会社未設定'} | {industryMaster[medicalRecord.userProfile.industry]?.label || '業界未設定'}
                          </div>
                          {/* プロフィール完成度表示 */}
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${medicalRecord.userProfile.profileCompleteness || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{medicalRecord.userProfile.profileCompleteness || 0}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setShowProfile(true)}
                    className="bg-white bg-opacity-80 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-90 transition-all border border-gray-200 shadow-sm"
                  >
                    🏢 ベースカルテ
                  </button>
                  <button
                    onClick={() => setCurrentPage('projects')}
                    className="bg-white bg-opacity-80 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-90 transition-all border border-gray-200 shadow-sm"
                  >
                    📁 プロジェクトカルテ
                  </button>
                  {/* AIヒアリングボタン */}
                  {medicalRecord.userProfile && (medicalRecord.userProfile.profileCompleteness || 0) >= 60 && (
                    <button
                      onClick={() => setShowInterview(true)}
                      className={`px-4 py-2 rounded-lg transition-all border shadow-sm ${
                        medicalRecord.userProfile.interviewCompletedAt
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse'
                      }`}
                    >
                      🎤 {medicalRecord.userProfile.interviewCompletedAt ? 'ヒアリング済み' : 'AIヒアリング'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowMedicalRecord(true)}
                    className="bg-white bg-opacity-80 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-90 transition-all border border-gray-200 shadow-sm"
                  >
                    📋 マイページ
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('ログアウトしますか？')) {
                        await signOut()
                      }
                    }}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-all border border-red-200 shadow-sm"
                  >
                    🚪 ログアウト
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* メインコンテンツ */}
          <div className="pt-20">
            {/* GIFアニメーション表示エリア */}
            <div className="w-full pb-8 bg-white bg-opacity-30">
              <img 
                src="/hero-animation.gif" 
                alt="Hero Animation" 
                className="w-[90%] h-auto mx-auto shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              {/* GIF読み込み失敗時のフォールバック */}
              <div className="hidden">
                <div className="w-[90%] h-64 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center mx-auto">
                  <span className="text-white text-2xl font-bold">🚀 AI Powered Business Coaching</span>
                </div>
              </div>
            </div>

            {/* メインヒーローコンテンツ */}
            <div className="relative min-h-screen overflow-hidden">
              <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
                <div className="text-center">
                  <div className="inline-flex items-center bg-white bg-opacity-70 backdrop-blur-sm rounded-full px-6 py-2 text-gray-800 text-sm font-medium mb-8 border border-gray-200 shadow-sm">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    AI-Powered Business Coaching
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                    あなた専属の
                    <span 
                      className="block"
                      style={{
                        background: 'linear-gradient(90deg, #DB0A3C 0%, #643498 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      AIコーチ陣
                    </span>
                    がビジネスを変革
                  </h1>
                  
                  <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
                    専門AIコーチが、あなたのビジネス課題を解決。戦略からメンタルケアまで、
                    <br />包括的なサポートで成果を最大化させます。
                  </p>

                  <div className="flex flex-col items-center space-y-8">
                    <button
                      onClick={() => setShowProjectSelectionModal(true)}
                      className="group relative px-8 py-4 text-white text-lg font-semibold rounded-2xl transition-all transform hover:scale-105 shadow-xl"
                      style={{
                        background: 'linear-gradient(135deg, #DB0A3C 0%, #643498 100%)'
                      }}
                    >
                      <span className="relative z-10">🚀 今すぐ無料で始める</span>
                    </button>
                    
                    <div className="flex space-x-8 text-gray-800">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-500">{medicalRecord.totalSessions}</div>
                        <div className="text-sm text-gray-600">総セッション数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-500">
                          {Math.round(medicalRecord.sessions.reduce((acc, s) => acc + s.duration, 0) / Math.max(1, medicalRecord.sessions.length)) || 0}分
                        </div>
                        <div className="text-sm text-gray-600">平均セッション時間</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-500">4</div>
                        <div className="text-sm text-gray-600">コーチオプション</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* コーチ紹介セクション */}
            <div className="bg-white bg-opacity-60 backdrop-blur-sm py-20">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">あなた専属のAIコーチ陣</h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    専門分野を持つAIコーチから選択、またはオリジナルコーチを作成できます
                  </p>
                  
                  {/* プロフィール完成度による案内 */}
                  {medicalRecord.userProfile && (medicalRecord.userProfile.profileCompleteness || 0) < 60 && (
                    <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex items-center justify-center space-x-3">
                        <span className="text-2xl">⚡</span>
                        <div>
                          <p className="text-orange-800 font-semibold">より良いコーチングのために</p>
                          <p className="text-orange-700 text-sm">ベースカルテを詳しく設定すると、あなたに最適化されたアドバイスが受けられます</p>
                        </div>
                        <button
                          onClick={() => setShowProfile(true)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
                        >
                          設定する
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* AIヒアリング案内 */}
                  {medicalRecord.userProfile && 
                   (medicalRecord.userProfile.profileCompleteness || 0) >= 60 && 
                   !medicalRecord.userProfile.interviewCompletedAt && (
                    <div className="mt-6 max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-center space-x-3">
                        <span className="text-2xl">🎤</span>
                        <div>
                          <p className="text-blue-800 font-semibold">AIヒアリングで更なる最適化</p>
                          <p className="text-blue-700 text-sm">数問の追加質問で、より深いインサイトとパーソナライズドコーチングを実現</p>
                        </div>
                        <button
                          onClick={() => setShowInterview(true)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        >
                          開始する
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto pb-6">
                  <div className="flex space-x-6 min-w-max px-4">
                    {Object.entries(presetCoaches).map(([key, coach]) => (
                      <div
                        key={key}
                        className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer border-2 w-80 flex-shrink-0 ${
                          selectedCoachForSession === key 
                            ? 'border-orange-400 ring-4 ring-orange-100 shadow-2xl' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCoachForSession(key as CoachId)}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${coach.color} opacity-5 rounded-3xl`}></div>
                        
                        <div className="relative z-10 text-center">
                          <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${coach.color} rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                            <span className="text-3xl">{coach.avatar}</span>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{coach.name}</h3>
                          <p className="text-sm font-semibold text-gray-600 mb-4">{coach.title}</p>
                          
                          <div className="text-xs text-gray-500 mb-4 leading-relaxed">
                            {coach.specialty}
                          </div>
                          
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {coach.description}
                          </p>
                          
                          {selectedCoachForSession === key && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* カスタムコーチカード */}
                    <div className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer border-2 border-dashed border-gray-300 hover:border-orange-400 w-80 flex-shrink-0">
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                        PREMIUM
                      </div>
                      
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg relative overflow-hidden">
                          <span className="text-3xl">⚙️</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">カスタムコーチ</h3>
                        <p className="text-sm font-semibold text-orange-600 mb-4">オリジナル作成</p>
                        
                        <div className="text-xs text-gray-500 mb-4 leading-relaxed space-y-1">
                          <div>✨ 完全カスタマイズ可能</div>
                          <div>🎯 専門分野を自由設定</div>
                          <div>🗣️ 話し方・性格を調整</div>
                          <div>📚 独自知識ベース対応</div>
                        </div>
                        
                        <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-md">
                          🚀 プレミアムにアップグレード
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-12">
                  <button
                    onClick={() => {
                      setSelectedCoach(selectedCoachForSession);
                      setShowProjectSelectionModal(true);
                    }}
                    className="group relative px-10 py-4 text-white text-lg font-semibold rounded-2xl hover:shadow-xl transition-all transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #DB0A3C 0%, #643498 100%)'
                    }}
                  >
                    <span className="relative z-10">
                      🚀 {presetCoaches[selectedCoachForSession].name}とセッション開始
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ダッシュボード */}
            <div className="bg-gradient-to-br from-gray-50 to-white py-20">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">あなたの成長データ</h2>
                  <p className="text-xl text-gray-600">AIコーチングの効果を数値で確認できます</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform shadow-lg">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold text-orange-600 mb-2">{medicalRecord.totalSessions}</div>
                    <div className="text-orange-800 font-semibold">総セッション数</div>
                  </div>

                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform shadow-lg">
                    <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold text-pink-600 mb-2">
                      {medicalRecord.favoriteCoach ? presetCoaches[medicalRecord.favoriteCoach].name.split(' ')[0] : '未設定'}
                    </div>
                    <div className="text-pink-800 font-semibold">お気に入りコーチ</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 text-center transform hover:scale-105 transition-transform shadow-lg">
                    <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {Math.round(medicalRecord.sessions.reduce((acc, s) => acc + s.duration, 0) / Math.max(1, medicalRecord.sessions.length)) || 0}分
                    </div>
                    <div className="text-purple-800 font-semibold">平均セッション時間</div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-lg">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900">🕒 最近のセッション</h3>
                    <button
                      onClick={() => setShowMedicalRecord(true)}
                      className="px-6 py-3 text-white rounded-xl transition-colors font-semibold shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, #DB0A3C 0%, #643498 100%)'
                      }}
                    >
                      すべて見る
                    </button>
                  </div>
                  
                  {medicalRecord.sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-lg">まだセッション履歴がありません</p>
                      <p className="text-gray-400 text-sm mt-2">最初のAIコーチングセッションを始めましょう！</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {medicalRecord.sessions.slice().reverse().slice(0, 6).map((session) => (
                        <div key={session.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className={`w-10 h-10 ${presetCoaches[session.coachId].color} rounded-xl flex items-center justify-center`}>
                              <span className="text-lg">{presetCoaches[session.coachId].avatar}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{presetCoaches[session.coachId].name}</div>
                              <div className="text-sm text-gray-500">
                                {session.date.toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{session.duration}分</span>
                            <span>{session.messageCount}メッセージ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* フッターCTA */}
            <div 
              className="py-20"
              style={{
                background: 'linear-gradient(135deg, #DB0A3C 0%, #643498 100%)'
              }}
            >
              <div className="max-w-4xl mx-auto text-center px-4">
                <h2 className="text-4xl font-bold text-white mb-4">
                  今すぐAIコーチングを体験
                </h2>
                <p className="text-xl text-pink-100 mb-8">
                  あなたのビジネス課題を、専門AIコーチと一緒に解決しませんか？
                </p>
                <button
                  onClick={() => {
                    setSelectedCoach(selectedCoachForSession);
                    setShowProjectSelectionModal(true);
                  }}
                  className="px-10 py-4 bg-white text-pink-600 text-lg font-bold rounded-2xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                >
                  🚀 {presetCoaches[selectedCoachForSession].name}とセッション開始
                </button>
              </div>
            </div>
          </div>
        </>
      ) : currentPage === 'projects' ? (
        // プロジェクトカルテ一覧画面
        <>
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage('home')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    ← ホームに戻る
                  </button>
                  <h1 className="text-2xl font-bold text-gray-800">📁 プロジェクトカルテ管理</h1>
                </div>
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setShowProjectModal(true);
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                >
                  ＋ 新規プロジェクト作成
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 py-8">
            <ProjectList 
              projects={projects}
              onEdit={(project) => {
                setEditingProject(project);
                setShowProjectModal(true);
              }}
              onDelete={handleDeleteProject}
              onStartSession={(projectId) => {
                handleStartSession([projectId], 'existing');
              }}
            />
          </div>
        </>
      ) : (
        // セッション画面
        <>
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentPage('home')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    ← ホームに戻る
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      {presetCoaches[selectedCoach].avatar} {presetCoaches[selectedCoach].name}
                    </h1>
                    <p className="text-gray-600 text-sm">{presetCoaches[selectedCoach].title}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowProfile(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    🏢 ベースカルテ
                  </button>
                  {selectedProjects.length > 0 && (
                    <button
                      onClick={() => setShowSelectedProjectsModal(true)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      📁 選択中プロジェクトカルテ
                    </button>
                  )}
                  <button
                    onClick={() => setShowMedicalRecord(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    📋 マイページ
                  </button>
                </div>
              </div>
              {selectedProjects.length > 0 && (
                <div className="mt-4">
                  <ProjectInfoDisplay 
                    projectIds={selectedProjects}
                    aiAutoUpdateEnabled={aiAutoUpdateEnabled}
                    onToggleAIUpdate={() => setAiAutoUpdateEnabled(!aiAutoUpdateEnabled)}
                  />
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 overflow-y-auto">
            {isRateLimited && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <div className="font-semibold">利用制限に達しました</div>
                    <div className="text-sm">
                      {rateLimitCountdown !== null ? (
                        <>あと {Math.floor(rateLimitCountdown / 60)}分{rateLimitCountdown % 60}秒で利用可能になります</>
                      ) : (
                        '10分後に再度お試しください'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-800 shadow-sm border'
                    }`}
                  >
                    {editingMessageIndex === index ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full p-2 border rounded text-[#0E2841]"
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEditedMessage}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        {message.attachment && (
                          <div className="text-xs mt-2 opacity-75">
                            📎 {message.attachment.name}
                          </div>
                        )}
                        {message.role === 'user' && (
                          <button
                            onClick={() => startEditingMessage(index)}
                            className="absolute top-0 right-0 -mt-2 -mr-2 bg-gray-600 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✏️
                          </button>
                        )}
                      </>
                    )}
                    <div className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-sm border px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span>考え中...</span>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && !isRateLimited && (
                <div className="text-center text-red-500 text-sm">{errorMessage}</div>
              )}
            </div>
          </div>

          <div className="bg-white border-t">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttachment}
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isRateLimited}
                      className={`p-2 transition-colors ${
                        isRateLimited 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="ファイル添付"
                    >
                      📎
                    </button>
                    {attachedFile && (
                      <span className="text-sm text-gray-600">
                        {attachedFile.name}
                        <button
                          onClick={() => setAttachedFile(null)}
                          disabled={isRateLimited}
                          className={`ml-2 ${
                            isRateLimited 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-red-500 hover:text-red-700'
                          }`}
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isRateLimited) {
                        e.preventDefault();
                        sendTextMessage();
                      }
                    }}
                    placeholder={isRateLimited ? "利用制限中です..." : "メッセージを入力してください..."}
                    className={`w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#0E2841] ${
                      isRateLimited ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    rows={3}
                    disabled={isLoading || isRateLimited}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={sendTextMessage}
                    disabled={isLoading || (!textInput.trim() && !attachedFile) || isRateLimited}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isRateLimited
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    送信
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading || isRateLimited}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isRateLimited
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-gray-500 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {isRecording ? '🔴 停止' : '🎤 録音'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* プロジェクト選択モーダル */}
      <ProjectSelectionModal
        isOpen={showProjectSelectionModal}
        onClose={() => setShowProjectSelectionModal(false)}
        projects={projects}
        onStartSession={handleStartSession}
      />

      {/* 選択中プロジェクトカルテモーダル */}
      <SelectedProjectsModal
        isOpen={showSelectedProjectsModal}
        onClose={() => setShowSelectedProjectsModal(false)}
        projectIds={selectedProjects}
        projects={projects}
        onEdit={(project) => {
          setEditingProject(project);
          setShowProjectModal(true);
          setShowSelectedProjectsModal(false);
        }}
      />

      {/* プロジェクト作成/編集モーダル */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={() => {
          fetchProjects();
          setShowProjectModal(false);
          setEditingProject(null);
        }}
      />

      {/* 拡張プロフィールモーダル */}
      <EnhancedProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        currentProfile={medicalRecord.userProfile}
        onSave={saveUserProfile}
        user={user}  // 追加
      />

      {/* AIヒアリングモーダル */}
      {medicalRecord.userProfile && (
        <AIInterviewModal
          isOpen={showInterview}
          onClose={() => setShowInterview(false)}
          userProfile={medicalRecord.userProfile}
          onComplete={handleInterviewComplete}
        />
      )}

      {showMedicalRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📋 あなたのマイページ</h2>
              <button 
                onClick={() => setShowMedicalRecord(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            {medicalRecord.userProfile && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">🏢 ベースカルテ</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>お名前:</strong> {medicalRecord.userProfile.name}</div>
                  <div><strong>会社:</strong> {medicalRecord.userProfile.company}</div>
                  <div><strong>役職:</strong> {medicalRecord.userProfile.position}</div>
                  <div><strong>部署:</strong> {medicalRecord.userProfile.department}</div>
                  <div><strong>業界:</strong> {industryMaster[medicalRecord.userProfile.industry]?.label}</div>
                  <div><strong>規模:</strong> {companySizeMaster[medicalRecord.userProfile.companySize]?.label}</div>
                </div>
                
                {medicalRecord.userProfile.interviewCompletedAt && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-600">🎤</span>
                      <strong className="text-blue-800">AIヒアリング完了</strong>
                      <span className="text-xs text-blue-600">
                        {medicalRecord.userProfile.interviewCompletedAt.toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    {medicalRecord.userProfile.interviewInsights && medicalRecord.userProfile.interviewInsights.length > 0 && (
                      <div className="text-sm text-blue-700">
                        <strong>取得インサイト:</strong> {medicalRecord.userProfile.interviewInsights.length}項目
                      </div>
                    )}
                  </div>
                )}
                
                {medicalRecord.userProfile.organizationCulture && medicalRecord.userProfile.organizationCulture.length > 0 && (
                  <div className="mt-3">
                    <strong>組織文化:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {medicalRecord.userProfile.organizationCulture.map((culture, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {culture}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {medicalRecord.userProfile.personalValues && medicalRecord.userProfile.personalValues.length > 0 && (
                  <div className="mt-3">
                    <strong>個人の価値観:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {medicalRecord.userProfile.personalValues.map((valueId, index) => {
                        const value = personalValuesMaster.find(v => v.id === valueId);
                        return value ? (
                          <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {value.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center space-x-2">
                  <strong>ベースカルテ完成度:</strong>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                      style={{ width: `${medicalRecord.userProfile.profileCompleteness || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{medicalRecord.userProfile.profileCompleteness || 0}%</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{medicalRecord.totalSessions}</div>
                <div className="text-sm text-blue-800">総セッション数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {medicalRecord.favoriteCoach ? presetCoaches[medicalRecord.favoriteCoach].name : '未設定'}
                </div>
                <div className="text-sm text-green-800">お気に入りコーチ</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(medicalRecord.sessions.reduce((acc, s) => acc + s.duration, 0) / Math.max(1, medicalRecord.sessions.length))}分
                </div>
                <div className="text-sm text-purple-800">平均セッション時間</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">🕒 セッション履歴</h3>
              {medicalRecord.sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">まだセッション履歴がありません</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {medicalRecord.sessions.slice().reverse().map((session) => (
                    <div key={session.id} className="border p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{presetCoaches[session.coachId].avatar}</span>
                          <div>
                            <div className="font-semibold">{presetCoaches[session.coachId].name}</div>
                            <div className="text-sm text-gray-600">
                              {session.date.toLocaleDateString()} {session.date.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{session.duration}分</div>
                          <div>{session.messageCount}メッセージ</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">{session.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// dynamic importで完全にクライアントサイドでのみレンダリング
const HomeWithAuth = dynamic(() => Promise.resolve(() => (
  <ProtectedRoute>
    <HomeComponent />
  </ProtectedRoute>
)), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  )
});

export default HomeWithAuth;