/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#164B35',
          50: '#F0F5F2',
          100: '#DCE8E2',
          200: '#BCD3C6',
          300: '#94BBA7',
          400: '#689F84',
          500: '#347653',
          600: '#235D40',
          700: '#164B35',
          800: '#113A29',
          900: '#0B271B',
        },
        leaf: {
          DEFAULT: '#347653',
          light: '#4C926D',
          dark: '#265B3E',
        },
        lime: {
          accent: '#B8D96B',
          light: '#CFE693',
          dark: '#9BBF4A',
        },
        cream: {
          DEFAULT: '#F7F8F2',
          card: '#FFFFFF',
          muted: '#EFF2EB',
          border: '#E2E7DE',
        },
        agridark: {
          DEFAULT: '#25312A',
          secondary: '#526058',
          muted: '#7C8C83',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(22, 75, 53, 0.05)',
        'medium': '0 8px 30px rgba(22, 75, 53, 0.08)',
        'card': '0 4px 20px -2px rgba(37, 49, 42, 0.06)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}


