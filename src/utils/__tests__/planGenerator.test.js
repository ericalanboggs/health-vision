import { describe, it, expect } from 'vitest'
import { generateActionPlan, generateMotivationalMessage } from '../planGenerator.js'

describe('planGenerator', () => {
  describe('generateActionPlan', () => {
    it('generates a plan with all required sections', () => {
      const formData = {
        focusAreas: ['Movement/Exercise'],
        timeCapacity: '10 minutes/day',
        barriers: ['Time'],
        habitsToImprove: ['Movement/Exercise', 'Nutrition'],
        readiness: 5
      }

      const plan = generateActionPlan(formData)

      expect(plan).toHaveProperty('weeklyActions')
      expect(plan).toHaveProperty('barrierStrategies')
      expect(plan).toHaveProperty('habitRecommendations')
      expect(plan).toHaveProperty('weeklyCheckIn')
    })

    it('generates actions based on focus areas and time capacity', () => {
      const formData = {
        focusAreas: ['Movement/Exercise'],
        timeCapacity: '10 minutes/day',
        barriers: [],
        habitsToImprove: [],
        readiness: 5
      }

      const plan = generateActionPlan(formData)

      expect(plan.weeklyActions.length).toBeGreaterThan(0)
      expect(plan.weeklyActions[0].area).toBe('Movement/Exercise')
      expect(plan.weeklyActions[0].actions.length).toBeLessThanOrEqual(2)
    })

    it('generates barrier strategies for provided barriers', () => {
      const formData = {
        focusAreas: [],
        timeCapacity: '10 minutes/day',
        barriers: ['Time', 'Energy'],
        habitsToImprove: [],
        readiness: 5
      }

      const plan = generateActionPlan(formData)

      expect(plan.barrierStrategies.length).toBe(2)
      expect(plan.barrierStrategies[0]).toHaveProperty('barrier')
      expect(plan.barrierStrategies[0]).toHaveProperty('strategy')
      expect(plan.barrierStrategies[0]).toHaveProperty('tips')
    })

    it('limits barrier strategies to top 3', () => {
      const formData = {
        focusAreas: [],
        timeCapacity: '10 minutes/day',
        barriers: ['Time', 'Energy', 'Stress', 'Motivation', 'Clarity'],
        habitsToImprove: [],
        readiness: 5
      }

      const plan = generateActionPlan(formData)

      expect(plan.barrierStrategies.length).toBe(3)
    })

    it('adjusts habit recommendations based on readiness level', () => {
      const lowReadiness = generateActionPlan({
        focusAreas: ['Movement/Exercise', 'Nutrition', 'Sleep'],
        timeCapacity: '10 minutes/day',
        barriers: [],
        habitsToImprove: ['Movement/Exercise', 'Nutrition', 'Sleep'],
        readiness: 3 // low readiness
      })

      const highReadiness = generateActionPlan({
        focusAreas: ['Movement/Exercise', 'Nutrition', 'Sleep'],
        timeCapacity: '10 minutes/day',
        barriers: [],
        habitsToImprove: ['Movement/Exercise', 'Nutrition', 'Sleep'],
        readiness: 9 // high readiness
      })

      // Low readiness should get fewer recommendations
      expect(lowReadiness.habitRecommendations.length).toBe(1)
      // High readiness should get more recommendations
      expect(highReadiness.habitRecommendations.length).toBe(3)
    })

    it('includes weekly check-in prompts', () => {
      const formData = {
        focusAreas: [],
        timeCapacity: '10 minutes/day',
        barriers: [],
        habitsToImprove: [],
        readiness: 5,
        whyMatters: 'My family depends on me'
      }

      const plan = generateActionPlan(formData)

      expect(plan.weeklyCheckIn.prompts.length).toBeGreaterThan(0)
      expect(plan.weeklyCheckIn.reminderText).toContain('My family depends on me')
    })
  })

  describe('generateMotivationalMessage', () => {
    it('generates message for high score and high readiness', () => {
      const message = generateMotivationalMessage({
        currentScore: 8,
        readiness: 8,
        visionStatement: ''
      })

      expect(message).toContain('strong position')
      expect(message).toContain('8/10')
    })

    it('generates message for low score and high readiness', () => {
      const message = generateMotivationalMessage({
        currentScore: 3,
        readiness: 8,
        visionStatement: ''
      })

      expect(message).toContain('readiness is high')
      expect(message).toContain('3/10')
    })

    it('generates message for high score and low readiness', () => {
      const message = generateMotivationalMessage({
        currentScore: 8,
        readiness: 3,
        visionStatement: ''
      })

      expect(message).toContain('readiness is low')
      expect(message).toContain('8/10')
    })

    it('includes truncated vision statement if provided', () => {
      const longVision = 'A'.repeat(150)
      const message = generateMotivationalMessage({
        currentScore: 5,
        readiness: 5,
        visionStatement: longVision
      })

      expect(message).toContain('...')
      expect(message.length).toBeLessThan(longVision.length + 100)
    })

    it('handles missing formData gracefully', () => {
      const message = generateMotivationalMessage({})

      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })
  })
})
