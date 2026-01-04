/**
 * SMS API Endpoint for Twilio Integration
 * 
 * This would typically be deployed as a serverless function or backend API.
 * For development, this shows the structure needed.
 */

const twilio = require('twilio')
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * POST /api/sms/send
 * Send SMS message via Twilio
 */
app.post('/api/sms/send', async (req, res) => {
  try {
    const { to, message, from } = req.body

    // Validate required fields
    if (!to || !message || !from) {
      return res.status(400).json({
        error: 'Missing required fields: to, message, from'
      })
    }

    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: from,
      to: to
    })

    console.log(`SMS sent to ${to}: SID ${twilioMessage.sid}`)

    res.json({
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
      to: twilioMessage.to,
      from: twilioMessage.from
    })

  } catch (error) {
    console.error('SMS sending failed:', error)
    res.status(500).json({
      error: 'Failed to send SMS',
      details: error.message
    })
  }
})

/**
 * GET /api/pilot/participants
 * Get all pilot participants with phone numbers
 */
app.get('/api/pilot/participants', async (req, res) => {
  try {
    // This would query your database (Supabase, PostgreSQL, etc.)
    // For now, returning mock data structure
    
    const participants = [
      {
        id: 'user_1',
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        is_pilot_participant: true
      },
      {
        id: 'user_2', 
        name: 'Jane Smith',
        phone: '+0987654321',
        email: 'jane@example.com',
        is_pilot_participant: true
      }
    ]

    res.json(participants)

  } catch (error) {
    console.error('Failed to get participants:', error)
    res.status(500).json({
      error: 'Failed to retrieve participants',
      details: error.message
    })
  }
})

/**
 * POST /api/sms/weekly-transition
 * Send weekly transition SMS to all participants
 */
app.post('/api/sms/weekly-transition', async (req, res) => {
  try {
    const { weekNumber } = req.body

    if (!weekNumber || weekNumber < 1 || weekNumber > 3) {
      return res.status(400).json({
        error: 'Invalid week number. Must be 1, 2, or 3.'
      })
    }

    // Get participants
    const participants = await getPilotParticipants()
    
    if (!participants || participants.length === 0) {
      return res.status(404).json({
        error: 'No pilot participants found'
      })
    }

    // Craft message
    const message = `Ready for Summit ⛰️ Week ${weekNumber}? Login to set or update habits or review your vision. https://health-vision.vercel.app`
    
    // Send to all participants
    const results = []
    
    for (const participant of participants) {
      try {
        const twilioMessage = await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: participant.phone
        })

        results.push({
          userId: participant.id,
          phone: participant.phone,
          success: true,
          messageId: twilioMessage.sid
        })

        console.log(`Week ${weekNumber} SMS sent to ${participant.phone}`)

      } catch (error) {
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

    res.json({
      success: successCount > 0,
      message: `Week ${weekNumber} SMS campaign completed. ${successCount} sent, ${failureCount} failed.`,
      results
    })

  } catch (error) {
    console.error('Weekly SMS campaign failed:', error)
    res.status(500).json({
      error: 'SMS campaign failed',
      details: error.message
    })
  }
})

/**
 * Helper function to get participants from database
 */
async function getPilotParticipants() {
  // This would typically query your database:
  // const { data, error } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('is_pilot_participant', true)
  //   .not('phone', 'is', null)
  
  // Mock implementation for demonstration
  return [
    {
      id: 'user_1',
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john@example.com',
      is_pilot_participant: true
    },
    {
      id: 'user_2', 
      name: 'Jane Smith',
      phone: '+0987654321',
      email: 'jane@example.com',
      is_pilot_participant: true
    }
  ]
}

module.exports = app

// For deployment as serverless function (e.g., Vercel, Netlify):
// export default app
