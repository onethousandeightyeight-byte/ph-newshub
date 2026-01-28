import { db } from './src/lib/db'

async function checkDb() {
    try {
        const articleCount = await db.article.count()
        const categoryCount = await db.category.count()
        const sourceCount = await db.source.count()

        console.log('=== Database Status ===')
        console.log('Articles:', articleCount)
        console.log('Categories:', categoryCount)
        console.log('Sources:', sourceCount)

        if (articleCount > 0) {
            const sample = await db.article.findFirst({
                include: { category: true, source: true }
            })
            console.log('\nSample article:')
            console.log(JSON.stringify(sample, null, 2))
        }
    } catch (e) {
        console.error('Error:', e)
    } finally {
        await db.$disconnect()
    }
}

checkDb()
