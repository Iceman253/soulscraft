import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { AREA_TYPES, REALMS } from '../../lib/constants'
import type { Area } from '../../types'

interface AddNodeModalProps {
  onClose: () => void
  onAdd: (area: Omit<Area, 'id' | 'subNodes' | 'subEdges' | 'revealed' | 'position'>) => void
}

export function AddNodeModal({ onClose, onAdd }: AddNodeModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<Area['type']>('settlement')
  const [realm, setRealm] = useState<Area['realm']>('overworld')
  const [description, setDescription] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), type, realm, description })
  }

  return (
    <Modal title="Add Area" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Name *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50"
            placeholder="Village of Thornfield..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-stone-400 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as Area['type'])} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none focus:border-gold/50">
              {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1">Realm</label>
            <select value={realm} onChange={e => setRealm(e.target.value as Area['realm'])} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none focus:border-gold/50">
              {REALMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none focus:border-gold/50 resize-none"
            placeholder="GM notes about this location..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
          <button onClick={submit} disabled={!name.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">Add</button>
        </div>
      </div>
    </Modal>
  )
}
