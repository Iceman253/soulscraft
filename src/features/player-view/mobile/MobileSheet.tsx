import { Heart, Zap, Shield, Hourglass, Sparkles, Send, Package, Coins, Trash2 } from 'lucide-react'
import type { Character, CharacterItem } from '../../../types'
import { useCharacterStore } from '../../characters/store'
import { PortraitPicker } from '../../characters/PortraitPicker'
import { TokenAvatar } from '../../../ui/TokenAvatar'
import { computeDef } from '../../../lib/rules/armor'
import type { useLevelUpFlow } from '../hooks/useLevelUpFlow'
import { AvoidDeathCard } from '../sheet/AvoidDeathCard'
import { DeniedProposalBanner } from '../sheet/LevelUpStatus'
import { SkillChips, AbilityList, EffectList } from '../sheet/SheetLists'
import { Wealth } from '../sheet/Wealth'
import { ShareToggle, PrivateInventoryNotice } from '../sheet/InventoryPrivacy'
import { SharedInventory } from '../sheet/SharedInventory'
import { Section } from './MobileChrome'
import { WeaponSpecLine } from '../../../ui/WeaponSpecLine'

interface Props {
  character: Character
  /** The player's own character (or the GM previewing): editable. */
  isOwn: boolean
  /** A player is looking at someone else's sheet. */
  viewingOther: boolean
  levelUp: ReturnType<typeof useLevelUpFlow>
  notify: (message: string) => void
  onAskGm: () => void
  /** The market where this character stands, if any, and how many GM counter-offers wait there. */
  shop?: { name: string; counterOffers: number; onOpen: () => void }
  isPotion: (item: CharacterItem) => boolean
  onDrink: (item: CharacterItem) => void
}

/** The phone character sheet, top to bottom. */
export function MobileSheet({ character: c, isOwn, viewingOther, levelUp, notify, onAskGm, shop, isPotion, onDrink }: Props) {
  const { adjustHp, adjustSd, removeOnHandItem, updateCharacter } = useCharacterStore()
  const def = computeDef(c.armorLoadout)

  const avoidDeath = (n: number) => {
    if (n < 1 || n > c.currentSd) return
    adjustSd(c.id, -n)
    adjustHp(c.id, n)
    notify(`Held on — spent ${n} SD to regain ${n} HP.`)
  }

  return (
    <div className="pb-6">
      {c.currentHp === 0 && !c.isDead && <AvoidDeathCard character={c} onSpend={avoidDeath} size="lg" />}

      <div className="flex items-center gap-3.5 px-4 pt-4">
        {isOwn ? <PortraitPicker name={c.name} characterId={c.id} size={60} /> : <TokenAvatar name={c.name} characterId={c.id} size={60} />}
        <div className="min-w-0">
          <div className="text-2xl font-bold font-heading tracking-wide text-stone-100 truncate">{c.name}</div>
          <div className="text-base text-stone-400">{c.species} · {c.class}</div>
          <div className="text-sm text-stone-500 font-mono">Level {c.level}</div>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-stone-900 border border-stone-700 p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-base text-stone-300"><Heart size={17} className="text-red-400" /> HP</span>
            <span className="text-xl font-bold font-mono tabular-nums text-stone-100">{c.currentHp}<span className="text-stone-500 text-base"> / {c.maxHp}</span></span>
          </div>
          <div className="h-3 rounded-full bg-stone-800 overflow-hidden">
            <div className="h-full bg-linear-to-r/srgb from-red-600 to-red-400 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100))}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-base">
            <Zap size={17} className="text-blue-400" />
            <span className="text-stone-300">SD</span>
            <span className="font-bold font-mono tabular-nums text-stone-100">{c.currentSd}<span className="text-stone-500"> / {c.maxSd}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {def > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-800/50 text-blue-300 text-base font-semibold">
                <Shield size={15} /> {def}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-base font-mono">{c.damageDie}</span>
          </div>
        </div>
      </div>

      {isOwn && (
        <div className="px-4 mt-3 flex gap-2.5">
          {levelUp.pending ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 border border-amber-500/40 text-amber-300 text-base font-semibold">
              <Hourglass size={17} /> Pending GM review
            </div>
          ) : c.xp >= 5 ? (
            <button onClick={levelUp.openFresh}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-stone-900 text-base font-bold active:bg-amber-400">
              <Sparkles size={18} /> Level Up
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-400 text-base">
              XP {c.xp} / 5
            </div>
          )}
          <button onClick={onAskGm}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-800 border border-stone-700 text-teal-300 text-base font-semibold active:bg-stone-700">
            <Send size={17} /> Ask GM
          </button>
        </div>
      )}
      {isOwn && shop && (
        <div className="px-4 mt-2.5">
          <button onClick={shop.onOpen}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-900/30 border border-amber-700/50 text-amber-200 text-base font-semibold active:bg-amber-900/50">
            🏪 Shop at {shop.name}
            {shop.counterOffers > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-teal-600 text-teal-50 text-sm">{shop.counterOffers} counter-offer{shop.counterOffers > 1 ? 's' : ''}</span>
            )}
          </button>
        </div>
      )}
      {isOwn && !levelUp.pending && levelUp.denied && (
        <DeniedProposalBanner request={levelUp.denied} onRetry={levelUp.retryDenied} onDismiss={levelUp.dismissDenied} size="lg" />
      )}

      {c.abilities.length > 0 && <Section title="Abilities"><AbilityList abilities={c.abilities} size="lg" /></Section>}
      {c.skills.length > 0 && <Section title="Skills"><SkillChips skills={c.skills} size="lg" /></Section>}
      {c.activeEffects.length > 0 && <Section title="Active Effects"><EffectList effects={c.activeEffects} size="lg" /></Section>}

      {viewingOther && c.inventoryShared && (
        <div className="px-4 mt-5"><SharedInventory character={c} size="lg" /></div>
      )}

      {isOwn && (
        <Section title="On Hand" icon={<Package size={16} />}>
          <ShareToggle character={c} size="lg" />
          {c.onHand.items.length === 0 ? (
            <div className="text-base text-stone-500 italic">Nothing on hand.</div>
          ) : (
            <div className="space-y-2">
              {c.onHand.items.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-stone-900 border border-stone-700">
                  <div className="flex-1 min-w-0">
                    <div className="text-base text-stone-200 truncate">{item.customName ?? item.name}</div>
                    {item.weapon && <WeaponSpecLine spec={item.weapon} className="text-xs" />}
                  </div>
                  <span className="text-base text-stone-400 font-mono">×{item.quantity}</span>
                  {isPotion(item) && (
                    <button onClick={() => onDrink(item)} className="px-3.5 py-2 rounded-lg bg-emerald/20 border border-emerald/40 text-emerald text-base font-medium active:bg-emerald/30">
                      Use
                    </button>
                  )}
                  <button onClick={() => removeOnHandItem(c.id, item.id)} className="p-2 text-stone-600 active:text-red-400">
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {isOwn && <Section title="Wealth" icon={<Coins size={16} />}><Wealth character={c} size="lg" /></Section>}

      {isOwn && (
        <Section title="Notes">
          <textarea value={c.notes ?? ''} onChange={e => updateCharacter(c.id, { notes: e.target.value })} rows={4} placeholder="Tap to add notes…"
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3.5 py-3 text-base text-stone-100 outline-hidden resize-none focus:border-gold/50" />
        </Section>
      )}

      {viewingOther && !c.inventoryShared && <PrivateInventoryNotice character={c} size="lg" />}
    </div>
  )
}
