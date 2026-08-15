'use client'

import { useState, useEffect } from 'react'
import {
  useItineraries,
  deleteItinerary,
  renameItinerary,
  setActiveItinerary,
  replaceItineraryContent,
  getQuotaWarning,
  subscribeQuotaWarning,
} from '@/lib/itinerary-store'
import { getCityCode } from '@/lib/quos-mapping'
import { matchCity } from '@/lib/city-match'
import { getApiToken } from '@/lib/api-config'
import ConfirmDialog from '@/components/confirm-dialog'
import Modal from '@/components/modal'
import { toast } from '@/components/toast'

// ---- 行程卡片信息派生 ----

// 路线摘要：相邻相同城市合并，最多显示前 5 个，超出加省略
function routeSummary(it) {
  const cities = []
  it.days.forEach((d) => {
    const name = d.cityName
    if (!name) return
    if (cities[cities.length - 1] !== name) cities.push(name)
  })
  const max = 5
  return cities.slice(0, max).join('→') + (cities.length > max ? '→…' : '')
}

// 行程详情进度（收费清单勾选）+ 三态状态
const STATUS = {
  todo: { icon: '📋', label: '待录入', bg: 'var(--bg-surface)', color: 'var(--text-tertiary)' },
  doing: { icon: '🔄', label: '进行中', bg: 'var(--accent-subtle)', color: 'var(--accent)' },
  done: { icon: '✅', label: '已完成', bg: 'rgba(79, 115, 31, 0.12)', color: '#4f731f' },
}

function getQuosStatus(it) {
  let total = 0
  let done = 0
  it.days.forEach((d) => d.items.forEach((i) => { total++; if (i.quosChecked) done++ }))
  if (total === 0 || done === 0) return { ...STATUS.todo, total, done }
  if (done === total) return { ...STATUS.done, total, done }
  return { ...STATUS.doing, total, done }
}

// 未匹配城市（cityId 为空 = 没匹配到本地数据）
function getUnmatchedCities(it) {
  const set = new Set()
  it.days.forEach((d) => { if (!d.cityId && d.cityName) set.add(d.cityName) })
  return [...set]
}

export default function ItineraryList({ activeItinerary, onNavigate }) {
  const { itineraries } = useItineraries()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [quotaWarning, setQuotaWarningState] = useState(() => getQuotaWarning())
  // AI 反馈重解析
  const [feedbackTarget, setFeedbackTarget] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  // 存储空间告警（localStorage 写满时显示，提示去「设置」导出备份）
  useEffect(() => {
    return subscribeQuotaWarning(setQuotaWarningState)
  }, [])

  // 提交 AI 反馈：带原文 + 上次结果 + 反馈重新解析，成功后原地替换行程内容
  const handleFeedbackSubmit = async () => {
    if (!feedbackTarget) return
    if (!feedbackText.trim()) {
      toast('请先填写反馈内容', 'error')
      return
    }

    setFeedbackLoading(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      const token = getApiToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      // 上次解析结果（精简版，供 AI 参考；排除报价注入项）
      const current = {
        days: feedbackTarget.days.map((d) => ({
          dayNumber: d.dayNumber,
          cityName: d.cityName,
          cityNameEn: d.cityNameEn,
          items: (d.items || [])
            .filter((i) => !i.quoteKind)
            .map((i) => ({
              type: i.type,
              name: i.name,
              nameEn: i.nameEn,
              startTime: i.startTime,
              endTime: i.endTime,
              from: i.from,
              to: i.to,
              transportMode: i.transportMode,
              transportSubtype: i.transportSubtype,
              costCategory: i.costCategory,
              estimatedCost: i.estimatedCost,
              notes: i.notes,
            })),
        })),
      }

      const res = await fetch('/api/reparse-itinerary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceText: feedbackTarget.sourceText,
          feedback: feedbackText.trim(),
          current,
        }),
      })

      const data = await res.json()
      if (res.status === 401) {
        toast('解析接口未授权：请到「设置」页填入 API Token', 'error')
        return
      }
      if (!res.ok) {
        throw new Error(data.error || '重新解析失败')
      }

      // 城市匹配（与导入流程一致）
      const days = (data.days || []).map((d, idx) => {
        const city = matchCity(d.cityName)
        const cityInfo = getCityCode(d.cityName, d.cityNameEn)
        return {
          dayNumber: d.dayNumber ?? idx + 1,
          cityId: city?.id || '',
          cityName: city?.name || d.cityName || '',
          cityNameEn: d.cityNameEn || '',
          cityCode: d.cityCode || cityInfo?.cityCode || '',
          countryCode: d.countryCode || cityInfo?.countryCode || '',
          finalCityName: d.finalCityName || '',
          finalCityNameEn: d.finalCityNameEn || '',
          items: d.items || [],
        }
      })

      replaceItineraryContent(feedbackTarget.id, {
        days,
        name: data.tourName,
        tourCode: data.tourCode,
        startDate: data.startDate,
        endDate: data.endDate,
        groupSize: data.groupSize,
      })
      setFeedbackTarget(null)
      setFeedbackText('')
      toast(`已按反馈重新解析并替换「${data.tourName || feedbackTarget.name}」`, 'success')
    } catch (err) {
      toast('重新解析失败：' + (err.message || '未知错误'), 'error')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const formatTime = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  }

  const handleDelete = (id) => {
    deleteItinerary(id)
  }

  const handleSelect = (it) => {
    setActiveItinerary(it.id)
    onNavigate()
  }

  const handleRename = (id) => {
    if (editName.trim()) {
      renameItinerary(id, editName.trim())
      setEditingId(null)
    }
  }

  return (
    <div className="p-3">
      {/* Storage quota warning */}
      {quotaWarning && (
        <div
          className="mb-3 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
        >
          <span>⚠️</span>
          <span className="flex-1">
            本地存储空间不足，最近的修改可能<b>没有保存</b>。请前往右上角「设置」→「数据备份」导出备份，并清理旧行程。
          </span>
        </div>
      )}

      {/* Itinerary list */}
      {itineraries.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-3xl mb-3">🗺️</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            还没有行程，导入行程文件后自动解析成结构化清单
          </p>
          <button
            onClick={() => document.querySelector('header [aria-label="导入行程文件"]')?.click()}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-medium transition-all"
            style={{ background: 'var(--accent-strong)', color: '#fff' }}
          >
            📤 导入行程
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {itineraries.map((it) => {
            const isActive = activeItinerary?.id === it.id
            const status = getQuosStatus(it)
            const unmatched = getUnmatchedCities(it)
            const route = routeSummary(it)
            const dateText = it.startDate
              ? `${it.startDate.slice(5)}${it.endDate ? '→' + it.endDate.slice(5) : ''}`
              : ''
            return (
              <div
                key={it.id}
                className="rounded-xl border transition-all cursor-pointer hover:shadow-md active:scale-[0.99] active:opacity-90"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'var(--bg-card)',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border-color)',
                }}
                onClick={() => handleSelect(it)}
              >
                {editingId === it.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(it.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => handleRename(it.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="m-3 w-[calc(100%-1.5rem)] px-2 py-1.5 rounded text-sm border outline-none"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                ) : (
                  <>
                    {/* 第 1 行：标识（团号优先/#N 兜底）+ 名称（完整不截断）+ 状态角标 */}
                    <div className="flex items-start gap-2 px-3 pt-2.5">
                      {it.tourCode ? (
                        <span
                          className="shrink-0 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold mt-0.5"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                          {it.tourCode}
                        </span>
                      ) : it.serialNumber ? (
                        <span
                          className="shrink-0 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold mt-0.5"
                          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                        >
                          #{it.serialNumber}
                        </span>
                      ) : null}
                      <p className="flex-1 min-w-0 text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {it.name}
                      </p>
                      <span
                        className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-0.5"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>

                    {/* 第 2 行：路线 */}
                    {route && (
                      <div className="px-3 mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="shrink-0">🗺️</span>
                        <span className="truncate">{route}</span>
                      </div>
                    )}

                    {/* 第 3 行：参数 + 工作流状态 */}
                    <div className="px-3 py-2 text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {dateText && <span>📅 {dateText}</span>}
                      <span>🗓 {it.days.length}天</span>
                      {it.groupSize > 0 && <span>👥 {it.groupSize}人</span>}
                      {status.total > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}>📋 已录 {status.done}/{status.total}</span>
                      )}
                      {unmatched.length > 0 && (
                        <span style={{ color: '#c05a30' }}>⚠️ {unmatched.length}城未匹配</span>
                      )}
                      {it.updatedAt && <span>更新于 {formatTime(it.updatedAt)}</span>}
                    </div>

                    {/* 操作行（触控目标 ≥32px） */}
                    <div className="px-2.5 pb-2.5 flex justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!it.sourceText) {
                            toast('该行程没有保留原文（旧版本导入），无法反馈重解析', 'error')
                            return
                          }
                          setFeedbackTarget(it)
                          setFeedbackText('')
                        }}
                        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-medium border transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                      >
                        🤖 反馈重解析
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(it.id)
                          setEditName(it.name)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-medium border transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                      >
                        ✏️ 重命名
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(it)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-medium border transition-colors hover:bg-[var(--bg-elevated)]"
                        style={{ borderColor: 'var(--border-color)', color: '#c05a30' }}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="删除行程"
          message={`确定删除「${deleteTarget.name}」？此操作不可恢复。`}
          onConfirm={() => {
            handleDelete(deleteTarget.id)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* AI 反馈重解析弹窗 */}
      {feedbackTarget && (
        <Modal
          title={`🤖 AI 反馈重解析：${feedbackTarget.name}`}
          onClose={feedbackLoading ? undefined : () => setFeedbackTarget(null)}
          width="w-96"
        >
          <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            导入后人工检查发现的问题，写在这里反馈给 AI。AI 会带原文重新解析并替换当前行程内容。
          </p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="例如：第 3 天应该是罗马而不是巴黎；第 5 天漏了火车交通；XX 景点应该是免费…"
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setFeedbackTarget(null)}
              disabled={feedbackLoading}
              className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-40"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              取消
            </button>
            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackLoading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60"
              style={{ background: 'var(--accent-strong)', color: '#fff' }}
            >
              {feedbackLoading ? 'AI 重新解析中...' : '提交反馈并重解析'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
