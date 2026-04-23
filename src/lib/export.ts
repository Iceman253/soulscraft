import type { CampaignData } from '../types'
import { newId } from './id'

export function serializeCampaign(data: CampaignData): string {
  return JSON.stringify(data, null, 2)
}

export function deserializeCampaign(json: string): CampaignData | null {
  try {
    const data = JSON.parse(json) as CampaignData
    if (!data.id || !data.name) return null
    // Assign a new ID to avoid collision on import
    return { ...data, id: newId() }
  } catch {
    return null
  }
}

export function downloadJson(data: CampaignData) {
  const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const date = new Date().toISOString().split('T')[0]
  const filename = `soulscraft_${slug}_${date}.json`
  const blob = new Blob([serializeCampaign(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
