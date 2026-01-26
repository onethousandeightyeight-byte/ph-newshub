import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/categories
 * 
 * Returns all categories in hierarchical structure
 * Useful for building category navigation menus
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const flat = searchParams.get('flat') === 'true'

    const categories = await db.category.findMany({
      orderBy: [
        { parentId: 'asc' }, // Root categories first
        { name: 'asc' }
      ],
      include: flat ? undefined : {
        children: {
          include: {
            children: true
          }
        }
      }
    })

    if (flat) {
      // Return flat list with parent info
      // Fetch all parent categories in one query to avoid N+1
      const parentIds = categories
        .filter(cat => cat.parentId)
        .map(cat => cat.parentId as string)
      
      const parents = await db.category.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, name: true }
      })
      
      const parentMap = new Map(parents.map(p => [p.id, p.name]))
      
      const flatCategories = categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        parentName: category.parentId ? parentMap.get(category.parentId) || null : null
      }))

      return NextResponse.json(flatCategories, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
      })
    }

    // Return hierarchical structure
    const rootCategories = categories.filter(cat => !cat.parentId)
    return NextResponse.json(rootCategories, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
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
