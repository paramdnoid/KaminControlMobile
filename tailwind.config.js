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
        background: '#F5F2EC',
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#FDFCFA',
          muted:   '#ECE7DE',
        },
        border:  '#D8D0C4',
        divider: '#EAE4DB',
        ink:     '#1C1917',
        muted: {
          DEFAULT: '#6E665E',
          light:   '#A39990',
        },
        primary: {
          DEFAULT: '#1E4E46',
          pressed: '#163B35',
          soft:    '#D5EAE5',
        },
        accent: {
          DEFAULT: '#B65F2A',
          soft:    '#F2DFCF',
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
        sm:   '6px',
        md:   '10px',
        lg:   '14px',
      },
      fontSize: {
        small:   ['13px', { lineHeight: '18px' }],
        h3:      ['17px', { lineHeight: '22px' }],
        title:   ['28px', { lineHeight: '34px' }],
        display: ['32px', { lineHeight: '38px' }],
      },
      maxWidth: {
        shell: '860px',
      },
    },
  },
  plugins: [],
};
