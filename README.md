# Azure & M365 Intelligence Dashboard

A live dashboard that fetches Azure and Microsoft 365 updates directly from Microsoft's official RSS feeds — no AI API needed. Select a month, see all updates for that month, and email the digest to anyone.

Built with **Next.js 14**, **Microsoft RSS Feeds**, and **Resend** for email.

---

## Features

- **Month selector** — pick any month from the last 18 months to load updates for that period
- **4 categories** auto-detected: Critical / Deprecations / New Features / News
- **Filter by category** with live counts
- **Email digest** — send a formatted HTML digest to any email address
- **One env var** — only `RESEND_API_KEY` needed
- **Vercel-ready** — deploys in 2 minutes

---

## Data Sources

Updates are pulled directly from Microsoft's public RSS feeds:

| Feed | Source |
|---|---|
| `azure.microsoft.com/en-us/updates/feed/` | Azure service updates |
| `azure.microsoft.com/en-us/blog/feed/` | Azure Blog |
| `microsoft.com/en-us/microsoft-365/blog/feed/` | Microsoft 365 Blog |
| `msrc.microsoft.com/blog/feed` | Microsoft Security Response Center |

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your RESEND_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select a month, and updates load automatically.

---

## Only One Environment Variable

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) — free, 3,000 emails/month |

### Getting your Resend API Key
1. Go to [resend.com](https://resend.com) → sign up (free)
2. Dashboard → **API Keys** → **Create API Key**
3. Paste into `.env.local` or Vercel environment variables

> **Note:** By default, emails send from `onboarding@resend.dev` which works for testing (sends to your Resend-verified address). For sending to any email in production, add and verify your own domain in Resend → update the `from` field in `app/api/send-email/route.ts`.

---

## Deploy to Vercel

1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add one environment variable: `RESEND_API_KEY`
4. Click **Deploy** — done!

Or via CLI:
```bash
npm i -g vercel
vercel
vercel env add RESEND_API_KEY
vercel --prod
```

---

## Project Structure

```
azure-m365-news/
├── app/
│   ├── page.tsx                    # Dashboard with month selector + email
│   ├── layout.tsx                  # Root layout
│   ├── globals.css
│   └── api/
│       ├── fetch-updates/route.ts  # Fetches + parses Microsoft RSS feeds
│       └── send-email/route.ts     # Sends digest via Resend
├── .env.example
├── package.json
└── README.md
```

---

Created by **Deep Darshan Singrodia**
