
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const categoryCount = await prisma.category.count()
        const articleCount = await prisma.article.count()
        console.log(`Categories: ${categoryCount}`)
        console.log(`Articles: ${articleCount}`)
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
