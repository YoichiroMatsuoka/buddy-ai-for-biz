import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Project {
  id: string
  project_name: string
  objectives: string
}

interface ProjectSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onStartSession: (projectIds: string[], action: 'existing' | 'new' | 'none') => void
}

export function ProjectSelectionModal({ isOpen, onClose, onStartSession }: ProjectSelectionModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [action, setAction] = useState<'existing' | 'new' | 'none'>('existing')

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'user-id': 'test-user-id' // TODO: 実際のユーザーIDを使用
        }
      })
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('プロジェクト取得エラー:', error)
    }
  }

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
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>どのプロジェクトについて相談しますか？</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 既存プロジェクトの選択 */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <Label>既存のプロジェクトから選択（複数選択可）</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={project.id}
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={() => handleProjectToggle(project.id)}
                      disabled={action !== 'existing'}
                    />
                    <Label 
                      htmlFor={project.id} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {project.objectives}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* その他のオプション */}
          <RadioGroup value={action} onValueChange={(value: any) => setAction(value)}>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">
                  プロジェクトを新規作成してセッション開始
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none">
                  プロジェクトを設定しないままセッション開始
                </Label>
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleStart}>
              セッション開始
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}