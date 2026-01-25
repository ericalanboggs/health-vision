import summitPreset from './design-system/tokens/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [summitPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./design-system/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Legacy compass colors (can be removed after migration)
      colors: {
        compass: {
          primary: '#d97706',
          secondary: '#78716c',
          accent: '#f59e0b',
        }
      },
    },
  },
  plugins: [],
}
