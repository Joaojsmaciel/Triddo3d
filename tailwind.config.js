/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#4C7DFF',
        'brand-blue-600': '#3f6af2',
        'brand-blue-700': '#2f54d7',
      },
    },
  },
  plugins: [],
}

