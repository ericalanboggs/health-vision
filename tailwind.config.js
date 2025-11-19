/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        compass: {
          primary: '#d97706',
          secondary: '#78716c',
          accent: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
