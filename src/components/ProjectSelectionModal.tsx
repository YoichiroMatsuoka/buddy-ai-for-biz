import React, { useState, useEffect } from 'react'

interface ProjectSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  projects: any[]
  onStartSession: (projectIds: string[], action: 'existing' | 'new' | 'none') => void
}

export function ProjectSelectionModal({ 
  isOpen, 
  onClose, 
  projects,
  onStartSession
}: ProjectSelectionModalProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [action, setAction] = useState<'existing' | 'new' | 'none'>('none')

  useEffect(() => {
    if (projects.length > 0) {
      setAction('existing')
    }
  }, [projects])

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleStart = () => {
    if (action === 'existing' && selectedProjects.length === 0) {
      alert('プロジェクトを選択してください')
      return
    }
    onStartSession(selectedProjects, action)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">どのプロジェクトについて相談しますか？</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {projects.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                既存のプロジェクトから選択（複数選択可）
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      id={project.id}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      disabled={action !== 'existing'}
                      className="mt-1"
                    />
                    <label 
                      htmlFor={project.id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {project.objectives}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="new"
                checked={action === 'new'}
                onChange={(e) => setAction(e.target.value as any)}
              />
              <span>プロジェクトを新規作成してセッション開始</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="none"
                checked={action === 'none'}
                onChange={(e) => setAction(e.target.value as any)}
              />
              <span>プロジェクトを設定しないままセッション開始</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleStart}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              セッション開始
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}