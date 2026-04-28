/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: '#E5E7EB', // gray-200, neutral
      },
      colors: {
        // ── 스노우 ── slate-50 (#F8FAFC) 통일. 본문·카드·푸터 모두 같은 톤,
        // 카드는 border/shadow 로만 분리. 눈부심 ↓, 깔끔한 미니멀.
        snow: {
          DEFAULT: '#F8FAFC',
          soft: '#FCFDFE', // 약간 더 밝은 elevation 이 필요할 때만
        },
        // ── PAN 브랜드: 흑백 모노크롬 ──
        // 기존 sky-* 톤을 slate 로 재매핑해서 전 페이지에서 자동으로 톤이 바뀜.
        sky: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#0F172A', // 강조 = 검정
          600: '#0F172A',
          700: '#020617',
          800: '#020617',
          900: '#000000',
        },
        primary: {
          DEFAULT: '#0F172A',
          light: '#334155',
          dark: '#000000',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
        },
        accent: {
          DEFAULT: '#0F172A',
          light: '#334155',
          dim: '#475569',
        },
        // 상태 컬러 — PAN 톤에 맞게 살짝 차분하게
        mint: '#059669',   // emerald-600 (selling/success)
        coral: '#DC2626',  // red-600 (danger)
        gold: '#D97706',   // amber-600 (warning/premium)
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
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
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
