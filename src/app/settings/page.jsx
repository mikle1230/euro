'use client'

import { useRef, useState } from 'react'
import { exportAllData, importAllData } from '@/lib/itinerary-store'
import { getApiToken, setApiToken } from '@/lib/api-config'
import { getQUOSOrder, saveQUOSOrder, DEFAULT_QUOS_ORDER, QUOS_LABELS } from '@/lib/quos-mapping'
import { toast } from '@/components/toast'

// E｜磁贴墙 皮肤：与列表/详情页同一套 token（globals.css 末尾 E 段）。
// 设置页不属于任何国家 → 面板左侧色条用深墨（--e-ink），不借用国家色。
// 只换衣服：控件、字段与行为（导出/导入/排序/保存/Token）一个不动。

// QUOS 类型排序（设置页内联卡片）：行程详情按此顺序排列
function QUOSSortSection() {
  const [order, setOrder] = useState(() => getQUOSOrder())

  const moveUp = (idx) => {
    if (idx <= 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setOrder(next)
  }

  const moveDown = (idx) => {
    if (idx >= order.length - 1) return
    const next = [...order]
    ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
    setOrder(next)
  }

  const save = () => {
    saveQUOSOrder(order)
    toast('已保存 QUOS 排序（重新进入行程详情生效）', 'success')
  }

  return (
    <div className="e-panel mt-4">
      <div className="e-panel-head">
        <h2>QUOS 类型排序</h2>
        <span className="e-panel-no">02</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
        行程详情（按类型视图 / 天内排列）按此顺序显示。拖拽排序暂用按钮代替，调整后点保存。
      </p>
      <div className="flex flex-col gap-1 mb-3">
        {order.map((code, idx) => (
          <div key={code} className="e-quos-row">
            <span className="e-quos-code">{code}</span>
            <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{QUOS_LABELS[code]}</span>
            <button
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className="e-quos-move disabled:opacity-20"
              aria-label={`${QUOS_LABELS[code]} 上移`}
            >▲</button>
            <button
              onClick={() => moveDown(idx)}
              disabled={idx === order.length - 1}
              className="e-quos-move disabled:opacity-20"
              aria-label={`${QUOS_LABELS[code]} 下移`}
            >▼</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 max-w-sm">
        <button
          onClick={() => setOrder([...DEFAULT_QUOS_ORDER])}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs border"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          重置默认
        </button>
        <button
          onClick={save}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--accent-strong)', color: 'var(--on-accent-strong)' }}
        >
          保存
        </button>
      </div>
    </div>
  )
}

// 设置页：数据备份 + QUOS 排序 + 解析 API Token。
// 后续设置项（默认语言等）继续往这里加。
export default function SettingsPage() {
  const backupFileRef = useRef(null)
  const [apiToken, setApiTokenState] = useState(() => getApiToken())

  const handleExport = () => {
    try {
      const data = exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `euro-atlas-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast(`已导出 ${data.itineraries.length} 个行程、${data.entities.length} 个实体`, 'success')
    } catch (err) {
      toast('导出失败：' + (err.message || '未知错误'), 'error')
    }
  }

  const handleImportFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        importAllData(data)
        toast(`已恢复 ${data.itineraries.length} 个行程（当前数据已替换）`, 'success')
      } catch (err) {
        toast('导入失败：' + (err.message || '备份文件无效'), 'error')
      }
    }
    reader.onerror = () => toast('读取文件失败', 'error')
    reader.readAsText(file)
  }

  return (
    <div className="min-h-full" data-skin="e" style={{ background: 'var(--page-ground, var(--bg-secondary))' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <div className="e-page-head">
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            设置
          </h1>
          <span className="e-page-kicker">SETUP</span>
        </div>
        <p className="text-xs mt-2 mb-6" style={{ color: 'var(--text-tertiary)' }}>
          数据备份与后续设置项
        </p>

        {/* 数据备份 */}
        <div className="e-panel">
          <div className="e-panel-head">
            <h2>数据备份</h2>
            <span className="e-panel-no">01</span>
          </div>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            行程数据保存在本机浏览器（localStorage，约 5MB 上限），换设备或清缓存会丢失，建议定期导出。
            导入备份会<strong>替换当前全部数据</strong>。
          </p>
          <div className="flex gap-2 max-w-sm">
            <button
              onClick={handleExport}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{ background: 'var(--accent-strong)', color: 'var(--on-accent-strong)' }}
            >
              导出备份
            </button>
            <button
              onClick={() => backupFileRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-[var(--bg-surface)]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              导入备份
            </button>
            <input
              ref={backupFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                handleImportFile(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* QUOS 类型排序 */}
        <QUOSSortSection />

        <p className="text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
          更多设置项将陆续加入
        </p>

        {/* 解析 API Token（全局设置：服务端配 PARSE_API_TOKEN 后需要） */}
        <div className="e-panel mt-4">
          <div className="e-panel-head">
            <h2>解析 API Token</h2>
            <span className="e-panel-no">03</span>
          </div>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            服务端在 .env.local / Vercel 配置了 PARSE_API_TOKEN 后，导入与反馈重解析需要此凭证；未配置则留空即可。
          </p>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => {
              setApiTokenState(e.target.value)
              setApiToken(e.target.value)
            }}
            placeholder="与 PARSE_API_TOKEN 一致"
            className="w-full max-w-sm px-3 py-2 rounded-lg text-sm border outline-none font-mono"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
