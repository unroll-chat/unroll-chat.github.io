import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,html}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        primary: 'var(--color-primary)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-muted': 'var(--color-on-surface-muted)',
        accent: 'var(--color-accent)',
      },
    },
  },
  plugins: [],
};

export default config;
