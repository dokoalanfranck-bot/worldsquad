/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#F5C518',
        neon: '#00D4FF',
        squad: {
          black: '#0A0A0F',
          dark: '#0D0D17',
          elevated: '#12121f',
        },
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'holo-shift': 'holo-shift 4s ease infinite',
        shimmer: 'shimmer 3s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
      },
      backgroundImage: {
        'squad-gradient': 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
      },
    },
  },
  plugins: [],
}
