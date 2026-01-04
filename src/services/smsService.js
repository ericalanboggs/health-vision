/**
 * SMS Service for Weekly Pilot Transitions
 * 
 * Sends automated SMS messages to pilot participants at the start of each week.
 * Uses Twilio API for message delivery.
 */

// Twilio configuration (these should be environment variables)
const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = import.meta.env.VITE_TWILIO_PHONE_NUMBER

// App URL for the link in SMS
const APP_URL = import.meta.env.VITE_APP_URL || 'https://health-vision.vercel.app'

/**
 * Send weekly transition SMS to all pilot participants
 * @param {number} weekNumber - The week number (1, 2, or 3)
 * @returns {Promise<{success: boolean, message: string, results?: Array}>}
 */
export const sendWeeklyTransitionSMS = async (weekNumber) => {
  try {
    // Validate week number
    if (weekNumber < 1 || weekNumber > 3) {
      return {
        success: false,
        message: 'Invalid week number. Must be 1, 2, or 3.'
      }
    }

    // Get all pilot participants with phone numbers
    const participants = await getPilotParticipants()
    
    if (!participants || participants.length === 0) {
      return {
        success: false,
        message: 'No pilot participants found with phone numbers.'
      }
    }

    // Craft the message for this week
    const message = `Ready for Summit ⛰️ Week ${weekNumber}? Login to set or update habits or review your vision. ${APP_URL}`
    
    // Send SMS to each participant
    const results = []
    
    for (const participant of participants) {
      try {
        const result = await sendSMS(participant.phone, message)
        results.push({
          userId: participant.id,
          phone: participant.phone,
          success: true,
          messageId: result.sid
        })
        
        console.log(`SMS sent successfully to ${participant.phone} for Week ${weekNumber}`)
        
      } catch (error) {
        console.error(`Failed to send SMS to ${participant.phone}:`, error)
        results.push({
          userId: participant.id,
          phone: participant.phone,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return {
      success: successCount > 0,
      message: `SMS campaign completed. ${successCount} sent, ${failureCount} failed.`,
      results
    }

  } catch (error) {
    console.error('Weekly SMS campaign failed:', error)
    return {
      success: false,
      message: `Campaign failed: ${error.message}`
    }
  }
}

/**
 * Send individual SMS message
 * @param {string} to - Phone number to send to
 * @param {string} message - Message content
 * @returns {Promise<Object>} Twilio message object
 */
const sendSMS = async (to, message) => {
  // This would normally use Twilio's SDK, but since we're in the browser,
  // we need to call a backend API endpoint
  
  const response = await fetch('/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      message,
      from: TWILIO_PHONE_NUMBER
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to send SMS: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get all pilot participants with phone numbers
 * @returns {Promise<Array>} Array of participant objects
 */
const getPilotParticipants = async () => {
  try {
    // This would query your database for pilot participants
    // For now, we'll simulate this with a placeholder
    
    const response = await fetch('/api/pilot/participants')
    
    if (!response.ok) {
      throw new Error(`Failed to get participants: ${response.statusText}`)
    }

    return await response.json()
    
  } catch (error) {
    console.error('Failed to get pilot participants:', error)
    return []
  }
}

/**
 * Schedule weekly SMS messages
 * This would typically be handled by a cron job or scheduled function
 */
export const scheduleWeeklySMS = () => {
  // Week 1: January 12, 2025 at 10:00 AM
  // Week 2: January 19, 2025 at 10:00 AM  
  // Week 3: January 26, 2025 at 10:00 AM
  
  const schedules = [
    {
      week: 1,
      date: '2025-01-12',
      time: '10:00',
      timezone: 'America/New_York'
    },
    {
      week: 2,
      date: '2025-01-19',
      time: '10:00',
      timezone: 'America/New_York'
    },
    {
      week: 3,
      date: '2025-01-26',
      time: '10:00',
      timezone: 'America/New_York'
    }
  ]

  console.log('Weekly SMS schedules:', schedules)
  
  // In a real implementation, these would be set up as:
  // - Cron jobs on your server
  // - AWS Lambda functions with CloudWatch Events
  // - Vercel cron jobs
  // - Supabase Edge Functions with cron
  
  return schedules
}

/**
 * Test SMS sending (for development)
 * @param {string} phoneNumber - Test phone number
 * @param {number} weekNumber - Test week number
 */
export const sendTestSMS = async (phoneNumber, weekNumber = 1) => {
  const message = `Ready for Summit ⛰️ Week ${weekNumber}? Login to set or update habits or review your vision. ${APP_URL}`
  
  try {
    const result = await sendSMS(phoneNumber, message)
    return {
      success: true,
      message: 'Test SMS sent successfully',
      result
    }
  } catch (error) {
    return {
      success: false,
      message: `Test SMS failed: ${error.message}`
    }
  }
}
