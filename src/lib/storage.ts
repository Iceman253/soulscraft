import type { CampaignData, CampaignMeta } from '../types'

const CAMPAIGNS_KEY = 'soulscraft_campaigns'
const ACTIVE_KEY = 'soulscraft_active_campaign'
const CURRENT_SCHEMA = 1

export function getCampaignKey(id: string) {
  return `soulscraft_campaign_${id}`
}

export function loadCampaignIndex(): CampaignMeta[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCampaignIndex(meta: CampaignMeta[]) {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(meta))
}

export function loadCampaign(id: string): CampaignData | null {
  try {
    const raw = localStorage.getItem(getCampaignKey(id))
    if (!raw) return null
    const data = JSON.parse(raw) as CampaignData
    return migrate(data)
  } catch {
    return null
  }
}

export function saveCampaign(data: CampaignData) {
  const key = getCampaignKey(data.id)
  const serialized = JSON.stringify(data)
  // Warn if approaching localStorage limit (~5MB)
  if (serialized.length > 3_000_000) {
    console.warn('[Soulscraft] Campaign data exceeds 3MB — consider exporting a backup.')
  }
  localStorage.setItem(key, serialized)
}

export function deleteCampaignData(id: string) {
  localStorage.removeItem(getCampaignKey(id))
}

export function getActiveCampaignId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveCampaignId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

function migrate(data: CampaignData): CampaignData {
  // Future migrations go here based on data.schemaVersion
  return { ...data, schemaVersion: CURRENT_SCHEMA }
}

export function getCampaignSizeBytes(id: string): number {
  const raw = localStorage.getItem(getCampaignKey(id))
  return raw ? new Blob([raw]).size : 0
}
