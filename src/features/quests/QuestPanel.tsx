import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2, Check } from 'lucide-react'
import { useQuestStore } from './store'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import type { Quest } from '../../types'

const STATUS_BADGE: Record<Quest['status'], { variant: 'gold' | 'green' | 'muted' | 'red'; label: string }> = {
  active:    { variant: 'gold',  label: 'Active' },
  completed: { variant: 'green', label: 'Completed' },
  failed:    { variant: 'red',   label: 'Failed' },
  inactive:  { variant: 'muted', label: 'Inactive' },
}

export function QuestPanel() {
  const { quests, addQuest, updateQuest, deleteQuest, setStatus, addObjective, toggleObjective, deleteObjective } = useQuestStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Quest['status'] | 'all'>('all')

  const filtered = quests.filter(q => filter === 'all' || q.status === filter)

  const handleCreate = () => {
    if (!newTitle.trim()) return
    addQuest({ title: newTitle.trim(), description: newDesc.trim(), status: 'active', objectives: [], reward: undefined })
    setNewTitle(''); setNewDesc(''); setShowAdd(false)
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-stone-100">Quests</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm">
          <Plus size={14} /> New Quest
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {(['all', 'active', 'completed', 'failed', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${filter === f ? 'bg-stone-600 text-stone-100' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 && <div className="text-stone-500 text-sm py-4 text-center">No quests</div>}
        {filtered.map(quest => {
          const isOpen = expanded[quest.id]
          const completedObjs = quest.objectives.filter(o => o.completed).length
          return (
            <div key={quest.id} className="bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
              <div className="flex items-start gap-2 p-3">
                <button onClick={() => setExpanded(e => ({ ...e, [quest.id]: !e[quest.id] }))} className="mt-0.5 text-stone-400">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={quest.title}
                      onChange={e => updateQuest(quest.id, { title: e.target.value })}
                      className="font-semibold text-stone-100 bg-transparent outline-none text-sm flex-1 min-w-0"
                    />
                    <Badge variant={STATUS_BADGE[quest.status].variant}>{STATUS_BADGE[quest.status].label}</Badge>
                    {quest.objectives.length > 0 && (
                      <span className="text-xs text-stone-500">{completedObjs}/{quest.objectives.length}</span>
                    )}
                  </div>
                  {isOpen && (
                    <textarea value={quest.description} onChange={e => updateQuest(quest.id, { description: e.target.value })}
                      placeholder="Quest description..." rows={2}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-stone-400 text-xs outline-none resize-none mt-2 focus:border-stone-500" />
                  )}
                </div>
                {/* Status selector */}
                <select value={quest.status} onChange={e => setStatus(quest.id, e.target.value as Quest['status'])}
                  className="bg-stone-700 border border-stone-600 rounded px-1.5 py-1 text-stone-200 text-xs outline-none shrink-0">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button onClick={() => setDeleteId(quest.id)} className="p-1 text-stone-500 hover:text-red-400 shrink-0"><Trash2 size={13} /></button>
              </div>

              {/* Objectives */}
              {isOpen && (
                <div className="border-t border-stone-700 px-3 pb-3">
                  <div className="space-y-1.5 mt-2">
                    {quest.objectives.map(obj => (
                      <div key={obj.id} className="flex items-center gap-2">
                        <button onClick={() => toggleObjective(quest.id, obj.id)} className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${obj.completed ? 'bg-emerald border-emerald' : 'border-stone-500'}`}>
                          {obj.completed && <Check size={10} className="text-white" />}
                        </button>
                        <input
                          value={obj.text}
                          onChange={e => {
                            const updated = quest.objectives.map(o => o.id === obj.id ? { ...o, text: e.target.value } : o)
                            updateQuest(quest.id, { objectives: updated })
                          }}
                          className={`flex-1 bg-transparent text-sm outline-none ${obj.completed ? 'line-through text-stone-500' : 'text-stone-200'}`}
                        />
                        <button onClick={() => deleteObjective(quest.id, obj.id)} className="p-0.5 text-stone-600 hover:text-red-400"><Trash2 size={11} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addObjective(quest.id, 'New objective')} className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-gold">
                    <Plus size={12} /> Add Objective
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && (
        <Modal title="New Quest" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-stone-400 block mb-1">Title *</label>
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-100 text-sm outline-none focus:border-gold/50" placeholder="The Lost Sword..." />
            </div>
            <div>
              <label className="text-sm text-stone-400 block mb-1">Description</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-stone-200 text-sm outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim()} className="px-3 py-1.5 rounded bg-gold text-stone-900 font-semibold hover:bg-yellow-400 text-sm disabled:opacity-50">Create</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title="Delete Quest" message={`Delete "${quests.find(q => q.id === deleteId)?.title}"?`} confirmLabel="Delete" danger onConfirm={() => deleteQuest(deleteId)} onClose={() => setDeleteId(null)} />
      )}
    </div>
  )
}
