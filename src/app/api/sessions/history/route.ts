import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { project_id } = body
    
    // プロジェクトに関連する最新のセッションを取得
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .contains('project_ids', [project_id])
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('セッション履歴取得エラー:', error)
      return NextResponse.json({ hasHistory: false, lastSession: null })
    }
    
    const hasHistory = sessions && sessions.length > 0
    const lastSession = hasHistory ? sessions[0] : null
    
    // 最後のセッションの要約を生成
    let summary = null
    if (lastSession && lastSession.messages && lastSession.messages.length > 0) {
      const lastMessages = lastSession.messages.slice(-5) // 最後の5メッセージ
      summary = lastMessages
        .filter((msg: any) => msg.role === 'user')
        .map((msg: any) => msg.content.substring(0, 100))
        .join(' / ')
    }
    
    return NextResponse.json({ 
      hasHistory, 
      lastSession,
      summary
    })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ hasHistory: false, lastSession: null })
  }
}