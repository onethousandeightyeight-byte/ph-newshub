import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/categories
 * 
 * Query Parameters:
 * - flat: Return flat list instead of hierarchical (optional, default: false)
 * - slug: Filter by specific category slug (optional)
 * 
 * Returns all categories in hierarchical structure or a specific category by slug
 * Useful for building category navigation menus
 * 
 * Examples:
 * - GET /api/categories - Returns hierarchical categories
 * - GET /api/categories?flat=true - Returns flat list
 * - GET /api/categories?slug=sports - Returns sports category
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const flat = searchParams.get('flat') === 'true'
    const slug = searchParams.get('slug')

    // If slug is provided, return that specific category
    if (slug) {
      const category = await db.category.findUnique({
        where: { slug }
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(category)
    }

    const categories = await db.category.findMany({
      orderBy: [
        { parentId: 'asc' }, // Root categories first
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { articles: true }
        },
        ...(flat ? {} : {
          children: {
            include: {
              _count: { select: { articles: true } },
              children: {
                include: {
                  _count: { select: { articles: true } }
                }
              }
            }
          }
        })
      }
    })

    if (flat) {
      // Return flat list with parent info
      const flatCategories = await Promise.all(
        categories.map(async (category) => {
          let parentName: string | null = null
          if (category.parentId) {
            const parent = await db.category.findUnique({
              where: { id: category.parentId },
              select: { name: true }
            })
            parentName = parent?.name || null
          }

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            parentId: category.parentId,
            parentName
          }
        })
      )

      return NextResponse.json(flatCategories)
    }

    // Return hierarchical structure with counts
    const rootCategories = categories.filter(cat => !cat.parentId)

    // Transform to include count field
    const transformCategory = (cat: any): any => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat._count?.articles || 0,
      children: cat.children?.map(transformCategory)
    })

    return NextResponse.json(rootCategories.map(transformCategory))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/categories
 * 
 * Create a new category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, parentId } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        parentId
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
