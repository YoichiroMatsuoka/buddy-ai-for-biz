import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // セッション数をカウント
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id')
      .contains('project_ids', [params.id])
    
    if (error) {
      console.error('セッション数取得エラー:', error)
      return NextResponse.json({ count: 0 })
    }
    
    const count = sessions?.length || 0
    
    // project_cardsテーブルのsession_countも更新
    await supabase
      .from('project_cards')
      .update({ session_count: count })
      .eq('id', params.id)
    
    return NextResponse.json({ count })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ count: 0 })
  }
}