# 🎯 GTM Tracker — LinkedIn Intelligence

An AI-powered tool that tracks LinkedIn thought leaders, scrapes their post commenters, and qualifies leads against your Ideal Customer Profile (ICP) using LLM intelligence — turning passive engagement data into an actionable sales pipeline.

## ✨ Features

- **📡 Signal Feed** — Track LinkedIn profiles and aggregate their latest posts into a single view
- **🔍 Interest Filters** — Define keywords to surface the most relevant posts (GTM, hiring, etc.)
- **👥 Commenter Scraping** — Automatically extract everyone who engaged with tracked posts
- **🧠 AI Qualification** — Score every commenter against your ICP using Google Gemini
- **🎯 Lead Pipeline** — View, filter, and sort AI-qualified leads by intent and ICP match
- **✉️ AI-Drafted DMs** — Get personalized outreach messages generated for high-intent leads
- **⚙️ Configurable ICP** — Set your target roles, company size, anti-signals, and custom instructions

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/gtm-linkedin-tracker.git
cd gtm-linkedin-tracker
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

| Key | Where to get it |
|---|---|
| `APIFY_API_KEY` | [Apify Console → Integrations](https://console.apify.com/account/integrations) |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |

### 3. Initialize Database

```bash
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 How It Works

### Step 1: Add Profiles
Go to **Profiles** → Add LinkedIn profile URLs of the thought leaders you want to track.

### Step 2: Configure Your ICP
Go to **Settings** → Define your company context:
- Company name & value proposition
- Target buyer roles (VP Sales, CTO, etc.)
- Anti-ICP signals (Recruiter, Student, etc.)
- Target company size

### Step 3: Sync & Scrape
Click **⚡ Sync Now** on the Signal Feed to:
1. Fetch the latest posts from tracked profiles
2. Scrape all commenters from those posts

### Step 4: Qualify Leads
Go to **Pipeline** → Click **🧠 Qualify Leads** to:
1. Run all unscored commenters through the AI evaluator
2. Each commenter gets an ICP score (0-100), intent level, reasoning, and a personalized DM draft

### Step 5: Outreach
Browse your qualified leads, filtered by intent level and ICP score. Copy the AI-drafted DM and reach out on LinkedIn.

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite via Prisma ORM
- **Scraping:** Apify (LinkedIn profile posts + post comments actors)
- **AI:** Google Gemini 2.0 Flash (structured JSON output)
- **Styling:** Vanilla CSS with Apple-inspired design system

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── context/       # Company ICP context CRUD
│   │   │   ├── pipeline/      # Qualified leads endpoint
│   │   │   ├── qualify/       # LLM qualification trigger
│   │   │   ├── posts/         # Posts + commenters
│   │   │   ├── profiles/      # Profile management
│   │   │   ├── sync/          # Apify sync pipeline
│   │   │   └── interests/     # Interest keyword filters
│   │   ├── pipeline/          # Lead Pipeline UI
│   │   ├── settings/          # ICP Configuration UI
│   │   ├── interests/         # Interest Filters UI
│   │   ├── profiles/          # Profile Management UI
│   │   ├── layout.js          # App shell + sidebar
│   │   ├── page.js            # Signal Feed (dashboard)
│   │   └── globals.css        # Design system
│   └── lib/
│       ├── apify.js           # Apify scraper integration
│       ├── llmEvaluator.js    # Gemini AI qualification engine
│       └── prisma.js          # Database client
├── .env.example               # Environment template
└── package.json
```

## 💰 Cost Estimates

| Component | Cost |
|---|---|
| Apify (posts) | ~$0.01 per profile |
| Apify (comments) | ~$0.01–0.10 per post |
| Gemini Flash (qualification) | ~$0.001 per 20 commenters |
| **Total for 10 profiles/day** | **~$0.15–0.50/day** |

## 🔧 Configuration

### Changing the LLM Provider

The evaluator in `src/lib/llmEvaluator.js` uses Google Gemini by default. To use a different provider, modify the `callGemini()` function to point to the OpenAI or Anthropic API instead.

### Adjusting Qualification Batch Size

Edit `BATCH_SIZE` in `src/lib/llmEvaluator.js` (default: 15 commenters per LLM call).

### Custom System Prompts

Use the **Settings → Custom AI Instructions** field to add domain-specific context like competitor names, tech stack preferences, or geographic targeting.

## 📝 License

MIT

## 🤝 Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.
