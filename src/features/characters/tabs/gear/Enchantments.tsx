// Gear enchantment list rows and the add form.
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '../../../../ui/Badge'
import type { GearEnchantment } from '../../../../types'

export function EnchantmentRow({ enc, onRemove }: { enc: GearEnchantment; onRemove: () => void }) {
  const durLabel = enc.durationType === 'scenes' || enc.durationType === 'days'
    ? `${enc.remaining} ${enc.durationType}` : enc.durationType
  return (
    <div className="flex items-center gap-2 text-xs" title={enc.description}>
      <span className="text-purple-300 flex-1 min-w-0">
        {enc.name}
        {enc.description && <span className="block text-[10px] text-stone-500 leading-snug">{enc.description}</span>}
      </span>
      <Badge variant="purple">{durLabel}</Badge>
      <button onClick={onRemove} className="p-0.5 text-stone-500 hover:text-red-400"><Trash2 size={10} /></button>
    </div>
  )
}

/** `withDescription` adds a line for what the enchantment does. */
export function AddEnchantmentRow({ onAdd, withDescription = false }: { onAdd: (e: Omit<GearEnchantment, 'id'>) => void; withDescription?: boolean }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durType, setDurType] = useState<GearEnchantment['durationType']>('scenes')
  const [remaining, setRemaining] = useState(3)

  const submit = () => {
    if (!name.trim()) return
    onAdd({
      name: name.trim(), durationType: durType, remaining: durType === 'scenes' || durType === 'days' ? remaining : undefined,
      ...(description.trim() ? { description: description.trim() } : {}),
    })
    setName('')
    setDescription('')
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5 items-end">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enchantment name..." className="flex-1 bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden focus:border-purple-500/50" />
        <select value={durType} onChange={e => setDurType(e.target.value as GearEnchantment['durationType'])}
          className="bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden">
          <option value="scenes">Scenes</option>
          <option value="days">Days</option>
          <option value="permanent">Permanent</option>
          <option value="manual">Manual</option>
        </select>
        {(durType === 'scenes' || durType === 'days') && (
          <input type="number" value={remaining} onChange={e => setRemaining(parseInt(e.target.value) || 1)} min={1}
            className="w-12 bg-stone-900 border border-stone-600 rounded-sm px-1.5 py-1 text-stone-200 text-xs outline-hidden" />
        )}
        <button onClick={submit} className="px-2 py-1 rounded-sm bg-stone-700 hover:bg-stone-600 text-stone-300 text-xs"><Plus size={11} /></button>
      </div>
      {withDescription && (
        <input value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="What it does (optional)..." className="w-full bg-stone-900 border border-stone-600 rounded-sm px-2 py-1 text-stone-200 text-xs outline-hidden focus:border-purple-500/50" />
      )}
    </div>
  )
}
