import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// クライアントコンポーネント用
export const supabase = createClientComponentClient()

// サーバーコンポーネント用（必要に応じて）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// 型定義
export type Database = {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string
          name: string
          company: string | null
          position: string | null
          department: string | null
          industry: string | null
          company_size: string | null
          organization_culture: any[] | null
          main_challenges: any[] | null
          goals: any[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          company?: string | null
          position?: string | null
          department?: string | null
          industry?: string | null
          company_size?: string | null
          organization_culture?: any[] | null
          main_challenges?: any[] | null
          goals?: any[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string | null
          position?: string | null
          department?: string | null
          industry?: string | null
          company_size?: string | null
          organization_culture?: any[] | null
          main_challenges?: any[] | null
          goals?: any[] | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          display_name: string
          price: number
          features: any[]
          ai_requests_limit: number | null
          projects_limit: number | null
          is_active: boolean
          created_at: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          coach_id: string
          messages: any[]
          project_ids: string[]
          created_at: string
          updated_at: string
        }
      }
      project_cards: {
        Row: {
          id: string
          user_id: string | null
          // 他のカラムは後で追加
        }
      }
    }
  }
}