import { useState, useEffect, type ReactNode } from 'react'
import {
  User, Map as MapIcon, Swords, Send, Sparkles, Hourglass, RotateCcw,
  ChevronDown, ChevronRight, Trash2, Package, Coins, Heart, Zap, Shield, LogOut,
} from 'lucide-react'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useCombatStore } from '../combat/store'
import { useRequestStore } from '../requests/store'
import { useCampaignStore } from '../campaigns/store'
import { LevelUpModal, type LevelUpInitialState } from '../characters/LevelUpModal'
import { PlayerRequestModal } from './PlayerRequestModal'
import { PlayerMap } from './PlayerMap'
import { PlayerCombatView } from './PlayerCombatView'
import { MobileCharacterCreate } from './MobileCharacterCreate'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { computeDef } from '../../lib/armor'
import { CURRENCY_OPTIONS } from '../../lib/currency'
import { POTION_RECIPES } from '../../lib/potions'
import type { CharacterItem, CombatRole, AppliedStatusEffectSpec } from '../../types'

interface Props {
  onClose: () => void
  isPlayerMode?: boolean
  focusedCharacterId?: string
  onAdoptCharacter?: (characterId: string) => void
}

type Pane = 'character' | 'world'

function rollD6()  { return Math.floor(Math.random() * 6)  + 1 }
function rollD12() { return Math.floor(Math.random() * 12) + 1 }
function roll2d6() { return rollD6() + rollD6() }

export function PlayerMobileView({ onClose, isPlayerMode, focusedCharacterId, onAdoptCharacter }: Props) {
  const {
    characters, adjustHp, adjustSd, addEffect, removeEffect,
    updateOnHandItem, removeOnHandItem, updateCharacter,
  } = useCharacterStore()
  const sessionNote = useWorldStore(s => s.sessionNote)
  const combatActive = useCombatStore(s => s.session !== null && !s.session.ended)
  const exitToSwitcher = useCampaignStore(s => s.exitToSwitcher)

  const [pane, setPane] = useState<Pane>('character')
  useEffect(() => { if (combatActive) setPane('world') }, [combatActive])

  const [activeTab, setActiveTab] = useState<string>(
    focusedCharacterId && characters.some(c => c.id === focusedCharacterId)
      ? focusedCharacterId
      : (characters[0]?.id ?? ''),
  )
  const [expandedAbility, setExpandedAbility] = useState<string | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpInitial, setLevelUpInitial] = useState<LevelUpInitialState | undefined>()
  const [pendingPotion, setPendingPotion] = useState<{ item: CharacterItem } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Phone players are bound to one character. If they have none — or theirs has
  // died — surface the create/adopt flow instead of a character sheet.
  const boundChar = focusedCharacterId ? characters.find(c => c.id === focusedCharacterId) : undefined
  const needsCharacter = !!isPlayerMode && (!boundChar || !!boundChar.isDead)
  const livingOthers = characters.filter(c => !c.isDead && c.id !== boundChar?.id)
  const activeChar = boundChar ?? characters.find(c => c.id === activeTab) ?? characters[0]
  const isOwnChar = !focusedCharacterId || focusedCharacterId === activeChar?.id

  // ── Skill-approval request state (pending / denied) ─────────────────────────
  const requests = useRequestStore(s => s.requests)
  const clearRequest = useRequestStore(s => s.clearRequest)
  const pendingSkillApproval = activeChar
    ? requests.find(r => r.type === 'skill-approval' && r.characterId === activeChar.id && r.status === 'pending')
    : undefined
  const deniedSkillApproval = activeChar
    ? requests.filter(r => r.type === 'skill-approval' && r.characterId === activeChar.id && r.status === 'denied')
        .sort((a, b) => b.createdAt - a.createdAt)[0]
    : undefined

  function retryLevelUpFromDenied() {
    if (!deniedSkillApproval) return
    const p = deniedSkillApproval.payload
    setLevelUpInitial({
      abilityName: typeof p.abilityName === 'string' ? p.abilityName : null,
      skillName: typeof p.skillName === 'string' ? p.skillName : '',
      skillDescription: typeof p.skillDescription === 'string' ? p.skillDescription : '',
      skillRoles: Array.isArray(p.skillCombatRoles) ? p.skillCombatRoles as CombatRole[] : ['general'],
      skillEffects: Array.isArray(p.skillAppliedEffects) ? p.skillAppliedEffects as AppliedStatusEffectSpec[] : [],
    })
    clearRequest(deniedSkillApproval.id)
    setShowLevelUp(true)
  }

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Avoid Death — spend SD to regain HP while at 0 HP (rulebook: 1 SD → 1 HP).
  const avoidDeath = (n: number) => {
    if (!activeChar || n < 1 || n > activeChar.currentSd) return
    adjustSd(activeChar.id, -n)
    adjustHp(activeChar.id, n)
    flash(`Held on — spent ${n} SD to regain ${n} HP.`)
  }

  // ── Potion use (mirrors the desktop panel) ──────────────────────────────────
  function isPotionItem(item: CharacterItem): boolean {
    return POTION_RECIPES.some(r => r.name.toLowerCase() === item.name.toLowerCase())
  }

  function usePotion(item: CharacterItem) {
    if (!activeChar) return
    const recipe = POTION_RECIPES.find(r => r.name.toLowerCase() === item.name.toLowerCase())
    if (!recipe) return

    if (!recipe.instant) { setPendingPotion({ item }); return }

    // Consume one
    if (item.quantity > 1) updateOnHandItem(activeChar.id, item.id, { quantity: item.quantity - 1 })
    else removeOnHandItem(activeChar.id, item.id)

    if (recipe.name === 'Potion of Healing') {
      const r = roll2d6(); adjustHp(activeChar.id, r); flash(`🧪 Healed ${r} HP`)
    } else if (recipe.name === 'Potion of Harming') {
      const r = rollD12(); adjustHp(activeChar.id, -r); flash(`💀 Took ${r} damage`)
    } else if (recipe.name === 'Potion of Restoration') {
      activeChar.activeEffects.forEach(e => removeEffect(activeChar.id, e.id)); flash('✨ Effects cleared')
    } else {
      flash(`🧪 Used ${recipe.name}`)
    }
  }

  function applyPendingPotion(scenes: number) {
    if (!pendingPotion || !activeChar) return
    const { item } = pendingPotion
    const recipe = POTION_RECIPES.find(r => r.name.toLowerCase() === item.name.toLowerCase())
    if (!recipe) { setPendingPotion(null); return }
    if (item.quantity > 1) updateOnHandItem(activeChar.id, item.id, { quantity: item.quantity - 1 })
    else removeOnHandItem(activeChar.id, item.id)
    addEffect(activeChar.id, {
      name: recipe.name.replace('Potion of ', ''),
      description: recipe.effect,
      durationType: 'scenes',
      remaining: scenes,
      damagePerRound: recipe.name === 'Potion of Poison' ? '1d6' : undefined,
    })
    if (recipe.name === 'Potion of Wither') adjustSd(activeChar.id, -activeChar.currentSd)
    flash(`🧪 ${recipe.name}: ${scenes} scene${scenes !== 1 ? 's' : ''}`)
    setPendingPotion(null)
  }

  const def = activeChar ? computeDef(activeChar.armorLoadout) : 0

  return (
    <div className="h-full flex flex-col bg-stone-950 text-stone-100 pt-[env(safe-area-inset-top)]">
      {/* Session note banner */}
      {sessionNote && (
        <div className="shrink-0 bg-teal-950/60 border-b border-teal-800/40 px-4 py-2.5 text-base text-teal-200 text-center">
          📜 {sessionNote}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-xl bg-emerald/15 border border-emerald/40 text-base text-emerald text-center">
          {toast}
        </div>
      )}

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {pane === 'world' ? (
          <div className="h-full">
            {combatActive ? <PlayerCombatView /> : <PlayerMap />}
          </div>
        ) : needsCharacter ? (
          <div className="pb-6">
            {/* After-death notice */}
            {boundChar?.isDead && (
              <div className="mx-4 mt-4 rounded-2xl bg-stone-900 border border-stone-700 p-5 text-center">
                <div className="text-4xl">💀</div>
                <div className="text-xl font-bold text-stone-200 mt-1">{boundChar.name} has fallen.</div>
                <div className="text-base text-stone-500 mt-1">Create a new hero to keep playing.</div>
              </div>
            )}

            {/* Adopt an existing living character instead of creating */}
            {onAdoptCharacter && livingOthers.length > 0 && (
              <div className="px-4 mt-4">
                <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Or take over an existing hero</div>
                <div className="space-y-2">
                  {livingOthers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onAdoptCharacter(c.id); setActiveTab(c.id) }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-700 active:border-gold/50 text-left"
                    >
                      <TokenAvatar name={c.name} characterId={c.id} size={40} />
                      <div>
                        <div className="text-base font-semibold text-stone-100">{c.name}</div>
                        <div className="text-sm text-stone-500">{c.class} · Level {c.level}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <MobileCharacterCreate
              title={boundChar?.isDead ? 'Create a new character' : 'Create your character'}
              onCreated={id => { onAdoptCharacter?.(id); setActiveTab(id) }}
            />
          </div>
        ) : activeChar ? (
          <div className="pb-6">
            {/* ── Death's Door — Avoid Death by spending SD (1 SD → 1 HP) ── */}
            {activeChar.currentHp === 0 && !activeChar.isDead && (
              <div className="mx-4 mt-4 rounded-2xl bg-red-950 border border-red-800 p-4 space-y-3">
                <div className="text-center">
                  <div className="text-3xl">💀</div>
                  <div className="text-xl font-bold text-red-200 mt-1">You're at 0 HP!</div>
                  <div className="text-base text-red-400 mt-0.5">
                    {activeChar.inTower
                      ? 'The Tower protects you — spend SD to fight on, or be ejected with 1 HP.'
                      : 'Spend Soul Dice to survive — each SD restores 1 HP.'}
                  </div>
                </div>
                {activeChar.currentSd > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Array.from({ length: Math.min(activeChar.currentSd, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => avoidDeath(n)}
                        className="px-4 py-2.5 rounded-xl bg-red-800 active:bg-red-700 text-red-100 text-base font-bold border border-red-600">
                        −{n} SD → +{n} HP
                      </button>
                    ))}
                    {activeChar.currentSd >= 2 && (
                      <button onClick={() => avoidDeath(activeChar.currentSd)}
                        className="px-4 py-2.5 rounded-xl bg-red-700 active:bg-red-600 text-white text-base font-bold border-2 border-red-400">
                        Sacrifice all ({activeChar.currentSd})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-base text-red-300 font-medium">No Soul Dice left.</div>
                )}
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3.5 px-4 pt-4">
              <TokenAvatar name={activeChar.name} characterId={activeChar.id} size={60} />
              <div className="min-w-0">
                <div className="text-2xl font-bold font-heading tracking-wide text-stone-100 truncate">{activeChar.name}</div>
                <div className="text-base text-stone-400">{activeChar.species} · {activeChar.class}</div>
                <div className="text-sm text-stone-500 font-mono">Level {activeChar.level}</div>
              </div>
            </div>

            {/* Vitals card — large */}
            <div className="mx-4 mt-4 rounded-2xl bg-stone-900 border border-stone-700 p-4 space-y-4">
              {/* HP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-base text-stone-300"><Heart size={17} className="text-red-400" /> HP</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-stone-100">{activeChar.currentHp}<span className="text-stone-500 text-base"> / {activeChar.maxHp}</span></span>
                </div>
                <div className="h-3 rounded-full bg-stone-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, (activeChar.currentHp / activeChar.maxHp) * 100))}%` }} />
                </div>
              </div>
              {/* SD + DEF + die */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-base">
                  <Zap size={17} className="text-blue-400" />
                  <span className="text-stone-300">SD</span>
                  <span className="font-bold font-mono tabular-nums text-stone-100">{activeChar.currentSd}<span className="text-stone-500"> / {activeChar.maxSd}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  {def > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-800/50 text-blue-300 text-base font-semibold">
                      <Shield size={15} /> {def}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-base font-mono">{activeChar.damageDie}</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            {isOwnChar && (
              <div className="px-4 mt-3 flex gap-2.5">
                {pendingSkillApproval ? (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 border border-amber-500/40 text-amber-300 text-base font-semibold">
                    <Hourglass size={17} /> Pending GM review
                  </div>
                ) : activeChar.xp >= 5 ? (
                  <button
                    onClick={() => { setLevelUpInitial(undefined); setShowLevelUp(true) }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-stone-900 text-base font-bold active:bg-amber-400"
                  >
                    <Sparkles size={18} /> Level Up
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-400 text-base">
                    XP {activeChar.xp} / 5
                  </div>
                )}
                <button
                  onClick={() => setShowRequest(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-800 border border-stone-700 text-teal-300 text-base font-semibold active:bg-stone-700"
                >
                  <Send size={17} /> Ask GM
                </button>
              </div>
            )}

            {/* Denied banner */}
            {isOwnChar && !pendingSkillApproval && deniedSkillApproval && (
              <div className="mx-4 mt-3 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 space-y-2">
                <div className="text-base text-red-300 leading-snug">
                  ❌ The GM denied your skill "{String(deniedSkillApproval.payload.skillName ?? '')}". Adjust and resend.
                </div>
                <div className="flex gap-2">
                  <button onClick={retryLevelUpFromDenied} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-700/40 border border-amber-600/50 text-amber-200 text-base font-medium">
                    <RotateCcw size={16} /> Pick again
                  </button>
                  <button onClick={() => clearRequest(deniedSkillApproval.id)} className="px-4 py-2 rounded-lg text-stone-500 text-base">Dismiss</button>
                </div>
              </div>
            )}

            {/* Abilities */}
            {activeChar.abilities.length > 0 && (
              <Section title="Abilities">
                <div className="space-y-2">
                  {activeChar.abilities.map(a => {
                    const open = expandedAbility === a.id
                    return (
                      <button
                        key={a.id}
                        onClick={() => setExpandedAbility(open ? null : a.id)}
                        className={`w-full text-left rounded-xl border p-3.5 transition-colors ${open ? 'bg-stone-900 border-amber-700/50' : 'bg-stone-900/60 border-stone-700'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          {open ? <ChevronDown size={18} className="shrink-0 text-stone-500" /> : <ChevronRight size={18} className="shrink-0 text-stone-500" />}
                          <span className="text-base font-semibold text-stone-100 flex-1">{a.name}</span>
                          <span className={`text-base font-mono shrink-0 ${a.sdCost > 0 ? 'text-amber-400' : 'text-stone-500'}`}>{a.sdCost > 0 ? `${a.sdCost} SD` : 'Free'}</span>
                        </div>
                        {open && (
                          <div className="mt-2.5 pl-6 text-base text-stone-400 leading-relaxed whitespace-pre-wrap">
                            {a.description || <span className="italic text-stone-600">No description.</span>}
                            {a.materials && <div className="mt-1.5 text-sm text-stone-500"><span className="text-stone-600">Materials:</span> {a.materials}</div>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Skills */}
            {activeChar.skills.length > 0 && (
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {activeChar.skills.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2">
                      <span className="text-base text-stone-200">{s.name}</span>
                      <span className="text-base font-bold text-gold font-mono">+{s.bonus}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Active effects */}
            {activeChar.activeEffects.length > 0 && (
              <Section title="Active Effects">
                <div className="space-y-2">
                  {activeChar.activeEffects.map(e => (
                    <div key={e.id} className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-base ${e.damagePerRound ? 'bg-red-900/20 border-red-800/40 text-red-300' : 'bg-emerald/10 border-emerald/30 text-emerald'}`}>
                      <span className="font-semibold">{e.name}</span>
                      {e.damagePerRound && <span className="text-red-400 font-mono text-sm">🩸{e.damagePerRound}/turn</span>}
                      {e.remaining != null && <span className="ml-auto text-stone-500 font-mono text-sm">{e.remaining} sc</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Inventory — own character only */}
            {isOwnChar && (
              <Section title="On Hand" icon={<Package size={16} />}>
                {activeChar.onHand.items.length === 0 ? (
                  <div className="text-base text-stone-500 italic">Nothing on hand.</div>
                ) : (
                  <div className="space-y-2">
                    {activeChar.onHand.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-stone-900 border border-stone-700">
                        <span className="flex-1 text-base text-stone-200 truncate">{item.customName ?? item.name}</span>
                        <span className="text-base text-stone-400 font-mono">×{item.quantity}</span>
                        {isPotionItem(item) && (
                          <button onClick={() => usePotion(item)} className="px-3.5 py-2 rounded-lg bg-emerald/20 border border-emerald/40 text-emerald text-base font-medium active:bg-emerald/30">
                            Use
                          </button>
                        )}
                        <button onClick={() => removeOnHandItem(activeChar.id, item.id)} className="p-2 text-stone-600 active:text-red-400">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Currency + rations — own character only */}
            {isOwnChar && (
              <Section title="Wealth" icon={<Coins size={16} />}>
                <div className="flex flex-wrap gap-x-4 gap-y-2.5">
                  {CURRENCY_OPTIONS.map(opt => {
                    const amt = activeChar.currency[opt.key] ?? 0
                    return (
                      <div key={opt.key} className="flex items-center gap-1.5">
                        <img src={opt.img} alt={opt.label} className="w-5 h-5" />
                        <span className={`text-base font-semibold font-mono tabular-nums ${amt > 0 ? 'text-white' : 'text-stone-600'}`}>{amt}</span>
                        <span className={`text-base ${amt > 0 ? 'text-stone-400' : 'text-stone-600'}`}>{opt.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-base text-stone-300">
                  🍖 <span className="text-stone-400">Rations</span>
                  <span className={`font-semibold font-mono ${activeChar.rations > 0 ? 'text-white' : 'text-stone-600'}`}>{activeChar.rations}</span>
                </div>
                {activeChar.missedRests > 0 && (
                  <div className="mt-3 bg-orange-900/20 border border-orange-700/40 rounded-xl px-3.5 py-2.5 text-base text-orange-300">
                    ⚠️ {activeChar.missedRests} missed rest{activeChar.missedRests !== 1 ? 's' : ''} — −{activeChar.missedRests}d4 on rolls
                  </div>
                )}
              </Section>
            )}

            {/* Notes — own character only */}
            {isOwnChar && (
              <Section title="Notes">
                <textarea
                  value={activeChar.notes ?? ''}
                  onChange={e => updateCharacter(activeChar.id, { notes: e.target.value })}
                  rows={4}
                  placeholder="Tap to add notes…"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-3 text-base text-stone-100 outline-none resize-none focus:border-gold/50"
                />
              </Section>
            )}

            {/* Locked notice for other players' sheets */}
            {!isOwnChar && !!focusedCharacterId && (
              <div className="mx-4 mt-4 rounded-2xl bg-stone-900/60 border border-stone-700 px-5 py-6 text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-base text-stone-400">{activeChar.name}'s inventory and notes are private.</div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Ongoing-potion duration picker (bottom sheet) */}
      {pendingPotion && (
        <div className="shrink-0 border-t border-gold/30 bg-stone-900 px-4 py-3 space-y-2.5">
          <div className="text-base text-stone-300 font-medium">How much Redstone Dust? (duration)</div>
          <div className="flex gap-2.5">
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => applyPendingPotion(n)} className="flex-1 py-3 rounded-xl border border-stone-600 text-stone-200 text-base font-semibold active:border-gold/60">
                {n} → {n} sc
              </button>
            ))}
          </div>
          <button onClick={() => setPendingPotion(null)} className="text-stone-500 text-base">Cancel</button>
        </div>
      )}

      {/* ── Bottom navigation ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-t border-stone-700 bg-stone-900 pb-[env(safe-area-inset-bottom)]">
        <NavButton active={pane === 'character'} onClick={() => setPane('character')} icon={<User size={22} />} label="Character" />
        <NavButton
          active={pane === 'world'}
          onClick={() => setPane('world')}
          icon={combatActive ? <Swords size={22} /> : <MapIcon size={22} />}
          label={combatActive ? 'Combat' : 'Map'}
          alert={combatActive}
        />
        <NavButton active={false} onClick={exitToSwitcher} icon={<LogOut size={22} />} label="Campaigns" />
        {!isPlayerMode && (
          <NavButton active={false} onClick={onClose} icon={<ChevronRight size={22} />} label="GM View" />
        )}
      </div>

      {/* Modals */}
      {showRequest && activeChar && (
        <PlayerRequestModal character={activeChar} onClose={() => setShowRequest(false)} />
      )}
      {showLevelUp && activeChar && isOwnChar && (
        <LevelUpModal
          character={activeChar}
          onClose={() => { setShowLevelUp(false); setLevelUpInitial(undefined) }}
          initialState={levelUpInitial}
        />
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 mt-5">
      <div className="flex items-center gap-1.5 mb-2.5 text-sm font-semibold text-stone-500 uppercase tracking-wider font-heading">
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function NavButton({ active, onClick, icon, label, alert }: {
  active: boolean; onClick: () => void; icon: ReactNode; label: string; alert?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors ${
        active ? 'text-gold' : alert ? 'text-red-400' : 'text-stone-400'
      }`}
    >
      {alert && !active && <span className="absolute top-2 right-1/3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
