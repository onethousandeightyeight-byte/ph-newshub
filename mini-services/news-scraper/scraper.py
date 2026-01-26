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
        self.api_url = self.config.get('api', {}).get('nextjs_api_url', 'http://127.0.0.1:3000/api')
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
        Note: This is a simplified implementation. In production,
        you would implement source-specific parsers.
        
        Args:
            source: Source configuration dictionary
        """
        # For demonstration, we'll create a few test URLs
        # In production, implement actual RSS/HTML parsing per source
        
        base_url = f"https://{source['domain']}"
        test_articles = self._get_test_articles(base_url, source['name'])
        
        for article_url in test_articles:
            self.scrape_article(article_url, source['domain'])
    
    def _get_test_articles(self, base_url: str, source_name: str) -> List[str]:
        """
        Generate test article URLs for demonstration.
        In production, replace with actual URL discovery logic.
        
        Args:
            base_url: Base URL of the source
            source_name: Name of the source
            
        Returns:
            List of article URLs
        """
        # This is a placeholder - in production, implement RSS parsing
        # or HTML scraping to discover actual article URLs
        
        test_articles = [
            f"{base_url}/news/philippines/{int(datetime.now().timestamp())}",
            f"{base_url}/business/{int(datetime.now().timestamp()) - 3600}",
            f"{base_url}/sports/{int(datetime.now().timestamp()) - 7200}"
        ]
        
        return test_articles
    
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
                print(f"  ✗ Validation failed: {result.get('reason', 'Unknown')}")
                self.stats['validation_failed'] += 1
                return None
            
            # Prepare article data
            article_data = {
                'title': result['title'],
                'snippet': result['content'][:200] + '...',
                'contentBody': result['content'],
                'originalUrl': url,
                'publishedAt': datetime.now().isoformat(),
                'imageUrl': None,  # Would extract from HTML in production
                'categoryId': self._get_category_id(result['content'], result['title']),
                'sourceDomain': source_domain
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
    
    def _get_category_id(self, content: str, title: str) -> str:
        """
        Get category ID based on article content and title.
        
        Args:
            content: Article content
            title: Article title
            
        Returns:
            Category slug (default: 'general')
        """
        from config_loader import classify_article
        return classify_article(content, title, self.config)
    
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


if __name__ == '__main__':
    main()
