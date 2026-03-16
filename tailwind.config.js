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
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
