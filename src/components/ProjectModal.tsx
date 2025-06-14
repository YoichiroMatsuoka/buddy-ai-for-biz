import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project?: any // 編集時は既存プロジェクトデータ
  onSave: () => void
}

export function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    project_name: project?.project_name || '',
    objectives: project?.objectives || '',
    project_purpose: project?.project_purpose || '',
    project_goals: project?.project_goals || '',
    user_role: project?.user_role || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = project 
        ? `/api/projects/${project.id}`
        : '/api/projects'
      
      const method = project ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'user-id': 'test-user-id' // TODO: 実際のユーザーIDを使用
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
        onClose()
      }
    } catch (error) {
      console.error('保存エラー:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'プロジェクト編集' : '新規プロジェクト作成'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project_name">
              プロジェクト名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              placeholder="例: 新規ECサイト立ち上げプロジェクト"
              required
            />
          </div>

          <div>
            <Label htmlFor="objectives">
              このプロジェクトについて、セッションで叶えたいこと、解決したい問題 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              placeholder="例: ECサイトの要件定義から実装まで、技術選定やチーム編成について相談したい"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="project_purpose">
              プロジェクトの目的
            </Label>
            <Textarea
              id="project_purpose"
              value={formData.project_purpose}
              onChange={(e) => setFormData({ ...formData, project_purpose: e.target.value })}
              placeholder="例: 自社商品のオンライン販売チャネルを確立し、売上の30%をEC経由にする"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="project_goals">
              プロジェクトのゴール
            </Label>
            <Textarea
              id="project_goals"
              value={formData.project_goals}
              onChange={(e) => setFormData({ ...formData, project_goals: e.target.value })}
              placeholder="例: 2025年12月までにECサイトをローンチし、月商1000万円を達成する"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="user_role">
              プロジェクト内でのあなたの役割
            </Label>
            <Input
              id="user_role"
              value={formData.user_role}
              onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
              placeholder="例: プロジェクトマネージャー"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit">
              {project ? '更新' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}