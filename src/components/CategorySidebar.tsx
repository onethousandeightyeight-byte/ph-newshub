'use client'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react'
import { useState } from 'react'

export interface Category {
  id: string
  name: string
  slug: string
  children?: Category[]
  count?: number
}

interface CategorySidebarProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (slug: string) => void
}

interface CategoryItemProps {
  category: Category
  level: number
  selectedCategory: string
  onCategoryChange: (slug: string) => void
}

function CategoryItem({ category, level, selectedCategory, onCategoryChange }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = category.children && category.children.length > 0
  const isSelected = selectedCategory === category.slug

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded)
          } else {
            onCategoryChange(category.slug)
          }
        }}
        className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 hover:bg-muted/80 flex items-center gap-2 ${
          isSelected ? 'bg-primary text-primary-foreground' : ''
        }`}
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 opacity-70" />
        )}
        
        <span className="flex-1 truncate">{category.name}</span>
        
        <Badge
          variant={isSelected ? 'secondary' : 'outline'}
          className="text-xs font-normal"
        >
          {category.count || 0}
        </Badge>
      </button>
      
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-0.5">
          {category.children?.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategorySidebar({ categories, selectedCategory, onCategoryChange }: CategorySidebarProps) {
  return (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Browse Topics
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              level={0}
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/30">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-2">Statistics</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Total Categories:</span>
              <span className="font-semibold">{categories.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Articles:</span>
              <span className="font-semibold">{categories.reduce((sum, cat) => sum + (cat.count || 0), 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
