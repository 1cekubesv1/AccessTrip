import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Two projects in one run so the Node backend and the jsdom frontend share a
// single Vitest invocation. Reuses Vite's ESM/TS transpile pipeline — no ts-jest.
export default defineConfig({
  test: {
    projects: [
      {
        // Backend: plain Node environment for server/ + scripts/ logic.
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      {
        // Frontend: jsdom + React for web/ components and hooks.
        plugins: [react()],
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./vitest.setup.ts'],
          include: ['web/src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
