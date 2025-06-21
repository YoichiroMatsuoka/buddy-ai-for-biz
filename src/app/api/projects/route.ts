import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // 現在のユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('認証エラーまたはユーザーなし:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // プロジェクトを取得
    const { data: projects, error } = await supabase
      .from('project_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('プロジェクト取得エラー:', error)
      return NextResponse.json({ projects: [] })
    }
    
    console.log('取得したプロジェクト数:', projects?.length || 0)
    return NextResponse.json({ projects: projects || [] })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ projects: [] })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    
    console.log('受信したデータ:', body)
    
    // 現在のユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('ユーザーID:', user.id)
    
    // プロジェクトを作成
    const insertData = {
      ...body,
      user_id: user.id,
      session_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('挿入するデータ:', insertData)
    
    const { data, error } = await supabase
      .from('project_cards')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('プロジェクト作成エラー詳細:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('作成成功:', data)
    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}