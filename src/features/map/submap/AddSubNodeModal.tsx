import { useState } from 'react'
import { Modal } from '../../../ui/Modal'
import { SUB_NODE_TYPES } from '../../../lib/rules/constants'
import type { SubNode } from '../../../types'

export function AddSubNodeModal({ onAdd, onClose }: {
  onAdd: (node: { name: string; type: SubNode['type']; description: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<SubNode['type']>('other')
  const [description, setDescription] = useState('')
  const add = () => { if (name.trim()) onAdd({ name: name.trim(), type, description }) }

  return (
    <Modal title="Add Sub-location" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-3 py-2 text-stone-100 text-sm outline-hidden focus:border-gold/50"
            placeholder="Iron Throne Room..." />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as SubNode['type'])} className="w-full bg-stone-900 border border-stone-600 rounded-sm px-3 py-2 text-stone-200 text-sm outline-hidden">
            {SUB_NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Notes</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full bg-stone-900 border border-stone-600 rounded-sm px-3 py-2 text-stone-200 text-sm outline-hidden resize-none" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-sm bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
          <button onClick={add} disabled={!name.trim()} className="px-3 py-1.5 rounded-sm bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">Add</button>
        </div>
      </div>
    </Modal>
  )
}
