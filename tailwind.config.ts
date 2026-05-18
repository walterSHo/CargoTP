import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        panel: 'var(--panel)',
        panelAlt: 'var(--panel-alt)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        accentSoft: 'var(--accent-soft)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        muted: 'var(--muted)'
      }
    }
  },
  plugins: []
};

export default config;
