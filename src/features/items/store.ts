import { create } from 'zustand'
import type { Item, ItemLocation } from '../../types'
import { newId } from '../../lib/id'
import { useCampaignStore } from '../campaigns/store'
import { log } from '../log/store'

interface ItemStore {
  items: Item[]
  hydrate: (items: Item[]) => void
  addItem: (item: Omit<Item, 'id'>) => string
  updateItem: (id: string, patch: Partial<Item>) => void
  deleteItem: (id: string) => void
  moveItem: (id: string, location: ItemLocation) => void
  purchaseItem: (name: string, quantity: number, location: ItemLocation, cost?: string) => string
}

function save(items: Item[]) {
  useCampaignStore.getState().updateCampaignData({ items })
}

export const useItemStore = create<ItemStore>((set, get) => ({
  items: [],

  hydrate(items) { set({ items }) },

  addItem(item) {
    const id = newId()
    const items = [...get().items, { ...item, id }]
    set({ items }); save(items)
    log('manual', `📦 Added ${item.quantity}× ${item.name}.`)
    return id
  },

  updateItem(id, patch) {
    const items = get().items.map(i => i.id === id ? { ...i, ...patch } : i)
    set({ items }); save(items)
  },

  deleteItem(id) {
    const items = get().items.filter(i => i.id !== id)
    set({ items }); save(items)
  },

  moveItem(id, location) {
    const items = get().items.map(i => i.id === id ? { ...i, location } : i)
    set({ items }); save(items)
  },

  purchaseItem(name, quantity, location, cost) {
    const id = newId()
    const item: Item = { id, name, quantity, location }
    const items = [...get().items, item]
    set({ items }); save(items)
    const costStr = cost ? ` for ${cost}` : ''
    log('item-purchase', `🛒 Purchased ${quantity}× ${name}${costStr}.`)
    return id
  },
}))
