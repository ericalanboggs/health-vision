/**
 * Summit Design System - Color Tokens
 *
 * The "Rich Nature-Tech" palette: vibrant greens sampled from mountain artwork
 * High-energy, modern, and aspirational
 */

export const colors = {
  // ============================================
  // PRIMARY SUMMIT COLORS - RICH NATURE-TECH
  // ============================================

  /** Primary CTA - high energy lime for buttons and primary actions */
  summit: {
    lime: '#A3E635',
    /** Active states - vibrant emerald for icons and checkmarks */
    emerald: '#10B981',
    /** Secondary accent - hover states, links */
    moss: '#059669',
    /** Primary text - deep, grounded forest (darker than before) */
    forest: '#022C22',
    /** Soft UI - tag backgrounds, subtle alerts */
    sage: '#D1FAE5',
    /** Page background - crisp, expansive feel */
    mint: '#F0FDFA',
  },

  // ============================================
  // EXTENDED EMERALD SCALE
  // ============================================

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
    900: '#064E3B',
    950: '#022C22',
  },

  // ============================================
  // EXTENDED GRAYSCALE
  // ============================================

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

  // ============================================
  // SEMANTIC SURFACE COLORS
  // ============================================

  surface: {
    /** Card backgrounds */
    base: '#FFFFFF',
    /** Page background (mint) */
    page: '#F0FDFA',
    /** Elevated surfaces */
    elevated: '#FFFFFF',
    /** Overlay backgrounds */
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // ============================================
  // SEMANTIC TEXT COLORS
  // ============================================

  text: {
    /** Headlines (forest) */
    primary: '#064E3B',
    /** Body text */
    secondary: 'rgba(6, 78, 59, 0.8)',
    /** Meta/helper text */
    muted: 'rgba(6, 78, 59, 0.5)',
    /** Text on dark backgrounds */
    inverse: '#FFFFFF',
    /** Disabled text */
    disabled: 'rgba(6, 78, 59, 0.35)',
  },

  // ============================================
  // SEMANTIC BORDER COLORS
  // ============================================

  border: {
    /** Light borders (sage) */
    subtle: '#D1FAE5',
    /** Default borders */
    default: '#E5E7EB',
    /** Focus rings (emerald) */
    focus: '#10B981',
    /** Strong borders */
    strong: '#064E3B',
  },

  // ============================================
  // FEEDBACK COLORS
  // ============================================

  feedback: {
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    error: '#EF4444',
    errorLight: '#FEF2F2',
    info: '#3B82F6',
    infoLight: '#EFF6FF',
  },

} as const

// Type exports for TypeScript consumers
export type SummitColors = typeof colors.summit
export type EmeraldScale = typeof colors.emerald
export type SurfaceColors = typeof colors.surface
export type TextColors = typeof colors.text
export type BorderColors = typeof colors.border
export type FeedbackColors = typeof colors.feedback
export type GrayScale = typeof colors.gray
export type Colors = typeof colors
