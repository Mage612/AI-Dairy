# AI&Dairy

个人成长管理助手 MVP：自然语言输入，自动识别计划、日总结或情绪聊天，并生成结构化卡片。

## Features

- PLAN：识别主线目标，拆解任务、优先级、下一步和行程建议。
- SUMMARY：按日期归档每日总结，同一天自动合并为一条记录。
- CHAT：温暖但理性的朋友模式，给出具体下一步。
- Records：每日记录表格视图，支持 CSV / JSON 导出。
- Action Board：日计划 / 周计划视图，任务可勾选、可编辑、可排序。
- Cloud Ready：Vercel serverless API + Supabase daily records。

## Tech Stack

- Frontend: React + Vite
- API: Node.js, Vercel serverless functions
- LLM: DeepSeek / OpenAI / Gemini compatible provider layer
- Storage: Supabase for daily records, localStorage fallback

## Local Development

```bash
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Local API:

```text
http://localhost:8787/api/health
```

## Environment Variables

Copy `.env.example` to `.env`, then fill keys locally.

For Vercel, set the same variables in Project Settings:

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

## Supabase

Run `supabase/schema.sql` in Supabase SQL Editor before deploying.

## Deploy

Import this repository into Vercel.

Recommended Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```
