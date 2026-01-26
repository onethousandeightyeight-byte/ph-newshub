"""
PH-NewsHub Article Validator - "The Rubbish Filter"

This module implements quality control and content verification
to ensure only high-quality articles are stored in the database.

Author: PH-NewsHub Development Team
"""

import re
from typing import Dict, List, Optional
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from dateutil import parser
from datetime import datetime


def _extract_title(soup: BeautifulSoup) -> str:
    """Extract article title from HTML."""
    # Try common title selectors
    selectors = [
        'h1.entry-title',
        'h1.article-title',
        'h1.post-title',
        'h1.title',
        'h1',
        'title'
    ]

    for selector in selectors:
        title_elem = soup.select_one(selector)
        if title_elem:
            title = title_elem.get_text().strip()
            if len(title) > 10:  # Ensure it's a real title
                return title

    return "Untitled Article"


def _extract_content(soup: BeautifulSoup) -> str:
    """Extract article content from HTML."""
    # Remove unwanted elements first
    for unwanted in soup.select('script, style, nav, footer, header, .ads, .social-share, .related-articles, .comments'):
        unwanted.decompose()

    # Try common content selectors
    selectors = [
        'div.entry-content',
        'div.article-content',
        'div.post-content',
        'div.content',
        'article',
        'div.article-body',
        'div.story-body',
        'main'
    ]

    for selector in selectors:
        content_elem = soup.select_one(selector)
        if content_elem:
            content = content_elem.get_text(separator=' ', strip=True)
            if len(content) > 200:  # Ensure substantial content
                return content

    # Fallback to body text
    body = soup.find('body')
    if body:
        return body.get_text(separator=' ', strip=True)

    return ""


def _extract_author(soup: BeautifulSoup) -> str:
    """Extract author name from HTML."""
    selectors = [
        'span.author',
        'a.author',
        'meta[name="author"]',
        'meta[property="article:author"]',
        '.byline',
        '.author-name'
    ]

    for selector in selectors:
        author_elem = soup.select_one(selector)
        if author_elem:
            if author_elem.name == 'meta':
                author = author_elem.get('content')
            else:
                author = author_elem.get_text()

            if author and len(author.strip()) > 0:
                return author.strip()

    return "Unknown Author"


def _extract_published_date(soup: BeautifulSoup) -> Optional[datetime]:
    """Extract publication date from HTML."""
    # Try common date selectors and attributes
    selectors = [
        'time.published',
        'time.entry-date',
        'meta[property="article:published_time"]',
        'meta[name="publishdate"]',
        'meta[name="date"]',
        '.published-date',
        '.entry-date'
    ]

    for selector in selectors:
        date_elem = soup.select_one(selector)
        if date_elem:
            if date_elem.name == 'meta':
                date_str = date_elem.get('content')
            else:
                date_str = date_elem.get('datetime') or date_elem.get_text()

            if date_str:
                try:
                    # Try parsing various date formats
                    return parser.parse(date_str)
                except:
                    continue

    return None


def _extract_image_url(soup: BeautifulSoup) -> Optional[str]:
    """Extract main article image URL."""
    # Try Open Graph image first
    og_image = soup.select_one('meta[property="og:image"]')
    if og_image and og_image.get('content'):
        return og_image['content']

    # Try Twitter card image
    twitter_image = soup.select_one('meta[name="twitter:image"]')
    if twitter_image and twitter_image.get('content'):
        return twitter_image['content']

    # Try article image selectors
    selectors = [
        'img.article-image',
        'img.featured-image',
        '.entry-image img',
        'article img'
    ]

    for selector in selectors:
        img_elem = soup.select_one(selector)
        if img_elem and img_elem.get('src'):
            return img_elem['src']

    return None


class ArticleValidator:
        """
        Initialize validator with configuration.

        Args:
            config: Dictionary containing quality filter settings
        """
        self.min_word_count = config.get('min_word_count', 200)
        self.error_phrases = config.get('error_phrases', [])
        self.spam_keywords = config.get('spam_keywords', [])

    def validate_article(self, content: str, url: str, title: str = "") -> Dict:
        """
        Main validation function that applies all quality checks.
        
        Args:
            content: The article body text
            url: The article URL
            title: The article title (optional)
            
        Returns:
            Dictionary with validation result and details:
            {
                'valid': bool,
                'reason': str (if invalid),
                'word_count': int,
                'checks': dict
            }
        """
        checks = {
            'word_count': self._check_word_count(content),
            'trusted_domain': self._check_trusted_domain(url),
            'error_phrases': self._check_error_phrases(content),
            'spam_keywords': self._check_spam_keywords(content),
            'title_caps': self._check_title_caps(title) if title else {'valid': True, 'message': 'No title'},
            'stub_page': self._check_stub_page(content)
        }
        
        # Article is valid only if all checks pass
        valid = all(check['valid'] for check in checks.values())
        
        if not valid:
            # Find the first failed check
            for check_name, result in checks.items():
                if not result['valid']:
                    return {
                        'valid': False,
                        'reason': result['message'],
                        'word_count': checks['word_count']['count'],
                        'checks': checks
                    }
        
        return {
            'valid': True,
            'word_count': checks['word_count']['count'],
            'checks': checks
        }
    
    def _check_word_count(self, content: str) -> Dict:
        """
        Check if article meets minimum word count requirement.
        
        Returns:
            Dictionary with validation result
        """
        if not content:
            return {
                'valid': False,
                'message': 'Empty content',
                'count': 0
            }
        
        # Count words (split by whitespace)
        word_count = len(content.split())
        
        if word_count < self.min_word_count:
            return {
                'valid': False,
                'message': f'Word count ({word_count}) below minimum ({self.min_word_count})',
                'count': word_count
            }
        
        return {
            'valid': True,
            'message': f'Word count ({word_count}) meets minimum',
            'count': word_count
        }
    
    def _check_trusted_domain(self, url: str) -> Dict:
        """
        Check if URL is from a trusted domain.
        Note: This is a placeholder. In production, load from config.
        
        Returns:
            Dictionary with validation result
        """
        # Import trusted sources from config
        try:
            from config_loader import get_trusted_domains
            trusted_domains = get_trusted_domains()
        except ImportError:
            # Fallback to checking against common Philippine news domains
            trusted_domains = [
                'inquirer.net',
                'philstar.com',
                'rappler.com',
                'abs-cbn.com',
                'cnnphilippines.com',
                'gmanetwork.com',
                'mb.com.ph'
            ]
        
        try:
            domain = urlparse(url).netloc.lower()
            
            # Remove 'www.' prefix for comparison
            domain = domain.replace('www.', '')
            
            # Check if domain or its parent is in trusted list
            is_trusted = any(
                trusted in domain
                for trusted in trusted_domains
            )
            
            if is_trusted:
                return {
                    'valid': True,
                    'message': f'Domain {domain} is trusted'
                }
            else:
                return {
                    'valid': False,
                    'message': f'Domain {domain} not in trusted sources'
                }
        except Exception as e:
            return {
                'valid': False,
                'message': f'Invalid URL format: {str(e)}'
            }
    
    def _check_error_phrases(self, content: str) -> Dict:
        """
        Check for error page indicators (404, access denied, etc.).
        
        Returns:
            Dictionary with validation result
        """
        content_lower = content.lower()
        
        for phrase in self.error_phrases:
            if phrase.lower() in content_lower:
                return {
                    'valid': False,
                    'message': f'Error phrase detected: "{phrase}"'
                }
        
        return {
            'valid': True,
            'message': 'No error phrases detected'
        }
    
    def _check_spam_keywords(self, content: str) -> Dict:
        """
        Check for spam or gambling keywords.
        
        Returns:
            Dictionary with validation result
        """
        content_lower = content.lower()
        
        for keyword in self.spam_keywords:
            if keyword.lower() in content_lower:
                return {
                    'valid': False,
                    'message': f'Spam keyword detected: "{keyword}"'
                }
        
        return {
            'valid': True,
            'message': 'No spam keywords detected'
        }
    
    def _check_title_caps(self, title: str) -> Dict:
        """
        Check if title is ALL CAPS (potential spam indicator).
        
        Returns:
            Dictionary with validation result
        """
        if not title:
            return {
                'valid': True,
                'message': 'No title to check'
            }
        
        # Check if title is more than 70% uppercase
        uppercase_count = sum(1 for c in title if c.isupper())
        total_chars = sum(1 for c in title if c.isalpha())
        
        if total_chars > 5 and uppercase_count / total_chars > 0.7:
            return {
                'valid': False,
                'message': 'Title is mostly uppercase (potential spam)'
            }
        
        return {
            'valid': True,
            'message': 'Title format is acceptable'
        }
    
    def _check_stub_page(self, content: str) -> Dict:
        """
        Check if page is a stub (placeholder) page.
        
        Returns:
            Dictionary with validation result
        """
        # Very short content is likely a stub
        if len(content.strip()) < 100:
            return {
                'valid': False,
                'message': 'Content too short (likely stub page)'
            }
        
        # Check for common stub indicators
        stub_indicators = [
            'this page is under construction',
            'more information coming soon',
            'content to be added',
            'placeholder',
            'article not found'
        ]
        
        content_lower = content.lower()
        for indicator in stub_indicators:
            if indicator in content_lower:
                return {
                    'valid': False,
                    'message': f'Stub page indicator: "{indicator}"'
                }
        
        return {
            'valid': True,
            'message': 'Page appears to have substantial content'
        }


def fetch_and_validate(url: str, config: Dict) -> Dict:
    """
    Fetch article from URL and validate it.
    
    Args:
        url: Article URL to fetch and validate
        config: Quality filter configuration
        
    Returns:
        Dictionary with validation result and article content (if valid)
    """
    try:
        # Fetch the page
        headers = {
            'User-Agent': config.get('scraper', {}).get('user_agent', 'Mozilla/5.0')
        }
        
        response = requests.get(
            url,
            headers=headers,
            timeout=config.get('scraper', {}).get('timeout', 30)
        )
        
        if response.status_code != 200:
            return {
                'valid': False,
                'reason': f'HTTP {response.status_code}',
                'url': url
            }
        
        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title with better selectors
        title = _extract_title(soup)
        
        # Extract content with better parsing
        content = _extract_content(soup)
        
        # Extract additional metadata
        author = _extract_author(soup)
        published_date = _extract_published_date(soup)
        image_url = _extract_image_url(soup)
        
        # Validate
        validator = ArticleValidator(config.get('quality_filter', {}))
        validation_result = validator.validate_article(content, url, title)
        
        if validation_result['valid']:
            return {
                'valid': True,
                'url': url,
                'title': title,
                'content': content,
                'author': author,
                'published_date': published_date.isoformat() if published_date else None,
                'image_url': image_url,
                'word_count': validation_result['word_count'],
                'validation': validation_result
            }
        else:
            return validation_result
            
    except Exception as e:
        return {
            'valid': False,
            'reason': f'Error fetching/parsing: {str(e)}',
            'url': url
        }


# Example usage
if __name__ == '__main__':
    import json
    
    # Load config
    with open('config.json', 'r') as f:
        config = json.load(f)
    
    # Test URLs
    test_urls = [
        'https://example.com/news/article1',
        'https://philstar.com/headlines/2024/test-article'
    ]
    
    for url in test_urls:
        print(f"\nTesting: {url}")
        result = fetch_and_validate(url, config)
        print(f"Valid: {result['valid']}")
        if not result['valid']:
            print(f"Reason: {result.get('reason', 'Unknown')}")
        else:
            print(f"Word count: {result['word_count']}")
