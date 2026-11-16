// The class feature panel on the character sheet: picks the panel for the character's class.
import { useCharacterStore } from '../store'
import type { Character } from '../../../types'
import { WarriorFeatures } from './panels/WarriorFeatures'
import { HunterFeatures } from './panels/HunterFeatures'
import { VindicatorFeatures } from './panels/VindicatorFeatures'
import { EnchanterFeatures } from './panels/EnchanterFeatures'
import { DelverFeatures } from './panels/DelverFeatures'
import { WildspeakerFeatures } from './panels/WildspeakerFeatures'
import { EvokerFeatures } from './panels/EvokerFeatures'
import { TectonFeatures } from './panels/TectonFeatures'
import { AlchemistFeatures } from './panels/AlchemistFeatures'

interface ClassFeaturesProps { character: Character }

export function ClassFeatures({ character: c }: ClassFeaturesProps) {
  const { useRestCharge, updateClassState } = useCharacterStore()
  const fs = c.classFeatureState

  if (fs.class === 'Warrior') return <WarriorFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} />
  if (fs.class === 'Hunter') return <HunterFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Vindicator') return <VindicatorFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Enchanter') return <EnchanterFeatures character={c} fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Delver') return <DelverFeatures fs={fs} onUse={id => useRestCharge(c.id, id)} />
  if (fs.class === 'Wildspeaker') return <WildspeakerFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Evoker') return <EvokerFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Tecton') return <TectonFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  if (fs.class === 'Alchemist') return <AlchemistFeatures fs={fs} onUpdate={p => updateClassState(c.id, p)} />
  return null
}
