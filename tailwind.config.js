/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Preto e cinza-escuro: base da identidade TRIDDO 3D.
        ink: {
          950: '#050508',
          900: '#0A0A0F',
          850: '#0F0F16',
          800: '#15151E',
          750: '#1C1C27',
          700: '#242431',
          600: '#32323F',
          500: '#45454F',
        },
        // Azul e roxo: cores de destaque.
        brand: {
          blue: '#4C7DFF',
          'blue-400': '#7B9FFF',
          'blue-600': '#3F6AF2',
          'blue-700': '#2F54D7',
          purple: '#8B5CF6',
          'purple-400': '#A78BFA',
          'purple-600': '#7C3AED',
          cyan: '#22D3EE',
        },
        positive: '#34D399',
        warning: '#FBBF24',
        negative: '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -12px rgba(0, 0, 0, 0.6)',
        glow: '0 0 0 1px rgba(76, 125, 255, 0.35), 0 12px 32px -12px rgba(76, 125, 255, 0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4C7DFF 0%, #8B5CF6 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(76,125,255,0.16) 0%, rgba(139,92,246,0.16) 100%)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideIn: 'slideIn 0.25s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
