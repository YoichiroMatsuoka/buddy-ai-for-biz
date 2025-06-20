import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProjectModal } from './ProjectModal'

interface Project {
  id: string
  project_name: string
  objectives: string
  created_at: string
  updated_at: string
}

interface ProjectListModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectListModal({ isOpen, onClose }: ProjectListModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects', {
        headers: {
          'user-id': 'test-user-id'
        }
      })
      
      if (!response.ok) {
        throw new Error('プロジェクトの取得に失敗しました')
      }
      
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('プロジェクト取得エラー:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'user-id': 'test-user-id'
        }
      })
      
      if (!response.ok) {
        throw new Error('プロジェクトの削除に失敗しました')
      }
      
      // 成功したらリストを更新
      await fetchProjects()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('プロジェクトの削除に失敗しました')
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>プロジェクトカルテ一覧</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateModal(true)}>
                新規プロジェクト作成
              </Button>
            </div>

            {loading ? (
              <div className="text-center p-8">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : projects.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">プロジェクトがまだありません</p>
                <p className="text-sm text-gray-400 mt-2">
                  新規プロジェクトを作成して、AIコーチと継続的な相談を始めましょう
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Card key={project.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          {project.project_name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {project.objectives}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          最終更新: {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingProject(project)}
                        >
                          編集
                        </Button>
                        {deleteConfirm === project.id ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => handleDelete(project.id)}
                            >
                              削除実行
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              キャンセル
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => setDeleteConfirm(project.id)}
                          >
                            削除
                          </Button>
                        )}
                      </div>
                    </div>
                    {deleteConfirm === project.id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        削除すると、過去のセッションデータも消えてしまいます。復元はできませんが、本当に削除しますか？
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 新規作成モーダル */}
      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={() => {
          setShowCreateModal(false)
          fetchProjects() // リストを更新
        }}
      />

      {/* 編集モーダル */}
      {editingProject && (
        <ProjectModal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          project={editingProject}
          onSave={() => {
            setEditingProject(null)
            fetchProjects() // リストを更新
          }}
        />
      )}
    </>
  )
}