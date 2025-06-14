import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Project {
  id: string
  project_name: string
  objectives: string
  created_at: string
  updated_at: string
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center p-4">読み込み中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">プロジェクト一覧</h2>
        <Button onClick={() => {/* 新規作成モーダルを開く */}}>
          新規プロジェクト作成
        </Button>
      </div>

      {projects.length === 0 ? (
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
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    削除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}