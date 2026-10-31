import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CampaignData } from '../../../types'
import { mergeCampaign } from '../../../../server/merge.js'

const { patchCampaign, enterCampaign } = vi.hoisted(() => ({ patchCampaign: vi.fn(), enterCampaign: vi.fn() }))
vi.mock('../../../lib/api', () => ({
  patchCampaign,
  listCampaigns: vi.fn(),
  createCampaignOnServer: vi.fn(),
  enterCampaign,
  deleteCampaignOnServer: vi.fn(),
  ApiError: class extends Error {},
}))
vi.mock('../../../lib/imageCache', () => ({ setImageSyncContext: vi.fn(), hydrateImages: vi.fn() }))

import { useCampaignStore, runWithoutSave } from '../store'

const data = (over: Partial<CampaignData> = {}) => ({ id: 'x', name: 'Test', ...over }) as CampaignData
const store = () => useCampaignStore.getState()

beforeEach(() => {
  vi.useFakeTimers()
  patchCampaign.mockReset().mockResolvedValue({ updatedAt: 1 })
  useCampaignStore.setState({ activeId: 'x', activeCode: 'code', activeCampaign: data() })
  store().flushCurrent()
  patchCampaign.mockClear()
})
afterEach(() => { vi.useRealTimers() })

describe('saving', () => {
  it('sends only the fields that changed, once the debounce settles', () => {
    store().updateCampaignData({ structures: [] })
    store().updateCampaignData({ requests: [] })
    expect(patchCampaign).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(patchCampaign).toHaveBeenCalledTimes(1)
    expect(patchCampaign).toHaveBeenCalledWith('x', 'code', { structures: [], requests: [] })
  })

  it('sends a cleared field as null so it reaches the server', () => {
    store().updateCampaignData({ mapBackground: undefined })
    store().flushCurrent()
    expect(patchCampaign).toHaveBeenCalledWith('x', 'code', { mapBackground: null })
  })

  it('has nothing to send when nothing changed', () => {
    store().flushCurrent()
    expect(patchCampaign).not.toHaveBeenCalled()
  })

  it('does not save changes that came from hydrating', () => {
    runWithoutSave(() => store().updateCampaignData({ structures: [] }))
    vi.advanceTimersByTime(400)
    expect(patchCampaign).not.toHaveBeenCalled()
  })

  it('retries a failed save with the next change', async () => {
    patchCampaign.mockRejectedValueOnce(new Error('offline'))
    store().updateCampaignData({ structures: [] })
    store().flushCurrent()
    await vi.advanceTimersByTimeAsync(0)
    store().updateCampaignData({ requests: [] })
    store().flushCurrent()
    expect(patchCampaign).toHaveBeenLastCalledWith('x', 'code', { structures: [], requests: [] })
  })
})

describe('changes from other devices', () => {
  it('adopts them', () => {
    const merged = store().applyRemote(data({ name: 'Renamed' }))
    expect(merged.name).toBe('Renamed')
    expect(store().activeCampaign?.name).toBe('Renamed')
  })

  it('keeps a local change that has not been saved yet', () => {
    const mine = [{ id: 'local' }] as CampaignData['structures']
    store().updateCampaignData({ structures: mine })
    const merged = store().applyRemote(data({ structures: [], name: 'Renamed' }))
    expect(merged.structures).toBe(mine)
    expect(merged.name).toBe('Renamed')
    vi.advanceTimersByTime(400)
    expect(patchCampaign).toHaveBeenCalledWith('x', 'code', { structures: mine })
  })
})

describe('catching up after sleep', () => {
  it('adopts the latest campaign', async () => {
    enterCampaign.mockResolvedValue({ data: data({ name: 'Newer' }) })
    const fresh = await store().refetchActive()
    expect(enterCampaign).toHaveBeenCalledWith('x', 'code')
    expect(fresh?.name).toBe('Newer')
    expect(store().activeCampaign?.name).toBe('Newer')
  })

  it('keeps unsaved local changes', async () => {
    const mine = [{ id: 'local' }] as CampaignData['structures']
    store().updateCampaignData({ structures: mine })
    enterCampaign.mockResolvedValue({ data: data({ structures: [] }) })
    expect((await store().refetchActive())?.structures).toBe(mine)
  })

  it('changes nothing when the server cannot be reached', async () => {
    enterCampaign.mockRejectedValue(new Error('offline'))
    expect(await store().refetchActive()).toBeNull()
    expect(store().activeCampaign?.name).toBe('Test')
  })

  it('ignores a reply that arrives after leaving the campaign', async () => {
    enterCampaign.mockImplementation(async () => {
      useCampaignStore.setState({ activeId: 'other' })
      return { data: data({ name: 'Stale' }) }
    })
    expect(await store().refetchActive()).toBeNull()
    expect(store().activeCampaign?.name).toBe('Test')
  })
})

describe('server merge', () => {
  it('replaces only the patched fields', () => {
    expect(mergeCampaign({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 })
  })

  it("lets two devices' saves land without undoing each other", () => {
    const phone = { requests: ['build'] }
    const gm = { areas: ['new area'] }
    const saved = mergeCampaign(mergeCampaign({ requests: [], areas: [] }, phone), gm)
    expect(saved).toEqual({ requests: ['build'], areas: ['new area'] })
  })
})
