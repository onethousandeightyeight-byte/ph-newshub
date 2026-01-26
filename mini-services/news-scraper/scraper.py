"""
PH-NewsHub News Scraper Service

This service periodically scrapes news articles from trusted Philippine
news sources, validates them using the "Rubbish Filter", and stores them
in the database via the Next.js API.

Author: PH-NewsHub Development Team
"""

import time
import schedule
import requests
import json
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from validate_article import fetch_and_validate
from config_loader import load_config, get_trusted_domains


class NewsScraper:
    """
    Main scraper class that coordinates article fetching, validation,
    and storage.
    """

    def __init__(self, config_path: str = 'config.json'):
        """
        Initialize scraper with configuration.

        Args:
            config_path: Path to configuration file
        """
        self.config = load_config(config_path)
        self.api_url = self.config.get('api', {}).get(
            'nextjs_api_url', 'http://127.0.0.1:3000/api')
        self.scraper_config = self.config.get('scraper', {})
        self.trusted_sources = self.config.get('trusted_sources', [])
        self.quality_filter = self.config.get('quality_filter', {})

        # Track scraped URLs to avoid duplicates
        self.scraped_urls = set()

        # Statistics
        self.stats = {
            'total_attempted': 0,
            'successfully_scraped': 0,
            'validation_failed': 0,
            'storage_failed': 0
        }

    def scrape_all_sources(self):
        """
        Scrape articles from all trusted sources.
        """
        print(f"\n[{datetime.now()}] Starting scrape cycle...")

        for source in self.trusted_sources:
            if source.get('is_trusted', True):
                print(f"\nScraping: {source['name']} ({source['domain']})")
                self.scrape_source(source)

                # Respect delay between requests
                delay = self.scraper_config.get('request_delay', 2)
                time.sleep(delay)

        # Print statistics
        print(f"\nScrape cycle completed:")
        print(f"  Total attempted: {self.stats['total_attempted']}")
        print(f"  Successfully scraped: {self.stats['successfully_scraped']}")
        print(f"  Validation failed: {self.stats['validation_failed']}")
        print(f"  Storage failed: {self.stats['storage_failed']}")

    def scrape_source(self, source: Dict):
        """
        Scrape articles from a single news source.
        """
        domain = source['domain']
        print(f"  Discovering articles from {domain}...")

        # Try RSS feeds first, then fallback to manual discovery
        article_urls = self._discover_articles_from_rss(domain)

        if not article_urls:
            # Fallback to manual URL generation (limited)
            article_urls = self._get_fallback_articles(f"https://{domain}")

        print(f"  Found {len(article_urls)} potential articles")

        for url in article_urls[:5]:  # Limit to 5 articles per source
            self.scrape_article(url, domain)
            time.sleep(1)  # Rate limiting

    def _discover_articles_from_rss(self, domain: str) -> List[str]:
        """
        Discover articles from RSS feeds.

        Args:
            domain: News source domain

        Returns:
            List of article URLs
        """
        rss_urls = [
            f"https://{domain}/feed/",
            f"https://{domain}/rss/",
            f"https://{domain}/rss.xml",
            f"https://{domain}/feed/rss/",
            f"https://{domain}/news/rss/",
        ]

        for rss_url in rss_urls:
            try:
                response = requests.get(rss_url, timeout=10, headers={
                    'User-Agent': self.scraper_config.get('user_agent', 'PH-NewsHub/1.0')
                })

                if response.status_code == 200:
                    # Parse RSS feed
                    soup = BeautifulSoup(response.content, 'xml')
                    items = soup.find_all('item')

                    urls = []
                    for item in items[:10]:  # Get latest 10 articles
                        link = item.find('link')
                        if link and link.text:
                            urls.append(link.text.strip())

                    if urls:
                        print(
                            f"  ✓ Found {len(urls)} articles from RSS: {rss_url}")
                        return urls

            except Exception as e:
                continue

        return []

    def _get_fallback_articles(self, base_url: str) -> List[str]:
        """
        Fallback method to generate potential article URLs.
        This is less reliable than RSS feeds.

        Args:
            base_url: Base URL of the source

        Returns:
            List of potential article URLs
        """
        # Common article URL patterns for news sites
        current_time = int(datetime.now().timestamp())

        patterns = [
            f"{base_url}/news/{{}}",
            f"{base_url}/article/{{}}",
            f"{base_url}/story/{{}}",
            f"{base_url}/{{}}",
        ]

        urls = []
        for pattern in patterns:
            for i in range(5):  # Generate 5 URLs per pattern
                article_id = current_time - (i * 3600)  # Different timestamps
                urls.append(pattern.format(article_id))

        return urls[:10]  # Return max 10 URLs

    def scrape_article(self, url: str, source_domain: str) -> Optional[Dict]:
        """
        Fetch, validate, and store a single article.

        Args:
            url: Article URL
            source_domain: Domain of the source

        Returns:
            Article data if successful, None otherwise
        """
        self.stats['total_attempted'] += 1

        # Skip if already scraped
        if url in self.scraped_urls:
            return None

        try:
            # Fetch and validate
            result = fetch_and_validate(url, self.config)

            if not result['valid']:
                print(
                    f"  ✗ Validation failed: {result.get('reason', 'Unknown')}")
                self.stats['validation_failed'] += 1
                return None

            # Get category ID
            category_id = self._get_category_id(result['content'], result['title'])
            
            # Skip if no category ID could be determined
            if not category_id:
                print(f"  ✗ Could not determine category ID")
                self.stats['validation_failed'] += 1
                return None

            # Prepare article data
            article_data = {
                'title': result['title'],
                'snippet': result['content'][:200] + '...' if len(result['content']) > 200 else result['content'],
                'contentBody': result['content'],
                'originalUrl': url,
                'publishedAt': result.get('published_date') or datetime.now().isoformat(),
                'imageUrl': result.get('image_url'),
                'categoryId': category_id,
                'sourceDomain': source_domain,  # Just the domain, API will handle it
                'author': result.get('author', 'Unknown Author')
            }

            # Store via API
            if self._store_article(article_data):
                self.scraped_urls.add(url)
                self.stats['successfully_scraped'] += 1
                print(f"  ✓ Scraped: {result['title'][:50]}...")
                return article_data
            else:
                self.stats['storage_failed'] += 1
                return None

        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
            self.stats['storage_failed'] += 1
            return None

    def _get_category_id(self, content: str, title: str) -> Optional[str]:
        """
        Get category ID based on article content and title.
        Queries the API to get the actual category ID.

        Args:
            content: Article content
            title: Article title

        Returns:
            Category ID (string CUID) or None if not found
        """
        from config_loader import classify_article

        # Get category slug
        category_slug = classify_article(content, title, self.config)

        # Query API to get category ID by slug
        try:
            response = requests.get(
                f"{self.api_url}/categories",
                params={'slug': category_slug},
                timeout=10
            )
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    return categories[0].get('id')
                elif isinstance(categories, dict):
                    return categories.get('id')
        except Exception as e:
            print(f"    Warning: Could not fetch category ID: {str(e)}")
        
        # If API call fails, try to get a default category
        try:
            response = requests.get(
                f"{self.api_url}/categories",
                timeout=10
            )
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    # Return first category as fallback
                    return categories[0].get('id')
        except:
            pass
        
        return None  # Will cause validation error in API

    def _store_article(self, article_data: Dict) -> bool:
        """
        Store article via Next.js API.

        Args:
            article_data: Article data to store

        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.post(
                f"{self.api_url}/articles",
                json=article_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )

            if response.status_code in [200, 201]:
                return True
            else:
                print(f"    Storage failed: HTTP {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"    Error detail: {error_detail}")
                except:
                    print(f"    Response text: {response.text[:200]}")
                return False

        except Exception as e:
            print(f"    Storage error: {str(e)}")
            return False

    def start_scheduler(self):
        """
        Start the scheduler for periodic scraping.
        """
        interval = self.scraper_config.get('interval_hours', 1)
        print(f"Starting scheduler - scraping every {interval} hour(s)")

        schedule.every(interval).hours.do(self.scrape_all_sources)

        # Run once immediately
        self.scrape_all_sources()

        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(60)


def main():
    """
    Main entry point for the scraper service.
    """
    print("=" * 60)
    print("PH-NewsHub News Scraper Service")
    print("=" * 60)

    # Initialize scraper
    scraper = NewsScraper('config.json')

    # Start scheduler
    try:
        scraper.start_scheduler()
    except KeyboardInterrupt:
        print("\n\nScraper stopped by user")
    except Exception as e:
        print(f"\n\nError: {str(e)}")


if __name__ == "__main__":
    # This comment is here to force a new deployment commit.
    print("Starting PH-NewsHub Scraper...")
    # Run once immediately on start
    try:
        main()
    except Exception as e:
        print(f"Error in main execution: {str(e)}")
        time.sleep(10)  # Wait before exiting
