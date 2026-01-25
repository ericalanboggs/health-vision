/**
 * Summit Design System - Spacing & Layout Tokens
 *
 * Generous whitespace for a fluid, open canvas feel
 * Moving from confined cards to expansive, breathing layouts
 */

export const spacing = {
  // ============================================
  // SPACING SCALE
  // ============================================

  space: {
    /** 0px */
    0: '0',
    /** 1px */
    px: '1px',
    /** 2px */
    0.5: '0.125rem',
    /** 4px - Tight gaps */
    1: '0.25rem',
    /** 6px */
    1.5: '0.375rem',
    /** 8px - Icon gaps, compact padding */
    2: '0.5rem',
    /** 10px */
    2.5: '0.625rem',
    /** 12px - Standard gaps */
    3: '0.75rem',
    /** 14px */
    3.5: '0.875rem',
    /** 16px - Component padding */
    4: '1rem',
    /** 20px */
    5: '1.25rem',
    /** 24px - Section gaps */
    6: '1.5rem',
    /** 28px */
    7: '1.75rem',
    /** 32px - Large gaps */
    8: '2rem',
    /** 36px */
    9: '2.25rem',
    /** 40px */
    10: '2.5rem',
    /** 44px */
    11: '2.75rem',
    /** 48px - Page sections */
    12: '3rem',
    /** 56px */
    14: '3.5rem',
    /** 64px - Hero spacing */
    16: '4rem',
    /** 80px */
    20: '5rem',
    /** 96px */
    24: '6rem',
    /** 112px */
    28: '7rem',
    /** 128px */
    32: '8rem',
    /** 144px */
    36: '9rem',
    /** 160px */
    40: '10rem',
  },
} as const

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  /** 0 */
  none: '0',
  /** 2px */
  sm: '0.125rem',
  /** 4px */
  DEFAULT: '0.25rem',
  /** 6px - Small inputs */
  md: '0.375rem',
  /** 8px - Buttons, tags */
  lg: '0.5rem',
  /** 12px - Cards */
  xl: '0.75rem',
  /** 16px - Large cards, modals */
  '2xl': '1rem',
  /** 24px */
  '3xl': '1.5rem',
  /** 9999px - Pills, avatars, circular checkboxes */
  full: '9999px',
} as const

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  /** No shadow */
  none: 'none',
  /** Subtle shadow for cards */
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  /** Default card shadow */
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  /** Medium shadow */
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  /** Large shadow for modals */
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  /** Extra large shadow */
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  /** Maximum shadow */
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  /** Inner shadow */
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  /** Focus ring shadow - Summit Emerald */
  focus: '0 0 0 3px rgba(16, 185, 129, 0.4)',
  /** Error focus ring */
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.4)',
} as const

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  /** Behind content */
  behind: -1,
  /** Default */
  base: 0,
  /** Slightly raised */
  raised: 10,
  /** Dropdown menus */
  dropdown: 20,
  /** Sticky elements */
  sticky: 30,
  /** Fixed elements */
  fixed: 40,
  /** Modal backdrop */
  modalBackdrop: 50,
  /** Modals */
  modal: 60,
  /** Popovers */
  popover: 70,
  /** Tooltips */
  tooltip: 80,
  /** Maximum (toasts, notifications) */
  max: 100,
} as const

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  /** 640px */
  sm: '640px',
  /** 768px */
  md: '768px',
  /** 1024px */
  lg: '1024px',
  /** 1280px */
  xl: '1280px',
  /** 1536px */
  '2xl': '1536px',
} as const

// ============================================
// CONTAINER WIDTHS
// ============================================

export const container = {
  /** Narrow content width */
  narrow: '640px',
  /** Default content width */
  DEFAULT: '768px',
  /** Wide content width */
  wide: '1024px',
  /** Maximum content width */
  max: '1280px',
} as const

// Type exports
export type Spacing = typeof spacing
export type BorderRadius = typeof borderRadius
export type Shadows = typeof shadows
export type ZIndex = typeof zIndex
export type Breakpoints = typeof breakpoints
export type Container = typeof container
