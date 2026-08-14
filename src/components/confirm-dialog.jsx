'use client'

import Modal from './modal'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '删除',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} width="w-72">
      <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
          style={{ background: '#e53e3e', color: '#fff' }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
