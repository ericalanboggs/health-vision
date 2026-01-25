/**
 * Summit Design System - Design Tokens
 *
 * Central export point for all design tokens
 * Import from '@summit/design-system/tokens' or './tokens'
 */

export { colors } from './colors'
export type {
  Colors,
  SummitColors,
  EmeraldScale,
  SurfaceColors,
  TextColors,
  BorderColors,
  FeedbackColors,
  GrayScale,
} from './colors'

export { typography, textStyles } from './typography'
export type { Typography, TextStyles } from './typography'

export {
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  container,
} from './spacing'
export type {
  Spacing,
  BorderRadius,
  Shadows,
  ZIndex,
  Breakpoints,
  Container,
} from './spacing'

// ============================================
// ANIMATION TOKENS
// ============================================

export const animation = {
  duration: {
    /** 100ms - Quick interactions (clicks) */
    fast: '100ms',
    /** 150ms - Button hovers */
    normal: '150ms',
    /** 200ms - Checkbox animations */
    medium: '200ms',
    /** 250ms - Modal entrance */
    slow: '250ms',
    /** 300ms - Page transitions */
    slower: '300ms',
    /** 500ms - Progress bars */
    slowest: '500ms',
  },
  easing: {
    /** Standard ease-out */
    out: 'cubic-bezier(0.33, 1, 0.68, 1)',
    /** Standard ease-in */
    in: 'cubic-bezier(0.32, 0, 0.67, 0)',
    /** Standard ease-in-out */
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    /** Spring-like bounce */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

export type Animation = typeof animation

// ============================================
// ALL TOKENS BUNDLE
// ============================================

import { colors } from './colors'
import { typography, textStyles } from './typography'
import {
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  container,
} from './spacing'

export const tokens = {
  colors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  container,
  animation,
} as const

export type Tokens = typeof tokens
