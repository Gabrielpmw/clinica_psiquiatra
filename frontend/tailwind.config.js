/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Roboto', 'sans-serif'] },
      colors: {
        paper: { 50: '#F9FAF6', 100: '#F2F5EF', 200: '#E6ECE2', 300: '#D5DED0' },
        leaf: {
          100: '#E3F0E8', 200: '#CFE5D8', 500: '#4A9E7A',
          600: '#368262', 700: '#2B6A4F', 800: '#1F4D3A', 900: '#17382A',
        },
        ink: { 400: '#7C8B83', 600: '#4A5A52', 900: '#1E2A24' },
        status: {
          scheduled: '#4A86B5', scheduledBg: '#E4EEF6',
          done: '#2B6A4F',      doneBg: '#CFE5D8',
          missed: '#C98A1B',    missedBg: '#FBEFD9',
          cancelled: '#B5645C', cancelledBg: '#F6E3E1',
        },
        ai: { bg: '#EAF1EC', border: '#4A9E7A' },
      },
    },
  },
  plugins: [],
};
