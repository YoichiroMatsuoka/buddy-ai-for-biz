import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// プロジェクト詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('project_cards')
      .select(`
        *,
        project_stakeholders(*),
        project_documents(*)
      `)
      .eq('id', params.id)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('プロジェクト詳細取得エラー:', error)
    return NextResponse.json(
      { error: 'プロジェクトの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// プロジェクト更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabaseAdmin
      .from('project_cards')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('プロジェクト更新エラー:', error)
    return NextResponse.json(
      { error: 'プロジェクトの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// プロジェクト削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('project_cards')
      .delete()
      .eq('id', params.id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('プロジェクト削除エラー:', error)
    return NextResponse.json(
      { error: 'プロジェクトの削除に失敗しました' },
      { status: 500 }
    )
  }
}