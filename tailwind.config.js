/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          900: '#071a09',
          800: '#0f2d14',
          700: '#1a4a22',
          600: '#235c2b',
          500: '#2d7a3a',
          400: '#3d9b4d',
          300: '#5aaf65',
          200: '#82c98b',
          100: '#b4e0ba',
          50: '#d9f0dc',
          25: '#eaf3de',
          10: '#f4faf5',
        },
        cream: '#f8f6f0',
        parchment: '#f2efe6',
        ink: {
          DEFAULT: '#0d1f10',
          2: '#243827',
          3: '#445447',
          4: '#6b7c6d',
          5: '#9aaa9c',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        fraunces: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
}
