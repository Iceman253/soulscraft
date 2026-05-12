import { useState } from 'react'
import { Search, FlaskConical, Sparkles, ChevronDown, ChevronRight, Info, Flame } from 'lucide-react'
import { POTION_RECIPES, ENCHANTER_SIGNS_DATA } from '../../lib/constants'
import type { PotionRecipe, EnchanterSign } from '../../lib/constants'

type RefTab = 'potions' | 'enchanting' | 'hazards'

// Rulebook pp. 73 — environmental damage tables
const HAZARD_TABLE = [
  { name: 'Lava',        icon: '🌋', note: 'Certain death. Full contact instantly kills most creatures. Partial contact destroys equipment + catastrophic injury.', damage: 'Instant kill / GM discretion', ignoresDef: true },
  { name: 'Fire',        icon: '🔥', note: 'Brief contact: no roll (blackens skin, ignites gear). Prolonged exposure:', damage: '3d6 – 5d6', ignoresDef: false },
  { name: 'Soul Fire',   icon: '🔵', note: 'Same as Fire but ignores DEF.', damage: '3d6 – 5d6', ignoresDef: true },
  { name: 'Drowning',    icon: '🌊', note: 'Hold breath 1 round, then per round until air restored or death.', damage: '1d10 / round', ignoresDef: true },
  { name: 'Falling',     icon: '⬇️',  note: 'Short drops: no roll. Long / violent impacts:', damage: '2d6 – 4d6', ignoresDef: false },
  { name: 'Explosion (Small)',   icon: '💥', note: '', damage: '3d6', ignoresDef: false },
  { name: 'Explosion (Medium)',  icon: '💥', note: '', damage: '6d6', ignoresDef: false },
  { name: 'Explosion (Large)',   icon: '💥', note: '', damage: '10d6', ignoresDef: false },
  { name: 'Explosion (Massive)', icon: '💥', note: 'Or lethal.', damage: '15d6', ignoresDef: false },
] as const

export function ReferencePanel() {
  const [tab, setTab] = useState<RefTab>('potions')
  const [search, setSearch] = useState('')

  const query = search.toLowerCase()

  const filteredPotions = POTION_RECIPES.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.effect.toLowerCase().includes(query) ||
    p.ingredients.some(i => i.toLowerCase().includes(query))
  )

  const filteredSigns = ENCHANTER_SIGNS_DATA.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.description.toLowerCase().includes(query)
  )

  return (
    <div className="h-full flex flex-col">
      {/* Sticky header — never scrolls away */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-stone-700 bg-stone-900">
        <h2 className="font-semibold text-stone-100 mb-3 font-heading tracking-wide">Reference</h2>

        {/* Tab selector */}
        <div className="flex rounded-lg overflow-hidden border border-stone-700 mb-3">
          <button
            onClick={() => setTab('potions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${
              tab === 'potions' ? 'bg-stone-700 text-gold font-medium' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <FlaskConical size={14} /> Potions & Brewing
          </button>
          <button
            onClick={() => setTab('enchanting')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${
              tab === 'enchanting' ? 'bg-stone-700 text-gold font-medium' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles size={14} /> Enchanting Signs
          </button>
          <button
            onClick={() => setTab('hazards')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm transition-colors ${
              tab === 'hazards' ? 'bg-stone-700 text-gold font-medium' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame size={14} /> Hazards
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'potions' ? 'Search potions, ingredients…' : tab === 'enchanting' ? 'Search signs…' : ''}
            className={`w-full bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500 ${tab === 'hazards' ? 'hidden' : ''}`}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === 'potions' && <PotionSection potions={filteredPotions} />}
        {tab === 'enchanting' && <EnchantingSection signs={filteredSigns} />}
        {tab === 'hazards' && <HazardsSection />}
      </div>
    </div>
  )
}

// ── Hazards ───────────────────────────────────────────────────────────

function HazardsSection() {
  return (
    <div className="space-y-3">
      <div className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-400 leading-snug">
        <strong className="text-stone-300">Environmental damage</strong> — from Soulscraft 3.1e pp. 73. DEF does not apply unless noted. These are GM guidelines; lesser hazards should use narrative consequences instead of HP loss.
      </div>
      <div className="space-y-2">
        {HAZARD_TABLE.map(h => (
          <div key={h.name} className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">{h.icon}</span>
                <span className="font-semibold text-stone-100 text-sm font-heading tracking-wide">{h.name}</span>
                {h.ignoresDef && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 border border-red-800/40 text-red-400">Ignores DEF</span>}
              </div>
              <span className="font-mono text-sm text-gold font-bold shrink-0">{h.damage}</span>
            </div>
            {h.note && <div className="text-xs text-stone-500 leading-snug">{h.note}</div>}
          </div>
        ))}
      </div>
      <div className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-500 space-y-1">
        <div className="font-medium text-stone-400 font-heading tracking-wide">Instant-kill rule</div>
        <div>When a player successfully hits a creature whose current HP ≤ the player's max damage die value, the creature drops to 0 HP regardless of DEF. Exception: creatures with the <strong className="text-orange-400">Tough</strong> tag must always be rolled against.</div>
      </div>
    </div>
  )
}

// ── Potions ───────────────────────────────────────────────────────────

function PotionSection({ potions }: { potions: PotionRecipe[] }) {
  return (
    <div className="space-y-3">
      {/* Duration mechanic callout */}
      <div className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs text-stone-400">
        <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <span className="text-stone-300 font-medium">Redstone controls duration of ongoing effects: </span>
          1 measure = 1 scene · 2 measures = 2 scenes · 3 measures = 3 scenes (max).
          Brew with a Brewing Stand fueled by Blaze Powder, clarified slime, or pale oak resin.
        </div>
      </div>

      {potions.length === 0
        ? <div className="text-stone-500 text-sm text-center py-8">No potions found</div>
        : potions.map(p => <PotionCard key={p.name} potion={p} />)
      }
    </div>
  )
}

function PotionCard({ potion: p }: { potion: PotionRecipe }) {
  const [open, setOpen] = useState(false)
  const isHarmful = p.name.includes('Harming') || p.name.includes('Poison') ||
    p.name.includes('Weakness') || p.name.includes('Slowness') || p.name.includes('Wither')

  return (
    <div className={`bg-stone-800 border rounded-xl overflow-hidden ${isHarmful ? 'border-red-900/60' : 'border-stone-700'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-700/50 transition-colors text-left"
      >
        <FlaskConical size={15} className={`shrink-0 ${isHarmful ? 'text-red-400' : p.name.includes('Awkward') || p.name.includes('Dragon') ? 'text-stone-500' : 'text-emerald-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-stone-100 font-heading tracking-wide">{p.name}</div>
          <div className="text-xs text-stone-500 truncate">{p.effect}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.instant
            ? <span className="text-xs bg-stone-700 text-stone-400 px-1.5 py-0.5 rounded">Instant</span>
            : <span className="text-xs bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/40">+ Redstone</span>
          }
          {open ? <ChevronDown size={14} className="text-stone-500" /> : <ChevronRight size={14} className="text-stone-500" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-stone-700/60 pt-2 space-y-2">
          <p className="text-sm text-stone-300">{p.effect}</p>

          <div>
            <div className="text-xs text-stone-500 mb-1">Ingredients</div>
            <div className="flex flex-wrap gap-1.5">
              {p.ingredients.map((ing, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-stone-700 border border-stone-600 text-stone-300 text-xs">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {!p.instant && (
            <div className="text-xs text-blue-300/80">
              Add Redstone Dust to set duration (up to 3 scenes).
            </div>
          )}
          {p.notes && (
            <div className="text-xs text-stone-500 italic">{p.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Enchanting Signs ──────────────────────────────────────────────────

function EnchantingSection({ signs }: { signs: EnchanterSign[] }) {
  const baseSigns = signs.filter(s => !s.advanced)
  const advancedSigns = signs.filter(s => s.advanced)

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs text-stone-400">
        <Info size={13} className="text-yellow-400 mt-0.5 shrink-0" />
        <div>
          <span className="text-stone-300 font-medium">Enchanters design custom enchantments and curses</span> by combining up to three Signs from their Tome. Each combination defines the effect, which must be approved by the GM. Once recorded, the effect is fixed.
        </div>
      </div>

      {/* Example combos */}
      <div className="bg-stone-800 border border-stone-700 rounded-xl p-3">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 font-heading">Example Combinations</div>
        <div className="space-y-1.5 text-xs">
          {[
            ['Element + Harm + Creature', '"When this blade strikes Undead, it erupts in fire."'],
            ['Defense + Movement', '"When the wearer is hit, the armor knocks the attacker back."'],
            ['Sign of Mind + Creature + Harm', '"A curse that causes a creature to act against its allies."'],
          ].map(([combo, result]) => (
            <div key={combo} className="flex items-start gap-2">
              <span className="text-yellow-400/80 font-mono shrink-0">{combo}</span>
              <span className="text-stone-500">→ {result}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Base Signs */}
      {baseSigns.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Signs</div>
          <div className="space-y-1.5">
            {baseSigns.map(s => <SignCard key={s.name} sign={s} />)}
          </div>
        </div>
      )}

      {/* Advanced Signs */}
      {advancedSigns.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 font-heading">Advanced Signs</div>
          <div className="space-y-1.5">
            {advancedSigns.map(s => <SignCard key={s.name} sign={s} />)}
          </div>
        </div>
      )}

      {baseSigns.length === 0 && advancedSigns.length === 0 && (
        <div className="text-stone-500 text-sm text-center py-8">No signs found</div>
      )}
    </div>
  )
}

function SignCard({ sign: s }: { sign: EnchanterSign }) {
  return (
    <div className={`bg-stone-800 border rounded-xl px-3 py-2.5 ${s.advanced ? 'border-purple-800/50' : 'border-stone-700'}`}>
      <div className="flex items-start gap-2">
        <Sparkles size={13} className={`mt-0.5 shrink-0 ${s.advanced ? 'text-purple-400' : 'text-yellow-400'}`} />
        <div>
          <div className="text-sm font-medium text-stone-100 font-heading tracking-wide">{s.name}</div>
          <p className="text-xs text-stone-400 mt-0.5">{s.description}</p>
          {s.notes && <p className="text-xs text-stone-500 italic mt-0.5">{s.notes}</p>}
        </div>
      </div>
    </div>
  )
}
