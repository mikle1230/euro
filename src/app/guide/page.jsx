'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useItineraries, setActiveItinerary } from '@/lib/itinerary-store'
import { buildGuideSteps, countFreeItems } from '@/lib/guide-content'

const PROGRESS_KEY = 'euro-guide-progress'

const ACTION_COLOR = {
  '选择': 'var(--accent)',
  '填入': 'var(--gold)',
  '勾选': 'var(--accent)',
  '手动录入': '#e8784a',
  '参考': 'var(--text-tertiary)',
  '操作': 'var(--text-secondary)',
}

function readProgress(itineraryId) {
  if (typeof window === 'undefined') return { current: 0, done: [] }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (raw) return JSON.parse(raw)[itineraryId] || { current: 0, done: [] }
  } catch { /* ignore */ }
  return { current: 0, done: [] }
}

function writeProgress(itineraryId, current, done) {
  if (typeof window === 'undefined') return
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
    all[itineraryId] = { current, done }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

const NAV_SHORT = {
  'nav-new-tour': 'New Tour',
  'nav-config': '配置',
  'nav-segments': 'Segments',
  'nav-tourmaker': 'TourMaker',
  'nav-quote': 'Quote',
  'nav-sales': 'Sales',
  'nav-finalise': 'Finalise',
  'nav-dos': 'DOS',
}

function shortLabel(step) {
  if (step.kind === 'nav') return NAV_SHORT[step.id] || step.title
  return step.item.name || step.quosType
}

export default function GuidePage() {
  const { itineraries, activeId } = useItineraries()
  const activeItinerary = activeId
    ? itineraries.find((t) => t.id === activeId) || itineraries[0] || null
    : itineraries[0] || null

  const steps = buildGuideSteps(activeItinerary)
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState([])

  useEffect(() => {
    if (!activeItinerary) {
      setCurrent(0)
      setDone([])
      return
    }
    const p = readProgress(activeItinerary.id)
    setCurrent(p.current)
    setDone(p.done)
  }, [activeItinerary?.id])

  const safeCurrent = steps.length ? Math.min(current, steps.length - 1) : 0
  const step = steps[safeCurrent]
  const freeCount = countFreeItems(activeItinerary)

  const jumpTo = (i) => {
    setCurrent(i)
    writeProgress(activeItinerary.id, i, done)
  }

  const prevStep = () => {
    if (safeCurrent <= 0) return
    setCurrent(safeCurrent - 1)
    writeProgress(activeItinerary.id, safeCurrent - 1, done)
  }

  const nextStep = () => {
    if (safeCurrent >= steps.length - 1) return
    setCurrent(safeCurrent + 1)
    writeProgress(activeItinerary.id, safeCurrent + 1, done)
  }

  const markDone = () => {
    const nextDone = done.includes(step.id) ? done : [...done, step.id]
    setDone(nextDone)
    if (safeCurrent < steps.length - 1) {
      setCurrent(safeCurrent + 1)
      writeProgress(activeItinerary.id, safeCurrent + 1, nextDone)
    } else {
      writeProgress(activeItinerary.id, safeCurrent, nextDone)
    }
  }

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
              🧭 界面导游
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              照着 QUOS 界面字段，逐步完成录入
            </p>
          </div>
          {itineraries.length > 0 && (
            <select
              value={activeItinerary?.id || ''}
              onChange={(e) => setActiveItinerary(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm max-w-[240px]"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {itineraries.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {!activeItinerary || steps.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">🧭</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              还没有可引导的行程
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              去导入一个行程 →
            </Link>
          </div>
        ) : (
          <>
            {/* 进度条 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                第 {safeCurrent + 1} / {steps.length} 步
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ background: 'var(--accent)', width: `${((safeCurrent + 1) / steps.length) * 100}%` }}
                />
              </div>
              {freeCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
                  已忽略免费 {freeCount} 项
                </span>
              )}
            </div>

            {/* 步骤条（可点击跳转） */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
              {steps.map((s, i) => {
                const isDone = done.includes(s.id)
                const isCurrent = i === safeCurrent
                return (
                  <button
                    key={s.id}
                    onClick={() => jumpTo(i)}
                    title={s.title}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{
                      background: isCurrent ? 'var(--accent-subtle)' : isDone ? 'var(--bg-surface)' : 'var(--bg-card)',
                      borderColor: isCurrent ? 'var(--accent)' : 'var(--border-color)',
                      color: isCurrent ? 'var(--accent)' : isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    }}
                  >
                    <span>{isDone ? '✓' : i + 1}</span>
                    <span className="max-w-[96px] truncate">{shortLabel(s)}</span>
                  </button>
                )
              })}
            </div>

            {/* 当前操作步骤指示 */}
            <div className="rounded-xl border p-4 mb-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="text-xs mb-1 font-medium" style={{ color: 'var(--accent)' }}>
                {step.kind === 'item' ? `Step ${safeCurrent + 1} · Add Serv · 第 ${step.dayNumber} 天` : `Step ${safeCurrent + 1}`}
              </div>
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{step.title}</h2>
              {step.subtitle && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{step.subtitle}</p>
              )}
            </div>

            {/* LDC 高亮卡 */}
            {step.ldc && (
              <div
                className="rounded-xl border p-4 mb-4"
                style={{ background: 'var(--gold-dim)', borderColor: 'var(--gold)' }}
              >
                <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  🚌 LDC 大巴规则（{step.ldc.scope}）
                </div>
                <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>供应商选择（务必）</div>
                  <div className="font-semibold" style={{ color: 'var(--accent)' }}>{step.ldc.supplierRule}</div>
                </div>
                <ul className="space-y-1">
                  {step.ldc.rates.map((r, i) => (
                    <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>· {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 字段映射表 */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>当前界面字段的映射指导</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>QUOS 字段</th>
                      <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>操作</th>
                      <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>填入 / 选择的值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.fields.map((f, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <td className="px-4 py-2.5 align-top font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{f.field}</td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap" style={{ color: ACTION_COLOR[f.action] || 'var(--text-secondary)' }}>{f.action}</td>
                        <td className="px-4 py-2.5 align-top">
                          <span style={{ color: 'var(--text-primary)' }}>
                            <span className="mr-1">{f.confidence}</span>
                            {f.value}
                          </span>
                          {f.note && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{f.note}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prevStep}
                disabled={safeCurrent <= 0}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-40"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                ← 上一步
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={nextStep}
                  disabled={safeCurrent >= steps.length - 1}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-40"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  下一步 →
                </button>
                <button
                  onClick={markDone}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {done.includes(step.id) ? '已完成 ✓' : 'Mark as Done'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
