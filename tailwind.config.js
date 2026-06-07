/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F2EFE8',
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#FBFAF7',
          muted:   '#EDE8DF',
        },
        border:  '#E3DCD0',
        divider: '#EDE7DD',
        ink:     '#1A1613',
        muted: {
          DEFAULT: '#6B635A',
          light:   '#A89E93',
        },
        primary: {
          DEFAULT: '#16453D',
          pressed: '#0F312B',
          soft:    '#DBEAE4',
        },
        accent: {
          DEFAULT: '#BC6230',
          soft:    '#F3E0D1',
        },
        success:  '#2D6A4F',
        warning:  '#9A5B11',
        danger: {
          DEFAULT: '#9F2D2D',
          soft:    '#F4DADA',
        },
        info: {
          DEFAULT: '#275C7D',
          soft:    '#DDEAF1',
        },
      },
      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '22px',
      },
      fontSize: {
        eyebrow: ['12px', { lineHeight: '16px', letterSpacing: '1.2px' }],
        small:   ['13px', { lineHeight: '18px' }],
        h3:      ['17px', { lineHeight: '23px' }],
        h2:      ['21px', { lineHeight: '27px' }],
        title:   ['31px', { lineHeight: '37px' }],
        display: ['40px', { lineHeight: '44px' }],
      },
      maxWidth: {
        shell: '860px',
      },
    },
  },
  plugins: [],
};
