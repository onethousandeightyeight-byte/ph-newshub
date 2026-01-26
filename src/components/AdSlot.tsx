'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

interface AdSlotProps {
  clientName: string
  targetUrl: string
  imageUrl: string
  altText?: string
}

export function AdSlot({
  clientName,
  targetUrl,
  imageUrl,
  altText = `Sponsored by ${clientName}`
}: AdSlotProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-primary/10">
        <CardContent className="p-0 h-full">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block h-full relative group"
          >
            <div className="relative w-full aspect-video overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt={altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <Badge className="absolute top-3 right-3 bg-secondary/90 backdrop-blur-sm">
                Sponsored
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Advertisement
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {clientName}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Learn More
              </Button>
            </div>
          </a>
        </CardContent>
      </Card>
    </motion.div>
  )
}
