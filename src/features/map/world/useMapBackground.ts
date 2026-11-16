// The world map's background image: upload, the flow-space node, and scaling mode.
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import type { Node } from '@xyflow/react'
import { useWorldStore } from '../store'
import { useCampaignStore } from '../../campaigns/store'
import { loadMapBg, saveMapBg, fileToDataUrl } from '../../../lib/platform/imageCache'
import { placeBackground, scaleBackground } from './backgroundMath'

export function useMapBackground() {
  const { areas, mapBackground, setMapBackground } = useWorldStore()
  const activeId = useCampaignStore(s => s.activeId)
  const [bgUrl, setBgUrl] = useState<string | null>(activeId ? loadMapBg(activeId) : null)
  const [scaleMode, setScaleMode] = useState(false)

  // A flow-space node so it pans and zooms with the map. Draggable only while
  // scaling; otherwise it ignores the pointer so panning works over it.
  const bgNode = useMemo<Node | null>(() => (bgUrl && mapBackground) ? {
    id: 'mapbg',
    type: 'mapBackground',
    position: { x: mapBackground.x, y: mapBackground.y },
    data: { url: bgUrl, w: mapBackground.w, h: mapBackground.h },
    draggable: scaleMode,
    selectable: false,
    zIndex: -1,
    style: scaleMode ? { cursor: 'move' } : { pointerEvents: 'none' },
  } : null, [bgUrl, mapBackground, scaleMode])

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeId) return
    const url = await fileToDataUrl(file, 1600)
    saveMapBg(activeId, url)
    setBgUrl(url)
    const img = new window.Image()
    img.onload = () => {
      setMapBackground(placeBackground(areas.map(a => a.position), img.naturalWidth, img.naturalHeight))
      setScaleMode(true)
    }
    img.src = url
  }

  const scale = (factor: number) => { if (mapBackground) setMapBackground(scaleBackground(mapBackground, factor)) }

  // While scaling, Enter finishes (locks the background to zoom/pan with the nodes).
  useEffect(() => {
    if (!scaleMode) return
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (ev.key === 'Enter') { ev.preventDefault(); setScaleMode(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scaleMode])

  return { hasImage: !!(bgUrl && mapBackground), bgNode, scaleMode, setScaleMode, upload, scale }
}
