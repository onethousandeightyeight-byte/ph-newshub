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


# =============================================================================
# SOURCE-BASED CATEGORY EXTRACTION
# Maps category paths from Philippine news websites to our taxonomy slugs
# =============================================================================

SOURCE_CATEGORY_MAP = {
    # Rappler - rappler.com/{category}/{subcategory}/...
    'rappler.com': {
        # More specific paths first (longer matches take priority)
        'nation/elections': 'elections',
        'nation/weather': 'hurricanes-typhoons',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'sports/football': 'football-soccer',
        'sports/volleyball': 'team-sports',
        'business/markets': 'stocks',
        'business/economy': 'economy',
        'technology/features': 'consumer-tech',
        'technology/social-media': 'software-internet',
        'entertainment/movies': 'movies',
        'entertainment/music': 'music',
        'entertainment/celebrities': 'celebrity-gossip',
        'life-and-style/food': 'food-drink',
        'life-and-style/travel': 'travel',
        'life-and-style/health': 'health-medicine',
        # Main categories
        'nation': 'politics-government',
        'world': 'world-current-affairs',
        'sports': 'sports',
        'business': 'business-finance-economy',
        'technology': 'technology',
        'entertainment': 'arts-entertainment-culture',
        'life-and-style': 'lifestyle-leisure',
        'newsbreak': 'politics-government',
        'voices': 'opinion-editorial',
        'science': 'science',
        'environment': 'environment',
        'moveph': 'social-issues',
    },
    
    # GMA News - gmanetwork.com/news/{category}/...
    'gmanetwork.com': {
        'news/nation': 'politics-government',
        'news/regions': 'politics-government',
        'news/metro': 'politics-government',
        'news/world': 'world-current-affairs',
        'news/opinion': 'opinion-editorial',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'sports/volleyball': 'team-sports',
        'sports/football': 'football-soccer',
        'money/economy': 'economy',
        'money/personal-finance': 'personal-finance',
        'money/companies': 'corporate-business',
        'scitech/science': 'science',
        'scitech/technology': 'technology',
        'scitech/gadgets': 'consumer-tech',
        'showbiz': 'celebrity-gossip',
        'lifestyle/travel': 'travel',
        'lifestyle/food': 'food-drink',
        'lifestyle/health': 'health-medicine',
        'lifestyle/family': 'lifestyle-leisure',
        # Main categories
        'news': 'politics-government',
        'sports': 'sports',
        'money': 'business-finance-economy',
        'scitech': 'science-technology',
        'lifestyle': 'lifestyle-leisure',
        'pinoyabroad': 'world-current-affairs',
        'weather': 'hurricanes-typhoons',
    },
    
    # Inquirer - inquirer.net/{section}/...
    'inquirer.net': {
        'newsinfo/nation': 'politics-government',
        'newsinfo/metro': 'politics-government',
        'newsinfo/regions': 'politics-government',
        'newsinfo/world': 'world-current-affairs',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'sports/volleyball': 'team-sports',
        'sports/football': 'football-soccer',
        'business/economy': 'economy',
        'business/stocks': 'stocks',
        'business/finance': 'personal-finance',
        'entertainment/movies': 'movies',
        'entertainment/music': 'music',
        'entertainment/celebrities': 'celebrity-gossip',
        'lifestyle/travel': 'travel',
        'lifestyle/food': 'food-drink',
        'lifestyle/health': 'health-medicine',
        'technology/gadgets': 'consumer-tech',
        'technology/social-media': 'software-internet',
        # Main categories
        'newsinfo': 'politics-government',
        'news': 'politics-government',
        'sports': 'sports',
        'business': 'business-finance-economy',
        'entertainment': 'arts-entertainment-culture',
        'lifestyle': 'lifestyle-leisure',
        'technology': 'technology',
        'globalnation': 'world-current-affairs',
        'opinion': 'opinion-editorial',
        'pop': 'celebrity-gossip',
        'esports': 'sports',
    },
    
    # Philstar - philstar.com/{section}/...
    'philstar.com': {
        'headlines': 'politics-government',
        'nation': 'politics-government',
        'metro': 'politics-government',
        'world': 'world-current-affairs',
        'business/economy': 'economy',
        'business/stock': 'stocks',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'sports/football': 'football-soccer',
        'entertainment/movies': 'movies',
        'entertainment/music': 'music',
        'lifestyle/travel': 'travel',
        'lifestyle/food': 'food-drink',
        'lifestyle/health': 'health-medicine',
        # Main categories
        'business': 'business-finance-economy',
        'sports': 'sports',
        'entertainment': 'arts-entertainment-culture',
        'lifestyle': 'lifestyle-leisure',
        'opinion': 'opinion-editorial',
        'ngn': 'world-current-affairs',
        'pilipino-star-ngayon': 'politics-government',
    },
    
    # ABS-CBN News - news.abs-cbn.com/{category}/...
    'abs-cbn.com': {
        'news/nation': 'politics-government',
        'news/world': 'world-current-affairs',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'business/economy': 'economy',
        'business/companies': 'corporate-business',
        'entertainment/movies': 'movies',
        'entertainment/music': 'music',
        'life/travel': 'travel',
        'life/food': 'food-drink',
        'life/health': 'health-medicine',
        # Main categories
        'news': 'politics-government',
        'sports': 'sports',
        'business': 'business-finance-economy',
        'entertainment': 'arts-entertainment-culture',
        'life': 'lifestyle-leisure',
        'overseas': 'world-current-affairs',
        'spotlight': 'politics-government',
    },
    
    # Manila Bulletin - mb.com.ph/{section}/...
    'mb.com.ph': {
        'news/national': 'politics-government',
        'news/metro': 'politics-government',
        'news/world': 'world-current-affairs',
        'business/economy': 'economy',
        'business/finance': 'personal-finance',
        'sports/basketball': 'basketball',
        'sports/boxing': 'boxing',
        'entertainment/celebrity': 'celebrity-gossip',
        'lifestyle/travel': 'travel',
        'lifestyle/food': 'food-drink',
        'lifestyle/health': 'health-medicine',
        # Main categories
        'news': 'politics-government',
        'business': 'business-finance-economy',
        'sports': 'sports',
        'entertainment': 'arts-entertainment-culture',
        'lifestyle': 'lifestyle-leisure',
        'opinion': 'opinion-editorial',
        'technology': 'technology',
    },
    
    # Philippine News Agency - pna.gov.ph/articles/...
    'pna.gov.ph': {
        'politics': 'politics-government',
        'regions': 'politics-government',
        'economy': 'economy',
        'sports': 'sports',
        'science-and-technology': 'science-technology',
        'lifestyle': 'lifestyle-leisure',
        'feature': 'world-current-affairs',
    },
    
    # BusinessWorld Online - bworldonline.com/...
    'bworldonline.com': {
        'economy': 'economy',
        'banking-finance': 'personal-finance',
        'stock-market': 'stocks',
        'corporate': 'corporate-business',
        'world': 'world-current-affairs',
        'technology': 'technology',
        'opinion': 'opinion-editorial',
        'sports': 'sports',
        'lifestyle': 'lifestyle-leisure',
    },
}


def _extract_source_category(url: str, soup: BeautifulSoup) -> Optional[str]:
    """
    Extract category from source website's URL path or meta tags.
    Returns the raw category slug from the source (not mapped to our taxonomy).
    The scraper will create categories dynamically if they don't exist.
    """
    try:
        parsed_url = urlparse(url)
        path = parsed_url.path.lower().strip('/')
        path_parts = [p for p in path.split('/') if p]
        
        # Skip these common non-category path segments
        excluded = ['article', 'articles', 'news', 'story', 'stories', 'post', 'posts', 
                    'read', 'view', 'en', 'ph', 'www', 'amp', 'mobile', 'index']
        
        # Find the first meaningful category segment
        for part in path_parts:
            # Skip numeric IDs, dates, and excluded words
            if part.isdigit():
                continue
            if part in excluded:
                continue
            if len(part) < 3:
                continue
            # Skip if it looks like an article slug (many hyphenated words)
            if '-' in part and len(part.split('-')) > 4:
                continue
            # Skip date-like patterns (2024, 01, 29, etc.)
            if len(part) == 4 and part.isdigit():
                continue
            if len(part) == 2 and part.isdigit():
                continue
            
            # Found a category!
            return part
        
        # Fallback: Try extracting from meta tags
        section_meta = soup.select_one('meta[property="article:section"]')
        if section_meta and section_meta.get('content'):
            section = section_meta['content'].lower().strip().replace(' ', '-')
            if len(section) > 2:
                return section
        
        og_section = soup.select_one('meta[property="og:section"]')
        if og_section and og_section.get('content'):
            section = og_section['content'].lower().strip().replace(' ', '-')
            if len(section) > 2:
                return section
        
        return None
        
    except Exception as e:
        print(f"     [DEBUG] Error extracting source category: {e}")
        return None


def _determine_category(title: str, content: str) -> str:
    """
    Determine article category based on keywords in title and content.
    Uses hierarchical matching - most specific (leaf) categories are checked first,
    falling back to broader parent categories only if no specific match is found.
    """
    text_to_search = (title + " " + content).lower()

    # LEAF-LEVEL CATEGORIES (Level 3-4) - Most specific, checked first
    # These map to the deepest taxonomy levels
    leaf_categories = {
        # World & Current Affairs > International Relations
        'diplomacy': ['diplomacy', 'diplomatic', 'ambassador', 'embassy', 'consulate'],
        'summits': ['summit', 'g7', 'g20', 'asean summit', 'apec summit'],
        'treaties': ['treaty', 'accord', 'bilateral agreement', 'trade deal'],
        'foreign-aid': ['foreign aid', 'humanitarian aid', 'development assistance'],
        'sanctions': ['sanctions', 'embargo', 'trade restrictions'],
        'united-nations': ['united nations', 'un security council', 'unesco', 'unicef', 'who'],
        'nato': ['nato', 'north atlantic treaty'],
        
        # World & Current Affairs > Armed Conflict & War
        'civil-wars': ['civil war', 'insurgency', 'rebel', 'militia'],
        'peacekeeping': ['peacekeeping', 'peace talks', 'ceasefire', 'armistice'],
        'wmds': ['nuclear weapon', 'chemical weapon', 'biological weapon', 'wmd'],
        'refugees-displacement': ['refugee', 'displaced', 'asylum seeker', 'migrant crisis'],
        'war-crimes': ['war crime', 'genocide', 'ethnic cleansing', 'crimes against humanity'],
        'coups-detat': ['coup', 'military takeover', 'junta', 'overthrow'],
        
        # World & Current Affairs > Politics & Government > Elections
        'voting': ['voting', 'ballot', 'precinct', 'comelec', 'electoral'],
        'polling': ['poll', 'survey', 'approval rating', 'exit poll'],
        'campaign-finance': ['campaign finance', 'political donation', 'super pac'],
        'voter-fraud': ['voter fraud', 'election fraud', 'rigging', 'vote buying'],
        
        # World & Current Affairs > Politics & Government > Legislative
        'parliaments-congresses': ['congress', 'senate', 'house of representatives', 'parliament', 'lawmaker', 'senator', 'congressman'],
        'bills': ['bill', 'proposed law', 'legislation', 'house bill', 'senate bill'],
        'amendments': ['amendment', 'constitutional amendment'],
        'vetoes': ['veto', 'pocket veto'],
        
        # World & Current Affairs > Politics & Government > Executive
        'heads-of-state': ['president', 'prime minister', 'marcos', 'duterte', 'bongbong', 'bbm'],
        'cabinets': ['cabinet', 'secretary', 'department head', 'minister'],
        'executive-orders': ['executive order', 'presidential proclamation', 'administrative order'],
        
        # World & Current Affairs > Politics & Government > Judicial
        'supreme-courts': ['supreme court', 'chief justice', 'associate justice'],
        'constitutional-law': ['constitutional', 'constitution', 'charter change', 'cha-cha'],
        'nominations': ['judicial nomination', 'court appointment'],
        
        # World & Current Affairs > Disasters & Emergencies > Natural
        'earthquakes': ['earthquake', 'tremor', 'seismic', 'magnitude', 'phivolcs'],
        'hurricanes-typhoons': ['typhoon', 'hurricane', 'cyclone', 'storm signal', 'pagasa', 'super typhoon'],
        'floods': ['flood', 'flooding', 'flash flood', 'overflow'],
        'wildfires': ['wildfire', 'forest fire', 'bushfire'],
        'droughts': ['drought', 'water shortage', 'el nino', 'dry spell'],
        'tsunamis': ['tsunami', 'tidal wave'],
        
        # World & Current Affairs > Disasters & Emergencies > Man-made
        'industrial-accidents': ['industrial accident', 'factory explosion', 'chemical spill', 'oil spill'],
        'structural-failures': ['building collapse', 'bridge collapse', 'structural failure'],
        'transport-accidents': ['plane crash', 'train derailment', 'ship sinking', 'ferry accident', 'bus accident'],
        
        # Business, Finance & Economy > Economy
        'inflation': ['inflation', 'consumer price', 'cpi', 'price hike', 'cost of living'],
        'interest-rates': ['interest rate', 'bsp rate', 'lending rate', 'monetary policy'],
        'gdp': ['gdp', 'gross domestic product', 'economic growth', 'economic output'],
        'recession': ['recession', 'economic downturn', 'depression', 'economic crisis'],
        'unemployment-rates': ['unemployment', 'jobless', 'layoff', 'retrenchment'],
        'trade-deficits': ['trade deficit', 'trade surplus', 'trade balance', 'export', 'import'],
        'central-banks': ['central bank', 'bsp', 'bangko sentral', 'federal reserve'],
        
        # Business, Finance & Economy > Markets & Investing
        'stocks': ['stock', 'pse', 'psei', 'share price', 'equity', 'wall street', 'nasdaq', 'dow jones'],
        'bonds': ['bond', 'treasury', 'debt securities', 'fixed income'],
        'commodities': ['commodity', 'gold price', 'oil price', 'copper', 'nickel'],
        'mutual-funds': ['mutual fund', 'uitf', 'investment fund'],
        'ipos': ['ipo', 'initial public offering', 'stock listing'],
        'cryptocurrency-blockchain': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'nft', 'defi'],
        'forex': ['forex', 'peso dollar', 'exchange rate', 'currency'],
        
        # Business, Finance & Economy > Corporate Business
        'mergers-acquisitions': ['merger', 'acquisition', 'buyout', 'takeover'],
        'earnings-reports': ['earnings', 'quarterly report', 'financial results', 'profit', 'revenue'],
        'executive-changes': ['ceo', 'executive appointment', 'board of directors'],
        'startups-venture-capital': ['startup', 'venture capital', 'seed funding', 'series a', 'unicorn'],
        'bankruptcy': ['bankruptcy', 'insolvency', 'debt restructuring', 'chapter 11'],
        
        # Business, Finance & Economy > Personal Finance
        'real-estate-mortgages': ['mortgage', 'home loan', 'real estate', 'property prices', 'housing'],
        'taxes': ['tax', 'bir', 'income tax', 'vat', 'tax filing', 'tax evasion'],
        'retirement-pensions': ['retirement', 'pension', 'sss', 'gsis', '401k'],
        'credit-cards-debt': ['credit card', 'debt', 'loan', 'lending'],
        'insurance': ['insurance', 'life insurance', 'health insurance', 'philhealth'],
        
        # Business, Finance & Economy > Industries
        'automotive-industry': ['automotive industry', 'car sales', 'vehicle production'],
        'energy-industry': ['energy sector', 'oil company', 'power plant', 'meralco'],
        'retail-industry': ['retail', 'mall', 'sm', 'ayala malls', 'robinsons'],
        'manufacturing': ['manufacturing', 'factory', 'industrial production'],
        'logistics-supply-chain': ['logistics', 'supply chain', 'shipping', 'freight'],
        'agriculture': ['agriculture', 'farming', 'crop', 'harvest', 'rice', 'palay'],
        
        # Law, Crime & Justice > Crime
        'violent-crime': ['murder', 'homicide', 'assault', 'robbery', 'kidnapping', 'rape'],
        'financial-white-collar': ['fraud', 'embezzlement', 'money laundering', 'corruption', 'graft'],
        'cybercrime': ['cybercrime', 'hacking', 'phishing', 'ransomware', 'data breach'],
        'organized-crime': ['syndicate', 'cartel', 'mafia', 'gang', 'drug lord'],
        
        # Law, Crime & Justice > Law Enforcement
        'police-procedure': ['police', 'pnp', 'law enforcement', 'investigation'],
        'brutality-misconduct': ['police brutality', 'misconduct', 'abuse of power'],
        'surveillance': ['surveillance', 'wiretapping', 'cctv', 'monitoring'],
        'arrests': ['arrest', 'apprehension', 'warrant', 'detained'],
        
        # Law, Crime & Justice > Justice System
        'trials': ['trial', 'hearing', 'court case', 'prosecution'],
        'verdicts': ['verdict', 'guilty', 'acquittal', 'conviction'],
        'sentencing': ['sentence', 'imprisonment', 'life sentence', 'death penalty'],
        'prisons-corrections': ['prison', 'jail', 'inmate', 'bucor', 'bjmp'],
        'capital-punishment': ['death penalty', 'execution', 'lethal injection'],
        'civil-litigation': ['lawsuit', 'civil case', 'damages', 'settlement'],
        
        # Law, Crime & Justice > Terrorism
        'domestic-extremism': ['domestic terrorism', 'extremist', 'radical'],
        'international-terrorism': ['terrorist attack', 'isis', 'al-qaeda', 'bombing'],
        'counter-terrorism': ['counter-terrorism', 'anti-terrorism', 'atr'],
        
        # Science & Technology > Technology
        'consumer-tech': ['smartphone', 'iphone', 'samsung', 'gadget', 'tablet', 'laptop'],
        'software-internet': ['software', 'app', 'website', 'social media', 'facebook', 'tiktok', 'google'],
        'hardware': ['processor', 'chip', 'semiconductor', 'cpu', 'gpu', 'nvidia'],
        
        # Science & Technology > Science
        'space': ['space', 'nasa', 'rocket', 'satellite', 'astronaut', 'mars', 'moon'],
        'biology-genetics': ['biology', 'genetics', 'dna', 'gene', 'evolution', 'species'],
        'physics-chemistry': ['physics', 'chemistry', 'particle', 'quantum', 'element'],
        'environment': ['climate change', 'global warming', 'carbon', 'emissions', 'pollution', 'environmental'],
        
        # Health & Medicine > Public Health
        'pandemics-epidemics': ['pandemic', 'epidemic', 'outbreak', 'covid', 'coronavirus', 'mpox', 'monkeypox'],
        'vaccines': ['vaccine', 'vaccination', 'immunization', 'booster', 'pfizer', 'moderna'],
        'health-policy': ['health policy', 'doh', 'healthcare reform', 'universal health'],
        'obesity': ['obesity', 'overweight', 'weight loss'],
        
        # Health & Medicine > Medical Research
        'cancer-research': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'carcinoma'],
        'alzheimers-dementia': ['alzheimer', 'dementia', 'cognitive decline', 'memory loss'],
        'stem-cells': ['stem cell', 'regenerative medicine'],
        'clinical-trials': ['clinical trial', 'drug trial', 'fda approval'],
        
        # Health & Medicine > Mental Health
        'depression': ['depression', 'depressed', 'major depressive'],
        'anxiety': ['anxiety', 'panic attack', 'anxious'],
        'addiction': ['addiction', 'substance abuse', 'rehabilitation', 'rehab'],
        'therapy-psychology': ['therapy', 'psychologist', 'psychiatrist', 'counseling', 'mental health'],
        
        # Health & Medicine > Nutrition & Fitness
        'diets': ['diet', 'keto', 'intermittent fasting', 'weight loss'],
        'exercise-trends': ['exercise', 'workout', 'gym', 'fitness'],
        'supplements': ['supplement', 'vitamin', 'protein powder'],
        
        # Sports > Team Sports
        'football-soccer': ['football', 'soccer', 'fifa', 'premier league', 'la liga', 'champions league', 'azkals'],
        'basketball': ['basketball', 'nba', 'pba', 'gilas', 'uaap basketball', 'ncaa basketball', 'lakers', 'warriors'],
        'american-football': ['nfl', 'american football', 'super bowl', 'touchdown'],
        'baseball': ['baseball', 'mlb', 'home run'],
        'hockey': ['hockey', 'nhl', 'ice hockey'],
        'rugby': ['rugby', 'world rugby'],
        'cricket': ['cricket', 'ipl', 'test match'],
        
        # Sports > Individual Sports
        'tennis': ['tennis', 'wimbledon', 'us open', 'australian open', 'french open', 'nadal', 'djokovic'],
        'golf': ['golf', 'pga', 'masters', 'tiger woods'],
        'boxing': ['boxing', 'pacquiao', 'manny pacquiao', 'heavyweight', 'knockout', 'wbc', 'wba'],
        'mma-ufc': ['mma', 'ufc', 'mixed martial arts', 'brandon vera'],
        'motorsports': ['formula 1', 'f1', 'nascar', 'motogp', 'racing'],
        'athletics': ['athletics', 'track and field', 'marathon', 'olympics 100m'],
        'swimming': ['swimming', 'swimmer', 'olympic swimming'],
        
        # Sports > Events
        'olympics': ['olympic', 'olympics', 'tokyo 2020', 'paris 2024', 'olympic games'],
        'world-cup': ['world cup', 'fifa world cup'],
        'super-bowl': ['super bowl'],
        'wimbledon': ['wimbledon'],
        
        # Sports > Business of Sports
        'player-contracts': ['player contract', 'signing', 'trade', 'free agent'],
        'stadiums': ['stadium', 'arena', 'sports venue'],
        'sponsorships': ['sponsorship', 'endorsement', 'athlete endorsement'],
        'gambling-fantasy-sports': ['sports betting', 'fantasy sports', 'gambling'],
        
        # Arts, Entertainment & Culture > Movies
        'box-office': ['box office', 'opening weekend', 'blockbuster'],
        'movie-reviews': ['movie review', 'film review', 'film critique'],
        'movie-awards': ['oscar', 'academy awards', 'golden globe', 'best picture', 'best actor'],
        'film-festivals': ['film festival', 'cannes', 'venice film festival', 'sundance'],
        'streaming-services': ['netflix', 'disney+', 'hbo max', 'amazon prime video', 'streaming'],
        
        # Arts, Entertainment & Culture > Music
        'music-releases': ['album release', 'single release', 'new song', 'music video'],
        'concerts-festivals': ['concert', 'music festival', 'tour', 'live performance'],
        'music-awards': ['grammy', 'billboard', 'mtv awards', 'brit awards'],
        'music-genres': ['pop music', 'rock music', 'hip hop', 'k-pop', 'opm'],
        
        # Arts, Entertainment & Culture > Television
        'series-premieres': ['series premiere', 'new show', 'tv series', 'premiere'],
        'reality-tv': ['reality tv', 'reality show', 'survivor', 'big brother'],
        'late-night': ['late night', 'talk show', 'jimmy fallon', 'jimmy kimmel'],
        'tv-awards': ['emmy', 'emmy awards', 'tv award'],
        
        # Arts, Entertainment & Culture > Literature
        'book-reviews': ['book review', 'literary review'],
        'bestseller-lists': ['bestseller', 'best seller', 'nyt bestseller'],
        'authors': ['author', 'novelist', 'writer', 'book signing'],
        'poetry': ['poetry', 'poem', 'poet'],
        
        # Arts, Entertainment & Culture > Arts
        'visual-arts': ['painting', 'sculpture', 'art exhibit', 'gallery'],
        'performing-arts': ['theater', 'theatre', 'ballet', 'opera', 'broadway'],
        'museums-galleries': ['museum', 'gallery', 'exhibit', 'exhibition'],
        'auctions': ['art auction', 'sotheby', 'christie'],
        
        # Arts, Entertainment & Culture > Celebrity & Gossip
        'relationships': ['celebrity relationship', 'dating', 'engaged', 'wedding', 'divorce'],
        'scandals': ['scandal', 'controversy', 'affair'],
        'paparazzi': ['paparazzi', 'spotted', 'candid'],
        'influencers': ['influencer', 'content creator', 'youtuber', 'tiktoker', 'vlogger'],
        
        # Lifestyle & Leisure > Travel
        'airlines': ['airline', 'flight', 'airfare', 'philippine airlines', 'cebu pacific'],
        'hotels-resorts': ['hotel', 'resort', 'accommodation', 'booking'],
        'tourism': ['tourism', 'tourist', 'destination', 'vacation'],
        'passports-visas': ['passport', 'visa', 'travel document', 'immigration'],
        'cruises': ['cruise', 'cruise ship', 'ocean liner'],
        'adventure-travel': ['adventure travel', 'trekking', 'hiking', 'backpacking'],
        
        # Lifestyle & Leisure > Food & Drink
        'restaurants': ['restaurant', 'dining', 'eatery', 'cafe'],
        'recipes': ['recipe', 'cooking', 'how to cook'],
        'wine-spirits': ['wine', 'whiskey', 'cocktail', 'beer', 'brewery'],
        'food-safety': ['food safety', 'food poisoning', 'contamination'],
        'chefs': ['chef', 'culinary', 'celebrity chef'],
        
        # Lifestyle & Leisure > Fashion & Beauty
        'trends': ['fashion trend', 'style trend', 'trending'],
        'fashion-week': ['fashion week', 'runway', 'model', 'designer'],
        'cosmetics': ['makeup', 'cosmetics', 'skincare', 'beauty products'],
        'luxury-goods': ['luxury', 'designer bag', 'rolex', 'gucci', 'louis vuitton'],
        
        # Lifestyle & Leisure > Home & Garden
        'interior-design': ['interior design', 'home decor', 'furniture'],
        'real-estate-trends': ['real estate trend', 'property market', 'condo'],
        'diy-renovation': ['diy', 'renovation', 'home improvement'],
        'gardening': ['gardening', 'plants', 'landscaping'],
        
        # Lifestyle & Leisure > Automotive (Consumer)
        'car-reviews': ['car review', 'test drive', 'vehicle review'],
        'electric-vehicles': ['electric vehicle', 'ev', 'tesla', 'hybrid car'],
        'classic-cars': ['classic car', 'vintage car', 'collector car'],
        
        # Social Issues > Civil Rights
        'racial-justice': ['racial justice', 'racism', 'discrimination', 'racial equality'],
        'lgbtq-rights': ['lgbtq', 'gay rights', 'same-sex', 'pride', 'transgender'],
        'gender-equality': ['gender equality', 'feminism', 'women rights', 'metoo'],
        'disability-rights': ['disability rights', 'pwd', 'accessibility'],
        
        # Social Issues > Education
        'student-debt': ['student debt', 'student loan', 'tuition'],
        'k-12-policy': ['k-12', 'deped', 'elementary', 'high school', 'public school'],
        'higher-education': ['university', 'college', 'ched', 'state university'],
        'online-learning': ['online learning', 'e-learning', 'distance learning', 'modular'],
        
        # Social Issues > Religion & Faith
        'catholic-church': ['catholic', 'pope', 'vatican', 'bishop', 'cbcp'],
        'islam': ['islam', 'muslim', 'mosque', 'ramadan', 'eid'],
        'judaism': ['jewish', 'synagogue', 'rabbi'],
        'religious-holidays': ['christmas', 'easter', 'holy week', 'all saints'],
        'secularism': ['secular', 'separation of church and state'],
        
        # Social Issues > Labor
        'unions-strikes': ['union', 'strike', 'labor union', 'walkout', 'picket'],
        'minimum-wage': ['minimum wage', 'wage hike', 'salary increase'],
        'gig-economy': ['gig economy', 'freelance', 'grab', 'uber', 'delivery rider'],
        'remote-work': ['remote work', 'work from home', 'wfh', 'hybrid work'],
        
        # Opinion & Editorial
        'editorials': ['editorial', 'editor opinion'],
        'op-eds': ['op-ed', 'opinion piece', 'commentary'],
        'letters-to-editor': ['letter to editor', 'reader letter'],
        'cartoons': ['editorial cartoon', 'political cartoon'],
    }
    
    # PARENT-LEVEL CATEGORIES (Level 2) - Checked if no leaf match
    parent_categories = {
        # World & Current Affairs children
        'international-relations': ['diplomacy', 'foreign policy', 'bilateral', 'multilateral'],
        'armed-conflict-war': ['war', 'conflict', 'military', 'troops', 'soldier'],
        'politics-government': ['politics', 'government', 'political', 'administration'],
        'disasters-emergencies': ['disaster', 'emergency', 'calamity', 'rescue'],
        'natural-disasters': ['natural disaster', 'nature disaster'],
        'man-made-disasters': ['accident', 'disaster'],
        
        # Business children
        'economy': ['economy', 'economic', 'macroeconomic'],
        'markets-investing': ['market', 'investing', 'investment', 'investor'],
        'corporate-business': ['corporate', 'company', 'business', 'firm'],
        'personal-finance': ['personal finance', 'savings', 'budget'],
        'industries': ['industry', 'sector'],
        
        # Law children
        'crime': ['crime', 'criminal', 'illegal'],
        'law-enforcement': ['law enforcement', 'police'],
        'justice-system': ['justice', 'court', 'legal'],
        'terrorism': ['terror', 'terrorist'],
        
        # Science children
        'technology': ['technology', 'tech', 'digital', 'innovation'],
        'science': ['science', 'scientific', 'research', 'discovery'],
        
        # Health children
        'public-health': ['public health', 'doh', 'health department'],
        'medical-research': ['medical research', 'study', 'clinical'],
        'mental-health': ['mental health', 'psychological'],
        'nutrition-fitness': ['nutrition', 'fitness', 'health'],
        
        # Sports children
        'team-sports': ['team sport', 'league', 'championship'],
        'individual-sports': ['individual sport', 'athlete'],
        'sports-events': ['sports event', 'tournament', 'championship'],
        'business-of-sports': ['sports business', 'sports industry'],
        
        # Entertainment children
        'movies': ['movie', 'film', 'cinema', 'hollywood'],
        'music': ['music', 'song', 'singer', 'band', 'album'],
        'television': ['television', 'tv show', 'series'],
        'literature': ['book', 'novel', 'literature', 'reading'],
        'arts-culture': ['art', 'culture', 'cultural'],
        'celebrity-gossip': ['celebrity', 'showbiz', 'entertainment'],
        
        # Lifestyle children
        'travel': ['travel', 'trip', 'vacation', 'tourist'],
        'food-drink': ['food', 'drink', 'cuisine', 'dining'],
        'fashion-beauty': ['fashion', 'beauty', 'style'],
        'home-garden': ['home', 'house', 'garden'],
        'consumer-automotive': ['car', 'vehicle', 'automotive'],
        
        # Social children
        'civil-rights': ['civil rights', 'human rights', 'equality'],
        'education': ['education', 'school', 'student', 'teacher'],
        'religion-faith': ['religion', 'faith', 'church', 'spiritual'],
        'labor': ['labor', 'worker', 'employment', 'job'],
        
        # Opinion
        'opinion-editorial': ['opinion', 'editorial', 'commentary'],
    }
    
    # ROOT-LEVEL CATEGORIES (Level 1) - Fallback only
    root_categories = {
        'world-current-affairs': ['world', 'international', 'global', 'foreign', 'nation'],
        'business-finance-economy': ['business', 'finance', 'economy', 'money', 'peso'],
        'law-crime-justice': ['law', 'crime', 'justice', 'legal', 'court'],
        'science-technology': ['science', 'technology', 'tech'],
        'health-medicine': ['health', 'medicine', 'medical', 'hospital', 'doctor'],
        'sports': ['sports', 'athlete', 'game', 'match', 'player'],
        'arts-entertainment-culture': ['entertainment', 'showbiz', 'celebrity', 'star'],
        'lifestyle-leisure': ['lifestyle', 'leisure', 'living'],
        'social-issues': ['social', 'society', 'community', 'issue'],
    }
    
    # Check leaf categories first (most specific)
    for category, keywords in leaf_categories.items():
        if any(keyword in text_to_search for keyword in keywords):
            return category
    
    # Check parent categories next
    for category, keywords in parent_categories.items():
        if any(keyword in text_to_search for keyword in keywords):
            return category
    
    # Check root categories last
    for category, keywords in root_categories.items():
        if any(keyword in text_to_search for keyword in keywords):
            return category
    
    return 'world-current-affairs'  # Default fallback


class ArticleValidator:
    """
    Validates news articles against quality and trust criteria.
    Implements the "Rubbish Filter" logic.
    """

    def __init__(self, config: Dict):
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
        
        # Try to extract category from source website first (most accurate)
        category = _extract_source_category(url, soup)
        if category:
            print(f"     [INFO] Category from source: {category}")
        else:
            # Fallback to keyword-based categorization
            category = _determine_category(title, content)
            print(f"     [INFO] Category from keywords: {category}")

        # Validate
        validator = ArticleValidator(config.get('quality_filter', {}))
        validation_result = validator.validate_article(content, url, title)

        if validation_result['valid']:
            # Generate snippet from content (first 300 characters, ending at word boundary)
            snippet = content[:300].rsplit(' ', 1)[0] + '...' if len(content) > 300 else content
            
            return {
                'valid': True,
                'originalUrl': url,  # Changed from 'url' to match scraper.py
                'title': title,
                'snippet': snippet,  # Added snippet field for scraper.py
                'contentBody': content,  # Changed from 'content' to match scraper.py
                'author': author,
                'publishedAt': published_date.isoformat() if published_date else datetime.now().isoformat(),  # Changed from 'published_date'
                'imageUrl': image_url,  # Changed from 'image_url' to match scraper.py
                'category': category,
                'word_count': validation_result['word_count'],
                'validation': validation_result
            }
        else:
            # Add the title to the result for better logging
            validation_result['title'] = title
            return validation_result

    except requests.exceptions.RequestException as e:
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
