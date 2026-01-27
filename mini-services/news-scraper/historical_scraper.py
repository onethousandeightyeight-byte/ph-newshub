import requests
import time
import os
import json
import random
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from validate_article import fetch_and_validate

# Configuration
API_URL = os.environ.get("NEXTJS_API_URL", "https://ph-newshub.vercel.app/api")

# User Agents (Shared with scraper.py)
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

def get_random_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }

# Target Routes for Historical Scraping
# Format: (Base URL, Pagination Pattern, Max Pages)
TARGETS = [
    # Inquirer: /latest-news/page/2/
    {
        "name": "Inquirer",
        "base_url": "https://www.inquirer.net/latest-news/",
        "page_pattern": "page/{}/", 
        "start_page": 1, 
        "max_pages": 5,
        "link_selector": "#c-list .c-entry-title a" # Typical Inquirer list selector
    },
    # Philstar: /headlines?page=2
    {
        "name": "Philstar",
        "base_url": "https://www.philstar.com/headlines",
        "page_pattern": "?page={}", 
        "start_page": 1, 
        "max_pages": 5,
        "link_selector": ".news_title a" # Typical Philstar selector
    },
    # Generic Fallback for simple link scraping
    # We will try to rely on generic <a> extraction if selectors fail
]

def get_category_map():
    try:
        response = requests.get(f"{API_URL}/categories", headers=get_random_headers(), verify=True)
        response.raise_for_status()
        return {cat['slug']: cat['id'] for cat in response.json()}
    except Exception as e:
        print(f"[ERROR] Failed to fetch categories: {e}")
        return {}

def scrape_history():
    print("-----------------------------------------")
    print(f"Starting HISTORICAL scraping cycle at {time.ctime()}")

    # Load Config
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
    except:
        config = {}

    categories_map = get_category_map()
    if not categories_map:
        print("[FATAL] Could not load categories. Aborting.")
        return

    for target in TARGETS:
        print(f"\n[INFO] Backtracking source: {target['name']}")
        
        for page_num in range(target['start_page'], target['max_pages'] + 1):
            # Construct Page URL
            if target['page_pattern']:
                suffix = target['page_pattern'].format(page_num)
                if page_num == 1 and 'page' in suffix: 
                    # Handle page 1 edge cases if needed (e.g. inquirer page 1 is often just base)
                    if 'inquirer' in target['name'].lower():
                        page_url = target['base_url']
                    else:
                        page_url = urljoin(target['base_url'], suffix)
                else:
                    page_url = urljoin(target['base_url'], suffix)
            else:
                page_url = target['base_url']

            print(f"  -> Scraping listing page: {page_url}")

            try:
                resp = requests.get(page_url, headers=get_random_headers(), timeout=15, verify=True)
                if resp.status_code == 404:
                    print(f"     [WARN] Page not found (404). Stopping this target.")
                    break
                resp.raise_for_status()

                soup = BeautifulSoup(resp.text, 'html.parser')
                
                # Extract Links
                article_links = set()
                
                # Method A: Specific Selector
                if 'link_selector' in target:
                    elements = soup.select(target['link_selector'])
                    for el in elements:
                        href = el.get('href')
                        if href: article_links.add(href)
                
                # Method B: Fallback (find all links matching domain)
                if not article_links:
                    all_links = soup.find_all('a', href=True)
                    domain = urlparse(target['base_url']).netloc
                    for link in all_links:
                        href = link['href']
                        if domain in href and len(href) > 30: # Basic filter for short links
                            article_links.add(href)

                print(f"     Found {len(article_links)} potential articles.")

                # Process Articles
                for link in article_links:
                    try:
                        # Validate
                        validated_data = fetch_and_validate(link, config)
                        if not validated_data or not validated_data.get('valid'):
                            continue # Skip invalid

                        # Prepare Payload
                        category_slug = validated_data.get('category', 'world-current-affairs')
                        category_id = categories_map.get(category_slug, categories_map.get('world-current-affairs'))

                        post_payload = {
                            "title": validated_data["title"],
                            "snippet": validated_data["snippet"],
                            "contentBody": validated_data["contentBody"],
                            "originalUrl": validated_data["originalUrl"],
                            "publishedAt": validated_data["publishedAt"],
                            "imageUrl": validated_data.get("imageUrl"),
                            "author": validated_data.get("author"),
                            "categoryId": category_id,
                            "sourceDomain": urlparse(validated_data["originalUrl"]).netloc
                        }

                        # POST
                        post_resp = requests.post(
                            f"{API_URL}/articles", 
                            json=post_payload, 
                            headers=get_random_headers(), 
                            verify=True
                        )
                        
                        if post_resp.status_code in [200, 201]:
                            print(f"     [SUCCESS] Stored: {validated_data['title'][:40]}...")
                        elif post_resp.status_code == 403:
                            print(f"     [WARN] 403 Forbidden. Backing off 60s...")
                            time.sleep(60)
                        else:
                            # 409 means Conflict (Duplicate), which is fine for backtracking
                            if post_resp.status_code != 409:
                                print(f"     [FAIL] {post_resp.status_code}")

                        time.sleep(1.5) # Gentle delay

                    except Exception as e:
                        print(f"     [ERR] Processing link {link}: {e}")

            except Exception as e:
                print(f"  [ERROR] Failed to scrape page {page_url}: {e}")
                time.sleep(5)
            
            # Pause between pages
            time.sleep(3)

if __name__ == "__main__":
    scrape_history()
