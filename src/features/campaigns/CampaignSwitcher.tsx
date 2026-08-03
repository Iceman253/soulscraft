import { useState } from 'react'
import { Plus, Upload, Trash2, Download, ChevronRight, Shield, User, Lock, KeyRound } from 'lucide-react'
import { useCampaignStore, getRememberedCode, wasCreatedHere } from './store'
import { TokenAvatar } from '../../ui/TokenAvatar'

interface Props {
  onPlay: (campaignId: string, characterId: string | null) => void
  /** Players (phones) can't create/delete campaigns and skip the GM role choice. */
  playerOnly?: boolean
}

export function CampaignSwitcher({ onPlay, playerOnly }: Props) {
  const { index, createCampaign, deleteCampaign, exportCampaign, importCampaign, stageCampaign } = useCampaignStore()
  // Select the stable `staged` ref and derive the array OUTSIDE the selector — a
  // selector returning a fresh `[]` each render triggers an infinite loop under
  // Zustand v5 / useSyncExternalStore.
  const staged = useCampaignStore(s => s.staged)
  const stagedCharacters = staged?.data.characters ?? []

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState(false)

  // Code-entry gate
  const [codePrompt, setCodePrompt] = useState<{ id: string; name: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  // Role / character picker (after a successful code entry)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [roleStep, setRoleStep] = useState<'pick-role' | 'pick-character'>('pick-role')

  // Delete (GM) needs the code too
  const [deletePrompt, setDeletePrompt] = useState<{ id: string; name: string } | null>(null)
  const [deleteCode, setDeleteCode] = useState('')

  // After a successful stage, route to the role / character picker.
  const proceed = (id: string) => {
    setCodePrompt(null)
    if (playerOnly) {
      const chars = useCampaignStore.getState().staged?.data.characters ?? []
      if (chars.length === 0) { onPlay(id, ''); return }
      setPendingId(id); setRoleStep('pick-character')
    } else {
      setPendingId(id); setRoleStep('pick-role')
    }
  }

  const openEnter = async (id: string, name: string) => {
    // If this device already knows the code (created it, or entered before),
    // enter without prompting — the GM never re-types their own code.
    const known = getRememberedCode(id)
    if (known && await stageCampaign(id, known)) { proceed(id); return }
    setCode(''); setCodeError(null); setCodePrompt({ id, name })
  }

  const submitCode = async () => {
    if (!codePrompt || busy) return
    setBusy(true); setCodeError(null)
    const ok = await stageCampaign(codePrompt.id, code)
    setBusy(false)
    if (!ok) { setCodeError('Wrong code, or the campaign is unavailable.'); return }
    proceed(codePrompt.id)
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim() || busy) return
    setBusy(true)
    const id = await createCampaign(newName.trim(), newCode.trim())
    if (!id) { setBusy(false); alert('Could not create the campaign (server unreachable?).'); return }
    const ok = await stageCampaign(id, newCode.trim())
    setBusy(false)
    setShowNew(false); setNewName(''); setNewCode('')
    if (ok) onPlay(id, null)   // creator enters as GM
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const code = window.prompt('Set a campaign code for this imported campaign:')
      if (!code) return
      const id = await importCampaign(text, code)
      if (!id) { alert('Invalid campaign file or server error.'); return }
      const ok = await stageCampaign(id, code)
      if (ok) onPlay(id, null)
    }
    input.click()
  }

  const confirmDelete = async () => {
    if (!deletePrompt) return
    await deleteCampaign(deletePrompt.id, deleteCode)
    setDeletePrompt(null); setDeleteCode('')
  }

  return (
    <div
      className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8"
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
    >
      {/* Header */}
      <div className="mb-10 text-center select-none">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src="/enchanted-book.png" alt="" className="w-8 h-8 opacity-80" />
          <h1 className="font-display text-gold" style={{ fontSize: '14px', letterSpacing: '0.04em' }}>Soulscraft</h1>
          <img src="/enchanted-book.png" alt="" className="w-8 h-8 opacity-80 scale-x-[-1]" />
        </div>
        <p className="font-heading text-stone-400 tracking-widest uppercase" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>
          Campaign Archive
        </p>
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
        {/* Action row — GM only */}
        {!playerOnly && (
          <div className="flex gap-2 mb-5">
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold transition-all rounded font-heading tracking-wide"
              style={{ fontSize: '12px', letterSpacing: '0.08em' }}>
              <Plus size={14} /> New Campaign
            </button>
            <button onClick={handleImport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-stone-600 text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-all rounded font-heading"
              style={{ fontSize: '12px', letterSpacing: '0.08em' }}>
              <Upload size={13} /> Import
            </button>
          </div>
        )}

        {index.length === 0 && (
          <div className="text-center py-20">
            <p className="font-heading text-stone-500 tracking-wider mb-1" style={{ fontSize: '13px' }}>No campaigns yet</p>
            <p className="text-stone-500 text-sm">{playerOnly ? 'Ask your GM to create one.' : 'Create one above to begin your chronicle.'}</p>
          </div>
        )}

        {/* Campaign list */}
        <div className="divide-y divide-stone-700">
          {index.map(meta => (
            <div key={meta.id} className="group flex items-center gap-4 py-4 hover:bg-stone-800/60 px-3 -mx-3 rounded transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-heading text-stone-100 tracking-wide mb-0.5" style={{ fontSize: '14px' }}>{meta.name}</div>
                <div className="text-xs text-stone-500 mt-1 font-mono">{new Date(meta.updatedAt).toLocaleString()}</div>
                {/* Code is shown ONLY on the device that created this campaign. */}
                {!playerOnly && wasCreatedHere(meta.id) && getRememberedCode(meta.id) && (
                  <div className="text-xs mt-1 flex items-center gap-1 text-stone-400">
                    <KeyRound size={11} className="text-gold/70" />
                    <span className="text-stone-500">Code:</span>
                    <span className="font-mono text-gold/90 select-all">{getRememberedCode(meta.id)}</span>
                  </div>
                )}
              </div>

              {!playerOnly && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => exportCampaign(meta.id)} title="Export"
                    className="p-1.5 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700 transition-colors">
                    <Download size={14} />
                  </button>
                  <button onClick={() => { setDeleteCode(''); setDeletePrompt({ id: meta.id, name: meta.name }) }} title="Delete"
                    className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-700 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <button onClick={() => openEnter(meta.id, meta.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-stone-600 text-stone-300 hover:border-gold/50 hover:text-gold text-sm font-heading transition-all shrink-0 group-hover:border-stone-500"
                style={{ fontSize: '12px', letterSpacing: '0.06em' }}>
                Enter <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Code prompt */}
      {codePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-heading text-stone-100 mb-1 tracking-wider flex items-center gap-2" style={{ fontSize: '15px' }}>
              <Lock size={14} className="text-gold" /> {codePrompt.name}
            </h2>
            <p className="text-stone-500 text-sm mb-4 italic">Enter the campaign code from your GM.</p>
            <input autoFocus type="password" value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitCode()}
              placeholder="Campaign code"
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/60 text-sm" />
            {codeError && <div className="text-red-400 text-xs mt-2">{codeError}</div>}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setCodePrompt(null)} className="px-3 py-1.5 rounded border border-stone-600 text-stone-400 hover:text-stone-200 text-sm">Cancel</button>
              <button onClick={submitCode} disabled={busy || !code}
                className="px-4 py-1.5 rounded border border-gold/60 text-gold hover:bg-gold/10 font-heading text-sm disabled:opacity-40">
                {busy ? 'Checking…' : 'Enter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign (GM) */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-heading text-stone-100 mb-4 tracking-wider" style={{ fontSize: '15px' }}>New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-widest" style={{ fontSize: '10px' }}>Campaign Name *</label>
                <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="The Nether Expedition…"
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/60 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1 uppercase tracking-widest" style={{ fontSize: '10px' }}>Campaign Code * <span className="text-stone-600 normal-case">(players need this to join)</span></label>
                <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. nether42"
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-gold/60 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowNew(false); setNewName(''); setNewCode('') }}
                className="px-3 py-1.5 rounded border border-stone-600 text-stone-400 hover:text-stone-200 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={busy || !newName.trim() || !newCode.trim()}
                className="px-4 py-1.5 rounded border border-gold/60 text-gold hover:bg-gold/10 font-heading text-sm disabled:opacity-40">
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm (GM) — requires the code */}
      {deletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-red-800/50 rounded p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-heading text-red-300 mb-1 tracking-wider" style={{ fontSize: '15px' }}>Delete "{deletePrompt.name}"</h2>
            <p className="text-stone-500 text-sm mb-4">This permanently deletes the campaign from the server. Enter its code to confirm.</p>
            <input autoFocus type="password" value={deleteCode} onChange={e => setDeleteCode(e.target.value)}
              placeholder="Campaign code"
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 outline-none focus:border-red-500/60 text-sm" />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setDeletePrompt(null)} className="px-3 py-1.5 rounded border border-stone-600 text-stone-400 hover:text-stone-200 text-sm">Cancel</button>
              <button onClick={confirmDelete} disabled={!deleteCode}
                className="px-4 py-1.5 rounded bg-red-800 text-red-100 hover:bg-red-700 text-sm disabled:opacity-40">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Role / character picker */}
      {pendingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-stone-800 border border-stone-600 rounded p-6 w-full max-w-sm shadow-2xl">
            {roleStep === 'pick-role' ? (
              <>
                <h2 className="font-heading text-stone-100 text-center mb-1 tracking-wider" style={{ fontSize: '15px' }}>Who are you?</h2>
                <p className="text-stone-500 text-sm text-center mb-6 italic">Choose how you want to play this session.</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { onPlay(pendingId, null); setPendingId(null) }}
                    className="flex items-center gap-3 p-4 rounded border border-stone-600 hover:border-gold/40 hover:bg-stone-700/50 text-left transition-all">
                    <Shield size={20} className="text-gold shrink-0" />
                    <div>
                      <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>Game Master</div>
                      <div className="text-xs text-stone-500 mt-0.5">Full control — manage the world, characters, and combat.</div>
                    </div>
                  </button>
                  <button onClick={() => {
                      if (stagedCharacters.length === 0) { onPlay(pendingId, ''); setPendingId(null) }
                      else setRoleStep('pick-character')
                    }}
                    className="flex items-center gap-3 p-4 rounded border border-stone-600 hover:border-teal-500/40 hover:bg-stone-700/50 text-left transition-all">
                    <User size={20} className="text-teal-400 shrink-0" />
                    <div>
                      <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>Player</div>
                      <div className="text-xs text-stone-500 mt-0.5">Play as one of the characters.</div>
                    </div>
                  </button>
                </div>
                <button onClick={() => setPendingId(null)} className="mt-5 w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors">Cancel</button>
              </>
            ) : (
              <>
                <h2 className="font-heading text-stone-100 text-center mb-1 tracking-wider" style={{ fontSize: '15px' }}>Which character are you?</h2>
                <p className="text-stone-500 text-sm text-center mb-4 italic">Select your character, or create a new one.</p>
                <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  <button onClick={() => { onPlay(pendingId, ''); setPendingId(null) }}
                    className="flex items-center gap-3 p-3 rounded border border-dashed border-gold/40 hover:border-gold/70 hover:bg-gold/5 text-left transition-all">
                    <span className="w-8 h-8 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shrink-0"><User size={16} /></span>
                    <div>
                      <div className="font-heading text-gold tracking-wide" style={{ fontSize: '13px' }}>Create a new character</div>
                      <div className="text-xs text-stone-500">Make your own hero for this campaign.</div>
                    </div>
                  </button>
                  {stagedCharacters.filter(c => !c.isDead).map(c => (
                    <button key={c.id} onClick={() => { onPlay(pendingId, c.id); setPendingId(null) }}
                      className="flex items-center gap-3 p-3 rounded border border-stone-600 hover:border-teal-500/40 hover:bg-stone-700/50 text-left transition-all">
                      <TokenAvatar name={c.name} characterId={c.id} size={32} />
                      <div>
                        <div className="font-heading text-stone-100 tracking-wide" style={{ fontSize: '13px' }}>{c.name}</div>
                        <div className="text-xs text-stone-500">{c.class} · Level {c.level}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => playerOnly ? setPendingId(null) : setRoleStep('pick-role')}
                  className="mt-4 w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors">
                  {playerOnly ? 'Cancel' : '← Back'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
