import type { Character } from '../../../types'
import { HpBar } from '../../../ui/HpBar'
import { SdDots } from '../../../ui/SdDots'

/** Shown in place of the sheet while a character is dead: what happened, ghost
 *  status, and how the Tower of Trials can bring them back (rulebook p.74). */
export function DeathPanel({ character: c }: { character: Character }) {
  const steps = [
    <>Find the Tower using an <span className="text-stone-300">Echo Compass</span>.</>,
    <>Appeal to the <span className="text-stone-300">Tower Keepers</span> — they decide whether to help.</>,
    <>{c.name} {c.isGhost ? 'observes as a Ghost' : 'can observe as a Ghost'} — able to speak but not fight.</>,
    <>The party completes the Tower's challenges. No one can permanently die inside.</>,
    <>Success returns <span className="text-stone-300">{c.name}</span> to life with full HP and SD.</>,
  ]
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
      <div className="w-full bg-stone-950 border border-stone-800 rounded-xl p-5 text-center space-y-2 mb-4">
        <div className="text-4xl">💀</div>
        <div className="text-lg font-bold text-stone-300">{c.name} has fallen.</div>
        <div className="text-xs text-stone-500 leading-relaxed">
          {c.name} has run out of HP and Soul Dice.<br />
          They cannot act or be healed until resurrected.
        </div>
      </div>

      {c.isGhost && (
        <div className="w-full bg-purple-950/40 border border-purple-800/50 rounded-xl p-4 text-center space-y-1 mb-4">
          <div className="text-2xl">👻</div>
          <div className="text-sm font-semibold text-purple-300">{c.name} is a Ghost</div>
          <div className="text-xs text-purple-500 leading-relaxed">
            They can observe and communicate with the party,<br />
            but cannot interact with the physical world.
          </div>
        </div>
      )}

      <div className="w-full bg-stone-900 border border-stone-700 rounded-xl p-4 space-y-2.5 text-xs text-stone-500">
        <div className="text-stone-400 font-semibold text-sm">The Tower of Trials</div>
        <p className="leading-snug">
          There is a way back. The party must find the mystical <span className="text-stone-300">Tower of Trials</span> using an <span className="text-stone-300">Echo Compass</span>.
        </p>
        <div className="space-y-1.5">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2"><span className="text-stone-500 shrink-0">{i + 1}.</span><span>{step}</span></div>
          ))}
        </div>
      </div>

      <div className="w-full mt-4 opacity-40 pointer-events-none space-y-2">
        <div className="text-xs text-stone-600 uppercase tracking-wider text-center">Last Known Stats</div>
        <HpBar current={0} max={c.maxHp} />
        <div className="flex items-center gap-1.5 justify-center">
          <span className="text-xs text-stone-600">SD</span>
          <SdDots current={0} max={c.maxSd} size="sm" />
        </div>
      </div>
    </div>
  )
}

/** Above the sheet while a living character is in ghost form. */
export function GhostBanner({ character: c }: { character: Character }) {
  return (
    <div className="shrink-0 bg-purple-950/30 border-b border-purple-900/40 px-4 py-2.5 text-center">
      <div className="text-sm font-semibold text-purple-300 mb-0.5">👻 Ghost Mode</div>
      <div className="text-xs text-purple-500">{c.name} can observe and communicate, but cannot interact with the physical world.</div>
    </div>
  )
}
