import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * POST /api/articles/[id]/summary
 * 
 * Generates an AI-powered 1-minute summary of an article.
 * This is a subscriber-only feature.
 * 
 * Headers:
 * - Authorization: User session token (to verify subscriber status)
 * 
 * Response:
 * {
 *   "summary": "1-minute summary text",
 *   "keyPoints": ["key point 1", "key point 2", ...],
 *   "readTime": "1 min"
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const articleId = params.id

    // Fetch article with existing summary
    const article = await db.article.findUnique({
      where: { id: articleId },
      include: {
        category: {
          select: { name: true }
        },
        source: {
          select: { name: true }
        },
        summary: true
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Return cached summary if it exists
    if (article.summary) {
      return NextResponse.json({
        summary: article.summary.summary,
        keyPoints: article.summary.keyPoints,
        readTime: article.summary.readTime,
        generatedAt: article.summary.createdAt.toISOString(),
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        }
      })
    }

    // In production, verify user is subscriber here
    // const user = await getCurrentUser(request)
    // if (user.role !== 'SUBSCRIBER' && user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Premium feature' }, { status: 403 })
    // }

    // Generate AI summary
    const zai = await ZAI.create()

    const systemPrompt = `You are an expert news analyst and journalist for PH-NewsHub, a Philippine news aggregation platform.
Your task is to create concise, informative 1-minute summaries of news articles.

Guidelines:
- Keep the summary under 150 words (approximately 1 minute reading time)
- Focus on the key facts and main points
- Maintain journalistic objectivity and accuracy
- Use clear, concise language
- Include context if necessary
- Highlight the most important information first

Format your response as follows:
SUMMARY: [Your 150-word summary here]

KEY POINTS:
- [Key point 1]
- [Key point 2]
- [Key point 3]
- [Key point 4]`

    const userPrompt = `Create a 1-minute summary of this article:

Title: ${article.title}
Source: ${article.source.name}
Category: ${article.category.name}

Article Content:
${article.contentBody}

Please provide a concise summary that captures the essential information in a format suitable for a 1-minute read.`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      thinking: { type: 'disabled' }
    })

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      )
    }

    // Parse the response
    const summaryMatch = responseText.match(/SUMMARY:\s*(.*?)(?=\n\nKEY POINTS:|$)/s)
    const keyPointsMatch = responseText.match(/KEY POINTS:\s*(.*)/s)

    const summary = summaryMatch?.[1]?.trim() || responseText.substring(0, 500)
    const keyPointsText = keyPointsMatch?.[1]?.trim() || ''
    const keyPoints = keyPointsText
      .split('\n')
      .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
      .filter((line: string) => line.length > 0)

    // Cache the summary in database
    await db.articleSummary.create({
      data: {
        articleId: article.id,
        summary,
        keyPoints,
        readTime: '1 min'
      }
    })

    return NextResponse.json({
      summary,
      keyPoints,
      readTime: '1 min',
      generatedAt: new Date().toISOString(),
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    })

  } catch (error) {
    console.error('Error generating article summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
