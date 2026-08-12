import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        'background-raised': 'var(--background-raised)',
        foreground: 'var(--foreground)',
        'foreground-dim': 'var(--foreground-dim)',
        accent: 'var(--accent)',
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
};

export default config;
