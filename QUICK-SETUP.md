# 🚀 Quick Setup Guide - Get Scraping Working

**Last Updated:** January 2026

This guide will help you get the PH-NewsHub scraper working in just a few steps.

---

## Prerequisites Checklist

- [ ] Repository cloned and synced to latest branch
- [ ] Node.js 18+ installed
- [ ] Database connection configured (DATABASE_URL in .env)
- [ ] Python 3.x installed (for scraper)

---

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### Step 2: Set Up Database

If you haven't already, create a `.env.local` file with your database connection:

```bash
# .env.local
DATABASE_URL="postgresql://user:password@host:5432/dbname"
# or for local SQLite:
# DATABASE_URL="file:./db/custom.db"
```

Push the database schema:

```bash
npm run db:push
```

### Step 3: Seed Categories ⭐ NEW

This is the key step! Run the seeding script to create all required categories:

```bash
npm run db:seed
```

**Expected output:**
```
🌱 Starting database seeding...
📂 Creating 8 categories...
  ✓ General (general) - ID: clm...
  ✓ Sports (sports) - ID: clm...
  ✓ Politics (politics) - ID: clm...
  ✓ Business (business) - ID: clm...
  ✓ Technology (technology) - ID: clm...
  ✓ Entertainment (entertainment) - ID: clm...
  ✓ Health (health) - ID: clm...
  ✓ World (world) - ID: clm...

✅ Seeding completed! Total categories in database: 8
```

**If seeding fails:**
- Check your DATABASE_URL is correct
- Make sure you ran `npm run db:push` first
- Verify database is accessible

### Step 4: Start Next.js Server

```bash
npm run dev
```

Server should start at `http://localhost:3000`

**Verify it's working:**
```bash
# In a new terminal
curl http://localhost:3000/api/categories
```

You should see JSON output with all 8 categories.

### Step 5: Run the Scraper

```bash
cd mini-services/news-scraper

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Run the scraper
python3 scraper.py
```

**Expected output:**
```
============================================================
PH-NewsHub News Scraper Service
============================================================
Starting scheduler - scraping every 1 hour(s)

[2026-01-26 16:30:00] Starting scrape cycle...

Scraping: Philippine Daily Inquirer (inquirer.net)
  Discovering articles from inquirer.net...
  ✓ Found 10 articles from RSS: https://inquirer.net/feed/
  ✓ Scraped: Breaking news article title...
  ✓ Scraped: Another article title...
  ...

Scrape cycle completed:
  Total attempted: 50
  Successfully scraped: 35
  Validation failed: 10
  Storage failed: 5
```

---

## Troubleshooting

### Categories Not Created

**Problem:** Seed script fails or categories don't appear

**Solution:**
```bash
# Manual approach using Prisma Studio
npx prisma studio

# Navigate to Category table
# Click "Add record" and create:
# - name: "Sports", slug: "sports"
# - name: "Politics", slug: "politics"
# - name: "Business", slug: "business"
# - name: "Technology", slug: "technology"
# - name: "Entertainment", slug: "entertainment"
# - name: "General", slug: "general"
```

### Scraper Connection Issues

**Problem:** Scraper can't reach API

**Check config.json:**
```json
{
  "api": {
    "nextjs_api_url": "http://localhost:3000/api"
  }
}
```

Make sure:
- Next.js is running (`npm run dev`)
- Port 3000 is not blocked
- URL matches your setup

### No Articles Being Scraped

**Problem:** Scraper runs but no articles appear

**Common causes:**
1. **No categories** - Run `npm run db:seed`
2. **API not running** - Start `npm run dev`
3. **Validation failures** - Check scraper logs for specific errors
4. **Network issues** - Verify scraper can reach news sites

**Debug steps:**
```bash
# Test single article
cd mini-services/news-scraper
python3 -c "
from validate_article import fetch_and_validate
from config_loader import load_config
config = load_config()
result = fetch_and_validate('https://inquirer.net', config)
print('Valid:', result['valid'])
print('Reason:', result.get('reason', 'N/A'))
"
```

### Database Connection Errors

**Problem:** "Can't reach database server"

**Solutions:**
1. **Check DATABASE_URL** in .env.local
2. **Verify database is running** (if using local PostgreSQL)
3. **Test connection:**
   ```bash
   npx prisma db pull
   ```

---

## Quick Verification Checklist

After setup, verify everything works:

- [ ] `npm run dev` - Next.js runs without errors
- [ ] `curl http://localhost:3000/api/categories` - Returns category list
- [ ] `curl http://localhost:3000/api/articles` - Returns article list (may be empty initially)
- [ ] Scraper runs and shows "Successfully scraped" messages
- [ ] Articles appear in database (check with `npx prisma studio`)

---

## Next Steps After Scraping Works

1. **Monitor scraper** - It runs every hour automatically
2. **Check articles** - View at `http://localhost:3000`
3. **Review logs** - Look for any validation failures
4. **Adjust config** - Fine-tune categories and sources in `config.json`

---

## Additional Resources

- **Detailed troubleshooting:** See [SCRAPER-TROUBLESHOOTING.md](./SCRAPER-TROUBLESHOOTING.md)
- **Deployment guide:** See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- **Architecture details:** See [PH-NEWSHUB-DELIVERABLES.md](./PH-NEWSHUB-DELIVERABLES.md)

---

## Common Commands Reference

```bash
# Database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed categories (run this!)
npx prisma studio      # Open database GUI

# Development
npm run dev            # Start Next.js dev server
npm run build          # Build for production
npm run lint           # Run linter

# Scraper
cd mini-services/news-scraper
pip install -r requirements.txt  # Install Python deps
python3 scraper.py               # Run scraper
```

---

**Need help?** Check [SCRAPER-TROUBLESHOOTING.md](./SCRAPER-TROUBLESHOOTING.md) for detailed debugging steps.
