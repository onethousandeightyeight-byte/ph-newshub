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
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { articles: true }
        },
        ...(flat ? {} : {
          children: {
            include: {
              _count: {
                select: { articles: true }
              },
              children: {
                include: {
                  _count: {
                    select: { articles: true }
                  }
                }
              }
            }
          }
        })
      }
    })

    if (flat) {
      // Return flat list with parent info and count
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
            parentName,
            count: category._count?.articles || 0
          }
        })
      );

      return NextResponse.json(flatCategories);
    }

    // Helper to transform category structure with aggregated counts
    // Implements pivot-table style aggregation:
    // - Leaf categories (no children): show their direct article count
    // - Parent categories: show ONLY the sum of children's counts (not their own direct articles)
    const transformCategory = (category: any): any => {
      // Check if children exist and is an array before mapping
      const hasChildren = Array.isArray(category.children) && category.children.length > 0

      // Transform children recursively only if they exist
      const transformedChildren = hasChildren
        ? category.children.map(transformCategory)
        : []

      // Calculate the sum of all child counts (for parent categories)
      const childrenTotalCount = transformedChildren.reduce(
        (sum: number, child: any) => sum + (child?.count || 0),
        0
      )

      // Own direct count (only used for leaf categories)
      const ownCount = category._count?.articles || 0

      // Pivot-table style: 
      // - If this category has children, count = sum of children only
      // - If this is a leaf category, count = its own direct articles
      const totalCount = hasChildren ? childrenTotalCount : ownCount

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId || null,
        count: totalCount,
        children: hasChildren ? transformedChildren : undefined,
      }
    };

    // Return hierarchical structure with aggregated counts
    const rootCategories = categories.filter(cat => !cat.parentId)
    const transformedCategories = rootCategories.map(transformCategory)
    return NextResponse.json(transformedCategories)
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
 * Create a new category or return existing if slug already exists
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

    // Check if category with this slug already exists
    const existing = await db.category.findUnique({
      where: { slug }
    })

    if (existing) {
      // Return existing category
      return NextResponse.json(existing, { status: 200 })
    }

    // Create new category
    const category = await db.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category', details: String(error) },
      { status: 500 }
    )
  }
}
