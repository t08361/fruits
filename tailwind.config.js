/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'slide-lr': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-lr-stop': {
          '0%': { transform: 'translateX(-10px)' },
          '20%': { transform: 'translateX(10px)' },
          '40%': { transform: 'translateX(-10px)' },
          '60%': { transform: 'translateX(10px)' },
          '80%': { transform: 'translateX(-10px)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      animation: {
        'slide-lr': 'slide-lr 2s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 1.5s ease-in-out infinite',
        'slide-lr-10s': 'slide-lr-stop 10s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}