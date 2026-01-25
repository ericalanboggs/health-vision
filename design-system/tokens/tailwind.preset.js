/**
 * Summit Design System - Tailwind CSS Preset
 *
 * Extends Tailwind defaults with Summit tokens
 * Usage: Add to presets array in tailwind.config.js
 *
 * @example
 * // tailwind.config.js
 * import summitPreset from '@summit/design-system/tailwind-preset'
 * export default {
 *   presets: [summitPreset],
 *   // ...
 * }
 */

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      // ==========================================
      // COLORS
      // ==========================================
      colors: {
        // Summit Primary - Rich Nature-Tech
        summit: {
          lime: '#A3E635',
          emerald: '#10B981',
          moss: '#059669',
          forest: '#022C22',
          sage: '#D1FAE5',
          mint: '#F0FDFA',
        },

        // Extended Emerald Scale
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#022C22',
          950: '#011713',
        },

        // Extended Grayscale
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },

        // Semantic Colors
        surface: {
          base: '#FFFFFF',
          page: '#F0FDFA',
        },
        text: {
          primary: '#022C22',
          secondary: 'rgba(2, 44, 34, 0.8)',
          muted: 'rgba(2, 44, 34, 0.5)',
          disabled: 'rgba(2, 44, 34, 0.35)',
          inverse: '#FFFFFF',
        },
        border: {
          subtle: '#D1FAE5',
          DEFAULT: '#E5E7EB',
          focus: '#10B981',
          strong: '#022C22',
        },

        // Feedback Colors
        feedback: {
          success: '#10B981',
          'success-light': '#ECFDF5',
          warning: '#F59E0B',
          'warning-light': '#FFFBEB',
          error: '#EF4444',
          'error-light': '#FEF2F2',
          info: '#3B82F6',
          'info-light': '#EFF6FF',
        },
      },

      // ==========================================
      // TYPOGRAPHY
      // ==========================================
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        // Custom sizes matching our scale - Rich Nature-Tech with extrabold headlines
        display: ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        h1: ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '800' }],
        h2: ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '800' }],
        h3: ['1.5rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        body: ['1rem', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        meta: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '600' }],
      },

      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.05em',
        wider: '0.1em',
      },

      // ==========================================
      // SPACING
      // ==========================================
      spacing: {
        // Keep Tailwind defaults, add custom values
        18: '4.5rem', // 72px
        22: '5.5rem', // 88px
      },

      // ==========================================
      // BORDER RADIUS
      // ==========================================
      borderRadius: {
        // Summit-specific radius tokens
        sm: '0.375rem', // 6px - Small inputs
        DEFAULT: '0.5rem', // 8px - Buttons, tags
        md: '0.5rem', // 8px
        lg: '0.75rem', // 12px - Cards
        xl: '1rem', // 16px - Large cards, modals
        '2xl': '1.5rem', // 24px
        full: '9999px', // Pills, avatars, circular checkboxes
      },

      // ==========================================
      // SHADOWS
      // ==========================================
      boxShadow: {
        // Card shadow
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        // Elevated shadow for hover states
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        // Modal shadow
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        // Focus ring
        focus: '0 0 0 3px rgba(16, 185, 129, 0.4)',
        'focus-error': '0 0 0 3px rgba(239, 68, 68, 0.4)',
      },

      // ==========================================
      // ANIMATION
      // ==========================================
      transitionDuration: {
        fast: '100ms',
        normal: '150ms',
        medium: '200ms',
        slow: '250ms',
        slower: '300ms',
        slowest: '500ms',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.33, 1, 0.68, 1)',
        in: 'cubic-bezier(0.32, 0, 0.67, 0)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      animation: {
        'checkbox-pop': 'checkbox-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 300ms ease-out',
        'scale-in': 'scale-in 250ms ease-out',
      },

      keyframes: {
        'checkbox-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
}
