/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',
        secondary: '#38bdf8',
        dark: {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
        },
        neon: {
          blue: '#00d4ff',
          purple: '#a855f7',
          pink: '#ec4899',
          green: '#10b981',
          orange: '#f59e0b',
        }
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3), 0 0 20px rgba(0, 212, 255, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
