# Soulscraft Campaign Manager

A fan-made GM and player companion for the Soulscraft 3.1e tabletop RPG (by rebelJC).
React 19 + Vite + TypeScript + Zustand 5 + Tailwind. A small Node server (`server/`)
stores campaign data; the browser syncs to it.

## Commands

- `npm run dev`: Vite dev server
- `npx tsc -b`: type-check (**excludes test files**)
- `npx vitest run`: unit tests (run these after any move or rename, because tsc won't catch broken test imports)
- `npm run build`: tsc plus a production build

## Conventions

- **Small files, one job each.** Aim for under ~300 lines and split anything over 400.
  Keep pure rules in `.ts` files apart from the React components that use them.
- **Every change ships with tests** for its logic and edge cases. Tests are `*.test.ts`
  only (Vitest, node environment, no DOM), placed next to the file or in a `__tests__/` folder.
  Helpers live in `src/test/fixtures.ts` (`makeChar`) and `src/test/rng.ts` (`queueMathRolls`).
- **Players do the work; the GM signs off.** Player actions run on the player's device and
  send a prefilled request (`features/requests`) that the GM approves, adjusts or denies.
- **Synced state.** Stores save through `useCampaignStore.getState().updateCampaignData(...)`.
  A new synced store needs a campaign-data field, a `hydrate`, a subscription and a
  `runWithoutSave` guard. The server merge is shallow (top-level keys).
- Pending features are listed in order in `TODO.md`.
- The rulebook text is in `reference/manual/` (gitignored). Search
  `soulscraft_full_instruction_manual.txt` for rules; the page numbers cited in code refer to it.

## Layout

```
src/
  types/            data shapes, one file per domain (character, world, economy, gear, ...)
  lib/              pure logic, no React
    rules/          the rulebook: classes, species, classOptions, quickEffects, classAbilities/ (one per class),
                    armor, weapons, weaponSpec (stats a sold/carried weapon keeps), potions, enchanting, dice, newCharacter
                    constants.ts is a barrel that re-exports most of these
    world/          places (map levels, rest spots), stashes (storage), world (area types, realms),
                    building/ (carry limit, mining tools, mining rolls, build projects, block moving)
    economy/        economyEngine (prices), goods, currency (coins and copper), haggle (better-price offers, counters)
    art/            pixelArt, iconTemplates
    platform/       api, sync, storage, imageCache, export, id, portrait, playerRole, useIsPhone
  ui/               shared widgets: Modal, Badge, HpBar, ContextMenu, TokenAvatar, useToast, WeaponSpecLine,
                    CoinPrice (price typed in a chosen coin, shown in words), ...
  test/             test fixtures
  features/<area>/  one folder per app area, each with its components and store
```

### Features

| Folder | What's there |
|---|---|
| `characters/` | GM character sheet (`CharacterSheet`, `tabs/` incl. `InventoryItemRow`, `tabs/gear/`), `LevelUpModal` (+ `levelUpOptions`), `classFeatures/` (dispatcher + `panels/` one per class), `AbilityApplyPanel` (+ pure `modifiers/`: types, available, commit), `drinkPotion` |
| `characters/store/` | Zustand slices: `core` (add/update/class), `vitals` (HP, SD, XP, death, rest), `location`, `sheet` (skills, traits, abilities), `effects`, `gear`, `classFeatures`, `inventory`; `helpers` (save, committer, settleCarry), `migrate`, `types` |
| `player-view/` | Player screens. `sheet/` desktop sheet sections, `mobile/` phone layout, `hooks/` shared logic (`usePotionUse`, `useLevelUpFlow`), `map/` player map nodes, `shop/` (`useShop`: buy now, haggle, counters; ware row, sell tab); `PlayerMap`, `PlayerMarketModal`, `PlayerRequestModal`, `PlayerSessionLog`, `PlayerCombatView` |
| `requests/` | Player→GM requests: `store`, `GMRequestsPanel`; `gm/useExecuteRequest` (what approving each request type does), `gm/RequestRow`, `gm/RequestDetails`, `gm/TradeTerms` (price, approve vs counter); `skillApproval` |
| `map/` | GM world map (`WorldMap` + `world/`: node renderers, party tray, Reveal Party, background image `useMapBackground` + pure `backgroundMath`), area sub-maps (`SubMap` + `submap/`: navigation, breadcrumbs, nodes, side panel, token tray, add modal), `NodePanel`, `store/` slices (areas, playerView, tower, subNodes) |
| `combat/` | `CombatTracker` (+ `CombatantRow`, `AddCombatantsPanel`), `AttackModal`, pure `combatMath` (outcomes, damage, log line), `useAttackFlow`, `useInitiativeRolls`, `applyStatusEffect`, `statusEffects`, `store` |
| `dice/` | `DiceRoller`, pure `rolling.ts`, `hazards.tsx`, `SubRollDisplay` |
| `economy/` | GM economy tab: `PriceBoard` (+ `PriceRow`, `priceGrid`, `usePriceCoin`: the coin prices are typed in), `GoodEditorModal` (+ `WeaponSpecEditor` for weapon goods), `MarketProfileEditor`, `FactionsPanel`, `EventsPanel`, `TransactModal`, `CraftingCalculator`, `store` |
| `items/` | Item library and `MerchantModal` (+ `WareList`, pure `wares`: catalogs, market weapons, delivered item) |
| `building/` | Builds, mining and block storage (`BuildHub`, `MineFlow`, `MiningModal`, `PixelEditor`, `PlaceMap`, `StructurePanel`, `store`) |
| others | `campaigns`, `bestiary`, `quests`, `log`, `notes`, `rest`, `reference` (each a panel + store) |

Root: `App.tsx`/`AppShell.tsx` (GM layout and routing), `TopBar.tsx`.

## Elsewhere

- `server/`: API server (`server.js`, shallow `merge.js`)
- `deploy/`: install scripts (native, Proxmox LXC); `Dockerfile`, `docker-compose.yml`, `nginx.conf`
- `reference/`: rulebook text and images (gitignored)
