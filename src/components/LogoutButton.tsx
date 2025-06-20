'use client'

import { useAuth } from '@/app/providers/AuthProvider'

export default function LogoutButton() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <button
      onClick={signOut}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      ログアウト
    </button>
  )
}