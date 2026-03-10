/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF0066',
          light: '#FF3385',
          dark: '#CC0052',
          50: '#FFF0F6',
          100: '#FFE0ED',
        },
        accent: {
          DEFAULT: '#FF0066',
          light: '#FF3385',
          dim: '#CC0052',
        },
        mint: '#00B894',
        coral: '#FF6B6B',
        gold: '#FDCB6E',
        navy: '#2D3436',
        soft: {
          blue: '#74B9FF',
          purple: '#A29BFE',
          green: '#55EFC4',
          orange: '#FAB1A0',
          pink: '#FD79A8',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
