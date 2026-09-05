/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: '#F7FAFC',
          card: '#FFFFFF',
          secondary: '#F1F7FC',
          lightBlue: '#E8F3FB',
          border: '#D8E7F2',
          primary: '#1677C8',
          primaryHover: '#125fa2',
          textDark: '#17324D',
          textMuted: '#64788A',
          positive: '#168A5B',
          positiveBg: '#E8F6F0',
          negative: '#D64545',
          negativeBg: '#FDF2F2',
          warning: '#B7791F',
          warningBg: '#FEF8EC',
        }
      }
    },
  },
  plugins: [],
}
