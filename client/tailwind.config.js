import typography from '@tailwindcss/typography';

export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#25c2a0',
          dark: '#1e9e83',
          light: '#4dd4b9',
        },
        secondary: {
          DEFAULT: '#0070f3',
          dark: '#005cc5',
        },
        accent: '#fd7e14',
        background: {
          light: '#f8f9fa',
          dark: '#343a40',
        }
      },
      boxShadow: {
        card: '0 2px 10px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [
    typography(),
  ],
}