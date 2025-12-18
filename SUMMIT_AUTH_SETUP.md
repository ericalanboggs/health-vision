# Summit Pilot - Authentication Setup

## ✅ Completed Steps
- [x] Supabase project created
- [x] Database tables created
- [x] Auth service implemented
- [x] Login page created
- [x] Auth callback handler created
- [x] Protected routes configured
- [x] React Router installed

## 🔧 Required: Configure Supabase Email Settings

### Step 1: Enable Email Auth (CRITICAL)

1. Go to: https://supabase.com/dashboard/project/oxszevplpzmzmeibjtdz/auth/providers
2. Find **"Email"** provider
3. **Enable** the Email provider
4. **IMPORTANT:** Turn OFF "Confirm email" (we want magic links, not confirmation emails)
5. Click **Save**

### Step 2: Configure Redirect URLs

1. Go to: https://supabase.com/dashboard/project/oxszevplpzmzmeibjtdz/auth/url-configuration
2. **Site URL:** Set to your production URL: `https://summit-health-vision.vercel.app`
3. **Redirect URLs:** Add these (one per line):
   ```
   http://localhost:5173/**
   https://summit-health-vision.vercel.app/**
   ```
4. Click **Save**

**Note:** The magic link will redirect to the home page (`/`) which automatically handles the auth tokens and redirects to the dashboard.

### Step 3: Test Authentication

1. Start your dev server: `npm run dev`
2. Go to: http://localhost:5173/
3. You should see the login page
4. Enter your email and click "Send Magic Link"
5. Check your email for the magic link
6. Click the link - you should be redirected to the dashboard

## 📋 Routes Available

- `/` - Redirects to login
- `/login` - Magic link login page
- `/auth/callback` - Handles magic link authentication
- `/dashboard` - Protected dashboard (requires auth)
- `/journey` - Legacy health journey (still works)

## 🐛 Troubleshooting

### "Invalid API key" error
- Make sure you're using the **publishable key** from Supabase
- Check that `.env` has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Magic link not working
- Check that "Confirm email" is OFF in Email provider settings
- Verify redirect URLs include your localhost and production URLs
- Check spam folder for the email

### Redirect loop after clicking magic link
- Make sure `/auth/callback` route exists in App.jsx
- Check browser console for errors

## 🎯 Next Steps

Once authentication is working:
1. Build habit commitment UI (`/habits`)
2. Build weekly reflection UI (`/reflection`)
3. Add week calculation utility
4. Create reminder scheduler

## 📝 Environment Variables

Your `.env` should have:
```env
VITE_SUPABASE_URL=https://oxszevplpzmzmeibjtdz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NJb9eB6nKc9g3do7rg7U_g_kqEbboYW
```
