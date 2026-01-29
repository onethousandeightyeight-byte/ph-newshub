
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Checking recent categories...')

    const categories = await prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { parent: true }
    })

    if (categories.length === 0) {
        console.log('❌ No categories found.')
        return
    }

    console.log(`✅ Found ${categories.length} recent categories:`)
    categories.forEach(cat => {
        const parent = cat.parent ? ` (Parent: ${cat.parent.name})` : ' (Root)'
        console.log(`   - ${cat.name} [${cat.slug}]${parent}`)
    })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
