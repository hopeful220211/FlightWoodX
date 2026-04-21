/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#faf6f1',
          100: '#f0e6d8',
          200: '#e0ccb0',
          300: '#cba87a',
          400: '#b8864f',
          500: '#a67038',
          600: '#8a5a2e',
          700: '#6e4626',
          800: '#5a3a22',
          900: '#4a3020',
        },
        tech: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        ink: {
          900: '#1A1A1A',
          700: '#3D3D3D',
          600: '#5C5C5C',
          400: '#8A8A8A',
          200: '#D4D4D4',
        },
        paper: {
          50: '#FAF8F4',
          100: '#F3EFE8',
          200: '#E8E2D8',
        },
        accent: {
          sky: '#7DB8D9',
          leaf: '#8FB88F',
          gold: '#D4A74A',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'MiSans', 'system-ui', 'sans-serif'],
        display: ['"DingTalk JinBuTi"', 'MiSans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,.08)',
        lift: '0 14px 40px rgba(0,0,0,.14)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}

