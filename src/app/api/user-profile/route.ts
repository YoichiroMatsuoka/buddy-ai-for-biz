import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json({ profile: null })
      }
      console.error('プロフィール取得エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const profileData = {
      ...body,
      id: user.id,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('users_profile')
      .upsert(profileData)
      .select()
      .single()
    
    if (error) {
      console.error('プロフィール保存エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('APIエラー:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}