import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { conversation, sessionId } = await request.json()
    
    // 現在のプロジェクト情報を取得
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('project_cards')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (fetchError) throw fetchError

    // OpenAI APIを使用して会話から情報を抽出
    const prompt = `
以下の会話からプロジェクトに関する新しい情報を抽出してください。
抽出する情報：
- ゴールの変更や追加
- 新しいステークホルダー
- 重要な意思決定
- KPIの更新
- プロジェクトの進捗

現在のプロジェクト情報：
${JSON.stringify(project, null, 2)}

会話内容：
${conversation}

JSON形式で、更新が必要なフィールドとその新しい値を返してください。
更新が不要な場合は空のオブジェクトを返してください。
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    })

    const updates = JSON.parse(completion.choices[0].message.content || '{}')
    
    // 更新がある場合
    if (Object.keys(updates).length > 0) {
      // プロジェクトを更新
      const { error: updateError } = await supabaseAdmin
        .from('project_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
      
      if (updateError) throw updateError

      // 更新履歴を記録
      for (const [field, newValue] of Object.entries(updates)) {
        await supabaseAdmin
          .from('ai_updates_log')
          .insert({
            project_id: params.id,
            field_name: field,
            old_value: JSON.stringify(project[field]),
            new_value: JSON.stringify(newValue),
            session_id: sessionId
          })
      }
    }

    return NextResponse.json({ 
      success: true, 
      updates: updates 
    })
  } catch (error) {
    console.error('AI更新エラー:', error)
    return NextResponse.json(
      { error: 'AI更新に失敗しました' },
      { status: 500 }
    )
  }
}