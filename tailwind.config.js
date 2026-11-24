/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#4f2fd8',
          blue: '#2f6df0',
          gold: '#d9a63a',
          'gold-light': '#f5d57f',
          'indigo-dark': '#381ea6',
          'indigo-light': '#6848e8',
          'blue-dark': '#1e52c4',
          'blue-light': '#5187f5',
        },
        dark: {
          bg: '#0b0f19',
          surface: '#131b2e',
          card: '#1a233b',
          border: '#2a3556'
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
