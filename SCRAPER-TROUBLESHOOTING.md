# 🔧 PH-NewsHub Scraper Troubleshooting Guide

**Last Updated:** January 2026  
**Context:** Debugging guide for when articles are not being scraped from online sources

---

## 📋 Table of Contents

1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [Common Issues and Fixes](#common-issues-and-fixes)
3. [Testing the Scraper](#testing-the-scraper)
4. [Verifying Database Connection](#verifying-database-connection)
5. [Checking API Endpoints](#checking-api-endpoints)
6. [Manual Testing Scripts](#manual-testing-scripts)
7. [Production Deployment Checks](#production-deployment-checks)

---

## Quick Diagnostic Checklist

Run through this checklist to identify the issue:

### ✅ Database Status
```bash
# Check if database file exists (for local SQLite)
ls -la db/custom.db

# For PostgreSQL (production), test connection
# Set your DATABASE_URL environment variable first
npx prisma db pull
```

### ✅ Scraper Service Status
```bash
# Navigate to scraper directory
cd mini-services/news-scraper

# Check if dependencies are installed
pip list | grep -E "requests|beautifulsoup4|schedule"

# Test configuration
python3 -c "from config_loader import load_config; print(load_config())"
```

### ✅ API Endpoint Status
```bash
# Test if Next.js API is running
curl http://localhost:3000/api/articles

# Or for production
curl https://ph-newshub.vercel.app/api/articles

# Test categories endpoint
curl http://localhost:3000/api/categories
```

### ✅ Network Connectivity
```bash
# Test if scraper can reach news sources
curl -I https://inquirer.net
curl -I https://philstar.com
```

---

## Common Issues and Fixes

### Issue 1: Missing BeautifulSoup Import ✅ FIXED

**Symptom:** 
```
NameError: name 'BeautifulSoup' is not defined
```

**Fix:** Added `from bs4 import BeautifulSoup` to scraper.py imports (line 17)

---

### Issue 2: Category ID Type Mismatch ✅ FIXED

**Symptom:**
- Articles fail to save
- Error: "Invalid category ID" or validation errors

**Problem:** 
- Scraper was sending integer category IDs (1, 2, 3...)
- Database expects string CUIDs (e.g., "clm1234567890")

**Fix:** Updated `_get_category_id()` method to:
1. Query the API for actual category IDs
2. Match by category slug (sports, politics, etc.)
3. Return proper CUID format

---

### Issue 3: No Categories in Database

**Symptom:**
```
Storage failed: HTTP 400
Error detail: Missing required fields
```

**Diagnosis:**
```bash
# Check if categories exist in database
npx prisma studio
# Navigate to Category table - should have entries

# Or via API:
curl http://localhost:3000/api/categories
```

**Fix:** Seed categories into database:

```sql
-- Example: Create categories (adjust for your database)
INSERT INTO "Category" (id, name, slug, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'General', 'general', NOW(), NOW()),
  (gen_random_uuid(), 'Politics', 'politics', NOW(), NOW()),
  (gen_random_uuid(), 'Sports', 'sports', NOW(), NOW()),
  (gen_random_uuid(), 'Business', 'business', NOW(), NOW()),
  (gen_random_uuid(), 'Technology', 'technology', NOW(), NOW()),
  (gen_random_uuid(), 'Entertainment', 'entertainment', NOW(), NOW());
```

Or create via API/admin panel if available.

---

### Issue 4: API URL Configuration

**Symptom:**
- Scraper runs but articles don't appear in database
- Connection errors in scraper logs

**Check config.json:**
```json
{
  "api": {
    "nextjs_api_url": "http://127.0.0.1:3000/api"  // Local development
    // OR
    "nextjs_api_url": "https://ph-newshub.vercel.app/api"  // Production
  }
}
```

**For local development:**
1. Make sure Next.js is running: `npm run dev`
2. Use `http://localhost:3000/api` or `http://127.0.0.1:3000/api`

**For production:**
1. Use your deployed Vercel URL
2. Ensure API routes are accessible (not behind auth)

---

### Issue 5: RSS Feed Discovery Fails

**Symptom:**
- No articles found from sources
- Log shows: "Found 0 potential articles"

**Diagnosis:**
```python
# Test RSS feed discovery manually
import requests
from bs4 import BeautifulSoup

rss_url = "https://inquirer.net/feed/"
response = requests.get(rss_url, timeout=10)
print(f"Status: {response.status_code}")

soup = BeautifulSoup(response.content, 'xml')
items = soup.find_all('item')
print(f"Found {len(items)} articles")
```

**Common causes:**
- News site changed RSS feed URL
- Rate limiting / IP blocking
- Need to update User-Agent string

**Fix:** Update config.json:
```json
{
  "scraper": {
    "user_agent": "Mozilla/5.0 (compatible; PH-NewsHub/1.0; +https://ph-newshub.com/bot)",
    "request_delay": 3  // Increase delay between requests
  }
}
```

---

### Issue 6: Article Validation Failures

**Symptom:**
- Log shows: "Validation failed: [reason]"
- No articles being stored

**Debug validation:**
```python
# Test article validation manually
from validate_article import fetch_and_validate
import json

with open('config.json', 'r') as f:
    config = json.load(f)

url = "https://inquirer.net/some-article-url"
result = fetch_and_validate(url, config)

print(f"Valid: {result['valid']}")
if not result['valid']:
    print(f"Reason: {result.get('reason')}")
else:
    print(f"Title: {result['title']}")
    print(f"Word count: {result['word_count']}")
```

**Common validation failures:**
- Word count too low (< 200 words)
- Error phrases detected ("404 Not Found")
- Domain not in trusted sources
- Spam keywords detected

**Fix:** Adjust quality filters in config.json:
```json
{
  "quality_filter": {
    "min_word_count": 150,  // Lower if needed for testing
    "error_phrases": [...],  // Review and adjust
    "spam_keywords": [...]   // Review and adjust
  }
}
```

---

### Issue 7: Database Connection Issues

**Symptom:**
- API returns 500 errors
- Prisma client errors

**Check DATABASE_URL:**
```bash
# .env.local or .env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Test Prisma connection
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

**Common issues:**
- Wrong DATABASE_URL in production
- Database not accessible from scraper service
- Prisma client not generated

---

## Testing the Scraper

### Manual Test Run

```bash
cd mini-services/news-scraper

# Install dependencies
pip install -r requirements.txt

# Test configuration
python3 -c "from config_loader import load_config; config = load_config(); print('Config loaded successfully')"

# Test single article validation
python3 validate_article.py

# Run scraper once (without scheduler)
python3 -c "
from scraper import NewsScraper
scraper = NewsScraper('config.json')
scraper.scrape_all_sources()
"
```

### Expected Output

```
Starting scrape cycle...

Scraping: Philippine Daily Inquirer (inquirer.net)
  Discovering articles from inquirer.net...
  ✓ Found 10 articles from RSS: https://inquirer.net/feed/
  ✓ Scraped: Duterte responds to ICC investigation...
  ✓ Scraped: PBA Finals: Ginebra defeats TNT...
  ...

Scrape cycle completed:
  Total attempted: 50
  Successfully scraped: 35
  Validation failed: 10
  Storage failed: 5
```

### Troubleshooting Low Success Rate

If most articles fail:

1. **Check validation logs** - Which checks are failing?
2. **Test a single URL** - Use the manual validation script above
3. **Verify API is accepting data** - Test POST directly with curl
4. **Check database constraints** - Unique URL constraint may block duplicates

---

## Verifying Database Connection

### Local Development (SQLite)

```bash
# Check database file
ls -la db/custom.db

# Open with SQLite
sqlite3 db/custom.db

# Check tables
.tables

# Check if articles exist
SELECT COUNT(*) FROM Article;

# Check if categories exist
SELECT * FROM Category;

# Exit
.quit
```

### Production (PostgreSQL)

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host/db"

# Use Prisma Studio
npx prisma studio

# Or use psql
psql $DATABASE_URL

# Check articles
SELECT COUNT(*) FROM "Article";

# Check categories
SELECT * FROM "Category";
```

---

## Checking API Endpoints

### Test GET /api/articles

```bash
# Should return articles (may be empty initially)
curl http://localhost:3000/api/articles

# Expected response:
{
  "feed": [...],
  "total": 0,
  "hasMore": false
}
```

### Test GET /api/categories

```bash
curl http://localhost:3000/api/categories

# Expected response:
[
  {
    "id": "clm...",
    "name": "Sports",
    "slug": "sports"
  },
  ...
]
```

**If categories are empty:**
- Create categories via Prisma Studio
- Or create an admin seeding script
- Or manually insert via database client

### Test POST /api/articles

```bash
# First, get a valid category ID
CATEGORY_ID=$(curl -s http://localhost:3000/api/categories | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")

# Test article creation
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Article\",
    \"snippet\": \"This is a test article snippet\",
    \"contentBody\": \"This is the full content body of the test article. It needs to be at least 200 words to pass validation. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\",
    \"originalUrl\": \"https://example.com/test-$(date +%s)\",
    \"publishedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
    \"imageUrl\": \"https://via.placeholder.com/800x400\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"sourceDomain\": \"example.com\",
    \"author\": \"Test Author\"
  }"

# Should return 201 Created with article data
```

**If POST fails with 400:**
- Check error message in response
- Verify categoryId exists in database
- Verify all required fields are present
- Check originalUrl is unique

**If POST fails with 500:**
- Check Next.js server logs
- Verify DATABASE_URL is correct
- Check Prisma client is generated

---

## Manual Testing Scripts

### 1. Test Single URL Scraping

Create `test_single_url.py`:

```python
#!/usr/bin/env python3
"""
Test scraping a single article URL
"""
import sys
from validate_article import fetch_and_validate
from config_loader import load_config

if len(sys.argv) < 2:
    print("Usage: python3 test_single_url.py <url>")
    sys.exit(1)

url = sys.argv[1]
config = load_config()

print(f"Testing URL: {url}")
print("-" * 60)

result = fetch_and_validate(url, config)

print(f"Valid: {result['valid']}")
if result['valid']:
    print(f"Title: {result['title']}")
    print(f"Author: {result.get('author', 'N/A')}")
    print(f"Word count: {result['word_count']}")
    print(f"Published: {result.get('published_date', 'N/A')}")
    print(f"Image: {result.get('image_url', 'N/A')}")
    print(f"\nContent preview:")
    print(result['content'][:200] + "...")
else:
    print(f"Reason: {result.get('reason', 'Unknown')}")
    if 'validation' in result:
        print(f"\nValidation details:")
        for check, details in result['validation'].get('checks', {}).items():
            print(f"  {check}: {details}")
```

Run:
```bash
python3 test_single_url.py "https://inquirer.net/some-article"
```

### 2. Test API Connection

Create `test_api.py`:

```python
#!/usr/bin/env python3
"""
Test API connectivity and endpoints
"""
import requests
from config_loader import load_config

config = load_config()
api_url = config['api']['nextjs_api_url']

print(f"Testing API at: {api_url}")
print("-" * 60)

# Test categories endpoint
print("\n1. Testing GET /categories")
try:
    response = requests.get(f"{api_url}/categories", timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        categories = response.json()
        print(f"   Found {len(categories)} categories")
        for cat in categories[:3]:
            print(f"     - {cat['name']} ({cat['slug']})")
    else:
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   Error: {str(e)}")

# Test articles endpoint
print("\n2. Testing GET /articles")
try:
    response = requests.get(f"{api_url}/articles", timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Total articles: {data.get('total', 0)}")
    else:
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"   Error: {str(e)}")

print("\n" + "=" * 60)
print("API test complete")
```

Run:
```bash
python3 test_api.py
```

---

## Production Deployment Checks

### Vercel Deployment (Next.js App)

1. **Check Environment Variables:**
   - `DATABASE_URL` is set correctly
   - Points to your Supabase/PostgreSQL instance

2. **Check Build Logs:**
   ```bash
   # In Vercel dashboard
   Deployments → Latest → Build Logs
   ```

3. **Test API Routes:**
   ```bash
   curl https://ph-newshub.vercel.app/api/categories
   curl https://ph-newshub.vercel.app/api/articles
   ```

### Render Deployment (Scraper Service)

1. **Check Environment Variables:**
   - All config values are set
   - API URL points to Vercel deployment

2. **Check Service Logs:**
   ```bash
   # In Render dashboard
   Services → news-scraper → Logs
   ```

3. **Verify Service is Running:**
   - Should show "Starting scheduler" message
   - Should show periodic scrape cycles

4. **Common Render Issues:**
   - Service crashes on start → Check Python version, dependencies
   - Network timeouts → Increase timeout settings
   - Memory issues → Upgrade Render plan or optimize scraper

---

## Quick Fixes Summary

### ✅ Issues Fixed in This Update

1. **Added BeautifulSoup import** in scraper.py
2. **Fixed category ID type mismatch** - Now queries API for proper CUIDs
3. **Improved error logging** - Shows detailed error responses from API
4. **Better validation** - Checks if category ID exists before storing
5. **Snippet truncation** - Properly handles short content

### 🔧 Next Steps to Get Scraping Working

1. **Create categories in database:**
   ```bash
   # Use Prisma Studio or SQL to create categories
   npx prisma studio
   ```

2. **Test API endpoints:**
   ```bash
   curl http://localhost:3000/api/categories
   ```

3. **Run scraper with updated code:**
   ```bash
   cd mini-services/news-scraper
   python3 scraper.py
   ```

4. **Monitor logs for issues:**
   - Watch for validation failures
   - Check API response errors
   - Verify articles are being stored

---

## Getting Help

If scraping still doesn't work after following this guide:

1. **Check logs carefully** - Most issues show up in scraper output
2. **Test each component separately** - API, database, validation
3. **Verify network connectivity** - Ensure scraper can reach news sites and API
4. **Review configuration** - Double-check all URLs and settings

For additional help:
- Review [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for deployment setup
- Check [PH-NEWSHUB-DELIVERABLES.md](./PH-NEWSHUB-DELIVERABLES.md) for architecture details
- Review [COPILOT-ALTERNATIVES.md](./COPILOT-ALTERNATIVES.md) for development tools

---

**Last updated:** January 26, 2026
