import { useMemo, useState } from 'react'
import { useCharacterStore } from '../characters/store'
import { useWorldStore } from '../map/store'
import { useRequestStore } from '../requests/store'
import { TokenAvatar } from '../../ui/TokenAvatar'
import { FullScreen, fieldCls, fieldLabelCls, primaryBtn } from './FullScreen'
import { PixelEditor } from './PixelEditor'
import { PlacePicker } from './PlacePicker'
import { PROJECT_TIERS, PROJECT_TIER_ORDER, TIER_EMOJI, isArchitect, parseBuildProposal, projectRequirements } from '../../lib/building'
import { placementLabel, type Placement } from '../../lib/places'
import type { Character, ProjectTier } from '../../types'

type Step = 'draw' | 'details' | 'place'

/** A player designs a whole build on their own device: draw it, say what it's for,
 *  pick a size, place it. The GM only signs off on the finished proposal. */
export function StartBuildFlow({ character, resend, onSent, onClose }: {
  character: Character
  /** A denied proposal's payload, to fix up and send again. */
  resend?: Record<string, unknown>
  onSent?: () => void
  onClose: () => void
}) {
  const characters = useCharacterStore(s => s.characters)
  const areas = useWorldStore(s => s.areas)
  const addRequest = useRequestStore(s => s.addRequest)
  const start = useMemo(() => resend ? parseBuildProposal(resend, character.id) : null, [resend, character.id])

  const [step, setStep] = useState<Step>(start ? 'details' : 'draw')
  const [icon, setIcon] = useState(start?.icon ?? '')
  const [name, setName] = useState(start?.name ?? '')
  const [description, setDescription] = useState(start?.description ?? '')
  const [tier, setTier] = useState<ProjectTier>(start?.tier ?? 'small')
  const [builderIds, setBuilderIds] = useState<string[]>(start?.builderIds ?? [character.id])
  const [placement, setPlacement] = useState<Placement | null>(start ? { areaId: start.areaId, subNodeId: start.subNodeId, position: start.position } : null)

  const others = characters.filter(c => !c.isDead && c.id !== character.id)
  const architect = characters.some(c => builderIds.includes(c.id) && isArchitect(c))
  const detailsReady = name.trim() !== '' && description.trim() !== ''

  const toggleBuilder = (id: string) =>
    setBuilderIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])

  const send = () => {
    if (!placement) return
    addRequest({
      characterId: character.id,
      characterName: character.name,
      type: 'build-start',
      payload: { name: name.trim(), description: description.trim(), tier, icon, builderIds, ...placement },
      label: `${name.trim()} · ${PROJECT_TIERS[tier].label}`,
    })
    onSent?.()
    onClose()
  }

  if (step === 'draw') {
    return (
      <FullScreen title="Draw your build" onClose={onClose}>
        <div className="p-4">
          <PixelEditor initial={icon} requireDrawing saveLabel="Next" onCancel={onClose} onSave={next => { setIcon(next); setStep('details') }} />
        </div>
      </FullScreen>
    )
  }

  if (step === 'place') {
    return (
      <FullScreen
        title="Where does it go?"
        onClose={onClose}
        onBack={() => setStep('details')}
        footer={
          <button onClick={send} disabled={!placement} className={primaryBtn}>
            {placement ? `Send to GM · ${placementLabel(placement, areas)}` : 'Pick a spot first'}
          </button>
        }
      >
        <PlacePicker character={character} icon={icon} tier={tier} value={placement} onChange={setPlacement} />
      </FullScreen>
    )
  }

  return (
    <FullScreen
      title="Describe your build"
      onClose={onClose}
      onBack={() => setStep('draw')}
      footer={<button onClick={() => setStep('place')} disabled={!detailsReady} className={primaryBtn}>Next: place it</button>}
    >
      <div className="space-y-5 p-4">
        <div>
          <label className={fieldLabelCls}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Hilltop Castle" className={fieldCls} />
        </div>
        <div>
          <label className={fieldLabelCls}>What is it supposed to do?</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="A safe place for the whole village if the horde comes back…"
            className={`${fieldCls} resize-none`} />
        </div>

        <div>
          <div className={fieldLabelCls}>Size</div>
          <div className="space-y-2">
            {PROJECT_TIER_ORDER.map(t => {
              const info = PROJECT_TIERS[t]
              const req = projectRequirements(t, architect)
              return (
                <button key={t} onClick={() => setTier(t)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${tier === t ? 'border-gold/70 bg-gold/10' : 'border-stone-700 bg-stone-900'}`}>
                  <span className="text-2xl leading-none">{TIER_EMOJI[t]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-stone-100">{info.label}</span>
                    <span className="block truncate text-sm text-stone-500">{info.examples}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-sm text-stone-300">
                    {req.blocks} blocks<br />{req.days} day{req.days === 1 ? '' : 's'}
                    {req.redstone > 0 && <><br />{req.redstone} dust</>}
                  </span>
                </button>
              )
            })}
          </div>
          {architect && <div className="mt-2 text-sm text-teal-300">📐 Architect Edge: half the blocks and time.</div>}
        </div>

        {others.length > 0 && (
          <div>
            <div className={fieldLabelCls}>Building with</div>
            <div className="flex flex-wrap gap-2">
              {others.map(c => {
                const on = builderIds.includes(c.id)
                return (
                  <button key={c.id} onClick={() => toggleBuilder(c.id)}
                    className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-base ${on ? 'border-gold/60 bg-gold/10 text-stone-100' : 'border-stone-600 text-stone-400'}`}>
                    <TokenAvatar name={c.name} characterId={c.id} size={26} />
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </FullScreen>
  )
}
