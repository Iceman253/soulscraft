import { X } from 'lucide-react'
import { useRequestStore } from './store'
import { RequestRow } from './gm/RequestRow'

// ── Panel (rendered as a floating dropdown from the TopBar bell) ──────────────
interface Props {
  onClose: () => void
}

export function GMRequestsPanel({ onClose }: Props) {
  const { requests, clearAll } = useRequestStore()
  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <div className="absolute right-0 top-full mt-1 w-80 bg-stone-900 border border-stone-600 rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-stone-800 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-100">Player Requests</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-gold text-stone-900">{pending.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {requests.length > 0 && (
            <button onClick={clearAll} className="text-xs text-stone-500 hover:text-stone-300 transition-colors px-1.5 py-0.5 rounded-sm hover:bg-stone-700">
              Clear all
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-sm text-stone-500 hover:text-stone-300 hover:bg-stone-700 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto p-2.5 space-y-2">
        {requests.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs">
            <div className="text-2xl mb-2">📭</div>
            No requests yet.
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <div className="text-xs text-stone-500 font-medium mb-1.5 px-1">Pending</div>
                <div className="space-y-2">
                  {pending.map(r => <RequestRow key={r.id} req={r} />)}
                </div>
              </div>
            )}
            {resolved.length > 0 && (
              <div>
                <div className="text-xs text-stone-500 font-medium mb-1.5 mt-2 px-1">Resolved</div>
                <div className="space-y-2">
                  {resolved.map(r => <RequestRow key={r.id} req={r} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
