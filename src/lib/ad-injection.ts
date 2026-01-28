/**
 * Ad Injection Utility for PH-NewsHub
 * 
 * This utility injects native advertisements into the news feed
 * at specified intervals while maintaining the visual flow.
 */

import type { FeedItem } from '@/components/NewsGrid'

export interface AdData {
  clientName: string
  targetUrl: string
  imageAsset: string
  altText?: string
}

export interface AdPlacementConfig {
  interval: number // Number of articles between ads (e.g., 6 for every 6th item)
  startAfter?: number // Number of articles before first ad (default: 0)
  maxAds?: number // Maximum number of ads to inject (default: unlimited)
}

/**
 * Injects advertisements into a feed of articles
 * 
 * @param articles - Array of article objects
 * @param ads - Array of ad objects to inject
 * @param config - Configuration for ad placement
 * @returns Combined array of articles and ads as FeedItem[]
 * 
 * @example
 * ```ts
 * const feed = injectAds(articles, availableAds, {
 *   interval: 6,
 *   startAfter: 3,
 *   maxAds: 3
 * })
 * ```
 */
export function injectAds(
  articles: any[],
  ads: AdData[],
  config: AdPlacementConfig = { interval: 6 }
): FeedItem[] {
  // Defensive check: ensure articles is an array
  if (!Array.isArray(articles)) {
    console.error('injectAds: articles is not an array', articles)
    return []
  }

  const {
    interval,
    startAfter = 0,
    maxAds = Infinity
  } = config

  if (!Array.isArray(ads) || ads.length === 0 || interval <= 0) {
    return articles.map(article => ({ type: 'article' as const, data: article }))
  }

  const feed: FeedItem[] = []
  let adIndex = 0
  let adsInjected = 0

  articles.forEach((article, index) => {
    // Add article to feed
    feed.push({ type: 'article', data: article })

    // Check if we should inject an ad after this article
    const shouldInjectAd =
      (index + 1) % interval === 0 && // At the right interval
      (index + 1) > startAfter && // After the start offset
      adsInjected < maxAds && // Under the max limit
      adIndex < ads.length // Still have ads available

    if (shouldInjectAd) {
      // Use ads cyclically
      const adData = ads[adIndex % ads.length]
      feed.push({ type: 'ad', data: adData })
      adIndex++
      adsInjected++
    }
  })

  return feed
}

/**
 * Removes all ads from a feed
 * Used for subscriber (ad-free) experience
 * 
 * @param feed - Combined feed of articles and ads
 * @returns Array of article objects only
 */
export function stripAds(feed: FeedItem[]): any[] {
  return feed
    .filter(item => item.type === 'article')
    .map(item => item.data)
}

/**
 * Validates ad data structure
 * Ensures required fields are present and valid
 */
export function validateAdData(ad: AdData): boolean {
  return !!(
    ad.clientName &&
    ad.targetUrl &&
    ad.imageAsset &&
    typeof ad.clientName === 'string' &&
    typeof ad.targetUrl === 'string' &&
    typeof ad.imageAsset === 'string'
  )
}

/**
 * Creates a mock ad for development/testing
 * 
 * @param index - Index for generating unique mock data
 * @returns Mock ad data object
 */
export function createMockAd(index: number): AdData {
  return {
    clientName: `Brand ${index + 1}`,
    targetUrl: `https://example.com/ad/${index + 1}`,
    imageAsset: '/placeholder-ad.jpg',
    altText: `Sponsored advertisement from Brand ${index + 1}`
  }
}

/**
 * Default ad placement configuration
 * Adjust based on user feedback and analytics
 */
export const DEFAULT_AD_CONFIG: AdPlacementConfig = {
  interval: 6,
  startAfter: 3,
  maxAds: 5
}

/**
 * Example usage in an API route:
 * 
 * ```ts
 * import { db } from '@/lib/db'
 * import { injectAds, DEFAULT_AD_CONFIG } from '@/lib/ad-injection'
 * 
 * export async function GET(request: Request) {
 *   const articles = await db.article.findMany({
 *     orderBy: { publishedAt: 'desc' }
 *   })
 * 
 *   const ads = await db.adPlacement.findMany({
 *     where: { isActive: true }
 *   })
 * 
 *   const feed = injectAds(articles, ads, DEFAULT_AD_CONFIG)
 * 
 *   return Response.json(feed)
 * }
 * ```
 */
