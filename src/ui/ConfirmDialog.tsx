import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-stone-300 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={`px-3 py-1.5 rounded text-sm font-medium ${danger ? 'bg-redstone hover:bg-red-700 text-white' : 'bg-gold hover:bg-yellow-400 text-stone-900'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
