// Polyfill for node:module in browser context
// This is needed for @supabase/supabase-js compatibility

// Export a mock createRequire function for browser
export const createRequire = () => {
  return (id) => {
    // Mock require that returns an empty object
    return {}
  }
}

// Default export for ESM compatibility
export default {
  createRequire
}
