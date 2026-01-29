'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Clock, Newspaper } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface NewsCardProps {
  id: string
  title: string
  snippet: string
  imageUrl?: string
  publishedAt: Date
  sourceName: string
  categoryName: string
  originalUrl: string
  isSubscriber: boolean
  onAISynthesis?: (articleId: string) => void
  tags?: string[]
}

export function NewsCard({
  id,
  title,
  snippet,
  imageUrl,
  publishedAt,
  sourceName,
  categoryName,
  originalUrl,
  isSubscriber,
  onAISynthesis,
  tags
}: NewsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {imageUrl && (
          <div className="relative w-full aspect-video overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm">
              {categoryName}
            </Badge>
          </div>
        )}

        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Newspaper className="h-4 w-4" />
            <span className="font-medium">{sourceName}</span>
            <span>•</span>
            <Clock className="h-4 w-4" />
            <time dateTime={publishedAt.toISOString()}>
              {formatDistanceToNow(publishedAt, { addSuffix: true })}
            </time>
          </div>
          <h3 className="text-lg font-semibold leading-tight line-clamp-2">
            {title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {snippet}
          </p>
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map(tag => (
                <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 h-auto hover:bg-secondary/80 cursor-pointer">
                    {tag.replace(/-/g, ' ')}
                  </Badge>
                </Link>
              ))}
              {tags.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">+{tags.length - 4}</span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Read More
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>

          {isSubscriber && onAISynthesis && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onAISynthesis(id)}
            >
              AI Summary
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}
