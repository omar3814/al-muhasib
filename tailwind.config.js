// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Tells Tailwind to scan these files for classes
  ],
  darkMode: 'class', // Enable class-based dark mode (we'll set 'dark' on the <html> tag)
  theme: {
    extend: {
      colors: {
        'navy-deep': '#0A192F',       // Deep navy-blue background
        'navy-light': '#172A45',      // Lighter navy for cards/modals
        'slate-blue': '#334E68',      // Subtle gray-blue accents
        'accent-blue': '#4A90E2',     // A slightly brighter accent if needed
        'text-primary-dark': '#CCD6F6', // Pale gray/off-white for text
        'text-secondary-dark': '#8892B0',// Softer gray for secondary text
      },
      fontFamily: {
        // We'll use system fonts for now for simplicity and broad Arabic support.
        // You can add custom Arabic fonts here later if desired.
        // e.g., 'sans': ['Noto Sans Arabic', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
      spacing: { // You can add custom spacing if needed
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: { // Generous rounded corners
        'xl': '1rem',
        '2xl': '1.5rem', // Even more rounded for some elements
      }
    },
  },
  plugins: [],
}