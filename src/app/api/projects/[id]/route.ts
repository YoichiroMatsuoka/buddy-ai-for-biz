import { NextResponse } from 'next/server'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientComponentClient()
    const body = await request.json()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('project_cards')
      .update(body)
      .eq('id', params.id)
      .eq('user_id', user.id)
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
    const supabase = createClientComponentClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('project_cards')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)
    
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