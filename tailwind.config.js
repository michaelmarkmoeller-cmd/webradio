/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'rgb(var(--bg-primary)   / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          card:      'rgb(var(--bg-card)      / <alpha-value>)',
          hover:     'rgb(var(--bg-hover)     / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent)       / <alpha-value>)',
          hover:   'rgb(var(--accent-hover) / <alpha-value>)',
          muted:   'rgb(var(--accent)       / <alpha-value>)',
        },
        text: {
          primary:   'rgb(var(--text-primary)   / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--text-muted)     / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border)        / <alpha-value>)',
          active:  'rgb(var(--border-active) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
