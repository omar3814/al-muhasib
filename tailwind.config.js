/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme based on "Personal Accountant" image
        'pa-dark-bg': '#101010',          // Very dark (almost black) background
        'pa-dark-surface': '#1C1C1C',    // Surface for cards/sections (slightly lighter)
        'pa-dark-border': '#2D2D2D',      // Subtle borders or dividers
        
        'pa-text-primary': '#FFFFFF',     // White text
        'pa-text-secondary': '#A0A0A0',   // Lighter gray for secondary text
        'pa-text-placeholder': '#505050', // Dimmer gray for placeholders

        // Accent - The image is very monochromatic. 
        // We'll use a light gray for primary buttons, and a subtle blue for focus/links if needed.
        'pa-button-bg': '#3D3D3D',         // Placeholder button background from image
        'pa-button-text': '#101010',       // Dark text on light button not seen, assuming light text on dark button
        'pa-button-hover-bg': '#4A4A4A',

        'pa-accent-interactive': '#4A90E2', // A subtle blue for links/focus rings
        'pa-accent-interactive-hover': '#5AAEFF',

        // Status colors (can be adjusted)
        'pa-danger': '#E53E3E',
        'pa-success': '#38A169',
        'pa-warning': '#DD6B20',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'],
      },
      borderRadius: {
        'lg': '8px',  // From image, buttons have noticeable rounding
        'xl': '12px',
      },
      boxShadow: {
        // Image doesn't show strong shadows, more about color separation
        'subtle-dark': '0 1px 2px 0 rgba(255, 255, 255, 0.03)', 
      },
    },
  },
  plugins: [],
}