// REST client for the shared-campaign backend. Same-origin — nginx proxies
// /api and /ws to the Node service, so relative paths work in production.
import type { CampaignData, CampaignMeta } from '../types'
import { newId } from './id'

/** Stable per-browser id so the server can skip echoing our own writes back. */
export function getClientId(): string {
  let id = localStorage.getItem('soulscraft_client_id')
  if (!id) { id = newId(); localStorage.setItem('soulscraft_client_id', id) }
  return id
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-client-id': getClientId(), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).error ?? msg } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
/** Public list — names + timestamps only. */
export const listCampaigns = () =>
  req<Array<Pick<CampaignMeta, 'id' | 'name'> & { updatedAt: number }>>('/api/campaigns')

export const createCampaignOnServer = (id: string, name: string, code: string, data: CampaignData) =>
  req<{ id: string }>('/api/campaigns', { method: 'POST', body: JSON.stringify({ id, name, code, data }) })

/** Validate the code and return the full campaign. Throws ApiError(403) on a bad code. */
export const enterCampaign = (id: string, code: string) =>
  req<{ id: string; name: string; data: CampaignData; updatedAt: number }>(
    `/api/campaigns/${id}/enter`, { method: 'POST', body: JSON.stringify({ code }) })

export const putCampaign = (id: string, code: string, data: CampaignData) =>
  req<{ updatedAt: number }>(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify({ code, data }) })

export const deleteCampaignOnServer = (id: string, code: string) =>
  req<{ ok: true }>(`/api/campaigns/${id}`, { method: 'DELETE', body: JSON.stringify({ code }) })

// ── Images ──────────────────────────────────────────────────────────────────
export const getImages = (id: string) =>
  req<Record<string, string>>(`/api/campaigns/${id}/images`)

export const putImage = (id: string, code: string, key: string, data: string) =>
  req<{ ok: true }>(`/api/campaigns/${id}/images/${encodeURIComponent(key)}`,
    { method: 'PUT', body: JSON.stringify({ code, data }) })

export const deleteImage = (id: string, code: string, key: string) =>
  req<{ ok: true }>(`/api/campaigns/${id}/images/${encodeURIComponent(key)}`,
    { method: 'DELETE', body: JSON.stringify({ code }) })
