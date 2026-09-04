/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        atmo: {
          canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          ink: 'rgb(var(--color-ink) / <alpha-value>)',
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          sun: 'rgb(var(--color-sun) / <alpha-value>)',
        },
        primary: {
          50: 'rgb(var(--color-primary) / 0.08)',
          100: 'rgb(var(--color-primary) / 0.14)',
          400: 'rgb(var(--color-primary) / 0.82)',
          500: 'rgb(var(--color-primary) / 0.92)',
          600: 'rgb(var(--color-primary) / 1)',
          700: 'rgb(var(--color-primary-dark) / 1)',
        },
        navy: {
          700: 'rgb(var(--color-ink) / 0.76)',
          800: 'rgb(var(--color-ink) / 0.86)',
          900: 'rgb(var(--color-surface) / 1)',
          950: 'rgb(var(--color-canvas) / 1)',
        },
        alert: {
          extreme: 'rgb(var(--alert-extreme) / <alpha-value>)',
          severe: 'rgb(var(--alert-severe) / <alpha-value>)',
          moderate: 'rgb(var(--alert-moderate) / <alpha-value>)',
          minor: 'rgb(var(--alert-minor) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        atmosphere: '0 24px 70px rgb(6 32 42 / 0.14)',
        lift: '0 16px 36px rgb(6 32 42 / 0.12)',
      },
    },
  },
  plugins: [],
};
