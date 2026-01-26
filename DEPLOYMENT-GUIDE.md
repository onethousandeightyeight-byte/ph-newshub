# 🚀 PH-NewsHub Deployment Guide
## Step-by-Step Instructions (Free Tier)

**Last Updated:** 2024  
**Difficulty:** Beginner to Intermediate  
**Estimated Time:** 1-2 hours  

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Prepare Your Code](#step-1-prepare-your-code)
4. [Step 2: Set Up GitHub Repository](#step-2-set-up-github-repository)
5. [Step 3: Deploy Database (Supabase)](#step-3-deploy-database-supabase)
6. [Step 4: Deploy Main Application (Vercel)](#step-4-deploy-main-application-vercel)
7. [Step 5: Deploy Scraper Service (Render)](#step-5-deploy-scraper-service-render)
8. [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
9. [Step 7: Test Your Deployment](#step-7-test-your-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Upgrade Paths](#upgrade-paths)
12. [Cost Summary](#cost-summary)

---

## Prerequisites

Before you start, make sure you have:

- [ ] **GitHub Account** - Free at [github.com](https://github.com)
- [ ] **Vercel Account** - Free at [vercel.com](https://vercel.com)
- [ ] **Supabase Account** - Free at [supabase.com](https://supabase.com)
- [ ] **Render Account** - Free at [render.com](https://render.com)
- [ ] **Git installed** on your computer
- [ ] **Node.js 18+** installed on your computer
- [ ] **Bun** installed (or npm)
- [ ] **Code Editor** - VS Code, WebStorm, etc.

### Check Your Tools:

```bash
# Check Node.js version
node --version
# Should show v18.0.0 or higher

# Check Git
git --version

# Check Bun (optional, can use npm)
bun --version
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
└────────────────────┬──────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │    Vercel (FREE)     │  ← Main Application
         │  Frontend + API       │     (Next.js)
         │  Port: Auto          │
         └───────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
  ┌─────▼─────┐ ┌──▼────┐ ┌──▼─────────┐
  │  Supabase  │ │ Vercel │ │  Render    │
  │ (FREE)     │ │ (FREE) │ │  (FREE)   │
  │ PostgreSQL  │ │ CDN    │ │  Scraper   │
  │  Database   │ │        │ │  Service   │
  │ 500MB      │ │        │ │  Port 3001│
  └────────────┘ └────────┘ └────────────┘

Current Monthly Cost: $0 (All Free Tiers)
```

---

## Step 1: Prepare Your Code

### 1.1 Navigate to Your Project

```bash
cd /home/z/my-project
```

### 1.2 Update Prisma Schema for PostgreSQL

We need to change from SQLite to PostgreSQL for production.

**File to Edit:** `prisma/schema.prisma`

**Find this line:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Change to:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.3 Generate Prisma Client for PostgreSQL

```bash
# Install Prisma CLI if not installed
npm install -g prisma

# Generate migration
npx prisma migrate dev --name init_postgres

# Or simply push to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 1.4 Add .env.example File

Create a `.env.example` file in your project root:

```env
# Database (from Supabase)
DATABASE_URL=

# NextAuth (optional, for later)
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Stripe (optional, for subscriptions)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Scraper Service
NEXTJS_API_URL=
SCRAPER_INTERVAL_HOURS=1
```

**Note:** Do NOT fill in values yet. We'll get them in later steps.

---

## Step 2: Set Up GitHub Repository

### 2.1 Initialize Git (If Not Already Done)

```bash
cd /home/z/my-project

# Check if already initialized
if [ ! -d ".git" ]; then
    git init
    echo "Git initialized"
else
    echo "Git already initialized"
fi
```

### 2.2 Create .gitignore File

Create `.gitignore` in your project root:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/
dist/

# Production
*.log
dev.log
server.log

# Misc
.DS_Store
*.pem
.env
.env.local
.env.production

# Vercel
.vercel

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local database
db/
*.db
*.db-journal

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
*.egg-info/
```

### 2.3 Commit Your Code

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit: PH-NewsHub ready for deployment"

# Set main branch
git branch -M main
```

### 2.4 Push to GitHub

**Create Repository First:**
1. Go to [github.com](https://github.com)
2. Click **New** (top right)
3. Repository name: `ph-newshub` (or your choice)
4. Make it **Public** (free tier allows public repos)
5. Click **Create repository**

**Push Your Code:**

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/ph-newshub.git

# Push to main branch
git push -u origin main
```

✅ **Check:** Go to your GitHub repository - you should see all your files!

---

## Step 3: Deploy Database (Supabase)

### Why Supabase?

- ✅ **500MB PostgreSQL database** (Free tier)
- ✅ **Real-time capabilities**
- ✅ **Easy dashboard**
- ✅ **Automatic backups**
- ✅ **Authentication included** (for later use)

### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign in/up with GitHub
4. Create new project:
   - **Name:** `ph-newshub`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users (e.g., Southeast Asia)
   - **Pricing Plan:** Free (default)
5. Click **Create new project**

### 3.2 Get Database Connection String

1. Wait for project to be ready (~2 minutes)
2. Click on your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Click **Copy** next to "URI"
6. **Paste** it somewhere safe (Notepad, password manager)

The connection string looks like:
```
postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### 3.3 Run Database Migration

Now we'll push your schema to Supabase.

**Option A: Using Prisma CLI (Recommended)**

```bash
cd /home/z/my-project

# Set temporary environment variable
export DATABASE_URL="PASTE_YOUR_SUPABASE_CONNECTION_STRING_HERE"

# Push schema
npx prisma db push

# Generate client
npx prisma generate
```

**Option B: Using Supabase SQL Editor**

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL (generated from your schema):

```sql
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'SUBSCRIBER', 'ADMIN');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'GUEST',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "domainUrl" TEXT NOT NULL,
    "name" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Source_domainUrl_key" ON "Source"("domainUrl");

CREATE INDEX "Source_isTrusted_idx" ON "Source"("isTrusted");

CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "contentBody" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

CREATE INDEX "Article_sourceId_idx" ON "Article"("sourceId");

CREATE INDEX "Article_wordCount_idx" ON "Article"("wordCount");

CREATE UNIQUE INDEX "Article_originalUrl_key" ON "Article"("originalUrl");

CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "imageAsset" TEXT NOT NULL,
    "altText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdPlacement_isActive_idx" ON "AdPlacement"("isActive");

CREATE INDEX "AdPlacement_position_idx" ON "AdPlacement"("position");
```

4. Click **Run** to execute the SQL

### 3.4 Save Connection String

**Save this for later:**
```
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

✅ **Database Deployed!** You have a PostgreSQL database ready.

---

## Step 4: Deploy Main Application (Vercel)

### Why Vercel?

- ✅ **100GB bandwidth** (Free tier)
- ✅ **Automatic HTTPS**
- ✅ **Zero configuration** for Next.js
- ✅ **Preview deployments**
- ✅ **Edge functions**
- ✅ **Global CDN**

### 4.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. Sign in with **GitHub** (recommended)
4. Complete your profile

### 4.2 Import Your Repository

1. Click **Add New** in Vercel dashboard
2. Select **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Find your `ph-newshub` repository
5. Click **Import**

### 4.3 Configure Project Settings

Vercel will auto-detect it as a Next.js project. Verify:

**Framework Preset:** Next.js  
**Root Directory:** `./`  
**Build Command:** `npm run build`  
**Output Directory:** `.next/standalone`  
**Install Command:** `npm install`

Click **Continue**

### 4.4 Set Environment Variables

Vercel will ask for environment variables. Add these:

**Database URL:**
- **Name:** `DATABASE_URL`
- **Value:** Paste your Supabase connection string
- **Environment:** Production, Preview, Development

**NextAuth Secret (Optional - for later):**
- **Name:** `NEXTAUTH_SECRET`
- **Value:** Generate with: `openssl rand -base64 32`
- **Environment:** Production

**NextAuth URL (Optional - for later):**
- **Name:** `NEXTAUTH_URL`
- **Value:** Your Vercel URL (you'll get this after deployment)
- **Environment:** Production

Click **Add** for each variable.

### 4.5 Deploy

Click **Deploy** and wait (~2-5 minutes).

### 4.6 Get Your Production URL

After deployment:
1. Vercel will show a success message
2. Your URL will be something like: `https://ph-newshub.vercel.app`
3. Click to visit your live site! 🎉

### 4.7 Update NEXTAUTH_URL

If you added NEXTAUTH_URL:
1. Go to your project's **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual Vercel URL
3. Click **Save**
4. Redeploy (Vercel will do this automatically)

✅ **Application Deployed!** Your Next.js app is now live.

---

## Step 5: Deploy Scraper Service (Render)

### Why Render?

- ✅ **Free web service** (spins down when idle)
- ✅ **Supports Python**
- ✅ **Easy Git deployment**
- ✅ **Logs and monitoring**
- ✅ **Automatic SSL**

### 5.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Click **Sign Up**
3. Sign in with GitHub
4. Complete profile

### 5.2 Add Dockerfile to Scraper Service

Create `mini-services/news-scraper/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install Node dependencies
RUN bun install

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Expose port
EXPOSE 3001

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Run application
CMD ["bun", "run", "dev"]
```

### 5.3 Create .dockerignore

Create `mini-services/news-scraper/.dockerignore`:

```text
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
ENV/
*.egg-info/
.git
.gitignore
node_modules
.DS_Store
```

### 5.4 Push to GitHub (Separate Repository or Branch)

**Option A: Same Repository (Easier)**

The scraper is already in your main repo. Render can deploy from a subdirectory.

**Option B: Separate Repository (Cleaner)**

1. Create new GitHub repo: `ph-newshub-scraper`
2. Copy `mini-services/news-scraper/` contents
3. Push to new repo

### 5.5 Deploy to Render

**If Using Same Repo:**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +**
3. Select **Web Service**
4. Connect to GitHub
5. Select your `ph-newshub` repository
6. Configure:

```
Name: ph-newshub-scraper
Root Directory: mini-services/news-scraper
Runtime: Docker
Branch: main
```

7. Click **Advanced**
8. Add environment variables:

**NEXTJS_API_URL:**
- `https://your-vercel-app-url.vercel.app/api`

**SCRAPER_INTERVAL_HOURS:**
- `1`

9. Click **Create Web Service**

**If Using Separate Repo:**

1. Same steps, but select the scraper repository
2. Root Directory: `./`

### 5.6 Get Your Scraper URL

After deployment (~2-5 minutes):
1. Render will provide a URL like: `https://ph-newshub-scraper.onrender.com`
2. Save this URL

### 5.7 Update Main App to Use Scraper

In your main app (optional), you might want to call the scraper API.

The scraper URL is: `https://ph-newshub-scraper.onrender.com`

✅ **Scraper Service Deployed!**

---

## Step 6: Configure Environment Variables

### 6.1 Verify All Variables Are Set

**Vercel:**
1. Go to Project → Settings → Environment Variables
2. Ensure these are set:

```
DATABASE_URL=✓ (Supabase connection string)
NEXTAUTH_URL=✓ (Your Vercel URL)
NEXTAUTH_SECRET=✓ (Random string, if using auth)
```

**Render (Scraper):**
1. Go to Service → Environment
2. Ensure these are set:

```
NEXTJS_API_URL=✓ (Vercel URL + /api)
SCRAPER_INTERVAL_HOURS=1
```

### 6.2 Update Application Code to Use Production Database

Your code already uses Prisma with `DATABASE_URL`, so no code changes needed!

Prisma reads from the environment variable automatically.

### 6.3 Test Database Connection

```bash
# Set environment variable
export DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"

# Test Prisma
npx prisma db pull

# If successful, your database connection works!
```

---

## Step 7: Test Your Deployment

### 7.1 Test Main Application

1. Visit your Vercel URL: `https://ph-newshub.vercel.app`
2. Check:
   - [ ] Page loads without errors
   - [ ] Header shows logo and menu
   - [ ] Sidebar displays categories
   - [ ] Clicking categories works
   - [ ] Search functionality works
   - [ ] News grid displays articles

### 7.2 Test Database Connection

1. Try accessing API endpoint:
   ```
   https://ph-newshub.vercel.app/api/articles
   ```
2. Should return JSON with articles or empty array

### 7.3 Test Scraper Service

1. Visit Render URL: `https://ph-newshub-scraper.onrender.com/health`
2. Should return:
   ```json
   {
     "status": "ok",
     "service": "ph-newshub-scraper",
     "pythonRunning": true,
     "timestamp": "2024-..."
   }
   ```

### 7.4 Check Vercel Logs

1. Go to Vercel Dashboard
2. Click your project
3. Go to **Logs** tab
4. Check for any errors

### 7.5 Check Render Logs

1. Go to Render Dashboard
2. Click your scraper service
3. Go to **Logs** tab
4. Check for Python/Bun errors

---

## Troubleshooting

### Problem: Build Failed on Vercel

**Symptoms:** Vercel shows build error

**Solutions:**

1. Check Node.js version:
   - Vercel Settings → General → Node.js Version
   - Set to `20.x`

2. Check for missing dependencies:
   ```bash
   # Locally
   npm install
   npm run build
   ```

3. Fix TypeScript errors:
   ```bash
   npm run lint
   ```

4. Check Vercel build logs for specific error

---

### Problem: Database Connection Error

**Symptoms:** "Can't reach database server" or "Connection refused"

**Solutions:**

1. Verify DATABASE_URL:
   - Check no typos
   - Ensure password is correct
   - Check special characters are URL-encoded

2. Supabase might be in maintenance:
   - Check Supabase status page

3. IP whitelist (if using other services):
   - Supabase allows all IPs on free tier

4. Test connection locally:
   ```bash
   npx prisma db push
   ```

---

### Problem: Scraper Not Working

**Symptoms:** Render logs show errors, scraper crashes

**Solutions:**

1. Check Python requirements:
   - Ensure `requirements.txt` is correct
   - All dependencies install successfully

2. Check port:
   - Ensure app listens on port 3001
   - Render expects default port or environment PORT

3. Update index.ts to use Render's port:

   ```typescript
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Running on port ${PORT}`)
   })
   ```

4. Check Python path:
   - Ensure `python3` is available in Docker image

---

### Problem: API Routes Returning 404

**Symptoms:** `/api/articles` or other endpoints not found

**Solutions:**

1. Check file structure:
   ```
   src/app/api/
   ├── articles/
   │   └── route.ts
   └── categories/
       └── route.ts
   ```

2. Verify filenames are `route.ts` (not `page.ts` for APIs)

3. Check Vercel re-deployed after changes

---

### Problem: Environment Variables Not Working

**Symptoms:** App can't read environment variables

**Solutions:**

1. Check variable names:
   - Must be exact match (case-sensitive)
   - No spaces around `=` sign

2. Redeploy after adding variables:
   - Vercel doesn't hot-reload env vars
   - Must push new commit or redeploy

3. Check where you access them:
   ```typescript
   // Correct
   process.env.DATABASE_URL

   // Wrong
   process.env['DATABASE_URL'] // In Next.js, use dots
   ```

---

### Problem: Scraper Service Spins Down (Render Free Tier)

**Symptoms:** Scraper service becomes unavailable after inactivity

**Cause:** Render free tier spins down web services after 15 minutes of inactivity

**Solutions:**

1. **Acceptable behavior** for scraper:
   - It wakes up on cron/next request
   - Cold start takes ~30 seconds

2. **Add keep-alive** (optional):
   - Use external cron service (cron-job.org)
   - Ping `/health` endpoint every 10 minutes

3. **Upgrade to paid** (see Upgrade Paths below):
   - Render Starter: $7/mo (no spin down)

---

## Upgrade Paths

### When to Upgrade?

Consider upgrading when:

- 📈 **Traffic**: 1,000+ daily visitors
- 🗄️ **Database**: Approaching 500MB limit
- ⚡ **Performance**: Slow page loads (>3 seconds)
- 🔄 **Scraper**: Need continuous running service
- 💰 **Budget**: Ready to invest more

### Upgrade Options

#### Database: Supabase Free → Pro

**Free Tier Limits:**
- 500MB database
- 1GB bandwidth
- 50MB file storage
- 2 concurrent connections

**Pro Tier ($25/mo):**
- 8GB database (16x more)
- 50GB bandwidth (50x more)
- 1GB file storage (20x more)
- Unlimited connections

**When to Upgrade:**
- ⚠️ Database error: "storage limit exceeded"
- ⚠️ Slow queries due to connection limits
- ⚠️ Need more storage for files/images

**How to Upgrade:**
1. Go to Supabase Dashboard → Organization Settings
2. Click **Upgrade**
3. Choose Pro plan
4. No code changes needed!

---

#### Application: Vercel Free → Pro

**Free Tier Limits:**
- 100GB bandwidth
- 6GB serverless function execution
- 100GB edge cache

**Pro Tier ($20/mo):**
- 1TB bandwidth (10x more)
- 10x faster builds
- Priority support
- Team collaboration

**When to Upgrade:**
- ⚠️ Bandwidth warning email
- ⚠️ Slow build times
- ⚠️ Need team features

**How to Upgrade:**
1. Vercel Dashboard → Settings → Plans
2. Click **Upgrade to Pro**
3. No code changes!

---

#### Scraper: Render Free → Paid

**Free Tier:**
- Spins down after 15 min inactivity
- No guarantee of uptime
- 512MB RAM

**Starter ($7/mo):**
- Always running
- 0.5GB RAM
- Better performance

**When to Upgrade:**
- ⚠️ Scraper timing issues
- ⚠️ Need consistent scraping
- ⚠️ Memory errors in logs

**How to Upgrade:**
1. Render Dashboard → Service → Settings
2. Change to Starter plan
3. No code changes!

---

### Full-Stack Upgrade: Railway

**Alternative:** Move everything to Railway

**Benefits:**
- Single platform for all services
- Easy networking between services
- Better for complex setups

**Pricing:**
- Free trial: $5 credit
- After: $5/mo per service (or $20 unlimited)

**When to Consider:**
- Need multiple services
- Want simpler management
- Growing complexity

---

## Cost Summary

### Current Free Setup

| Service | Tier | Monthly Cost | Limits |
|---------|-------|--------------|---------|
| **Vercel** | Free | $0 | 100GB bandwidth, 6GB builds |
| **Supabase** | Free | $0 | 500MB DB, 1GB bandwidth |
| **Render** | Free | $0 | Spins down, 512MB RAM |
| **GitHub** | Free | $0 | Public repo |
| **Total** | - | **$0/month** |

### Upgrade Estimates

| Growth Level | Recommended Plan | Monthly Cost | Why |
|------------|-----------------|--------------|------|
| **Small** (<10K visits/mo) | Stay Free | $0 | Within free tier limits |
| **Medium** (10K-100K visits/mo) | Supabase Pro + Vercel Free | $25 | Database is bottleneck |
| **Large** (100K+ visits/mo) | Supabase Pro + Vercel Pro + Render Starter | $52 | Everything scales |
| **Enterprise** (Million+ visits/mo) | Full paid stack + dedicated hosting | $200+ | Need dedicated infrastructure |

---

## Quick Reference Commands

### Git Commands

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# Pull latest
git pull origin main
```

### Prisma Commands

```bash
# Push schema to database
npx prisma db push

# Generate client
npx prisma generate

# Reset database
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

### Vercel Commands

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# View logs
vercel logs

# View env vars
vercel env ls
```

---

## Security Checklist

Before going live, ensure:

- [ ] Change all default passwords
- [ ] Use strong, unique passwords
- [ ] Enable two-factor authentication on all accounts
- [ ] Don't commit sensitive data (API keys, passwords)
- [ ] Use `.env.example` for documentation
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Enable rate limiting on API routes
- [ ] Use HTTPS only (automatic on Vercel/Render)
- [ ] Regular backups enabled (Supabase does this)
- [ ] Review and test all third-party integrations

---

## Post-Deployment Tasks

### Day 1

1. ✅ Test all functionality
2. ✅ Set up Google Analytics or Plausible
3. ✅ Submit sitemap to Google Search Console
4. ✅ Share on social media
5. ✅ Monitor error logs

### Week 1

1. ✅ Monitor performance (Vercel Analytics)
2. ✅ Check database growth (Supabase Dashboard)
3. ✅ Review scraper logs
4. ✅ Gather user feedback
5. ✅ Fix any discovered bugs

### Month 1

1. ✅ Review bandwidth usage (Vercel)
2. ✅ Review database storage (Supabase)
3. ✅ Decide if upgrades needed
4. ✅ Plan next features
5. ✅ Consider adding monitoring/alerts

---

## Additional Resources

### Documentation Links

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Render Docs](https://render.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)

### Community Support

- [Vercel Discord](https://vercel.com/discord)
- [Supabase Discord](https://supabase.com/discord)
- [Next.js Discord](https://discord.gg/nextjs)
- [Stack Overflow](https://stackoverflow.com)

### Tools & Extensions

- **Vercel:** Vercel CLI, GitHub integration
- **Supabase:** Supabase Dashboard, pgAdmin
- **Database:** Prisma Studio, TablePlus
- **Monitoring:** Vercel Analytics, Sentry

---

## Congratulations! 🎉

You now have PH-NewsHub deployed with:

✅ Production-ready Next.js application (Vercel)  
✅ PostgreSQL database (Supabase)  
✅ Automated scraper service (Render)  
✅ All on **FREE tiers**  
✅ Ready to scale when you grow  

**Your Website:** `https://ph-newshub.vercel.app` (or your custom URL)

---

## Need Help?

If you encounter issues:

1. **Check logs:** Vercel and Render dashboards
2. **Review this guide:** Common problems are documented
3. **Search error messages:** Google + Stack Overflow
4. **Community:** Discord servers for support

---

**Good luck with PH-NewsHub!** 🚀

Remember: Start free, grow when needed. The platform will scale with you.
