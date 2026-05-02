/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F7F5",
        ink: "#1C1C1A",
        accent: "#0B2447",
        stamp: "#8B0000",
      },
      fontFamily: {
        serif: ['"Merriweather"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'document': '0 0 0 1px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}