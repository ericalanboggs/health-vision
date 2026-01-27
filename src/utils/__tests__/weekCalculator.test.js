import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock import.meta.env before importing the module
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_PILOT_START_DATE: '2026-01-12'
    }
  }
})

// Dynamic import to allow mocking
const {
  getWeekStartDate,
  getWeekEndDate,
  formatDateRange,
} = await import('../weekCalculator.js')

describe('weekCalculator', () => {
  describe('getWeekStartDate', () => {
    it('returns pilot start date for week 1', () => {
      const weekStart = getWeekStartDate(1)
      expect(weekStart.getFullYear()).toBe(2026)
      expect(weekStart.getMonth()).toBe(0) // January
      expect(weekStart.getDate()).toBe(12)
    })

    it('returns correct date for week 2', () => {
      const weekStart = getWeekStartDate(2)
      expect(weekStart.getFullYear()).toBe(2026)
      expect(weekStart.getMonth()).toBe(0) // January
      expect(weekStart.getDate()).toBe(19) // 12 + 7
    })

    it('returns correct date for week 5', () => {
      const weekStart = getWeekStartDate(5)
      expect(weekStart.getFullYear()).toBe(2026)
      expect(weekStart.getMonth()).toBe(1) // February
      expect(weekStart.getDate()).toBe(9) // 12 + 28 = 40 -> Feb 9
    })
  })

  describe('getWeekEndDate', () => {
    it('returns 6 days after week start', () => {
      const weekEnd = getWeekEndDate(1)
      expect(weekEnd.getFullYear()).toBe(2026)
      expect(weekEnd.getMonth()).toBe(0) // January
      expect(weekEnd.getDate()).toBe(18) // 12 + 6
    })

    it('handles month boundaries', () => {
      // Week 4 starts Jan 12 + 21 = Feb 2
      const weekEnd = getWeekEndDate(4)
      expect(weekEnd.getMonth()).toBe(1) // February
      expect(weekEnd.getDate()).toBe(8) // Feb 2 + 6
    })
  })

  describe('formatDateRange', () => {
    it('formats date range correctly', () => {
      const startDate = new Date(2026, 0, 12) // Jan 12
      const endDate = new Date(2026, 0, 18) // Jan 18
      const formatted = formatDateRange(startDate, endDate)
      expect(formatted).toBe('Jan 12 - Jan 18')
    })

    it('handles cross-month ranges', () => {
      const startDate = new Date(2026, 0, 26) // Jan 26
      const endDate = new Date(2026, 1, 1) // Feb 1
      const formatted = formatDateRange(startDate, endDate)
      expect(formatted).toBe('Jan 26 - Feb 1')
    })
  })
})
