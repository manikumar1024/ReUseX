/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ReUseX Design System
        canvas: '#F7F7F4',
        surface: '#FFFFFF',
        'surface-muted': '#F0F2EE',
        'surface-soft': '#EAF2E5',
        brand: {
          DEFAULT: '#163C2A',
          dark: '#0E2A1C',
          light: '#1E5038',
        },
        accent: {
          DEFAULT: '#B7E35A',
          dark: '#9DCB3E',
          light: '#CBF07A',
        },
        ink: {
          DEFAULT: '#17211B',
          muted: '#66706A',
          subtle: '#96A09A',
          faint: '#BAC4BE',
        },
        border: {
          DEFAULT: '#E1E5DF',
          strong: '#C8CEC9',
          subtle: '#EEF0EC',
        },
        success: '#3D8055',
        warning: '#C58A32',
        danger: '#C94A4A',
        info: '#2563EB',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '600' }],
        'hero-sm': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '600' }],
        'page': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'section': ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'lead': ['1.0625rem', { lineHeight: '1.6', fontWeight: '400' }],
      },
      boxShadow: {
        'xs':   '0 1px 2px 0 rgba(23,33,27,0.05)',
        'sm':   '0 1px 3px 0 rgba(23,33,27,0.07), 0 1px 2px -1px rgba(23,33,27,0.04)',
        'md':   '0 4px 6px -1px rgba(23,33,27,0.07), 0 2px 4px -2px rgba(23,33,27,0.04)',
        'lg':   '0 10px 15px -3px rgba(23,33,27,0.08), 0 4px 6px -4px rgba(23,33,27,0.04)',
        'xl':   '0 20px 25px -5px rgba(23,33,27,0.09), 0 8px 10px -6px rgba(23,33,27,0.04)',
        'inner-sm': 'inset 0 1px 2px rgba(23,33,27,0.05)',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
      },
      transitionDuration: {
        '175': '175ms',
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      maxWidth: {
        'content': '72rem',
        'prose': '68ch',
      },
    },
  },
  plugins: [],
}
