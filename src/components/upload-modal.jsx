'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { importItinerary, deleteItinerary } from '@/lib/itinerary-store'
import { getCityCode } from '@/lib/quos-mapping'
import { getApiToken } from '@/lib/api-config'
import { matchCity } from '@/lib/city-match'
import { toast } from '@/components/toast'

const ACCEPTED = '.pdf,.docx,.xlsx,.xls'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function UploadModal({ open, onClose, pendingFile = null, onPendingHandled }) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setError('')
      setLoading(false)
      setProgress(0)
      setProgressStage('')
    }
  }, [open])

  // Progress animation during loading
  useEffect(() => {
    if (!loading) {
      setProgress(0)
      setProgressStage('')
      return
    }

    setProgress(2)
    setProgressStage('提取文件文本...')

    const stages = [
      { at: 10, label: '提取文件文本...' },
      { at: 25, label: 'AI 分析行程中...' },
      { at: 60, label: 'AI 识别景点与交通...' },
      { at: 85, label: '整理结构化数据...' },
    ]

    let currentStage = 0
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      // Simulate progress with diminishing returns, max out at 92%
      const simulated = Math.min(92, 2 + Math.log10(elapsed / 100 + 1) * 28)
      setProgress(Math.round(simulated))

      // Advance stages
      while (currentStage < stages.length && simulated >= stages[currentStage].at) {
        setProgressStage(stages[currentStage].label)
        currentStage++
      }
    }, 200)

    return () => clearInterval(timer)
  }, [loading])

  // 解析成功后直接导入（跳过预览），带「撤销」toast
  const performImport = useCallback((data) => {
    const days = (data.days || []).map((d, idx) => {
      const city = matchCity(d.cityName)
      // AI 直接输出的 cityCode 优先；缺失时用 QUOS 码表兜底
      const cityInfo = getCityCode(d.cityName, d.cityNameEn)
      const items = (d.items || []).map((item) => ({
        id: undefined, // will be generated
        type: item.type || 'attraction',
        name: item.name || '',
        nameEn: item.nameEn || '',
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        from: item.from || '',
        to: item.to || '',
        transportMode: item.transportMode || 'bus',
        transportSubtype: item.transportSubtype || '',
        distance: item.distance || null,
        duration: item.duration || null,
        // Cost — 报价注入项（quoteKind）才有真实价格；AI 解析的普通项只有 estimatedCost（¥估算）。
        // AI 偶尔会自发输出 schema 里没有的 price/priceUnit/currency（幻觉），普通项一律不信任，避免显示假的 €xxx。
        costCategory: item.costCategory || '',
        estimatedCost: item.estimatedCost || 0,
        price: item.quoteKind ? (item.price || 0) : 0,
        priceUnit: item.priceUnit || 'perPerson',
        currency: item.currency || '',
        quantity: item.quantity || 0,
        notes: item.notes || '',
        quoteKind: item.quoteKind || undefined,
        quoteOrder: item.quoteOrder ?? undefined,
        locationCategory: item.locationCategory || undefined,
        // 报价注入项自带的国/城必须透传（保险=CN/BJS、THROUGH COACH=供应商所在地）
        cityCode: item.cityCode || '',
        countryCode: item.countryCode || '',
      }))

      return {
        dayNumber: d.dayNumber ?? idx + 1,
        cityId: city?.id || '',
        cityName: city?.name || d.cityName || '',
        cityNameEn: d.cityNameEn || '',
        cityCode: cityInfo?.cityCode || d.cityCode || '',
        countryCode: cityInfo?.countryCode || d.countryCode || '',
        finalCityName: d.finalCityName || '',
        finalCityNameEn: d.finalCityNameEn || '',
        items,
      }
    })

    const itinerary = importItinerary({
      name: data.tourName || '导入行程',
      tourCode: data.tourCode || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      groupSize: data.groupSize || 0,
      sourceText: data.sourceText || '',
      days,
    })

    onClose()
    router.push('/explore')
    toast(`已导入「${itinerary.name}」（${itinerary.days.length} 天）`, 'success', 6000, '撤销', () => deleteItinerary(itinerary.id))
  }, [onClose, router])

  const handleFile = useCallback(async (file) => {
    // Validate
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx', 'xlsx', 'xls'].includes(ext)) {
      setError('不支持的文件格式，请上传 PDF、Word (.docx) 或 Excel (.xlsx) 文件')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('文件大小不能超过 10MB')
      return
    }

    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const headers = {}
      const token = getApiToken()
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/parse-itinerary', {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await res.json()
      if (res.status === 401) {
        setError('解析接口未授权：请到「设置」页填入 API Token（与 PARSE_API_TOKEN 一致）')
        return
      }
      if (!res.ok) {
        throw new Error(data.error || '解析失败')
      }

      performImport(data)
    } catch (err) {
      setError(err.message || '解析失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [performImport])

  // 外部直接选好文件（点「导入」→ 本地文件选择器）后，弹窗直接进入上传进度
  useEffect(() => {
    if (open && pendingFile) {
      handleFile(pendingFile)
      onPendingHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingFile])

  // Drag & drop handlers（失败重试时仍可拖拽）
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // Keyboard: Escape to close（上传中不允许关闭）
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, loading, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div
        className="rounded-2xl border shadow-2xl w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 480,
          maxHeight: '85vh',
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            📤 导入行程文件
          </h2>
          <button
            onClick={loading ? undefined : onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: 'var(--text-tertiary)',
              opacity: loading ? 0.3 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body —— 只显示进度条；解析成功自动导入并关闭 */}
        <div className="p-5">
          {!loading && (
            <>
              {/* Drop zone（失败重试时可见） */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: dragOver ? 'var(--accent)' : 'var(--border-color)',
                  background: dragOver ? 'rgba(8, 115, 157, 0.05)' : 'var(--bg-surface)',
                }}
              >
                <div className="text-4xl mb-3">📎</div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  支持 PDF、Word (.docx)、Excel (.xlsx) — 最大 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleChange}
                className="hidden"
              />
            </>
          )}

          {/* Loading with progress bar */}
          {loading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{progressStage || '准备中...'}</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--accent-strong)',
                  }}
                />
              </div>
              <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>
                AI 分析通常需要 10-60 秒（行程越大越久），完成后自动导入
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
              }}
            >
              <span className="font-medium">⚠️ </span>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
