'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NewsGrid, type FeedItem } from '@/components/NewsGrid'
import { CategorySidebar, type Category } from '@/components/CategorySidebar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Search, Menu, Newspaper, User, Lock, Crown, Filter } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { injectAds, createMockAd, type AdData } from '@/lib/ad-injection'

// Extensive Taxonomy with Nested Categories
const TAXONOMY: Category[] = [
  {
    id: 'all',
    name: 'All News',
    slug: 'all',
    children: undefined,
    count: 50 // Will be calculated dynamically
  },
  {
    id: 'sports',
    name: 'Sports',
    slug: 'sports',
    children: [
      {
        id: 'sports-basketball',
        name: 'Basketball',
        slug: 'sports-basketball',
        children: [
          { id: 'sports-basketball-pba', name: 'PBA', slug: 'sports-basketball-pba' },
          { id: 'sports-basketball-nba', name: 'NBA', slug: 'sports-basketball-nba' },
          { id: 'sports-basketball-uaap', name: 'UAAP', slug: 'sports-basketball-uaap' },
          { id: 'sports-basketball-ncaa', name: 'NCAA', slug: 'sports-basketball-ncaa' }
        ]
      },
      {
        id: 'sports-football',
        name: 'Football',
        slug: 'sports-football',
        children: [
          { id: 'sports-football-azkals', name: 'Azkals', slug: 'sports-football-azkals' },
          { id: 'sports-football-intl', name: 'International', slug: 'sports-football-intl' }
        ]
      },
      {
        id: 'sports-boxing',
        name: 'Boxing',
        slug: 'sports-boxing',
        children: [
          { id: 'sports-boxing-pacquiao', name: 'Pacquiao', slug: 'sports-boxing-pacquiao' },
          { id: 'sports-boxing-local', name: 'Local Boxing', slug: 'sports-boxing-local' }
        ]
      },
      {
        id: 'sports-volleyball',
        name: 'Volleyball',
        slug: 'sports-volleyball',
        children: [
          { id: 'sports-volleyball-pvl', name: 'PVL', slug: 'sports-volleyball-pvl' },
          { id: 'sports-volleyball-uaap', name: 'UAAP Volleyball', slug: 'sports-volleyball-uaap' }
        ]
      },
      {
        id: 'sports-tennis',
        name: 'Tennis',
        slug: 'sports-tennis',
        children: undefined
      },
      {
        id: 'sports-golf',
        name: 'Golf',
        slug: 'sports-golf',
        children: [
          { id: 'sports-golf-local', name: 'Local Golf', slug: 'sports-golf-local' },
          { id: 'sports-golf-intl', name: 'International', slug: 'sports-golf-intl' }
        ]
      },
      {
        id: 'sports-athletics',
        name: 'Athletics',
        slug: 'sports-athletics',
        children: [
          { id: 'sports-athletics-olympics', name: 'Olympics', slug: 'sports-athletics-olympics' },
          { id: 'sports-athletics-sea', name: 'SEA Games', slug: 'sports-athletics-sea' }
        ]
      }
    ]
  },
  {
    id: 'politics',
    name: 'Politics & Government',
    slug: 'politics',
    children: [
      {
        id: 'politics-national',
        name: 'National Government',
        slug: 'politics-national',
        children: [
          { id: 'politics-presidency', name: 'Presidency', slug: 'politics-presidency' },
          { id: 'politics-cabinet', name: 'Cabinet', slug: 'politics-cabinet' }
        ]
      },
      {
        id: 'politics-congress',
        name: 'Congress',
        slug: 'politics-congress',
        children: [
          { id: 'politics-senate', name: 'Senate', slug: 'politics-senate' },
          { id: 'politics-house', name: 'House of Representatives', slug: 'politics-house' }
        ]
      },
      {
        id: 'politics-local',
        name: 'Local Government',
        slug: 'politics-local',
        children: [
          { id: 'politics-lgu', name: 'LGUs', slug: 'politics-lgu' },
          { id: 'politics-bbl', name: 'Barangay', slug: 'politics-bbl' }
        ]
      },
      {
        id: 'politics-elections',
        name: 'Elections',
        slug: 'politics-elections',
        children: [
          { id: 'politics-national-elections', name: 'National Elections', slug: 'politics-national-elections' },
          { id: 'politics-local-elections', name: 'Local Elections', slug: 'politics-local-elections' }
        ]
      }
    ]
  },
  {
    id: 'business',
    name: 'Business & Economy',
    slug: 'business',
    children: [
      {
        id: 'business-market',
        name: 'Market & Stocks',
        slug: 'business-market',
        children: [
          { id: 'business-psei', name: 'PSEi', slug: 'business-psei' },
          { id: 'business-ph-bonds', name: 'Philippine Bonds', slug: 'business-ph-bonds' }
        ]
      },
      {
        id: 'business-banking',
        name: 'Banking & Finance',
        slug: 'business-banking',
        children: [
          { id: 'business-banks', name: 'Banks', slug: 'business-banks' },
          { id: 'business-insurance', name: 'Insurance', slug: 'business-insurance' }
        ]
      },
      {
        id: 'business-realestate',
        name: 'Real Estate',
        slug: 'business-realestate',
        children: [
          { id: 'business-condo', name: 'Condominiums', slug: 'business-condo' },
          { id: 'business-housing', name: 'Housing', slug: 'business-housing' }
        ]
      },
      {
        id: 'business-startup',
        name: 'Startups & Tech',
        slug: 'business-startup',
        children: [
          { id: 'business-vc', name: 'Venture Capital', slug: 'business-vc' },
          { id: 'business-incubator', name: 'Incubators', slug: 'business-incubator' }
        ]
      },
      {
        id: 'business-trade',
        name: 'Trade & Exports',
        slug: 'business-trade',
        children: [
          { id: 'business-exports', name: 'Exports', slug: 'business-exports' },
          { id: 'business-imports', name: 'Imports', slug: 'business-imports' }
        ]
      }
    ]
  },
  {
    id: 'technology',
    name: 'Technology',
    slug: 'technology',
    children: [
      {
        id: 'tech-ai',
        name: 'AI & Innovation',
        slug: 'tech-ai',
        children: undefined
      },
      {
        id: 'tech-telecom',
        name: 'Telecommunications',
        slug: 'tech-telecom',
        children: [
          { id: 'tech-mobile', name: 'Mobile', slug: 'tech-mobile' },
          { id: 'tech-internet', name: 'Internet', slug: 'tech-internet' }
        ]
      },
      {
        id: 'tech-ecommerce',
        name: 'E-commerce',
        slug: 'tech-ecommerce',
        children: [
          { id: 'tech-shopee', name: 'Shopee', slug: 'tech-shopee' },
          { id: 'tech-lazada', name: 'Lazada', slug: 'tech-lazada' }
        ]
      },
      {
        id: 'tech-gaming',
        name: 'Gaming',
        slug: 'tech-gaming',
        children: [
          { id: 'tech-mobilegames', name: 'Mobile Games', slug: 'tech-mobilegames' },
          { id: 'tech-pcgames', name: 'PC Games', slug: 'tech-pcgames' },
          { id: 'tech-esports', name: 'Esports', slug: 'tech-esports' }
        ]
      }
    ]
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    slug: 'entertainment',
    children: [
      {
        id: 'ent-movies',
        name: 'Movies & TV',
        slug: 'ent-movies',
        children: [
          { id: 'ent-local-film', name: 'Local Cinema', slug: 'ent-local-film' },
          { id: 'ent-intl-film', name: 'International', slug: 'ent-intl-film' },
          { id: 'ent-streaming', name: 'Streaming', slug: 'ent-streaming' }
        ]
      },
      {
        id: 'ent-music',
        name: 'Music',
        slug: 'ent-music',
        children: [
          { id: 'ent-opm', name: 'OPM', slug: 'ent-opm' },
          { id: 'ent-concerts', name: 'Concerts', slug: 'ent-concerts' }
        ]
      },
      {
        id: 'ent-celebs',
        name: 'Celebrities',
        slug: 'ent-celebs',
        children: undefined
      },
      {
        id: 'ent-arts',
        name: 'Arts & Culture',
        slug: 'ent-arts',
        children: [
          { id: 'ent-art', name: 'Visual Arts', slug: 'ent-art' },
          { id: 'ent-theater', name: 'Theater', slug: 'ent-theater' }
        ]
      }
    ]
  },
  {
    id: 'news',
    name: 'News & Current Events',
    slug: 'news',
    children: [
      {
        id: 'news-weather',
        name: 'Weather',
        slug: 'news-weather',
        children: [
          { id: 'news-typhoons', name: 'Typhoons', slug: 'news-typhoons' },
          { id: 'news-floods', name: 'Floods', slug: 'news-floods' }
        ]
      },
      {
        id: 'news-crime',
        name: 'Crime & Justice',
        slug: 'news-crime',
        children: [
          { id: 'news-crime-local', name: 'Local Crime', slug: 'news-crime-local' },
          { id: 'news-courts', name: 'Courts', slug: 'news-courts' }
        ]
      },
      {
        id: 'news-health',
        name: 'Health',
        slug: 'news-health',
        children: [
          { id: 'news-doh', name: 'DOH Updates', slug: 'news-doh' },
          { id: 'news-disease', name: 'Disease Outbreaks', slug: 'news-disease' }
        ]
      },
      {
        id: 'news-education',
        name: 'Education',
        slug: 'news-education',
        children: [
          { id: 'news-deped', name: 'DepEd', slug: 'news-deped' },
          { id: 'news-ched', name: 'CHED', slug: 'news-ched' }
        ]
      }
    ]
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    slug: 'lifestyle',
    children: [
      {
        id: 'life-food',
        name: 'Food & Dining',
        slug: 'life-food',
        children: [
          { id: 'life-restaurants', name: 'Restaurants', slug: 'life-restaurants' },
          { id: 'life-streetfood', name: 'Street Food', slug: 'life-streetfood' }
        ]
      },
      {
        id: 'life-travel',
        name: 'Travel',
        slug: 'life-travel',
        children: [
          { id: 'life-local-travel', name: 'Local Destinations', slug: 'life-local-travel' },
          { id: 'life-intl-travel', name: 'International', slug: 'life-intl-travel' }
        ]
      },
      {
        id: 'life-auto',
        name: 'Automotive',
        slug: 'life-auto',
        children: [
          { id: 'life-cars', name: 'Cars', slug: 'life-cars' },
          { id: 'life-motorcycles', name: 'Motorcycles', slug: 'life-motorcycles' }
        ]
      },
      {
        id: 'life-fashion',
        name: 'Fashion & Beauty',
        slug: 'life-fashion',
        children: [
          { id: 'life-fashion-local', name: 'Local Brands', slug: 'life-fashion-local' },
          { id: 'life-beauty', name: 'Beauty', slug: 'life-beauty' }
        ]
      }
    ]
  }
]

// Mock ads
const MOCK_ADS: AdData[] = Array.from({ length: 4 }, (_, i) => createMockAd(i))

// Interface matching the API response
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
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [articles, setArticles] = useState<APIArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarCategories, setSidebarCategories] = useState<Category[]>([])
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    const initData = async () => {
      try {
        const [catsRes, artsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/articles?limit=200&includeAds=false') // includeAds=false to get raw array
        ])

        let totalArticles = 0
        if (artsRes.ok) {
          const arts = await artsRes.json()
          // Validate that arts is an array before using
          if (Array.isArray(arts)) {
            setArticles(arts)
            totalArticles = arts.length
          } else {
            console.error('Articles API returned non-array response:', arts)
            setArticles([])
          }
        }

        if (catsRes.ok) {
          const cats = await catsRes.json()
          // Validate that cats is an array before processing
          if (Array.isArray(cats)) {
            // We need to get the total from the API, but for now we'll sum up what we have
            const calculatedTotal = cats.reduce((sum: number, cat: Category) => sum + (cat.count || 0), 0)

            setSidebarCategories([
              { id: 'all', name: 'All News', slug: 'all', count: calculatedTotal },
              ...cats
            ])
          } else {
            console.error('Categories API returned non-array response:', cats)
            // Use fallback TAXONOMY if API returns invalid data
            setSidebarCategories(TAXONOMY)
          }
        } else {
          // Fall back to hardcoded TAXONOMY if API fails
          console.error('Failed to fetch categories, using fallback')
          setSidebarCategories(TAXONOMY)
        }
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    initData()
  }, [])

  // Filter articles based on category
  const filteredArticles = articles.filter(article => {
    if (selectedCategory === 'all') return true
    const articleSlug = article.category?.slug || ''
    return articleSlug === selectedCategory || articleSlug.startsWith(selectedCategory + '-')
  })

  // Filter based on search query
  const matchesSearch = filteredArticles.filter(article => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return article.title.toLowerCase().includes(q) ||
      article.snippet.toLowerCase().includes(q)
  })

  // Map to flattened article data for UI
  const flattenedArticles = matchesSearch.map(article => ({
    ...article,
    sourceName: article.source.name,
    categoryName: article.category.name
  }))

  // Inject ads for non-subscribers
  const feed: FeedItem[] = isSubscriber
    ? flattenedArticles.map(a => ({ type: 'article' as const, data: a }))
    : injectAds(flattenedArticles, MOCK_ADS, { interval: 6, startAfter: 3 })


  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug)
    setIsMobileMenuOpen(false)
  }

  const handleSubscribe = () => {
    setIsSubscriber(true)
  }

  const handleAISynthesis = async (articleId: string) => {
    if (!isSubscriber) {
      alert('AI Summary is a subscriber-only feature. Please subscribe to access.')
      return
    }

    try {
      const response = await fetch(`/api/articles/${articleId}/summary`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      alert(`AI Summary (1-min read):\n\n${data.summary}\n\nKey Points:\n${data.keyPoints.map((p: string) => `• ${p}`).join('\n')}`)
    } catch (error) {
      console.error('Error generating AI summary:', error)
      alert('Failed to generate AI summary. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left side - Logo and Toggle */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="hidden lg:flex"
              >
                <Filter className="h-5 w-5" />
              </Button>

              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-hidden">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Browse Topics</SheetTitle>
                  </SheetHeader>
                  <CategorySidebar
                    categories={sidebarCategories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                  />
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <Newspaper className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold hidden sm:block">PH-NewsHub</h1>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isSubscriber ? (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Subscriber
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSubscribe}>
                  <Lock className="h-4 w-4 mr-2" />
                  Subscribe
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <aside className="hidden lg:block w-80 flex-shrink-0 overflow-hidden">
            <CategorySidebar
              categories={sidebarCategories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-3xl font-bold">
                  {selectedCategory === 'all' ? 'Latest News' : selectedCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' > ')}
                </h2>
                <Badge variant="outline">
                  {matchesSearch.length} articles
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Curated news from trusted Philippine sources
              </p>
            </div>

            <NewsGrid
              items={feed}
              isSubscriber={isSubscriber}
              isLoading={isLoading}
              onAISynthesis={handleAISynthesis}
              columns={{ mobile: 1, tablet: 2, desktop: 2 }}
            />
          </div>

          {/* Footer */}
          <footer className="border-t bg-muted/50 mt-12">
            <div className="container mx-auto px-4 py-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">PH-NewsHub</h3>
                  <p className="text-sm text-muted-foreground">
                    Your trusted source for Philippine news. Aggregated from top sources including Inquirer, PhilStar, Rappler, and more.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Categories</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-foreground transition-colors">Sports</a></li>
                    <li><a href="#" className="hover:text-foreground transition-colors">Politics</a></li>
                    <li><a href="#" className="hover:text-foreground transition-colors">Business</a></li>
                    <li><a href="#" className="hover:text-foreground transition-colors">Technology</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Legal</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                    <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                    <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t mt-6 pt-6">
                <p className="text-center text-sm text-muted-foreground">
                  © 2024 PH-NewsHub. All rights reserved. Content sourced from trusted Philippine news outlets.
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
