import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ads
 * 
 * Returns all active ad placements
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const ads = await db.adPlacement.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { position: 'asc' }
    })

    return NextResponse.json(ads)
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ads
 * 
 * Create a new ad placement (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName, targetUrl, imageAsset, altText, position } = body

    if (!clientName || !targetUrl || !imageAsset) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const ad = await db.adPlacement.create({
      data: {
        clientName,
        targetUrl,
        imageAsset,
        altText,
        position: position || 6
      }
    })

    return NextResponse.json(ad, { status: 201 })
  } catch (error) {
    console.error('Error creating ad:', error)
    return NextResponse.json(
      { error: 'Failed to create ad' },
      { status: 500 }
    )
  }
}
