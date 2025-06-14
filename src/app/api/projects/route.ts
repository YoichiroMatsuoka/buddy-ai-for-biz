import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// プロジェクト一覧を取得
export async function GET(request: NextRequest) {
  try {
    // TODO: 実際の実装では認証を追加
    const userId = request.headers.get('user-id') || 'test-user-id'
    
    const { data, error } = await supabaseAdmin
      .from('project_cards')
      .select(`
        *,
        project_stakeholders(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({ projects: data })
  } catch (error) {
    console.error('プロジェクト取得エラー:', error)
    return NextResponse.json(
      { error: 'プロジェクトの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 新規プロジェクト作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = request.headers.get('user-id') || 'test-user-id'
    
    const { data, error } = await supabaseAdmin
      .from('project_cards')
      .insert({
        user_id: userId,
        project_name: body.project_name,
        objectives: body.objectives,
        project_period: body.project_period || null,
        project_purpose: body.project_purpose || null,
        project_goals: body.project_goals || null,
        user_role: body.user_role || null,
        user_personal_goals: body.user_personal_goals || null,
        kpis: body.kpis || null,
        important_decisions: body.important_decisions || null
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('プロジェクト作成エラー:', error)
    return NextResponse.json(
      { error: 'プロジェクトの作成に失敗しました' },
      { status: 500 }
    )
  }
}