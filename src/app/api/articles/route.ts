import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { injectAds, DEFAULT_AD_CONFIG } from '@/lib/ad-injection'

/**
 * GET /api/articles
 * 
 * Query Parameters:
 * - category: Filter by category slug (optional)
 * - limit: Number of articles to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * - includeAds: Whether to include ads in response (default: true)
 * 
 * Example:
 * GET /api/articles?category=sports&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categorySlug = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeAds = searchParams.get('includeAds') !== 'false'

    // Build query filters
    const where: any = {}
    
    if (categorySlug && categorySlug !== 'all') {
      // Find category by slug
      const category = await db.category.findUnique({
        where: { slug: categorySlug }
      })
      
      if (category) {
        where.categoryId = category.id
      }
    }

    // Fetch articles with related data
    const articles = await db.article.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { publishedAt: 'desc' },
      include: {
        category: {
          select: { name: true, slug: true }
        },
        source: {
          select: { name: true, domainUrl: true }
        }
      }
    })

    // Transform articles to feed format
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.title,
      snippet: article.snippet,
      contentBody: article.contentBody,
      wordCount: article.wordCount,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      sourceName: article.source.name,
      categoryName: article.category.name,
      categorySlug: article.category.slug,
      originalUrl: article.originalUrl
    }))

    // Inject ads if requested
    let response
    if (includeAds) {
      // Fetch active ads
      const ads = await db.adPlacement.findMany({
        where: { isActive: true },
        orderBy: { position: 'asc' }
      })

      const formattedAds = ads.map(ad => ({
        clientName: ad.clientName,
        targetUrl: ad.targetUrl,
        imageAsset: ad.imageAsset,
        altText: ad.altText
      }))

      const feed = injectAds(formattedArticles, formattedAds, DEFAULT_AD_CONFIG)
      response = {
        feed,
        total: await db.article.count({ where }),
        hasMore: formattedArticles.length === limit
      }
    } else {
      response = {
        feed: formattedArticles.map(article => ({ type: 'article' as const, data: article })),
        total: await db.article.count({ where }),
        hasMore: formattedArticles.length === limit
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/articles
 * 
 * Create a new article (admin only)
 * This endpoint would typically be called by the scraper service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      title,
      snippet,
      contentBody,
      originalUrl,
      publishedAt,
      imageUrl,
      categoryId,
      sourceDomain
    } = body

    // Validate required fields
    if (!title || !snippet || !contentBody || !originalUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate word count
    const wordCount = contentBody.split(/\s+/).length

    // Find or create source
    let source = await db.source.findUnique({
      where: { domainUrl: sourceDomain }
    })

    if (!source) {
      source = await db.source.create({
        data: {
          domainUrl: sourceDomain,
          name: new URL(sourceDomain).hostname,
          isTrusted: false
        }
      })
    }

    // Create article
    const article = await db.article.create({
      data: {
        title,
        snippet,
        contentBody,
        originalUrl,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        imageUrl,
        wordCount,
        categoryId,
        sourceId: source.id
      },
      include: {
        category: true,
        source: true
      }
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}
