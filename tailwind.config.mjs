/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pearl: '#fffaf7',
        blush: '#f8dfe5',
        rose: '#c87787',
        ruby: '#9b1d3d',
        wine: '#512135',
        gold: '#b9893b',
        ink: '#21161c',
        mist: '#f4efe9'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(92, 45, 62, 0.14)'
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        serif: ['"Shippori Mincho"', 'serif']
      }
    }
  },
  plugins: []
};
