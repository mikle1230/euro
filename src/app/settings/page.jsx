'use client'

import { useRef, useState } from 'react'
import { exportAllData, importAllData } from '@/lib/itinerary-store'
import { getApiToken, setApiToken } from '@/lib/api-config'
import { toast } from '@/components/toast'

// 设置页：数据备份 + 解析 API Token。
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
    <div className="min-h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
          ⚙️ 设置
        </h1>
        <p className="text-xs mt-1 mb-6" style={{ color: 'var(--text-tertiary)' }}>
          数据备份与后续设置项
        </p>

        {/* 数据备份 */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            🛟 数据备份
          </h2>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            行程数据保存在本机浏览器（localStorage，约 5MB 上限），换设备或清缓存会丢失，建议定期导出。
            导入备份会<strong>替换当前全部数据</strong>。
          </p>
          <div className="flex gap-2 max-w-sm">
            <button
              onClick={handleExport}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
              style={{ background: 'var(--accent-strong)', color: '#fff' }}
            >
              💾 导出备份
            </button>
            <button
              onClick={() => backupFileRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-[var(--bg-surface)]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              📥 导入备份
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

        <p className="text-xs mt-6" style={{ color: 'var(--text-tertiary)' }}>
          更多设置项将陆续加入
        </p>

        {/* 解析 API Token（全局设置：服务端配 PARSE_API_TOKEN 后需要） */}
        <div
          className="rounded-xl border p-4 mt-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            🔑 解析 API Token
          </h2>
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
