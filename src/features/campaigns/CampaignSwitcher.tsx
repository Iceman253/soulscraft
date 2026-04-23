import { useState, useMemo } from 'react'
import { Plus, Upload, Trash2, Download, Play, Shield, User } from 'lucide-react'
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

  // Role picker
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [roleStep, setRoleStep] = useState<'pick-role' | 'pick-character'>('pick-role')
  const pendingCharacters = useMemo(
    () => (pendingId ? (loadCampaign(pendingId)?.characters ?? []) : []),
    [pendingId],
  )

  const openRolePicker = (id: string) => {
    setPendingId(id)
    setRoleStep('pick-role')
  }

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
      <div className="mb-8 text-center">
        <h1 className="font-display text-gold text-2xl mb-2">Soulscraft</h1>
        <p className="text-stone-400 text-sm">Choose a campaign to continue</p>
      </div>

      <div className="w-full max-w-2xl">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm">
            <Plus size={16} /> New Campaign
          </button>
          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2 rounded bg-stone-700 text-stone-200 hover:bg-stone-600 text-sm">
            <Upload size={16} /> Import
          </button>
        </div>

        {index.length === 0 && (
          <div className="text-center py-16 text-stone-500">
            <p className="text-lg mb-2">No campaigns yet</p>
            <p className="text-sm">Create one above to get started</p>
          </div>
        )}

        <div className="space-y-2">
          {index.map(meta => {
            const bytes = getSizeBytes(meta.id)
            const mb = (bytes / 1024 / 1024).toFixed(2)
            const warn = bytes > 3 * 1024 * 1024
            return (
              <div key={meta.id} className="bg-stone-800 border border-stone-600 rounded-lg p-4 flex items-center gap-3 hover:border-stone-500 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-100">{meta.name}</div>
                  {meta.description && <div className="text-sm text-stone-400 truncate">{meta.description}</div>}
                  <div className="text-xs text-stone-500 mt-0.5 flex gap-3">
                    <span>Last played: {new Date(meta.lastPlayedAt).toLocaleDateString()}</span>
                    <span className={warn ? 'text-orange-400' : ''}>{mb} MB {warn ? '⚠️' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => exportCampaign(meta.id)} title="Export" className="p-2 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700">
                    <Download size={15} />
                  </button>
                  <button onClick={() => setDeleteId(meta.id)} title="Delete" className="p-2 rounded text-stone-400 hover:text-red-400 hover:bg-stone-700">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => openRolePicker(meta.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-overworld hover:bg-green-700 text-white text-sm font-medium">
                    <Play size={13} /> Play
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-stone-800 border border-stone-600 rounded-lg p-6 w-full max-w-md">
            <h2 className="font-semibold text-stone-100 mb-4">New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  placeholder="The Nether Expedition..."
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/50 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Role picker modal */}
      {pendingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-stone-800 border border-stone-600 rounded-lg p-6 w-full max-w-sm">
            {roleStep === 'pick-role' ? (
              <>
                <h2 className="font-semibold text-stone-100 mb-1 text-center text-lg">Who are you?</h2>
                <p className="text-stone-400 text-sm text-center mb-6">Choose how you want to play this session.</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { onPlay(pendingId, null); closeRolePicker() }}
                    className="flex items-center gap-3 p-4 rounded-lg bg-stone-700 hover:bg-stone-600 border border-stone-600 hover:border-stone-500 text-left transition-colors"
                  >
                    <Shield size={22} className="text-gold shrink-0" />
                    <div>
                      <div className="font-semibold text-stone-100">Game Master</div>
                      <div className="text-xs text-stone-400 mt-0.5">Full control — manage the world, characters, and combat.</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (pendingCharacters.length === 0) { onPlay(pendingId, ''); closeRolePicker() }
                      else setRoleStep('pick-character')
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg bg-stone-700 hover:bg-stone-600 border border-stone-600 hover:border-stone-500 text-left transition-colors"
                  >
                    <User size={22} className="text-teal-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-stone-100">Player</div>
                      <div className="text-xs text-stone-400 mt-0.5">Read-only view of what your GM has revealed.</div>
                    </div>
                  </button>
                </div>
                <button onClick={closeRolePicker} className="mt-4 w-full text-center text-sm text-stone-500 hover:text-stone-300">Cancel</button>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-stone-100 mb-1 text-center text-lg">Which character are you?</h2>
                <p className="text-stone-400 text-sm text-center mb-4">Select your character for this session.</p>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {pendingCharacters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onPlay(pendingId, c.id); closeRolePicker() }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-stone-700 hover:bg-stone-600 border border-stone-600 hover:border-teal-500 text-left transition-colors"
                    >
                      <TokenAvatar name={c.name} characterId={c.id} size={32} />
                      <div>
                        <div className="font-medium text-stone-100">{c.name}</div>
                        <div className="text-xs text-stone-400">{c.class} · Level {c.level}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setRoleStep('pick-role')} className="mt-4 w-full text-center text-sm text-stone-500 hover:text-stone-300">← Back</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
