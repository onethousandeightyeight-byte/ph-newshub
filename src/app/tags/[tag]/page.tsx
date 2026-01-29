'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NewsGrid, type FeedItem } from '@/components/NewsGrid'
import { injectAds, createMockAd, type AdData } from '@/lib/ad-injection'
import { ArrowLeft } from 'lucide-react'

// Mock ads (reused)
const MOCK_ADS: AdData[] = Array.from({ length: 4 }, (_, i) => createMockAd(i))

interface APIArticle {
    id: string
    title: string
    snippet: string
    imageUrl: string | null
    publishedAt: string
    originalUrl: string
    source: {
        name: string
        domain: string
    }
    category: {
        name: string
        slug: string
    }
    tags: string[]
}

export default function TagPage() {
    const params = useParams()
    // Tag from URL might be encoded
    const tagSlug = params.tag as string
    const tagName = decodeURIComponent(tagSlug).replace(/-/g, ' ') // Display name

    const [articles, setArticles] = useState<APIArticle[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubscriber, setIsSubscriber] = useState(false) // Simplified for this view

    useEffect(() => {
        const fetchArticles = async () => {
            setIsLoading(true)
            try {
                // Fetch articles filtered by this tag
                const res = await fetch(`/api/articles?tag=${encodeURIComponent(tagSlug)}&limit=50&includeAds=false`)

                if (res.ok) {
                    const data = await res.json()
                    if (Array.isArray(data)) {
                        setArticles(data)
                    }
                }
            } catch (e) {
                console.error('Error fetching tag articles:', e)
            } finally {
                setIsLoading(false)
            }
        }

        if (tagSlug) {
            fetchArticles()
        }
    }, [tagSlug])

    // Flatten for grid
    const flattenedArticles = articles.map(article => ({
        ...article,
        sourceName: article.source.name,
        categoryName: article.category.name
    }))

    // Inject ads
    const feed: FeedItem[] = isSubscriber
        ? flattenedArticles.map(a => ({ type: 'article' as const, data: a }))
        : injectAds(flattenedArticles, MOCK_ADS, { interval: 6, startAfter: 3 })

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to All News
                        </Link>
                    </Button>

                    <h1 className="text-3xl font-bold mb-2">
                        Topic: <span className="text-primary capitalize">{tagName}</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Found {articles.length} articles related to "{tagName}"
                    </p>
                </div>

                <NewsGrid
                    items={feed}
                    isSubscriber={isSubscriber}
                    isLoading={isLoading}
                    columns={{ mobile: 1, tablet: 2, desktop: 3 }}
                />
            </div>
        </div>
    )
}
