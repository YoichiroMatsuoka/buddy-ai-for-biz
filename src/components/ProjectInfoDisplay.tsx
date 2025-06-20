import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Project {
  id: string
  project_name: string
  objectives: string
  project_purpose?: string
  project_goals?: string
  user_role?: string
}

interface AIUpdate {
  field: string
  timestamp: Date
  oldValue?: string
  newValue: string
}

interface ProjectInfoDisplayProps {
  projectIds: string[]
  aiAutoUpdateEnabled: boolean
  onToggleAIUpdate: () => void
}

export function ProjectInfoDisplay({ 
  projectIds, 
  aiAutoUpdateEnabled, 
  onToggleAIUpdate 
}: ProjectInfoDisplayProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [aiUpdates, setAiUpdates] = useState<AIUpdate[]>([])
  const [showUpdateBubble, setShowUpdateBubble] = useState<string | null>(null)

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchProjects()
    }
  }, [projectIds])

  const fetchProjects = async () => {
    try {
      const projectData = await Promise.all(
        projectIds.map(async (id) => {
          const response = await fetch(`/api/projects/${id}`)
          if (response.ok) {
            return await response.json()
          }
          return null
        })
      )
      
      setProjects(projectData.filter(p => p !== null).map(data => data.project))
    } catch (error) {
      console.error('プロジェクト取得エラー:', error)
    }
  }

  // AI更新をシミュレート（実際の実装では、APIからの更新を受け取る）
  const simulateAIUpdate = (field: string, value: string) => {
    const update: AIUpdate = {
      field,
      timestamp: new Date(),
      newValue: value
    }
    
    setAiUpdates([...aiUpdates, update])
    setShowUpdateBubble(field)
    
    // 3秒後に吹き出しを非表示
    setTimeout(() => {
      setShowUpdateBubble(null)
    }, 3000)
  }

  // フィールドがAIによって更新されたかチェック
  const isAIUpdated = (field: string) => {
    return aiUpdates.some(update => update.field === field)
  }

  if (projects.length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      {/* AI自動更新ボタン */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">AIコーチによるプロジェクトカルテ自動更新</span>
          {aiAutoUpdateEnabled && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              ✨ 有効
            </span>
          )}
        </div>
        <button
          onClick={onToggleAIUpdate}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            aiAutoUpdateEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span 
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              aiAutoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} 
          />
        </button>
      </div>

      {/* プロジェクト情報表示 */}
      {projects.map((project, index) => (
        <Card key={project.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${
                  isAIUpdated('project_name') ? 'text-blue-600' : ''
                }`}>
                  {project.project_name}
                  {showUpdateBubble === 'project_name' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">
                      AIが更新しました
                    </span>
                  )}
                </h3>
                {index === 0 && (
                  <span className="text-xs text-gray-500">メインプロジェクト</span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="relative">
                <p className={`${isAIUpdated('objectives') ? 'text-blue-600' : 'text-gray-700'}`}>
                  <span className="font-medium">目的:</span> {project.objectives}
                  {showUpdateBubble === 'objectives' && (
                    <span className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg shadow-lg">
                      AIが内容を更新しました
                      <span className="absolute -bottom-1 left-4 w-2 h-2 bg-blue-600 transform rotate-45"></span>
                    </span>
                  )}
                </p>
              </div>

              {project.project_purpose && (
                <div className="relative">
                  <p className={`${isAIUpdated('project_purpose') ? 'text-blue-600' : 'text-gray-700'}`}>
                    <span className="font-medium">プロジェクトの目的:</span> {project.project_purpose}
                    {showUpdateBubble === 'project_purpose' && (
                      <span className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg shadow-lg">
                        AIが内容を更新しました
                        <span className="absolute -bottom-1 left-4 w-2 h-2 bg-blue-600 transform rotate-45"></span>
                      </span>
                    )}
                  </p>
                </div>
              )}

              {project.project_goals && (
                <div className="relative">
                  <p className={`${isAIUpdated('project_goals') ? 'text-blue-600' : 'text-gray-700'}`}>
                    <span className="font-medium">ゴール:</span> {project.project_goals}
                    {showUpdateBubble === 'project_goals' && (
                      <span className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg shadow-lg">
                        AIが内容を更新しました
                        <span className="absolute -bottom-1 left-4 w-2 h-2 bg-blue-600 transform rotate-45"></span>
                      </span>
                    )}
                  </p>
                </div>
              )}

              {project.user_role && (
                <div className="relative">
                  <p className={`${isAIUpdated('user_role') ? 'text-blue-600' : 'text-gray-700'}`}>
                    <span className="font-medium">あなたの役割:</span> {project.user_role}
                    {showUpdateBubble === 'user_role' && (
                      <span className="absolute -top-8 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-lg shadow-lg">
                        AIが内容を更新しました
                        <span className="absolute -bottom-1 left-4 w-2 h-2 bg-blue-600 transform rotate-45"></span>
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* AI更新履歴 */}
            {aiUpdates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  最終AI更新: {new Date(aiUpdates[aiUpdates.length - 1].timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}