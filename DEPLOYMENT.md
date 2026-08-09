# AI&Diary Deployment

## 1. Supabase

Open Supabase SQL Editor and run:

```sql
-- see supabase/schema.sql
```

This creates `public.daily_records`, one row per `user_id + date`.

## 2. Vercel Environment Variables

Set these in Vercel Project Settings:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
APP_USER_ID=single-user
```

## 3. Deploy

```bash
npm run build
```

Then import the project into Vercel. Vercel uses:

- Frontend: Vite React, output `dist`
- API: serverless functions in `api/`
- Local dev: `npm run dev`
