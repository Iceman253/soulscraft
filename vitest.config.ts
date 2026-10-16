import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Unit tests for game logic (stores, dice). The node environment is enough —
// nothing here renders React. Test files are excluded from tsconfig.app.json so
// they never affect the production `tsc -b && vite build`.
export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
}))
