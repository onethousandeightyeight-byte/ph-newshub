"""
PH-NewsHub News Scraper Service

This service periodically scrapes news articles from trusted Philippine
news sources, validates them using the "Rubbish Filter", and stores them
in the database via the Next.js API.

Author: PH-NewsHub Development Team
"""

import requests
import time
import schedule
import os
from typing import List, Dict
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from validate_article import fetch_and_validate

# --- Configuration ---
API_URL = os.environ.get("NEXTJS_API_URL", "https://ph-newshub.vercel.app/api")
SCRAPER_INTERVAL_HOURS = int(os.environ.get("SCRAPER_INTERVAL_HOURS", 1))

import random

# List of common user agents to rotate and avoid blocking
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

def get_random_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }

# Focusing on sources that are more likely to work and have good RSS feeds.
trusted_sources = [
    {"name": "GMA News Online", "url": "https://www.gmanetwork.com/news/"},
    {"name": "ABS-CBN News", "url": "https://news.abs-cbn.com/"},
    {"name": "Rappler", "url": "https://www.rappler.com/"},
    {"name": "Inquirer.net", "url": "https://www.inquirer.net/"},
    {"name": "Philstar.com", "url": "https://www.philstar.com/"},
    {"name": "Manila Bulletin", "url": "https://mb.com.ph/"},
    {"name": "Philippine News Agency", "url": "https://www.pna.gov.ph/"},
    {"name": "BusinessWorld", "url": "https://www.bworldonline.com/"},
]
# --- End Configuration ---


def discover_rss_feeds(site_url: str) -> List[str]:
    """Attempts to discover RSS feed URLs from a website's homepage."""
    print(f"  -> Discovering RSS feeds for {site_url}")
    found_feeds = []
    site_domain = urlparse(site_url).netloc
    
    try:
        # Using headers and disabling SSL verification for robustness.
        response = requests.get(site_url, timeout=15,
                                headers=get_random_headers(), verify=True)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Look for proper RSS link tags in head (most reliable)
        rss_link_tags = soup.find_all('link', type=['application/rss+xml', 'application/atom+xml'])
        for link in rss_link_tags:
            href = link.get('href')
            if href:
                full_url = urljoin(site_url, href)
                if full_url not in found_feeds:
                    found_feeds.append(full_url)
                    print(f"     [DISCOVERY] Found RSS link tag: {full_url}")

        # If no RSS link tags found, look for anchor links but be more restrictive
        if not found_feeds:
            rss_links = soup.find_all('a', href=True)
            for link in rss_links:
                href = link['href']
                href_lower = href.lower()
                full_url = urljoin(site_url, href)
                link_domain = urlparse(full_url).netloc
                
                # Only accept if:
                # 1. Contains 'rss' or ends with '.xml'
                # 2. Same domain as the source site (exclude facebook, twitter, etc.)
                # 3. Does NOT contain 'facebook', 'twitter', 'dialog', 'share'
                is_rss_pattern = ('rss' in href_lower or href_lower.endswith('.xml'))
                is_same_domain = (site_domain in link_domain)
                is_not_social = not any(x in href_lower for x in ['facebook', 'twitter', 'dialog', 'share'])
                
                if is_rss_pattern and is_same_domain and is_not_social:
                    if full_url not in found_feeds:
                        found_feeds.append(full_url)
                        print(f"     [DISCOVERY] Found potential feed: {full_url}")

        # Fallback to common feed URLs if none are found
        if not found_feeds:
            print("     [DISCOVERY] No RSS links found, trying common paths...")
            common_feeds = ['/rss', '/feed', '/rss.xml', '/feeds/posts/default']
            for feed_path in common_feeds:
                found_feeds.append(urljoin(site_url, feed_path))

        print(f"  -> Discovered {len(found_feeds)} feeds.")
        return found_feeds
    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Could not discover feeds for {site_url}: {e}")
        return []


def fetch_articles_from_rss(feed_url: str) -> List[Dict]:
    """Fetches articles from an RSS feed."""
    articles = []
    try:
        # Using headers with SSL verification enabled.
        response = requests.get(feed_url, timeout=15,
                                headers=get_random_headers(), verify=True)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')

        items = soup.find_all('item')
        for item in items:
            link = item.find('link')
            if link and link.text:
                articles.append({'link': link.text.strip()})
        return articles
    except requests.exceptions.RequestException as e:
        print(
            f"     [ERROR] Failed to fetch or parse RSS feed {feed_url}: {e}")
        return []
    except Exception as e:
        print(
            f"     [ERROR] An unexpected error occurred while parsing {feed_url}: {e}")
        return []


def scrape_and_store():
    """Main function to scrape articles and store them via the API."""
    print("-----------------------------------------")
    print(f"Starting news scraping cycle at {time.ctime()}")
    
    # Load config for validation settings
    import json
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
        print("[SUCCESS] Loaded config.json for validation settings.")
    except FileNotFoundError:
        print("[WARN] config.json not found, using default validation settings.")
        config = {}

    for source in trusted_sources:
        site_url = source["url"]
        print(f"\n[INFO] Processing source: {source['name']} ({site_url})")

        try:
            # Using headers and disabling SSL verification for robustness.
            categories_response = requests.get(
                f"{API_URL}/categories", headers=get_random_headers(), verify=True)
            categories_response.raise_for_status()
            categories_map = {cat['slug']: cat['id']
                              for cat in categories_response.json()}
            print(
                f"  [SUCCESS] Fetched {len(categories_map)} categories from API.")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                print(f"  [ERROR] API 403 Forbidden (Vercel WAF blocked). Sleeping 60s to cool down...")
                time.sleep(60)
            print(f"  [ERROR] Could not fetch categories from API: {e}")
            print("  [WARN] Skipping source due to category fetch failure.")
            continue
        except requests.exceptions.RequestException as e:
            print(f"  [ERROR] Could not fetch categories from API: {e}")
            print("  [WARN] Skipping source due to category fetch failure.")
            continue

        rss_feeds = discover_rss_feeds(site_url)
        if not rss_feeds:
            print(f"  [WARN] No RSS feeds found for {site_url}. Skipping.")
            continue

        for feed_url in rss_feeds:
            print(f"  -> Scraping RSS feed: {feed_url}")
            articles = fetch_articles_from_rss(feed_url)
            print(f"     Found {len(articles)} potential articles in feed.")

            for article_data in articles:
                try:
                    # Use the standalone fetch_and_validate function
                    validated_data = fetch_and_validate(
                        article_data['link'], config)
                    if validated_data and validated_data.get('valid'):
                        category_slug = validated_data.get(
                            'category', 'world-current-affairs')
                        category_id = categories_map.get(category_slug)

                        if not category_id:
                            print(
                                f"     [WARN] Category '{category_slug}' not found. Defaulting to 'world-current-affairs'.")
                            category_id = categories_map.get('world-current-affairs')

                        if not category_id:
                            print(
                                f"     [ERROR] Default category 'world-current-affairs' not found. Cannot post article.")
                            print(
                                f"     [DEBUG] Available categories: {list(categories_map.keys())}")
                            continue

                        # Build payload with proper error handling for missing keys
                        try:
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
                        except KeyError as ke:
                            print(
                                f"     [ERROR] Missing key in validated_data: {ke}")
                            print(
                                f"     [DEBUG] Available keys: {list(validated_data.keys())}")
                            continue

                        # Using headers and disabling SSL verification for robustness.
                        # Log payload for debugging
                        print(f"     [DEBUG] Posting article: {post_payload.get('title', 'NO TITLE')[:50]}...")
                        response = requests.post(
                            f"{API_URL}/articles", json=post_payload, headers=get_random_headers(), verify=True)
                        
                        if response.status_code in [200, 201]:
                            action = "Updated" if response.status_code == 200 else "Stored"
                            print(
                                f"     [SUCCESS] {action} article: {validated_data['title'][:50]}...")
                        else:
                            print(
                                f"     [ERROR] Failed to store article. HTTP {response.status_code}")
                            resp_text = response.text
                            # Split log to avoid truncation of the important error message at the end
                            print(f"     [DEBUG] Response body START: {resp_text[:500]}")
                            if len(resp_text) > 500:
                                print(f"     [DEBUG] Response body END: {resp_text[-2000:]}")
                            
                            # Backoff on 403
                            if response.status_code == 403:
                                print(f"     [WARN] API 403 Forbidden on POST. Sleeping 60s to cool down...")
                                time.sleep(60)
                        
                        # Add delay to avoid rate limiting
                        time.sleep(2)
                    else:
                        reason = validated_data.get('reason', 'Unknown') if validated_data else 'Validation returned None'
                        title = validated_data.get('title', 'Unknown title') if validated_data else 'Unknown'
                        print(
                            f"     [INFO] Article failed validation: '{title}' - Reason: {reason}")

                except requests.exceptions.RequestException as e:
                    print(
                        f"     [ERROR] Network error for {article_data.get('link', '')}: {e}")
                except Exception as e:
                    print(
                        f"     [ERROR] Unexpected error for {article_data.get('link', '')}: {type(e).__name__}: {e}")

    print(f"\nScraping cycle finished at {time.ctime()}")
    print("-----------------------------------------")


if __name__ == "__main__":
    # This comment is here to force a new deployment commit.
    print("Starting PH-NewsHub Scraper...")
    # Run once immediately on start
    scrape_and_store()
    # Then schedule to run every hour
    schedule.every(SCRAPER_INTERVAL_HOURS).hours.do(scrape_and_store)
    print(
        f"Scheduled to run every {SCRAPER_INTERVAL_HOURS} hour(s). Waiting...")

    while True:
        schedule.run_pending()
        time.sleep(1)
