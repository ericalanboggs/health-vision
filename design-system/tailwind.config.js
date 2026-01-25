import preset from './tokens/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  presets: [preset],
  theme: {
    extend: {},
  },
  plugins: [],
}
