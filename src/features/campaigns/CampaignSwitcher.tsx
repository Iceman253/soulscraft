import { useState, useMemo } from 'react'
import { Plus, Upload, Trash2, Download, ChevronRight, Shield, User } from 'lucide-react'
import { useCampaignStore } from './store'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { loadCampaign } from '../../lib/storage'
import { TokenAvatar } from '../../ui/TokenAvatar'

interface Props {
  onPlay: (campaignId: string, characterId: string | null) => void
}

export function CampaignSwitcher({ onPlay }: Props) {
  const { index, createCampaign, deleteCampaign, exportCampaign, importCampaign, getSizeBytes } = useCampaignStore()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [pendingId, setPendingId] = useState<string | null>(null)
  const [roleStep, setRoleStep] = useState<'pick-role' | 'pick-character'>('pick-role')
  const pendingCharacters = useMemo(
    () => (pendingId ? (loadCampaign(pendingId)?.characters ?? []) : []),
    [pendingId],
  )

  const openRolePicker = (id: string) => { setPendingId(id); setRoleStep('pick-role') }
  const closeRolePicker = () => setPendingId(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    const id = createCampaign(newName.trim(), newDesc.trim() || undefined)
    onPlay(id, null)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const id = importCampaign(text)
      if (id) onPlay(id, null)
      else alert('Invalid campaign file.')
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8">

      {/* Header */}
      <div className="mb-10 text-center select-none">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src="/enchanted-book.png" alt="" className="w-8 h-8 opacity-80" />
          <h1 className="font-display text-gold" style={{ fontSize: '14px', letterSpacing: '0.04em' }}>
            Soulscraft
          </h1>
          <img src="/enchanted-book.png" alt="" className="w-8 h-8 opacity-80 scale-x-[-1]" />
        </div>
        <p className="font-heading text-stone-400 tracking-widest uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>
          Campaign Archive
        </p>
        {/* Ornamental rule */}
        <div className="flex items-center gap-2 mt-4 justify-center">
          <div className="w-16 h-px bg-stone-600" />
          <div className="w-1 h-1 rounded-full bg-stone-600" />
          <div className="w-24 h-px bg-gold/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
          <div className="w-24 h-px bg-gold/40" />
          <div className="w-1 h-1 rounded-full bg-stone-600" />
          <div className="w-16 h-px bg-stone-600" />
        </div>
      </div>

      <div className="w-full max-w-xl">

        {/* Action row */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold transition-all rounded font-heading tracking-wide"
            style={{ fontSize: '12px', letterSpacing: '0.08em' }}
          >
            <Plus size={14} /> New Campaign
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-all rounded font-heading"
            style={{ fontSize: '12px', letterSpacing: '0.08em' }}
          >
            <Upload size={13} /> Import
          </button>
        </div>

        {/* Empty state */}
        {index.length === 0 && (
          <div className="text-center py-20">
            <p className="font-heading text-stone-500 tracking-wider mb-1" style={{ fontSize: '13px' }}>No campaigns yet</p>
            <p className="text-stone-500 text-sm">Create one above to begin your chronicle.</p>
          </div>
        )}

        {/* Campaign list */}
        <div className="divide-y divide-stone-700">
          {index.map(meta => {
            const bytes = getSizeBytes(meta.id)
            const mb = (bytes / 1024 / 1024).toFixed(2)
            const warn = bytes > 3 * 1024 * 1024
            return (
              <div
                key={meta.id}
                className="group flex items-center gap-4 py-4 hover:bg-stone-800/60 px-3 -mx-3 rounded transition-colors"
              >
                {/* Text block */}
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-stone-100 tracking-wide mb-0.5" style={{ fontSize: '14px' }}>
                    {meta.name}
                  </div>
                  {meta.description && (
                    <div className="text-stone-400 text-sm truncate italic">{meta.description}</div>
                  )}
                  <div className="text-xs text-stone-500 mt-1 flex gap-3 font-mono">
                    <span>{new Date(meta.lastPlayedAt).toLocaleDateString()}</span>
                    {warn && <span className="text-amber-500">{mb} MB ⚠</span>}
                  </div>
                </div>

                {/* Actions — appear on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => exportCampaign(meta.id)}
                    title="Export"
                    className="p-1.5 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700 transition-colors"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(meta.id)}
                    title="Delete"
                    className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Enter button */}
                <button
                  onClick={() => openRolePicker(meta.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-sm font-heading transition-all shrink-0 group-hover:border-stone-500"
                  style={{ fontSize: '12px', letterSpacing: '0.06em' }}
                >
                  Enter <ChevronRight size={13} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* New Campaign modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-heading text-stone-100 mb-4 tracking-wider" style={{ fontSize: '15px' }}>
              New Campaign
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1 font-heading tracking-widest uppercase" style={{ fontSize: '10px' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  placeholder="The Nether Expedition..."
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/60 transition-colors text-sm placeholder:text-stone-600"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 font-heading tracking-widest uppercase" style={{ fontSize: '10px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Optional..."
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/60 transition-colors text-sm placeholder:text-stone-600"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => { setShowNew(false); setNewName(''); setNewDesc('') }}
                className="px-3 py-1.5 rounded border border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-500 text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded border border-gold/60 text-gold hover:bg-gold/10 font-heading text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ fontSize: '12px', letterSpacing: '0.06em' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ConfirmDialog
          title="Delete Campaign"
          message={`Delete "${index.find(m => m.id === deleteId)?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteCampaign(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      )}

      {/* Role / character picker */}
      {pendingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded p-6 w-full max-w-sm shadow-2xl">
            {roleStep === 'pick-role' ? (
              <>
                <h2 className="font-heading text-stone-100 text-center mb-1 tracking-wider" style={{ fontSize: '15px' }}>
                  Who are you?
                </h2>
                <p className="text-stone-500 text-sm text-center mb-6 italic">
                  Choose how you want to play this session.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { onPlay(pendingId, null); closeRolePicker() }}
                    className="flex items-center gap-3 p-4 rounded border border-stone-600 hover:border-gold/40 hover:bg-stone-700/50 text-left transition-all group"
                  >
                    <Shield size={20} className="text-gold shrink-0" />
                    <div>
                      <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>Game Master</div>
                      <div className="text-xs text-stone-500 mt-0.5">Full control — manage the world, characters, and combat.</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (pendingCharacters.length === 0) { onPlay(pendingId, ''); closeRolePicker() }
                      else setRoleStep('pick-character')
                    }}
                    className="flex items-center gap-3 p-4 rounded border border-stone-600 hover:border-teal-500/40 hover:bg-stone-700/50 text-left transition-all"
                  >
                    <User size={20} className="text-teal-400 shrink-0" />
                    <div>
                      <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>Player</div>
                      <div className="text-xs text-stone-500 mt-0.5">Read-only view of what your GM has revealed.</div>
                    </div>
                  </button>
                </div>
                <button
                  onClick={closeRolePicker}
                  className="mt-5 w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="font-heading text-stone-100 text-center mb-1 tracking-wider" style={{ fontSize: '15px' }}>
                  Which character are you?
                </h2>
                <p className="text-stone-500 text-sm text-center mb-4 italic">Select your character for this session.</p>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {pendingCharacters.filter(c => !c.isDead).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onPlay(pendingId, c.id); closeRolePicker() }}
                      className="flex items-center gap-3 p-3 rounded border border-stone-600 hover:border-teal-500/40 hover:bg-stone-700/50 text-left transition-all"
                    >
                      <TokenAvatar name={c.name} characterId={c.id} size={32} />
                      <div>
                        <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>{c.name}</div>
                        <div className="text-xs text-stone-500">{c.class} · Level {c.level}</div>
                      </div>
                    </button>
                  ))}
                  {pendingCharacters.some(c => c.isDead) && (
                    <div className="mt-1 border-t border-stone-700 pt-2">
                      <div className="text-xs text-stone-500 px-1 mb-1.5">Fallen characters</div>
                      {pendingCharacters.filter(c => c.isDead).map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded border border-stone-800 opacity-50 cursor-not-allowed">
                          <span className="text-base">💀</span>
                          <div>
                            <div className="font-heading text-stone-500 tracking-wide line-through" style={{ fontSize: '13px' }}>{c.name}</div>
                            <div className="text-xs text-stone-600">{c.class} · Fallen</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setRoleStep('pick-role')}
                  className="mt-4 w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
