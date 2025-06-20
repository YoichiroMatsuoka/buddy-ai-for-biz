'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // プロフィールの存在確認と作成
  const ensureUserProfile = async (userId: string, name?: string) => {
    try {
      console.log('プロフィール確認開始:', { userId, name })
      
      // プロフィールの存在確認
      const { data: existingProfile, error: checkError } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('プロフィール確認結果:', { existingProfile, checkError })

      if (!existingProfile) {
        console.log('プロフィールが存在しないため作成します')
        
        // プロフィールが存在しない場合は作成
        const profileData = {
          id: userId,
          name: name || 'ユーザー',
          company: '',
          position: '',
          department: '',
          industry: 'manufacturer',
          company_size: '51-200',
          organization_culture: [],
          main_challenges: [],
          goals: []
        }
        
        console.log('作成するプロフィールデータ:', profileData)
        
        const { data: createdProfile, error: createError } = await supabase
          .from('users_profile')
          .insert(profileData)
          .select()
          .single()

        if (createError) {
          console.error('プロフィール作成エラー詳細:', {
            error: createError,
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code
          })
          // エラーの詳細をアラートで表示（デバッグ用）
          alert(`プロフィール作成エラー: ${createError.message || 'Unknown error'}`);
          throw createError
        }
        
        console.log('プロフィール作成成功:', createdProfile)

        // フリープランを割り当て
        const { data: freePlan, error: planError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'free')
          .single()

        console.log('フリープラン取得結果:', { freePlan, planError })

        if (freePlan && !planError) {
          const subscriptionData = {
            user_id: userId,
            plan_id: freePlan.id,
            status: 'active'
          }
          
          console.log('作成するサブスクリプションデータ:', subscriptionData)
          
          const { data: subscription, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .insert(subscriptionData)
            .select()
            .single()

          if (subscriptionError) {
            console.error('サブスクリプション作成エラー詳細:', {
              error: subscriptionError,
              message: subscriptionError.message,
              details: subscriptionError.details,
              hint: subscriptionError.hint,
              code: subscriptionError.code
            })
          } else {
            console.log('サブスクリプション作成成功:', subscription)
          }
        }
      } else {
        console.log('プロフィールは既に存在します:', existingProfile)
      }
    } catch (error) {
      console.error('プロフィール確認/作成中の予期しないエラー:', error)
    }
  }

  useEffect(() => {
    // 現在のセッションを確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('初期セッション確認:', session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // 既存ユーザーのプロフィール確認
        ensureUserProfile(session.user.id, session.user.user_metadata?.name)
      }
      setLoading(false)
    })

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('認証状態変更:', { event: _event, session })
      setUser(session?.user ?? null)
      
      if (_event === 'SIGNED_IN' && session?.user) {
        // サインイン時にプロフィール確認
        await ensureUserProfile(session.user.id, session.user.user_metadata?.name)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) throw error
    console.log('サインアップ成功:', data)
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    console.log('サインイン成功:', data)
    
    // サインイン成功後、プロフィール確認
    if (data.user) {
      await ensureUserProfile(data.user.id, data.user.user_metadata?.name)
    }
    
    router.push('/')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/auth/login')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}