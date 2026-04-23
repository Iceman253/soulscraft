import { useState } from 'react'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { HpBar } from '../../ui/HpBar'
import { SdDots } from '../../ui/SdDots'
import { Badge } from '../../ui/Badge'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { computeDef } from '../../lib/armor'
import { CURRENCY_OPTIONS } from '../../lib/currency'

interface Props {
  focusedCharacterId?: string
}

export function PlayerCharacterPanel({ focusedCharacterId }: Props) {
  const characters = useCharacterStore(s => s.characters)
  const areas = useWorldStore(s => s.areas)
  const travelingMarkers = useWorldStore(s => s.travelingMarkers)
  const [activeTab, setActiveTab] = useState<string>(
    focusedCharacterId && characters.some(c => c.id === focusedCharacterId)
      ? focusedCharacterId
      : (characters[0]?.id ?? '')
  )

  const activeChar = characters.find(c => c.id === activeTab) ?? characters[0]

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-stone-500 text-sm">
        No characters in this campaign.
      </div>
    )
  }

  const location = activeChar ? areas.find(a => a.id === activeChar.locationId) : null
  const travelMarker = activeChar ? travelingMarkers.find(m => m.characterId === activeChar.id) : null

  const BONUS_LABEL: Record<number, string> = { 1: '+1', 2: '+2', 3: '+3' }

  return (
    <div className="h-full flex flex-col bg-stone-900">
      {/* Character tabs */}
      <div className="shrink-0 flex gap-0.5 px-2 pt-2 overflow-x-auto border-b border-stone-700">
        {characters.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs whitespace-nowrap transition-colors ${
              activeTab === c.id
                ? 'bg-stone-800 text-gold border-t border-l border-r border-stone-600 -mb-px pb-2'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            <TokenAvatar name={c.name} characterId={c.id} size={16} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Character content */}
      {activeChar && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <TokenAvatar name={activeChar.name} characterId={activeChar.id} size={48} />
            <div className="min-w-0">
              <div className="font-bold text-stone-100 text-base">{activeChar.name}</div>
              <div className="text-sm text-stone-400">{activeChar.species} · {activeChar.class}</div>
              <div className="text-xs text-stone-500">Level {activeChar.level}</div>
            </div>
          </div>

          {/* Location / travel status */}
          {(location || travelMarker) && (
            <div className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
              travelMarker
                ? 'bg-amber-900/20 border border-amber-700/40 text-amber-300'
                : 'bg-stone-800 border border-stone-700 text-stone-400'
            }`}>
              {travelMarker ? (
                <>
                  <span>🚶</span>
                  <span>
                    Traveling from <span className="text-stone-200">{location?.name ?? '?'}</span>
                    {travelMarker.label && <span className="text-amber-400/80"> — {travelMarker.label}</span>}
                  </span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span className="text-stone-300">{location?.name}</span>
                  <span className="text-stone-500">{location?.type}</span>
                </>
              )}
            </div>
          )}

          {/* Vital stats */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                <span>HP</span>
                <span className="font-mono text-stone-300">{activeChar.currentHp} / {activeChar.maxHp}</span>
              </div>
              <HpBar current={activeChar.currentHp} max={activeChar.maxHp} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400">SD</span>
                <SdDots current={activeChar.currentSd} max={activeChar.maxSd} size="sm" />
                <span className="text-xs text-stone-500 font-mono">({activeChar.currentSd}/{activeChar.maxSd})</span>
              </div>
              <div className="flex items-center gap-1.5">
                {computeDef(activeChar.armorLoadout) > 0 && (
                  <Badge variant="blue">DEF {computeDef(activeChar.armorLoadout)}</Badge>
                )}
                <Badge variant="muted">{activeChar.damageDie}</Badge>
              </div>
            </div>
          </div>

          {/* Skills */}
          {activeChar.skills.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {activeChar.skills.map(s => (
                  <div key={s.id} className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded px-2 py-0.5">
                    <span className="text-xs text-stone-200">{s.name}</span>
                    <span className="text-xs font-bold text-gold font-mono">{BONUS_LABEL[s.bonus] ?? `+${s.bonus}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active effects */}
          {activeChar.activeEffects.length > 0 && (
            <div>
              <div className="text-xs font-medium text-stone-400 mb-2">Active Effects</div>
              <div className="space-y-1">
                {activeChar.activeEffects.map(e => (
                  <div key={e.id} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                    e.damagePerRound
                      ? 'bg-red-900/20 border-red-800/40 text-red-300'
                      : 'bg-emerald/10 border-emerald/30 text-emerald'
                  }`}>
                    <span className="font-medium shrink-0">{e.name}</span>
                    {e.description && <span className="text-stone-400 truncate">{e.description}</span>}
                    {e.damagePerRound && <span className="text-red-400 font-mono shrink-0">🩸{e.damagePerRound}/turn</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-stone-700" />

          {/* On-hand inventory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-stone-400">On Hand</div>
              {activeChar.onHand.items.some(i => i.isBlock) && (
                <div className="text-xs text-stone-500">
                  {activeChar.onHand.items.filter(i => i.isBlock).length}/10 blocks
                </div>
              )}
            </div>
            {activeChar.onHand.items.length === 0 ? (
              <div className="text-xs text-stone-600 italic">Nothing on hand.</div>
            ) : (
              <div className="space-y-1">
                {activeChar.onHand.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-2 py-1 rounded bg-stone-800 text-xs">
                    <span className="text-stone-200">{item.name}</span>
                    <span className="text-stone-400 font-mono">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currency */}
          <div>
            <div className="text-xs font-medium text-stone-400 mb-2">Currency</div>
            <div className="flex items-center gap-3 flex-wrap">
              {CURRENCY_OPTIONS.map(opt => {
                const amount = activeChar.currency[opt.key] ?? 0
                return (
                  <div key={opt.key} className="flex items-center gap-1">
                    <img src={opt.img} alt={opt.label} className="w-4 h-4" />
                    <span className={`text-xs font-semibold ${amount > 0 ? 'text-white' : 'text-stone-600'}`}>{amount}</span>
                    <span className={`text-xs ${amount > 0 ? 'text-stone-400' : 'text-stone-600'}`}>{opt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rations */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">🍖 Rations</span>
            <span className={`text-xs font-semibold ${activeChar.rations > 0 ? 'text-white' : 'text-stone-600'}`}>{activeChar.rations}</span>
          </div>

          {/* Missed rests warning */}
          {activeChar.missedRests > 0 && (
            <div className="bg-orange-900/20 border border-orange-700/40 rounded-lg px-3 py-2 text-xs text-orange-300">
              ⚠️ {activeChar.missedRests} missed rest{activeChar.missedRests !== 1 ? 's' : ''} — -{activeChar.missedRests}d4 on rolls
            </div>
          )}
        </div>
      )}
    </div>
  )
}
