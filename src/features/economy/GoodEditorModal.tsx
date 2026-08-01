import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useEconomyStore } from './store'
import { GOOD_CATEGORIES, ALL_GOOD_TAGS } from '../../lib/goods'
import { formatCopper } from '../../lib/currency'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import type { Good, GoodTag } from '../../types'

interface Props {
  /** null = create a new custom good */
  good: Good | null
  onClose: () => void
}

export function GoodEditorModal({ good, onClose }: Props) {
  const { addCustomGood, updateCustomGood, deleteCustomGood } = useEconomyStore()
  const [name, setName] = useState(good?.name ?? '')
  const [category, setCategory] = useState<Good['category']>(good?.category ?? 'misc')
  const [price, setPrice] = useState(good?.basePriceCopper ?? 100)
  const [tags, setTags] = useState<GoodTag[]>(good?.tags ?? [])
  const [unit, setUnit] = useState(good?.unit ?? '')
  const [description, setDescription] = useState(good?.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleTag = (tag: GoodTag) =>
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])

  const save = () => {
    const data = {
      name: name.trim(), category, basePriceCopper: Math.max(1, price),
      tags, unit: unit.trim() || undefined, description: description.trim() || undefined,
    }
    if (good) updateCustomGood(good.id, data)
    else addCustomGood(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <h2 className="font-bold text-stone-100 text-sm font-heading">{good ? 'Edit Custom Good' : 'New Custom Good'}</h2>
          <button onClick={onClose} className="p-1 rounded text-stone-500 hover:text-stone-200 hover:bg-stone-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Name</label>
            <input
              value={name} autoFocus
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sculk Compass"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 placeholder:text-stone-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Good['category'])}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none"
              >
                {GOOD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Unit</label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="each / per day / bundle…"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500 placeholder:text-stone-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">
              Base price <span className="normal-case text-stone-600">(copper)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} value={price}
                onChange={e => setPrice(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm outline-none focus:border-stone-500 font-mono tabular-nums"
              />
              <span className="text-xs text-stone-400 font-mono">= {formatCopper(price)}</span>
            </div>
            <div className="text-[10px] text-stone-600 mt-1">1 iron = 10c · 1 gold = 100c · 1 emerald = 1,000c · 1 diamond = 10,000c</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GOOD_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    tags.includes(tag)
                      ? 'bg-teal-600/20 border-teal-500/50 text-teal-300'
                      : 'bg-stone-800 border-stone-700 text-stone-500 hover:border-stone-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-stone-600 mt-1">Tags decide how specialties, shortages, and events move this good's price.</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5 font-heading">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm outline-none focus:border-stone-500 resize-none"
            />
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2 shrink-0">
          {good && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2.5 rounded-lg text-red-400 border border-red-900/40 hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={save}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-lg bg-amber-700 text-amber-100 font-semibold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {good ? 'Save Changes' : 'Create Good'}
          </button>
        </div>
      </div>

      {confirmDelete && good && (
        <ConfirmDialog
          title="Delete Custom Good"
          message={`Delete "${good.name}"? It will be removed from every market that stocks it.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteCustomGood(good.id); onClose() }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
