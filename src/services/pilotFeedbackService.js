import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'

/**
 * Service for managing pilot feedback surveys
 */

/**
 * Save pilot feedback survey response
 * @param {object} feedback - Survey response data
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const savePilotFeedback = async (feedback) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    // Get current user (optional - surveys can be anonymous)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Check if user already submitted feedback
    if (userId) {
      const { data: existing } = await supabase
        .from('pilot_feedback')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        // Update existing feedback
        const { data, error } = await supabase
          .from('pilot_feedback')
          .update({
            overall_value: feedback.overall_value,
            favorite_aspect: feedback.favorite_aspect,
            aha_moments: feedback.aha_moments,
            improvements: feedback.improvements,
            price_slider: feedback.price_slider,
            price_explanation: feedback.price_explanation,
            testimonial_text: feedback.testimonial_text,
            testimonial_permission: feedback.testimonial_permission,
            testimonial_name: feedback.testimonial_name,
            additional_feedback: feedback.additional_feedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating pilot feedback:', error)
          trackEvent('pilot_feedback_update_failed', { error: error.message })
          return { success: false, error }
        }

        trackEvent('pilot_feedback_updated', { userId })
        return { success: true, data, isUpdate: true }
      }
    }

    // Create new feedback
    const { data, error } = await supabase
      .from('pilot_feedback')
      .insert({
        user_id: userId,
        overall_value: feedback.overall_value,
        favorite_aspect: feedback.favorite_aspect,
        aha_moments: feedback.aha_moments,
        improvements: feedback.improvements,
        price_slider: feedback.price_slider,
        price_explanation: feedback.price_explanation,
        testimonial_text: feedback.testimonial_text,
        testimonial_permission: feedback.testimonial_permission,
        testimonial_name: feedback.testimonial_name,
        additional_feedback: feedback.additional_feedback
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving pilot feedback:', error)
      trackEvent('pilot_feedback_save_failed', { error: error.message })
      return { success: false, error }
    }

    trackEvent('pilot_feedback_submitted', {
      userId,
      overallValue: feedback.overall_value,
      priceSlider: feedback.price_slider,
      hasTestimonial: !!feedback.testimonial_text
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error in savePilotFeedback:', error)
    return { success: false, error }
  }
}

/**
 * Get existing pilot feedback for current user
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const getPilotFeedback = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: true, data: null }
    }

    const { data, error } = await supabase
      .from('pilot_feedback')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching pilot feedback:', error)
      return { success: false, error }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error in getPilotFeedback:', error)
    return { success: false, error }
  }
}

/**
 * Check if current user has already submitted pilot feedback
 * @returns {Promise<boolean>}
 */
export const hasSubmittedPilotFeedback = async () => {
  const { success, data } = await getPilotFeedback()
  return success && data !== null
}
