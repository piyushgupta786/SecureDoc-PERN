/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Swiss Technical Editorial palette — OKLCH-derived, ink-on-paper
        paper: {
          DEFAULT: 'var(--color-paper)',
          2: 'var(--color-paper-2)',
          3: 'var(--color-paper-3)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          2: 'var(--color-ink-2)',
          3: 'var(--color-ink-3)',
          4: 'var(--color-ink-4)',
        },
        rule: {
          DEFAULT: 'var(--color-rule)',
          subtle: 'var(--color-rule-subtle)',
        },
        // Accent — amber signal
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          border: 'var(--color-accent-border)',
          dark: 'var(--color-accent-dark)',
          ink: 'var(--color-accent-ink)',
        },
        // Status semantics
        verified: {
          DEFAULT: 'var(--color-verified)',
          bg: 'var(--color-verified-bg)',
          border: 'var(--color-verified-border)',
        },
        tampered: {
          DEFAULT: 'var(--color-tampered)',
          bg: 'var(--color-tampered-bg)',
          border: 'var(--color-tampered-border)',
        },
        warn: {
          DEFAULT: 'var(--color-warn)',
          bg: 'var(--color-warn-bg)',
          border: 'var(--color-warn-border)',
        },
        amber: {
          50: '#fdf3e3',
          100: '#fbe7c6',
          200: '#f5ce8d',
          300: '#eeb055',
          400: '#e59628',
          500: '#c17d2a',
          600: '#a76521',
          700: '#8c501b',
          800: '#7a4e1a',
          900: '#643d16',
          DEFAULT: '#c17d2a',
          light: '#fdf3e3',
          dark: '#7a4e1a',
        },
      },
      spacing: {
        '3xs': '2px',
        '2xs': '4px',
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '40px',
        '2xl': '64px',
        '3xl': '96px',
        '4xl': '144px',
      },
      fontSize: {
        'display': ['84px', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-s': ['60px', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'section': ['36px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'title': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'lead': ['18px', { lineHeight: '1.5' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'xs': ['11px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'sm': '3px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'card': '0 1px 3px oklch(20% 0.01 60 / 0.08)',
        'modal': '0 8px 32px oklch(20% 0.01 60 / 0.16)',
      },
      transitionDuration: {
        'micro': '120ms',
        'short': '220ms',
        'long': '420ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0.0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      zIndex: {
        'raised': '10',
        'dropdown': '100',
        'sticky': '200',
        'nav': '300',
        'modal': '400',
        'toast': '500',
        'tooltip': '600',
      }
    },
  },
  plugins: [],
}
