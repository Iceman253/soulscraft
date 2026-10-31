import { useState } from 'react'
import { X } from 'lucide-react'
import { COMMON_MATERIALS } from '../../lib/building'

/** Tag what can be mined at a place (Guidebook p.81). */
export function MaterialsEditor({ materials, onChange }: { materials: string[]; onChange: (materials: string[]) => void }) {
  const [newMaterial, setNewMaterial] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const add = (m: string) => {
    const name = m.trim()
    if (name && !materials.some(x => x.toLowerCase() === name.toLowerCase())) onChange([...materials, name])
  }

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {materials.map(m => (
          <span key={m} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-stone-900 border border-stone-600 text-xs text-stone-300">
            {m}
            <button onClick={() => onChange(materials.filter(x => x !== m))} className="text-stone-600 hover:text-red-400" title={`Remove ${m}`}><X size={10} /></button>
          </span>
        ))}
        <button onClick={() => setShowPicker(v => !v)} className="px-2 py-0.5 rounded-full border border-dashed border-stone-600 text-xs text-stone-500 hover:text-stone-200">
          {showPicker ? 'Done' : '+ Material'}
        </button>
      </div>
      {materials.length === 0 && !showPicker && (
        <div className="text-[10px] text-stone-600 mt-1">Players can only mine what the place has — a forest for wood, a mineshaft for ore.</div>
      )}
      {showPicker && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {COMMON_MATERIALS.filter(m => !materials.some(x => x.toLowerCase() === m.toLowerCase())).map(m => (
              <button key={m} onClick={() => add(m)} className="px-1.5 py-0.5 rounded-sm border border-stone-700 text-[11px] text-stone-400 hover:text-gold hover:border-gold/40">{m}</button>
            ))}
          </div>
          <input
            value={newMaterial}
            onChange={e => setNewMaterial(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { add(newMaterial); setNewMaterial('') } }}
            placeholder="Other material, then Enter"
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-100 text-xs outline-hidden focus:border-gold/50"
          />
        </div>
      )}
    </>
  )
}
