'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で設定してください。');
      setLoading(false);
      return;
    }

    try {
      // ユーザー登録
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            company: formData.company
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        // Supabaseの仕様：既存ユーザーの場合、identitiesが空配列になる
        if (data.user.identities && data.user.identities.length === 0) {
          setError('このメールアドレスは既に登録済みです。ログイン画面からログインしてください。');
          return;
        }

        // 新規ユーザーの場合のみプロフィール作成
        const { error: profileError } = await supabase
          .from('users_profile')
          .insert({
            id: data.user.id,
            name: formData.name,
            company: formData.company
          });

        if (profileError) {
          // 既にプロフィールが存在する場合もエラーになる
          if (profileError.code === '23505') { // PostgreSQLの重複エラーコード
            setError('このメールアドレスは既に登録済みです。ログイン画面からログインしてください。');
          } else {
            console.error('プロフィール作成エラー:', profileError);
            setError('プロフィールの作成に失敗しました。もう一度お試しください。');
          }
          
          // エラーが発生した場合はセッションをクリア
          await supabase.auth.signOut();
        } else {
          setMessage('認証メールを送信しました。メールボックスをご確認ください。');
          
          // 3秒後にログイン画面へリダイレクト
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        }
      }
    } catch (err) {
      setError('登録中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ロゴエリア */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">新規登録</h2>
            <p className="mt-2 text-gray-600">アカウントを作成して始めましょう</p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 成功メッセージ */}
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {/* 登録フォーム */}
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="山田 太郎"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="株式会社○○"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                個人事業主など会社に所属していない方は"個人事業主"など自由に記載いただくか"その他"と入力してください
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="6文字以上で入力"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                placeholder="もう一度入力"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登録中...
                </>
              ) : (
                '新規登録'
              )}
            </button>
          </form>

          {/* ログインリンク */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              既にアカウントをお持ちの方は{' '}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition duration-150"
              >
                ログイン
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}