import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, wide }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-stone-800 border border-stone-600 rounded-lg shadow-2xl flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-4xl' : 'w-full max-w-xl'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-600 shrink-0">
          <h2 className="font-semibold text-stone-100 font-heading tracking-wide">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
