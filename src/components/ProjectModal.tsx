import React, { useState, useEffect } from 'react'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project?: any
  onSave: () => void
}

export function ProjectModal({ isOpen, onClose, project, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    project_name: '',
    consultation_category: '', // 追加
    objectives: '',
    project_purpose: '',
    project_goals: '',
    user_role: '',
    // 新しく追加するフィールド
    project_period: {},
    user_personal_goals: [],
    kpis: [],
    important_decisions: [],
    ai_auto_update_enabled: true
  })
  
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 相談カテゴリの選択肢
  const consultationCategories = [
    {
      value: 'problem_solving',
      label: '仕事で起こっている問題を解決したい',
      description: '問題解決思考を活用します。問題の本質を探り、アクションプランにつなげます'
    },
    {
      value: 'qualitative_goal',
      label: '定性的な目標を達成したい',
      description: '問題解決思考を発展的に活用します。企画、育成、管理など様々な定性目標の達成を支援できます。'
    },
    {
      value: 'quantitative_goal',
      label: '定量的な目標を達成したい',
      description: 'ゴールまでのプロセスを明確にし、アクションにつなげます。営業職、採用職など目標数値が明確な目標の達成に最適です。'
    },
    {
      value: 'others',
      label: 'その他',
      description: '上記に当てはまらない様々なご相談をサポートします。'
    }
  ]

  useEffect(() => {
    if (project) {
      setFormData({
        project_name: project.project_name || '',
        consultation_category: project.consultation_category || '', // 追加
        objectives: project.objectives || '',
        project_purpose: project.project_purpose || '',
        project_goals: project.project_goals || '',
        user_role: project.user_role || '',
        project_period: project.project_period || {},
        user_personal_goals: project.user_personal_goals || [],
        kpis: project.kpis || [],
        important_decisions: project.important_decisions || [],
        ai_auto_update_enabled: project.ai_auto_update_enabled ?? true
      })
    } else {
      setFormData({
        project_name: '',
        consultation_category: '', // 追加
        objectives: '',
        project_purpose: '',
        project_goals: '',
        user_role: '',
        project_period: {},
        user_personal_goals: [],
        kpis: [],
        important_decisions: [],
        ai_auto_update_enabled: true
      })
    }
  }, [project, isOpen])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'プロジェクト名は必須です'
    }
    
    if (!formData.consultation_category) {
      newErrors.consultation_category = 'カテゴリを選択してください'
    }
    
    if (!formData.objectives.trim()) {
      newErrors.objectives = 'このフィールドは必須です'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const url = project 
        ? `/api/projects/${project.id}`
        : '/api/projects'
      
      const method = project ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (response.ok) {
        onSave()
        onClose()
        setFormData({
          project_name: '',
          consultation_category: '',
          objectives: '',
          project_purpose: '',
          project_goals: '',
          user_role: '',
          project_period: {},
          user_personal_goals: [],
          kpis: [],
          important_decisions: [],
          ai_auto_update_enabled: true
        })
        setErrors({})
      } else {
        console.error('エラーレスポンス:', data)
        setErrors({ submit: data.error || 'プロジェクトの保存に失敗しました。もう一度お試しください。' })
      }
    } catch (error) {
      console.error('保存エラー:', error)
      setErrors({ submit: 'エラーが発生しました。もう一度お試しください。' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {project ? 'プロジェクト編集' : '新規プロジェクト作成'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 埋められる箇所だけで問題ありません。空白部分はセッションでAIコーチと一緒に埋めていきましょう！
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <input
              id="project_name"
              type="text"
              value={formData.project_name}
              onChange={(e) => {
                setFormData({ ...formData, project_name: e.target.value })
                if (errors.project_name) {
                  setErrors({ ...errors, project_name: '' })
                }
              }}
              placeholder="例: 新規ECサイト立ち上げプロジェクト"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.project_name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.project_name && (
              <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
            )}
          </div>

          {/* 相談カテゴリ選択（2番目の必須項目） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              相談したい内容のカテゴリを選んでください <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {consultationCategories.map((category) => (
                <div 
                  key={category.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.consultation_category === category.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setFormData({ ...formData, consultation_category: category.value })
                    if (errors.consultation_category) {
                      setErrors({ ...errors, consultation_category: '' })
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="consultation_category"
                      value={category.value}
                      checked={formData.consultation_category === category.value}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{category.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.consultation_category && (
              <p className="text-red-500 text-sm mt-1">{errors.consultation_category}</p>
            )}
          </div>

          <div>
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-1">
              このプロジェクトについて、セッションで叶えたいこと、解決したい問題 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => {
                setFormData({ ...formData, objectives: e.target.value })
                if (errors.objectives) {
                  setErrors({ ...errors, objectives: '' })
                }
              }}
              placeholder="例: ECサイトの要件定義から実装まで、技術選定やチーム編成について相談したい"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.objectives ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              required
            />
            {errors.objectives && (
              <p className="text-red-500 text-sm mt-1">{errors.objectives}</p>
            )}
          </div>

          <div>
            <label htmlFor="project_purpose" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクトの目的（任意）
            </label>
            <textarea
              id="project_purpose"
              value={formData.project_purpose}
              onChange={(e) => setFormData({ ...formData, project_purpose: e.target.value })}
              placeholder="例: 自社商品のオンライン販売チャネルを確立し、売上の30%をEC経由にする"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="project_goals" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクトのゴール（任意）
            </label>
            <textarea
              id="project_goals"
              value={formData.project_goals}
              onChange={(e) => setFormData({ ...formData, project_goals: e.target.value })}
              placeholder="例: 2025年12月までにECサイトをローンチし、月商1000万円を達成する"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="user_role" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクト内でのあなたの役割（任意）
            </label>
            <input
              id="user_role"
              type="text"
              value={formData.user_role}
              onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
              placeholder="例: プロジェクトマネージャー"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '作成中...' : (project ? '更新' : '作成')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}