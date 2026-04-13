# 🤖 Smart Assistant (المساعد الذكي) - Setup Guide

## Overview
The Smart Assistant is an AI-powered dental assistant integrated into SmileCraft CMS using Google's Gemini API. It provides:
- Preliminary case diagnosis
- Treatment plan suggestions
- Dental care advice
- Medical procedure information

## Setup Instructions

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or navigate to [API Keys](https://aistudio.google.com/app/apikey)
4. Create a new API key
5. Copy the key (it starts with `AIza...`)

### 2. Configure Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Gemini AI API Configuration
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual Gemini API key.

**Example:**
```env
GEMINI_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

### 3. Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Smart Assistant page:
   - Arabic: Go to "المساعد الذكي" in the sidebar
   - English: Go to "Smart Assistant" in the sidebar

3. You should see:
   - ✅ Green "AI Active" badge if configured correctly
   - ❌ Warning message if API key is missing

### 4. Using the Smart Assistant

The assistant responds in the current locale language:
- **Arabic locale**: Responds in Arabic
- **English locale**: Responds in English

**Example Questions (Arabic):**
- ما هو علاج تسوس الأسنان؟
- كيف أقوم بتنظيف الأسنان بشكل صحيح؟
- ما هي أعراض التهاب اللثة؟

**Example Questions (English):**
- What is the treatment for tooth decay?
- How should I brush my teeth properly?
- What are the symptoms of gingivitis?

## Features

### 💬 Chat Interface
- Beautiful glassmorphic UI
- Real-time message streaming
- Message history with timestamps
- Auto-scroll to latest messages
- Responsive design (mobile-friendly)

### 🎯 Quick Actions
Pre-defined prompts for common tasks:
- **Preliminary Case Diagnosis**: Get initial assessment for dental conditions
- **Suggest Treatment Plan**: Receive treatment recommendations
- **Dental Care Advice**: Get oral hygiene tips
- **Medical Procedures Information**: Learn about dental procedures

### ⚡ Technical Details
- **Model**: Gemini 2.0 Flash
- **Context Window**: Last 10 messages for conversation continuity
- **Response Time**: ~1-3 seconds
- **Rate Limiting**: Subject to Gemini API limits

### 🔒 Privacy & Security
- All API calls go through server actions (secure server-side)
- API key never exposed to client
- No patient data sent to AI (maintains privacy)
- Conversations are not stored (session-only)

## Customization

### Adjust AI Behavior

Edit `src/lib/gemini/types.ts` to modify the system instruction:

```typescript
export function createSystemInstruction(locale: string = 'ar'): string {
  const instructions: Record<string, string> = {
    ar: `Your custom Arabic instructions here...`,
    en: `Your custom English instructions here...`
  };
  return instructions[locale] || instructions['ar'];
}
```

### Change Model

Edit `src/lib/gemini/types.ts`:

```typescript
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
```

Available models:
- `gemini-2.0-flash` (default, fastest)
- `gemini-2.0-flash-lite` (cheaper)
- `gemini-1.5-pro` (more capable)

### Adjust Response Parameters

Edit `src/lib/gemini/serverActions.ts`:

```typescript
generationConfig: {
  temperature: 0.7,        // Creativity (0-1)
  topK: 40,               // Token diversity
  topP: 0.95,             // Nucleus sampling
  maxOutputTokens: 2048,  // Max response length
}
```

## Troubleshooting

### "AI Not Configured" Message
- Check that `GEMINI_API_KEY` is in your `.env.local`
- Restart the development server after adding the key
- Verify the key is valid at [Google AI Studio](https://aistudio.google.com/)

### Slow Responses
- Check your internet connection
- Gemini API may have rate limits
- Consider upgrading to Gemini API paid tier for higher limits

### Incorrect Answers
- The AI is trained on general dental knowledge
- Always verify critical medical information
- Use as a guidance tool, not a diagnostic authority

### Build Errors
If you see routing errors after adding the assistant:
- Make sure `/assistant` is in `src/i18n/routing.ts`
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## API Usage & Costs

### Free Tier
- 60 requests per minute
- 1,500 requests per day
- Sufficient for development/testing

### Paid Tier (if needed)
- $0.000375 per 1K input tokens
- $0.0015 per 1K output tokens
- Typical usage: ~$5-15/month for small clinic

Monitor usage at: https://aistudio.google.com/app/apikey

## Security Best Practices

1. **Never commit API keys to Git**
   - Add `.env.local` to `.gitignore` (already done)
   - Use environment variables in production

2. **Production Deployment**
   - Set `GEMINI_API_KEY` in your hosting provider's environment
   - Vercel: `vercel env add GEMINI_API_KEY`
   - Railway/DigitalOcean: Add in dashboard settings

3. **Monitor Usage**
   - Regularly check Gemini API usage dashboard
   - Set up alerts for high usage

## Support

For issues or questions:
- Check [Gemini API Documentation](https://ai.google.dev/docs)
- Visit [Google AI Studio](https://aistudio.google.com/)
- Review error logs in browser console and server terminal

---

**Enjoy your AI-powered dental assistant! 🦷✨**
