import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to ensure mocks are available before module loading
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn()
}))

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  default: {
    auth: {
      getUser: mockGetUser
    },
    from: mockFrom
  }
}))

// Mock posthog
vi.mock('../../lib/posthog', () => ({
  trackEvent: vi.fn()
}))

// Import after mocks are set up
const { saveHabits, getHabits, deleteHabit, updateHabit, hasHabits } = await import('../habitService.js')

describe('habitService', () => {
  const mockUser = { id: 'user-123' }
  const mockHabits = [
    { id: 'habit-1', habit_name: 'Exercise', day_of_week: 1, user_id: 'user-123' },
    { id: 'habit-2', habit_name: 'Meditate', day_of_week: 2, user_id: 'user-123' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset auth mock to return a user by default
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
  })

  describe('saveHabits', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await saveHabits([{ habit_name: 'Test' }])

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('inserts habits with correct data structure', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: mockHabits, error: null })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      const habitsToSave = [
        { habit_name: 'Exercise', day_of_week: 1, reminder_time: '09:00' }
      ]

      const result = await saveHabits(habitsToSave)

      expect(mockFrom).toHaveBeenCalledWith('weekly_habits')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            habit_name: 'Exercise',
            day_of_week: 1,
            week_number: null
          })
        ])
      )
      expect(result.success).toBe(true)
    })

    it('handles database errors gracefully', async () => {
      const mockError = { message: 'Database error' }
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      const result = await saveHabits([{ habit_name: 'Test' }])

      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError)
    })
  })

  describe('getHabits', () => {
    it('fetches all habits for the current user', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: mockHabits, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getHabits()

      expect(mockFrom).toHaveBeenCalledWith('weekly_habits')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockHabits)
    })

    it('accepts optional userId parameter', async () => {
      const customUserId = 'custom-user-456'
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      await getHabits(customUserId)

      expect(mockEq).toHaveBeenCalledWith('user_id', customUserId)
    })

    it('returns empty array when no habits found', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getHabits()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })

  describe('updateHabit', () => {
    it('updates habit with provided fields', async () => {
      const updatedHabit = { ...mockHabits[0], habit_name: 'Updated Name' }
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedHabit, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const result = await updateHabit('habit-1', { habit_name: 'Updated Name' })

      expect(mockUpdate).toHaveBeenCalledWith({ habit_name: 'Updated Name' })
      expect(mockEq).toHaveBeenCalledWith('id', 'habit-1')
      expect(result.success).toBe(true)
      expect(result.data.habit_name).toBe('Updated Name')
    })
  })

  describe('deleteHabit', () => {
    it('deletes habit by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      const result = await deleteHabit('habit-1')

      expect(mockFrom).toHaveBeenCalledWith('weekly_habits')
      expect(mockEq).toHaveBeenCalledWith('id', 'habit-1')
      expect(result.success).toBe(true)
    })
  })

  describe('hasHabits', () => {
    it('returns true when habits exist', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: mockHabits, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await hasHabits()

      expect(result).toBe(true)
    })

    it('returns false when no habits exist', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await hasHabits()

      expect(result).toBe(false)
    })
  })
})
