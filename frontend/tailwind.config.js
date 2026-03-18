/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: '#BAE6FD',
      },
      colors: {
        primary: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
          dark: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
        },
        accent: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
          dim: '#0EA5E9',
        },
        mint: '#10B981',
        coral: '#F43F5E',
        gold: '#F59E0B',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
