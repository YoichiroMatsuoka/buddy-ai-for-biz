import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 音声認識用Rate Limiting（より厳格）
const transcribeRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const TRANSCRIBE_RATE_LIMIT_REQUESTS = 15; // 10分間に15回まで（音声認識は制限を厳しく）
const TRANSCRIBE_RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10分（ミリ秒）

// ファイルサイズ制限（25MB）
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// 許可される音声ファイル形式
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/m4a',
  'audio/wav',
  'audio/flac'
];

// IPアドレス取得関数
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Rate Limit チェック関数（音声認識用）
function checkTranscribeRateLimit(clientIP: string): { allowed: boolean; remainingRequests: number } {
  const now = Date.now();
  const clientData = transcribeRateLimitMap.get(clientIP);
  
  // クライアントデータが存在しない、または時間ウィンドウが過ぎている場合
  if (!clientData || now > clientData.resetTime) {
    transcribeRateLimitMap.set(clientIP, {
      count: 1,
      resetTime: now + TRANSCRIBE_RATE_LIMIT_WINDOW
    });
    return { allowed: true, remainingRequests: TRANSCRIBE_RATE_LIMIT_REQUESTS - 1 };
  }
  
  // 制限に達している場合
  if (clientData.count >= TRANSCRIBE_RATE_LIMIT_REQUESTS) {
    return { allowed: false, remainingRequests: 0 };
  }
  
  // カウントを増加
  clientData.count += 1;
  transcribeRateLimitMap.set(clientIP, clientData);
  
  return { allowed: true, remainingRequests: TRANSCRIBE_RATE_LIMIT_REQUESTS - clientData.count };
}

// メモリクリーンアップ（古いエントリを削除）
function cleanupTranscribeRateLimitMap() {
  const now = Date.now();
  for (const [key, data] of transcribeRateLimitMap.entries()) {
    if (now > data.resetTime) {
      transcribeRateLimitMap.delete(key);
    }
  }
}

// 定期的なクリーンアップ（メモリリーク防止）
setInterval(cleanupTranscribeRateLimitMap, 5 * 60 * 1000); // 5分ごと

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting チェック
    const clientIP = getClientIP(req);
    const rateLimitResult = checkTranscribeRateLimit(clientIP);
    
    console.log(`🛡️ Transcribe Rate Limit Check - IP: ${clientIP}, Allowed: ${rateLimitResult.allowed}, Remaining: ${rateLimitResult.remainingRequests}`);
    
    if (!rateLimitResult.allowed) {
      console.log(`⚠️ Transcribe rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { 
          error: '音声認識の利用制限に達しました。10分後に再度お試しください。',
          rateLimitExceeded: true 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': TRANSCRIBE_RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + TRANSCRIBE_RATE_LIMIT_WINDOW / 1000).toString()
          }
        }
      );
    }

    console.log('🎤 Whisper API呼び出し開始');
    
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    // ファイル存在チェック
    if (!audioFile) {
      return NextResponse.json(
        { error: '音声データが提供されていません。' }, 
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (audioFile.size > MAX_FILE_SIZE) {
      console.log(`⚠️ File too large: ${audioFile.size} bytes`);
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます。25MB以下のファイルをアップロードしてください。' },
        { status: 413 }
      );
    }

    // ファイル形式チェック
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      console.log(`⚠️ Invalid file type: ${audioFile.type}`);
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。音声ファイル（MP3、WAV、M4A等）をアップロードしてください。' },
        { status: 415 }
      );
    }

    console.log('📊 音声ファイル情報:', {
      name: audioFile.name,
      size: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
      type: audioFile.type
    });

    // ファイルサイズが0の場合のチェック
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: '空のファイルです。音声を録音してから送信してください。' },
        { status: 400 }
      );
    }

    // OpenAI Whisper APIで音声認識
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja', // 日本語指定
      response_format: 'text', // テキスト形式で返答
    });

    console.log('✅ Whisper認識結果:', transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''));
    
    return NextResponse.json({ 
      text: transcription 
    }, {
      headers: {
        'X-RateLimit-Limit': TRANSCRIBE_RATE_LIMIT_REQUESTS.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingRequests.toString(),
      }
    });

  } catch (error: any) {
    console.error('💥 Whisper API Error:', error);
    
    // OpenAI API制限エラーの場合
    if (error?.status === 429) {
      return NextResponse.json(
        { error: '音声認識サービスが混雑しています。少し時間をおいて再度お試しください。' },
        { status: 429 }
      );
    }
    
    // ファイルエラーの場合
    if (error?.status === 400) {
      return NextResponse.json(
        { error: '音声ファイルを処理できませんでした。別の形式でお試しください。' },
        { status: 400 }
      );
    }
    
    // その他のエラー
    return NextResponse.json(
      { error: '音声認識に失敗しました。もう一度お試しください。' }, 
      { status: 500 }
    );
  }
}