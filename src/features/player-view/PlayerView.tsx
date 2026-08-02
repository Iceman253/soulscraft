import { useState, useEffect } from 'react'
import { Eye, Edit3, Check, User, Map as MapIcon, Swords } from 'lucide-react'
import { useCombatStore } from '../combat/store'
import { useWorldStore } from '../map/store'
import { PlayerMap } from './PlayerMap'
import { PlayerCombatView } from './PlayerCombatView'
import { PlayerCharacterPanel } from './PlayerCharacterPanel'

interface PlayerViewProps {
  onClose: () => void
  isPlayerMode?: boolean
  focusedCharacterId?: string
}

/** Which pane fills the screen on phones. On desktop both show side-by-side. */
type MobilePane = 'character' | 'world'

export function PlayerView({ onClose, isPlayerMode, focusedCharacterId }: PlayerViewProps) {
  const combatActive = useCombatStore(s => s.session !== null && !s.session.ended)
  const { sessionNote, setSessionNote } = useWorldStore()

  // Mobile-only: which pane is showing. Players care about their sheet first.
  const [mobilePane, setMobilePane] = useState<MobilePane>('character')
  // When a fight starts, pull phone users over to the combat view automatically.
  useEffect(() => {
    if (combatActive) setMobilePane('world')
  }, [combatActive])

  // GM can edit the session note inline
  const [editingNote, setEditingNote] = useState(false)
  const [draftNote, setDraftNote] = useState(sessionNote)

  const saveNote = () => {
    setSessionNote(draftNote)
    setEditingNote(false)
  }

  const startEdit = () => {
    setDraftNote(sessionNote)
    setEditingNote(true)
  }

  return (
    <div className="h-full flex flex-col bg-stone-950 text-stone-100">
      {/* Header — GM controls */}
      <div className="shrink-0 bg-stone-900 border-b border-stone-700 px-3 md:px-4 py-2 flex items-center gap-2 md:gap-3">
        <Eye size={15} className="text-teal-400 shrink-0" />
        <span className="font-semibold text-stone-200 text-sm shrink-0 hidden sm:inline">Player View</span>
        {combatActive && (
          <span className="text-xs bg-redstone/20 border border-redstone/40 text-red-400 px-2 py-0.5 rounded shrink-0">
            ⚔️ Combat Active
          </span>
        )}

        {/* Session note — GM edits inline, players see read-only */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {!isPlayerMode && editingNote ? (
            <>
              <input
                autoFocus
                value={draftNote}
                onChange={e => setDraftNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setEditingNote(false) }}
                placeholder="Add a scene note for players…"
                className="flex-1 bg-stone-800 border border-teal-600/50 rounded px-2.5 py-1 text-stone-200 text-sm outline-none placeholder:text-stone-600 min-w-0"
              />
              <button onClick={saveNote} className="shrink-0 p-1 rounded text-teal-400 hover:bg-stone-700">
                <Check size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={!isPlayerMode ? startEdit : undefined}
              disabled={isPlayerMode}
              className={`flex items-center gap-1.5 text-sm truncate min-w-0 group ${
                isPlayerMode ? 'cursor-default text-stone-400' : 'text-stone-400 hover:text-stone-200'
              }`}
              title={isPlayerMode ? undefined : 'Click to edit session note'}
            >
              {sessionNote
                ? <span className="truncate italic text-stone-300">"{sessionNote}"</span>
                : !isPlayerMode
                  ? <span className="text-stone-600 italic">Add a note for players…</span>
                  : null
              }
              {!isPlayerMode && <Edit3 size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          )}
        </div>

        {!isPlayerMode && (
          <button
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors shrink-0 ml-2"
          >
            ← GM View
          </button>
        )}
      </div>

      {/* Session note banner — shown to players when set */}
      {sessionNote && !editingNote && (
        <div className="shrink-0 bg-teal-950/60 border-b border-teal-800/40 px-4 py-2 text-sm text-teal-200 text-center">
          📜 {sessionNote}
        </div>
      )}

      {/* Mobile pane switcher — phones show one pane at a time (hidden on md+) */}
      <div className="md:hidden shrink-0 flex gap-1.5 px-2 py-2 bg-stone-900 border-b border-stone-700">
        <button
          onClick={() => setMobilePane('character')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mobilePane === 'character'
              ? 'bg-teal-600/20 border border-teal-500/50 text-teal-200'
              : 'bg-stone-800 border border-stone-700 text-stone-400'
          }`}
        >
          <User size={15} /> Character
        </button>
        <button
          onClick={() => setMobilePane('world')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            mobilePane === 'world'
              ? combatActive
                ? 'bg-redstone/20 border border-redstone/50 text-red-300'
                : 'bg-teal-600/20 border border-teal-500/50 text-teal-200'
              : 'bg-stone-800 border border-stone-700 text-stone-400'
          }`}
        >
          {combatActive
            ? <><Swords size={15} /> Combat</>
            : <><MapIcon size={15} /> Map</>}
        </button>
      </div>

      {/* Body — side-by-side on desktop, single stacked pane on phones */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Map or combat */}
        <div className={`${mobilePane === 'world' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0`}>
          {combatActive ? <PlayerCombatView /> : <PlayerMap />}
        </div>

        {/* Character stats + inventory */}
        <div className={`${mobilePane === 'character' ? 'block' : 'hidden'} md:block flex-1 md:flex-none w-full md:w-80 shrink-0 md:border-l border-stone-700 min-h-0`}>
          <PlayerCharacterPanel focusedCharacterId={focusedCharacterId} />
        </div>
      </div>
    </div>
  )
}
