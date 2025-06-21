'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ProjectModal } from '@/components/ProjectModal';
import { SessionStartModal } from '@/components/SessionStartModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from './providers/AuthProvider';
import { User } from '@supabase/supabase-js';
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
  consultation_category?: string;
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
  session_count?: number;
}

// 拡張UserProfile interface
interface EnhancedUserProfile {
  id?: string;
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
  joinDate?: string;
  jobDescription?: string;
  industrySelectionMethod?: 'free' | 'classification';
  customOrganizationCulture?: string[];
  selectedJobCategories?: string[];
  jobCategoryDetails?: {[key: string]: string};
  customJobCategories?: string[];
  customPersonalValues?: string[];
  
  // 価値観関連の新フィールド
  personalValues?: string[];
  companyPersonalMatch?: number;
  
  // AIヒアリング関連
  interviewCompletedAt?: string;
  interviewInsights?: string[];
  interviewAnswers?: any[];
  
  // メタデータ
  createdAt?: string;
  updatedAt?: string;
  profileCompleteness: number;
}

// セッション記録のインターフェース
interface SessionRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  coach_id: string;
  messages: any[];
  project_ids: string[];
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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [aiAutoUpdateEnabled, setAiAutoUpdateEnabled] = useState(true);

  // ユーザープロフィール関連のState
  const [userProfile, setUserProfile] = useState<EnhancedUserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // セッション関連のState
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionStartModal, setShowSessionStartModal] = useState(false);
  const [currentProjectForSession, setCurrentProjectForSession] = useState<Project | null>(null);
  const [hasInitialMessage, setHasInitialMessage] = useState(false);

  // Rate Limit関連のState
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 初期データロード
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // ユーザーデータの読み込み
  const loadUserData = async () => {
    if (!user) return;
    
    setIsLoadingProfile(true);
    
    try {
      // プロフィール取得
      const profileRes = await fetch('/api/user-profile');
      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        setUserProfile(profile);
      }

      // プロジェクト一覧取得
      const projectsRes = await fetch('/api/projects');
      if (projectsRes.ok) {
        const { projects } = await projectsRes.json();
        setProjects(projects || []);
      }

      // セッション履歴取得
      const sessionsRes = await fetch('/api/user-sessions');
      if (sessionsRes.ok) {
        const { sessions } = await sessionsRes.json();
        setSessions(sessions || []);
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // プロフィール保存
  const saveUserProfile = async (profileData: Partial<EnhancedUserProfile>) => {
    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const { profile } = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
    }
  };

  // セッション開始時の処理
  const handleStartSession = async (projectIds: string[], action: 'existing' | 'new' | 'none') => {
    if (action === 'new') {
      setShowProjectModal(true);
      return;
    }

    // プロジェクトが選択されている場合
    if (action === 'existing' && projectIds.length > 0) {
      const mainProject = projects.find(p => p.id === projectIds[0]);
      if (mainProject) {
        // セッション回数を取得
        const response = await fetch(`/api/projects/${mainProject.id}/session-count`);
        const { count } = await response.json();
        
        setCurrentProjectForSession(mainProject);
        setSelectedProjects(projectIds);
        
        // セッション開始モーダルを表示
        setShowSessionStartModal(true);
      }
    } else {
      // プロジェクトなしでセッション開始
      startNewSession([], 'none');
    }
  };

  // セッション開始アクションの処理
  const handleSessionStartAction = async (action: 'new' | 'continue') => {
    if (action === 'continue' && selectedProjects.length > 0) {
      // 前回のセッション履歴を取得
      const response = await fetch('/api/sessions/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProjects[0] })
      });
      
      const { lastSession, summary } = await response.json();
      
      if (lastSession && lastSession.messages) {
        // 前回の会話を復元
        const restoredMessages = lastSession.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setConversation(restoredMessages);
        
        // 要約メッセージを追加
        const summaryMessage: Message = {
          role: 'assistant',
          content: `承知しました。前回までのセッション内容を読み込みました。\n\n前回お話した内容は以下です：\n${summary || '前回の会話内容を確認しました。'}`,
          timestamp: new Date()
        };
        setConversation(prev => [...prev, summaryMessage]);
      }
    } else {
      // 新しく相談を始める
      const greetingMessage: Message = {
        role: 'assistant',
        content: '承知しました。是非今回のセッションも最高のものにしていきましょう！今回はどんなご相談ですか？',
        timestamp: new Date()
      };
      setConversation([greetingMessage]);
    }
    
    startNewSession(selectedProjects, 'existing');
  };

  // 新しいセッションを開始
  const startNewSession = async (projectIds: string[], action: string) => {
    const newSessionId = `session_${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setSessionId(newSessionId);
    
    // 新しいセッションをデータベースに作成
    try {
      const sessionData = {
        id: newSessionId,
        coach_id: selectedCoach,
        messages: [],
        project_ids: projectIds
      };
      
      await fetch('/api/user-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
    } catch (error) {
      console.error('セッション作成エラー:', error);
    }
    
    setCurrentPage('session');
    setHasInitialMessage(false);
    
    if (action !== 'existing' || !conversation.length) {
      setTimeout(() => showInitialMessage(), 100);
    }
  };

  // 初回メッセージ表示
  const showInitialMessage = () => {
    if (hasInitialMessage) return;
    
    const initialMessage: Message = {
      role: 'assistant',
      content: presetCoaches[selectedCoach].initialMessage,
      timestamp: new Date()
    };
    
    setConversation([initialMessage]);
    setHasInitialMessage(true);
  };

  // 会話処理関数
  const processConversation = async (newMessage: Message) => {
    if (isRateLimited) return;
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const updatedConversation = [...conversation, newMessage];
      setConversation(updatedConversation);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConversation,
          mode: selectedCoach,
          userProfile: userProfile,
          industryInsights: userProfile ? industryMaster[userProfile.industry]?.insights : null,
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
          return;
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.content || data.choices?.[0]?.message?.content;
      
      if (aiContent && aiContent.trim()) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: aiContent,
          timestamp: new Date(),
        };
        
        const newConversation = [...updatedConversation, assistantMessage];
        setConversation(newConversation);
        
        // セッションを更新
        if (currentSessionId) {
          await updateSession(newConversation);
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage('すみません、もう一度お話しいただけますか？');
    } finally {
      setIsLoading(false);
    }
  };

  // セッション更新
  const updateSession = async (messages: Message[]) => {
    if (!currentSessionId) return;
    
    try {
      await fetch(`/api/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
    } catch (error) {
      console.error('セッション更新エラー:', error);
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

  // その他の関数は前回のコードと同じ（音声認識、録音、ファイル添付など）
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

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

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

  // プロジェクト削除
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('このプロジェクトを削除してもよろしいですか？')) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadUserData();
      }
    } catch (error) {
      console.error('プロジェクト削除エラー:', error);
    }
  };

  // Rate Limitカウントダウン
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

  // 計算系関数
  const calculateTotalSessions = () => sessions.length;
  
  const calculateAverageSessionDuration = () => {
    if (sessions.length === 0) return 0;
    const totalMessages = sessions.reduce((acc, session) => acc + (session.messages?.length || 0), 0);
    return Math.round(totalMessages / sessions.length * 2); // 仮の計算
  };
  
  const calculateFavoriteCoach = () => {
    if (sessions.length === 0) return null;
    
    const coachCounts = sessions.reduce((acc, session) => {
      const coachId = session.coach_id as CoachId;
      acc[coachId] = (acc[coachId] || 0) + 1;
      return acc;
    }, {} as Record<CoachId, number>);
    
    const favorite = Object.entries(coachCounts).reduce((a, b) => 
      coachCounts[a[0] as CoachId] > coachCounts[b[0] as CoachId] ? a : b
    );
    
    return favorite ? favorite[0] as CoachId : null;
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        background: 'linear-gradient(135deg, #FDFEF0 0%, #F8F6F0 25%, #F0EBE5 50%, #E8DFD8 75%, #CCBEB8 100%)'
      }}
    >
      {currentPage === 'home' ? (
        // トップページ（前回と同じ構造）
        <>
          <header className="fixed top-0 left-0 right-0 bg-white bg-opacity-90 backdrop-blur-md shadow-sm border-b z-50">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
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
                        {userProfile?.name || user.user_metadata?.name || 'ユーザー'}さん
                      </div>
                      {userProfile && (
                        <>
                          <div className="text-sm text-gray-600">
                            {userProfile.company || '会社未設定'} | {industryMaster[userProfile.industry]?.label || '業界未設定'}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${userProfile.profileCompleteness || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">{userProfile.profileCompleteness || 0}%</span>
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

          <div className="pt-20">
            <div className="w-full pb-8 bg-white bg-opacity-30">
              <img 
                src="/hero-animation.gif" 
                alt="Hero Animation" 
                className="w-[90%] h-auto mx-auto shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>

            <div className="relative min-h-screen overflow-hidden">
              <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
                <div className="text-center">
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
                        <div className="text-3xl font-bold text-orange-500">{calculateTotalSessions()}</div>
                        <div className="text-sm text-gray-600">総セッション数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pink-500">
                          {calculateAverageSessionDuration()}分
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

            {/* コーチ紹介セクション（前回と同じ） */}
            <div className="bg-white bg-opacity-60 backdrop-blur-sm py-20">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">あなた専属のAIコーチ陣</h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    専門分野を持つAIコーチから選択、またはオリジナルコーチを作成できます
                  </p>
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
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg mb-2">プロジェクトがまだありません</p>
                <p className="text-gray-400 text-sm">新規プロジェクトを作成して、AIコーチと継続的な相談を始めましょう</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {project.project_name}
                        </h3>
                        {project.consultation_category && (
                          <div className="text-sm text-blue-600 mb-2">
                            カテゴリ: {
                              project.consultation_category === 'problem_solving' ? '問題解決' :
                              project.consultation_category === 'qualitative_goal' ? '定性的な目標' :
                              project.consultation_category === 'quantitative_goal' ? '定量的な目標' :
                              'その他'
                            }
                          </div>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {project.objectives}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>最終更新: {new Date(project.updated_at).toLocaleDateString('ja-JP')}</span>
                          <span>セッション数: {project.session_count || 0}回</span>
                          {project.ai_auto_update_enabled && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                              AI自動更新ON
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleStartSession([project.id], 'existing')}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          セッション開始
                        </button>
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setShowProjectModal(true);
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* モーダル類 */}
      <ProjectSelectionModal
        isOpen={showProjectSelectionModal}
        onClose={() => setShowProjectSelectionModal(false)}
        projects={projects}
        onStartSession={handleStartSession}
      />

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={async () => {
          await loadUserData();
          setShowProjectModal(false);
          setEditingProject(null);
        }}
      />

      <SessionStartModal
        isOpen={showSessionStartModal}
        onClose={() => setShowSessionStartModal(false)}
        projectName={currentProjectForSession?.project_name || ''}
        sessionCount={(currentProjectForSession?.session_count || 0) + 1}
        userName={userProfile?.name || user?.user_metadata?.name || 'ユーザー'}
        onSelectAction={handleSessionStartAction}
        hasHistory={(currentProjectForSession?.session_count || 0) > 0}
      />

      {/* プロフィールモーダルなどは省略（前回と同じ実装） */}
    </div>
  );
}

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