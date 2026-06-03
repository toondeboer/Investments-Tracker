const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':     '#0A1628',
        'bg-surface':  '#0F2035',
        'bg-elevated': '#162840',
        'bg-alt':      '#0D1F38',
        navy:          '#1B3A5C',
        'navy-light':  '#2E5F8A',
        ocean:         '#1E6091',
        gold:          '#C9A84C',
        'gold-light':  '#E8C97A',
        'gold-dark':   '#A08030',
        sand:          '#E8D5B7',
        cream:         '#F5F0E8',
        muted:         '#8FA8C0',
        success:       '#2ECC71',
        error:         '#E74C3C',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card:        '0 10px 40px rgba(0,0,0,0.4)',
        'card-hover':'0 20px 60px rgba(0,0,0,0.5)',
        soft:        '0 8px 32px rgba(0,0,0,0.3)',
        gold:        '0 0 20px rgba(201,168,76,0.2)',
        'focus-gold':'0 0 0 2px rgba(201,168,76,0.15)',
      },
      fontFamily: {
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
      },
      backgroundImage: {
        brand:    'linear-gradient(135deg, #1B3A5C 0%, #0A1628 100%)',
        'brand-45':'linear-gradient(45deg, #1B3A5C, #0A1628)',
        accent:   'linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)',
        ocean:    'linear-gradient(180deg, #0A1628 0%, #1E6091 100%)',
      },
      accentColor: {
        gold: '#C9A84C',
      },
      screens: {
        sm:  '480px',
        md:  '768px',
        lg:  '1024px',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shimmer:  'shimmer 1.5s ease-in-out infinite',
        fadeInUp: 'fadeInUp 0.3s ease forwards',
        float:    'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
