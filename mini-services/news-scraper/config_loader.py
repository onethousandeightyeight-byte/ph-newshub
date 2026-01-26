"""
Configuration loader for PH-NewsHub scraper service.
"""

import json
from typing import List, Dict
from pathlib import Path


def load_config(config_path: str = 'config.json') -> Dict:
    """
    Load configuration from JSON file.
    
    Args:
        config_path: Path to config file
        
    Returns:
        Configuration dictionary
    """
    config_file = Path(config_path)
    
    if not config_file.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_file, 'r') as f:
        return json.load(f)


def get_trusted_domains(config: Dict = None) -> List[str]:
    """
    Get list of trusted domains from configuration.
    
    Args:
        config: Configuration dictionary (optional)
        
    Returns:
        List of trusted domain strings
    """
    if config is None:
        config = load_config()
    
    return [
        source['domain']
        for source in config.get('trusted_sources', [])
        if source.get('is_trusted', True)
    ]


def get_quality_filter_config(config: Dict = None) -> Dict:
    """
    Get quality filter configuration.
    
    Args:
        config: Configuration dictionary (optional)
        
    Returns:
        Quality filter settings dictionary
    """
    if config is None:
        config = load_config()
    
    return config.get('quality_filter', {})


def get_categories(config: Dict = None) -> Dict:
    """
    Get category configuration.
    
    Args:
        config: Configuration dictionary (optional)
        
    Returns:
        Dictionary of categories with their keywords
    """
    if config is None:
        config = load_config()
    
    return config.get('categories', {})


def classify_article(content: str, title: str, config: Dict = None) -> str:
    """
    Classify article into a category based on keywords.
    
    Args:
        content: Article content
        title: Article title
        config: Configuration dictionary (optional)
        
    Returns:
        Category slug (e.g., 'sports', 'politics')
    """
    if config is None:
        config = load_config()
    
    categories = get_categories(config)
    
    # Combine title and content for classification
    text = f"{title} {content}".lower()
    
    # Score each category based on keyword matches
    category_scores = {}
    for slug, category_config in categories.items():
        keywords = category_config.get('keywords', [])
        score = sum(1 for keyword in keywords if keyword.lower() in text)
        if score > 0:
            category_scores[slug] = score
    
    # Return category with highest score, or 'general' if no matches
    if category_scores:
        return max(category_scores, key=category_scores.get)
    
    return 'general'
