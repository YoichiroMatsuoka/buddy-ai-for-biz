import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

interface Stakeholder {
  id?: string
  name: string
  relationship_type: string
  involvement_level: 'high' | 'medium' | 'low'
  attitude: number
  expectations: string
  priority_level: 'high' | 'medium' | 'low'
}

interface StakeholderManagerProps {
  projectId: string
  stakeholders: Stakeholder[]
  onUpdate: () => void
}

export function StakeholderManager({ projectId, stakeholders, onUpdate }: StakeholderManagerProps) {
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  
  const handleSave = async (stakeholder: Stakeholder) => {
    try {
      if (stakeholder.id) {
        // 更新
        await fetch(`/api/stakeholders/${stakeholder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stakeholder)
        })
      } else {
        // 新規作成
        await fetch('/api/stakeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...stakeholder,
            project_id: projectId
          })
        })
      }
      
      setEditingStakeholder(null)
      onUpdate()
    } catch (error) {
      console.error('ステークホルダー保存エラー:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ステークホルダー管理</h3>
        <Button 
          size="sm"
          onClick={() => setEditingStakeholder({
            name: '',
            relationship_type: 'team_member',
            involvement_level: 'medium',
            attitude: 3,
            expectations: '',
            priority_level: 'medium'
          })}
        >
          追加
        </Button>
      </div>

      <div className="grid gap-3">
        {stakeholders.map((stakeholder) => (
          <Card key={stakeholder.id} className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{stakeholder.name}</h4>
                <p className="text-sm text-gray-600">
                  関係: {stakeholder.relationship_type} | 
                  関与度: {stakeholder.involvement_level} | 
                  優先度: {stakeholder.priority_level}
                </p>
                <p className="text-sm mt-1">{stakeholder.expectations}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setEditingStakeholder(stakeholder)}
              >
                編集
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 編集モーダルをここに実装 */}
    </div>
  )
}