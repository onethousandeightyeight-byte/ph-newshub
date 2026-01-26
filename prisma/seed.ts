/**
 * Database Seeding Script for PH-NewsHub
 * 
 * This script seeds the database with initial categories required for the scraper to work.
 * Run this script after setting up your database connection.
 * 
 * Usage:
 *   npm run db:seed
 *   or
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Define categories that match the scraper's config.json
  const categories = [
    {
      name: 'General',
      slug: 'general',
      description: 'General news and current events'
    },
    {
      name: 'Sports',
      slug: 'sports',
      description: 'Sports news, PBA, NBA, boxing, and athletics'
    },
    {
      name: 'Politics',
      slug: 'politics',
      description: 'Political news, government, and legislation'
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Economy, finance, stocks, and trade'
    },
    {
      name: 'Technology',
      slug: 'technology',
      description: 'Tech news, startups, AI, and innovation'
    },
    {
      name: 'Entertainment',
      slug: 'entertainment',
      description: 'Showbiz, movies, music, and celebrities'
    },
    {
      name: 'Health',
      slug: 'health',
      description: 'Health, wellness, and medical news'
    },
    {
      name: 'World',
      slug: 'world',
      description: 'International news and global events'
    }
  ]

  console.log(`📂 Creating ${categories.length} categories...`)

  for (const category of categories) {
    try {
      const created = await prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
        },
        create: {
          name: category.name,
          slug: category.slug,
        },
      })
      console.log(`  ✓ ${category.name} (${category.slug}) - ID: ${created.id}`)
    } catch (error) {
      console.error(`  ✗ Failed to create ${category.name}:`, error)
    }
  }

  // Verify categories were created
  const count = await prisma.category.count()
  console.log(`\n✅ Seeding completed! Total categories in database: ${count}`)

  // Display all categories with their IDs
  console.log('\n📋 All categories:')
  const allCategories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  })
  
  allCategories.forEach(cat => {
    console.log(`   ${cat.name.padEnd(20)} → ${cat.slug.padEnd(15)} → ${cat.id}`)
  })

  console.log('\n🎉 Database is ready for scraping!')
  console.log('\n💡 Next steps:')
  console.log('   1. Start your Next.js server: npm run dev')
  console.log('   2. Test categories API: curl http://localhost:3000/api/categories')
  console.log('   3. Run the scraper: cd mini-services/news-scraper && python3 scraper.py')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
