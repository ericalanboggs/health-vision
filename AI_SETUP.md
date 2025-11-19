# AI Enhancement Setup Guide

## Overview
The Health Summit app now includes optional AI-powered personalization that enhances the rule-based action plan with context-specific recommendations.

## Features
- **✨ Personalize with AI** button on the action plan
- AI analyzes user's full context (vision, barriers, schedule, readiness)
- Generates 4-6 highly specific, actionable steps tailored to their situation
- Shows "why this works" and practical tips for each action
- Users can toggle between AI-enhanced and original plan

## Setup Instructions

### 1. Get an OpenAI API Key
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### 2. Add API Key to Your Project
1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your API key to `.env`:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Important**: Never commit your `.env` file to git! It's already in `.gitignore`.

### 3. Restart the Dev Server
```bash
npm run dev
```

## How It Works

### User Flow
1. User completes all steps and sees their rule-based action plan
2. Clicks "✨ Personalize with AI" button
3. AI analyzes their context and generates personalized actions
4. Enhanced plan shows with specific "why" and "tip" for each action
5. User can switch back to original plan anytime

### Technical Flow
1. `SummaryPage.jsx` calls `enhanceActionPlan()` from `aiService.js`
2. Service builds a detailed prompt with user's full context
3. Calls OpenAI GPT-4o-mini with structured JSON output
4. Parses response and displays enhanced actions

### Cost Considerations
- Uses GPT-4o-mini (very affordable)
- ~1,000-2,000 tokens per enhancement
- Cost: ~$0.001-0.002 per plan enhancement
- Only called when user clicks the button (not automatic)

## Production Deployment

### Security Best Practices
⚠️ **Current implementation uses client-side API calls for development only!**

For production, you should:

1. **Move API calls to a backend**:
   ```javascript
   // Instead of calling OpenAI directly from browser:
   const response = await fetch('/api/enhance-plan', {
     method: 'POST',
     body: JSON.stringify({ formData, actionPlan })
   })
   ```

2. **Store API key server-side**:
   - Use environment variables on your server
   - Never expose API keys in client code

3. **Add rate limiting**:
   - Prevent abuse
   - Control costs

4. **Add authentication**:
   - Only allow authenticated users to enhance plans

### Recommended Backend Setup
```javascript
// Example Express.js endpoint
app.post('/api/enhance-plan', async (req, res) => {
  const { formData, actionPlan } = req.body
  
  // Add rate limiting, auth checks, etc.
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Server-side only
  })
  
  const enhanced = await enhanceActionPlan(formData, actionPlan, openai)
  res.json(enhanced)
})
```

## Customization

### Adjust AI Behavior
Edit `src/utils/aiService.js`:

- **Change model**: Replace `gpt-4o-mini` with `gpt-4o` for better quality (higher cost)
- **Adjust temperature**: Lower (0.5) = more consistent, Higher (0.9) = more creative
- **Modify prompts**: Customize the system message and user prompt
- **Change output format**: Adjust the JSON structure

### Add More AI Features
The `aiService.js` includes additional functions ready to use:

1. **`enhanceBarrierStrategy()`**: Get AI advice for specific barriers
2. **`generateMotivationalMessage()`**: AI-powered encouragement

## Troubleshooting

### "OpenAI API key not found" Error
- Make sure `.env` file exists in project root
- Check that the key starts with `VITE_` (required for Vite)
- Restart dev server after adding `.env`

### "Failed to enhance plan" Error
- Verify API key is valid
- Check you have credits in your OpenAI account
- Look at browser console for detailed error

### AI Response Format Issues
- The AI is instructed to return JSON
- If format is unexpected, check `aiService.js` response parsing
- May need to adjust prompt or add fallback handling

## Future Enhancements

Potential additions:
- **Weekly check-ins**: AI analyzes progress and adjusts plan
- **Barrier coaching**: Dedicated AI advice for each barrier
- **Progress insights**: AI identifies patterns and suggests pivots
- **Voice of encouragement**: Personalized motivational messages
- **Habit stacking**: AI suggests how to combine habits

## Support

For issues or questions:
1. Check browser console for errors
2. Verify `.env` setup
3. Test API key at [OpenAI Playground](https://platform.openai.com/playground)
