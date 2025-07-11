import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('project_cards')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id) // ユーザーIDでフィルタリング
      .select()
      .single()
    
    if (error) {
      console.error('プロジェクト更新エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('project_cards')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id) // ユーザーIDでフィルタリング
    
    if (error) {
      console.error('プロジェクト削除エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}