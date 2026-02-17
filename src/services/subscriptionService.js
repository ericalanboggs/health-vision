import supabase from '../lib/supabase'
import { trackEvent } from '../lib/posthog'

/**
 * Create a Stripe Checkout session and return the redirect URL
 * @param {string} priceId - Stripe price ID for the selected tier
 * @returns {Promise<{success: boolean, url?: string, error?: any}>}
 */
export const createCheckoutSession = async (priceId) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'User not authenticated' }
    }

    const response = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId },
    })

    if (response.error) {
      console.error('Error creating checkout session:', response.error)
      trackEvent('checkout_session_failed', { error: response.error.message })
      return { success: false, error: response.error }
    }

    trackEvent('checkout_session_created', { priceId })
    return { success: true, url: response.data.url }
  } catch (error) {
    console.error('Error in createCheckoutSession:', error)
    trackEvent('checkout_session_error', { error: error.message })
    return { success: false, error }
  }
}

/**
 * Create a Stripe Customer Portal session and return the redirect URL
 * @returns {Promise<{success: boolean, url?: string, error?: any}>}
 */
export const createPortalSession = async () => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'User not authenticated' }
    }

    const response = await supabase.functions.invoke('create-portal-session', {
      body: {},
    })

    if (response.error) {
      console.error('Error creating portal session:', response.error)
      trackEvent('portal_session_failed', { error: response.error.message })
      return { success: false, error: response.error }
    }

    trackEvent('portal_session_created')
    return { success: true, url: response.data.url }
  } catch (error) {
    console.error('Error in createPortalSession:', error)
    trackEvent('portal_session_error', { error: error.message })
    return { success: false, error }
  }
}

/**
 * Check if a profile has an active subscription (trialing or active)
 * @param {object} profile - Profile object with subscription_status field
 * @returns {boolean}
 */
export const hasActiveSubscription = (profile) => {
  if (!profile) return false
  return profile.subscription_status === 'trialing' || profile.subscription_status === 'active'
}

/**
 * Get display name for a subscription tier
 * @param {string} tier - Tier slug ('core', 'plus', 'premium')
 * @returns {string}
 */
export const getTierDisplayName = (tier) => {
  const names = {
    core: 'Core',
    plus: 'Plus',
    premium: 'Premium',
  }
  return names[tier] || 'Unknown'
}
