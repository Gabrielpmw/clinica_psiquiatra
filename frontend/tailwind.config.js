/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0d9488',    // teal-600
          hover: '#0f766e',      // teal-700
          accent: '#0284c7',     // sky-600
        },
        surface: {
          background: '#f8fafc', // slate-50
          card: '#ffffff',
        },
        status: {
          done: '#10b981',       // emerald-500
          scheduled: '#3b82f6',  // blue-500
          pending: '#f59e0b',    // amber-500
          cancelled: '#f43f5e',  // rose-500
        },
        ai: {
          bg: '#eff6ff',         // blue-50
          border: '#bfdbfe',     // blue-200
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
