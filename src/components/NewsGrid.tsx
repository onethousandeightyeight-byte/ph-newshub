'use client'

import { useState, useEffect } from 'react'
import { NewsCard } from './NewsCard'
import { AdSlot } from './AdSlot'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export type FeedItem =
  | { type: 'article'; data: any }
  | { type: 'ad'; data: any }

interface NewsGridProps {
  items: FeedItem[]
  isSubscriber: boolean
  isLoading?: boolean
  error?: string | null
  onAISynthesis?: (articleId: string) => void
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

export function NewsGrid({
  items,
  isSubscriber,
  isLoading = false,
  error = null,
  onAISynthesis,
  columns = { mobile: 1, tablet: 2, desktop: 3 }
}: NewsGridProps) {
  const [gridColumns, setGridColumns] = useState(columns.mobile)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setGridColumns(columns.desktop)
      } else if (window.innerWidth >= 768) {
        setGridColumns(columns.tablet)
      } else {
        setGridColumns(columns.mobile)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [columns])

  // Distribute items across columns for masonry layout
  const distributeItems = (items: FeedItem[], numColumns: number) => {
    const columnsArray: FeedItem[][] = Array.from({ length: numColumns }, () => [])
    items.forEach((item, index) => {
      columnsArray[index % numColumns].push(item)
    })
    return columnsArray
  }

  const columnsItems = distributeItems(items, gridColumns)

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div
        className={`grid gap-6 grid-cols-${gridColumns}`}
        style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="w-full aspect-video rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No articles found. Check back later for the latest news.
        </p>
      </div>
    )
  }

  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
    >
      {columnsItems.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-6">
          {columnItems.map((item, itemIndex) => (
            <div key={`${item.type}-${columnIndex}-${itemIndex}`}>
              {item.type === 'article' ? (
                <NewsCard
                  id={item.data.id}
                  title={item.data.title}
                  snippet={item.data.snippet}
                  imageUrl={item.data.imageUrl}
                  publishedAt={item.data.publishedAt ? new Date(item.data.publishedAt) : new Date()}
                  sourceName={item.data.sourceName}
                  categoryName={item.data.categoryName}
                  originalUrl={item.data.originalUrl}
                  isSubscriber={isSubscriber}
                  onAISynthesis={onAISynthesis}
                />
              ) : (
                <AdSlot
                  clientName={item.data.clientName}
                  targetUrl={item.data.targetUrl}
                  imageUrl={item.data.imageAsset}
                  altText={item.data.altText}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
