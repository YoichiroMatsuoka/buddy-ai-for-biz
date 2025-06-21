import React, { useState, useEffect } from 'react'

interface SessionStartModalProps {
  isOpen: boolean
  onClose: () => void
  projectName: string
  sessionCount: number
  userName: string
  onSelectAction: (action: 'new' | 'continue') => void
  hasHistory: boolean
}

export function SessionStartModal({ 
  isOpen, 
  onClose, 
  projectName,
  sessionCount,
  userName,
  onSelectAction,
  hasHistory
}: SessionStartModalProps) {
  const [selectedAction, setSelectedAction] = useState<'new' | 'continue' | null>(null)

  if (!isOpen) return null

  const handleProceed = () => {
    if (selectedAction) {
      onSelectAction(selectedAction)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {userName}さん、こんにちは
          </h2>
          <p className="text-gray-700">
            「{projectName}」について、今回が{sessionCount}回目のセッションですね
          </p>
        </div>

        {hasHistory ? (
          <>
            <p className="text-center text-gray-600 mb-6">
              このプロジェクトについて、新しく相談を始めますか？<br />
              それとも前回の続きを話しますか？
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedAction('new')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedAction === 'new'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={selectedAction === 'new'}
                    onChange={() => {}}
                    className="text-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">新しく相談したい</div>
                    <div className="text-sm text-gray-600">新しいトピックについて相談を始めます</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedAction('continue')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedAction === 'continue'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={selectedAction === 'continue'}
                    onChange={() => {}}
                    className="text-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">前回の続きを相談したい</div>
                    <div className="text-sm text-gray-600">前回の会話内容を踏まえて続きから始めます</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleProceed}
                disabled={!selectedAction}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                セッション開始
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-gray-600 mb-6">
              このプロジェクトの最初のセッションを始めましょう！
            </p>
            <button
              onClick={() => {
                onSelectAction('new')
                onClose()
              }}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              セッション開始
            </button>
          </>
        )}
      </div>
    </div>
  )
}