/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0F0F14',
          secondary: '#1A1A24',
          card: '#16161F',
          hover: '#1E1E2A',
        },
        accent: {
          DEFAULT: '#F5A623',
          hover: '#F7B84B',
          muted: '#F5A62333',
        },
        text: {
          primary: '#F0F0F5',
          secondary: '#9090A0',
          muted: '#5A5A6A',
        },
        border: {
          DEFAULT: '#2A2A38',
          active: '#F5A623',
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
