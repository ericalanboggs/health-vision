/**
 * Summit Design System - Typography Tokens
 *
 * Typography as a design element - bold, expressive headlines
 * that feel aspirational and motivating
 */

export const typography = {
  // ============================================
  // FONT FAMILIES
  // ============================================

  fontFamily: {
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace",
  },

  // ============================================
  // FONT SIZES
  // ============================================

  fontSize: {
    /** 12px - Labels, all-caps meta */
    xs: '0.75rem',
    /** 14px - Secondary text */
    sm: '0.875rem',
    /** 16px - Standard body */
    base: '1rem',
    /** 18px - Vision statements */
    lg: '1.125rem',
    /** 20px - Large body */
    xl: '1.25rem',
    /** 24px - H3, Card headers */
    '2xl': '1.5rem',
    /** 30px - H2, Section headers */
    '3xl': '1.875rem',
    /** 36px - Large H1 */
    '4xl': '2.25rem',
    /** 40px - H1, Page titles */
    '5xl': '2.5rem',
    /** 48px+ - Display, Hero headlines */
    '6xl': '3rem',
    /** 60px - Extra large display */
    '7xl': '3.75rem',
    /** 72px - Maximum display */
    '8xl': '4.5rem',
  },

  // ============================================
  // FONT WEIGHTS
  // ============================================

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // ============================================
  // LINE HEIGHTS
  // ============================================

  lineHeight: {
    /** 1.1 - Display headlines */
    none: '1',
    tight: '1.1',
    /** 1.2 - H1 */
    snug: '1.2',
    /** 1.3 - H2 */
    normal: '1.3',
    /** 1.4 - H3, Meta */
    relaxed: '1.4',
    /** 1.5 - Body small */
    loose: '1.5',
    /** 1.6 - Body text */
    prose: '1.6',
  },

  // ============================================
  // LETTER SPACING
  // ============================================

  letterSpacing: {
    /** -0.02em - Display headlines */
    tighter: '-0.02em',
    /** -0.01em - H1, H2 */
    tight: '-0.01em',
    /** 0 - Body text */
    normal: '0',
    /** 0.05em - Meta, all-caps */
    wide: '0.05em',
    /** 0.1em - Extra wide tracking */
    wider: '0.1em',
  },
} as const

// ============================================
// PRESET TEXT STYLES
// ============================================

export const textStyles = {
  /** Hero headlines - 48px+, extrabold, tight tracking */
  display: {
    fontSize: typography.fontSize['6xl'],
    fontWeight: typography.fontWeight.extrabold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tighter,
  },

  /** Page titles - 40px, extrabold */
  h1: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.extrabold,
    lineHeight: typography.lineHeight.snug,
    letterSpacing: typography.letterSpacing.tight,
  },

  /** Section headers - 30px, extrabold */
  h2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.extrabold,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.tight,
  },

  /** Card headers - 24px, semibold */
  h3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },

  /** Large body text - 18px for vision statements */
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.prose,
    letterSpacing: typography.letterSpacing.normal,
  },

  /** Standard body text - 16px */
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.prose,
    letterSpacing: typography.letterSpacing.normal,
  },

  /** Secondary text - 14px */
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight.loose,
    letterSpacing: typography.letterSpacing.normal,
  },

  /** Labels, meta text - 12px, semibold, wide tracking */
  meta: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },

  /** "North Star" style - 24-30px, medium weight for vision summaries */
  northStar: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },

  /** Tech labels - 12px, semibold, all-caps, Summit Moss */
  techLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
} as const

// Type exports
export type Typography = typeof typography
export type TextStyles = typeof textStyles
