import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock import.meta.env for tests
beforeAll(() => {
  // Set default test environment variables
  globalThis.import = {
    meta: {
      env: {
        VITE_PILOT_START_DATE: '2026-01-12',
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-key',
      }
    }
  }
})
