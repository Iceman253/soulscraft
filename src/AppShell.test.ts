import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// Stand-ins for the real screens, so the test sees which ones AppShell mounts
// without needing a browser. The GM map and log are the screens that leaked.
vi.mock('./TopBar', () => ({ TopBar: () => 'GM-TOPBAR' }))
vi.mock('./features/map/WorldMap', () => ({ WorldMap: () => 'GM-MAP' }))
vi.mock('./features/log/SessionLog', () => ({ SessionLog: () => 'GM-LOG' }))
vi.mock('./features/notes/PinnedNotes', () => ({ PinnedNotes: () => 'GM-NOTES' }))
vi.mock('./features/player-view/PlayerView', () => ({
  PlayerView: ({ isPlayerMode, focusedCharacterId }: { isPlayerMode?: boolean; focusedCharacterId?: string }) =>
    `PLAYER-VIEW mode=${!!isPlayerMode} char=${focusedCharacterId ?? 'none'}`,
}))

const { AppShell } = await import('./AppShell')
const render = (playerCharacterId: string | null) => renderToString(createElement(AppShell, { playerCharacterId }))

describe('AppShell', () => {
  it('renders only the player UI for a bound player', () => {
    const html = render('char-1')
    expect(html).toContain('PLAYER-VIEW mode=true char=char-1')
    expect(html).not.toContain('GM-')
  })

  it('renders only the player UI for a player without a character yet', () => {
    const html = render('')
    expect(html).toContain('PLAYER-VIEW mode=true char=none')
    expect(html).not.toContain('GM-')
  })

  it('renders the GM screens for the GM, with the Player View preview closed', () => {
    const html = render(null)
    for (const screen of ['GM-TOPBAR', 'GM-MAP', 'GM-LOG', 'GM-NOTES']) expect(html).toContain(screen)
    expect(html).not.toContain('PLAYER-VIEW')
  })
})
