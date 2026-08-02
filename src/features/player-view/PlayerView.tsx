import { useState } from 'react'
import { Eye, Edit3, Check } from 'lucide-react'
import { useCombatStore } from '../combat/store'
import { useWorldStore } from '../map/store'
import { useIsPhone } from '../../lib/useIsPhone'
import { PlayerMap } from './PlayerMap'
import { PlayerCombatView } from './PlayerCombatView'
import { PlayerCharacterPanel } from './PlayerCharacterPanel'
import { PlayerMobileView } from './PlayerMobileView'

interface PlayerViewProps {
  onClose: () => void
  isPlayerMode?: boolean
  focusedCharacterId?: string
}

export function PlayerView({ onClose, isPlayerMode, focusedCharacterId }: PlayerViewProps) {
  const isPhone = useIsPhone()
  const combatActive = useCombatStore(s => s.session !== null && !s.session.ended)
  const { sessionNote, setSessionNote } = useWorldStore()

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

  // Phones (iPhone/Android) get a purpose-built, large-type, bottom-nav layout.
  // iPad and desktop keep the two-column view below.
  if (isPhone) {
    return (
      <PlayerMobileView
        onClose={onClose}
        isPlayerMode={isPlayerMode}
        focusedCharacterId={focusedCharacterId}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-stone-950 text-stone-100">
      {/* Header — GM controls */}
      <div className="shrink-0 bg-stone-900 border-b border-stone-700 px-4 py-2 flex items-center gap-3">
        <Eye size={15} className="text-teal-400 shrink-0" />
        <span className="font-semibold text-stone-200 text-sm shrink-0">Player View</span>
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

      {/* Two-column body (iPad / desktop) */}
      <div className="flex flex-1 min-h-0">
        {/* Left: map or combat */}
        <div className="flex-1 min-w-0 min-h-0">
          {combatActive ? <PlayerCombatView /> : <PlayerMap />}
        </div>

        {/* Right: character stats + inventory — always visible */}
        <div className="w-80 shrink-0 border-l border-stone-700 min-h-0">
          <PlayerCharacterPanel focusedCharacterId={focusedCharacterId} />
        </div>
      </div>
    </div>
  )
}
