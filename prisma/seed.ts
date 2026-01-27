/**
 * Database Seeding Script for PH-NewsHub
 * Implements Comprehensive IPTC/IAB Taxonomy
 * 
 * Usage:
 *   npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

interface CategoryNode {
  name: string
  slug: string
  children?: CategoryNode[]
}

const TAXONOMY: CategoryNode[] = [
  {
    name: 'World & Current Affairs',
    slug: 'world-current-affairs',
    children: [
      {
        name: 'International Relations',
        slug: 'international-relations',
        children: [
          { name: 'Diplomacy', slug: 'diplomacy' },
          { name: 'Summits', slug: 'summits' },
          { name: 'Treaties', slug: 'treaties' },
          { name: 'Foreign Aid', slug: 'foreign-aid' },
          { name: 'Sanctions', slug: 'sanctions' },
          { name: 'United Nations', slug: 'united-nations' },
          { name: 'NATO', slug: 'nato' }
        ]
      },
      {
        name: 'Armed Conflict & War',
        slug: 'armed-conflict-war',
        children: [
          { name: 'Civil Wars', slug: 'civil-wars' },
          { name: 'Peacekeeping', slug: 'peacekeeping' },
          { name: 'WMDs', slug: 'wmds' },
          { name: 'Refugees & Displacement', slug: 'refugees-displacement' },
          { name: 'War Crimes', slug: 'war-crimes' },
          { name: "Coups d'état", slug: 'coups-detat' }
        ]
      },
      {
        name: 'Politics & Government',
        slug: 'politics-government',
        children: [
          {
            name: 'Elections',
            slug: 'elections',
            children: [
              { name: 'Voting', slug: 'voting' },
              { name: 'Polling', slug: 'polling' },
              { name: 'Campaign Finance', slug: 'campaign-finance' },
              { name: 'Voter Fraud', slug: 'voter-fraud' }
            ]
          },
          {
            name: 'Legislative',
            slug: 'legislative',
            children: [
              { name: 'Parliaments & Congresses', slug: 'parliaments-congresses' },
              { name: 'Bills', slug: 'bills' },
              { name: 'Amendments', slug: 'amendments' },
              { name: 'Vetoes', slug: 'vetoes' }
            ]
          },
          {
            name: 'Executive',
            slug: 'executive',
            children: [
              { name: 'Heads of State', slug: 'heads-of-state' },
              { name: 'Cabinets', slug: 'cabinets' },
              { name: 'Executive Orders', slug: 'executive-orders' }
            ]
          },
          {
            name: 'Judicial',
            slug: 'judicial',
            children: [
              { name: 'Supreme Courts', slug: 'supreme-courts' },
              { name: 'Constitutional Law', slug: 'constitutional-law' },
              { name: 'Nominations', slug: 'nominations' }
            ]
          }
        ]
      },
      {
        name: 'Disasters & Emergencies',
        slug: 'disasters-emergencies',
        children: [
          {
            name: 'Natural',
            slug: 'natural-disasters',
            children: [
              { name: 'Earthquakes', slug: 'earthquakes' },
              { name: 'Hurricanes & Typhoons', slug: 'hurricanes-typhoons' },
              { name: 'Floods', slug: 'floods' },
              { name: 'Wildfires', slug: 'wildfires' },
              { name: 'Droughts', slug: 'droughts' },
              { name: 'Tsunamis', slug: 'tsunamis' }
            ]
          },
          {
            name: 'Man-made',
            slug: 'man-made-disasters',
            children: [
              { name: 'Industrial Accidents', slug: 'industrial-accidents' },
              { name: 'Structural Failures', slug: 'structural-failures' },
              { name: 'Transport Accidents', slug: 'transport-accidents' }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Business, Finance & Economy',
    slug: 'business-finance-economy',
    children: [
      {
        name: 'Economy',
        slug: 'economy',
        children: [
          { name: 'Inflation', slug: 'inflation' },
          { name: 'Interest Rates', slug: 'interest-rates' },
          { name: 'GDP', slug: 'gdp' },
          { name: 'Recession', slug: 'recession' },
          { name: 'Unemployment Rates', slug: 'unemployment-rates' },
          { name: 'Trade Deficits', slug: 'trade-deficits' },
          { name: 'Central Banks', slug: 'central-banks' }
        ]
      },
      {
        name: 'Markets & Investing',
        slug: 'markets-investing',
        children: [
          { name: 'Stocks', slug: 'stocks' },
          { name: 'Bonds', slug: 'bonds' },
          { name: 'Commodities', slug: 'commodities' },
          { name: 'Mutual Funds', slug: 'mutual-funds' },
          { name: 'IPOs', slug: 'ipos' },
          { name: 'Cryptocurrency & Blockchain', slug: 'cryptocurrency-blockchain' },
          { name: 'Forex', slug: 'forex' }
        ]
      },
      {
        name: 'Corporate Business',
        slug: 'corporate-business',
        children: [
          { name: 'Mergers & Acquisitions', slug: 'mergers-acquisitions' },
          { name: 'Earnings Reports', slug: 'earnings-reports' },
          { name: 'Executive Changes', slug: 'executive-changes' },
          { name: 'Startups & Venture Capital', slug: 'startups-venture-capital' },
          { name: 'Bankruptcy', slug: 'bankruptcy' }
        ]
      },
      {
        name: 'Personal Finance',
        slug: 'personal-finance',
        children: [
          { name: 'Real Estate & Mortgages', slug: 'real-estate-mortgages' },
          { name: 'Taxes', slug: 'taxes' },
          { name: 'Retirement & Pensions', slug: 'retirement-pensions' },
          { name: 'Credit Cards & Debt', slug: 'credit-cards-debt' },
          { name: 'Insurance', slug: 'insurance' }
        ]
      },
      {
        name: 'Industries',
        slug: 'industries',
        children: [
          { name: 'Automotive', slug: 'automotive-industry' },
          { name: 'Energy', slug: 'energy-industry' },
          { name: 'Retail', slug: 'retail-industry' },
          { name: 'Manufacturing', slug: 'manufacturing' },
          { name: 'Logistics & Supply Chain', slug: 'logistics-supply-chain' },
          { name: 'Agriculture', slug: 'agriculture' }
        ]
      }
    ]
  },
  {
    name: 'Law, Crime & Justice',
    slug: 'law-crime-justice',
    children: [
      {
        name: 'Crime',
        slug: 'crime',
        children: [
          { name: 'Violent Crime', slug: 'violent-crime' },
          { name: 'Financial & White Collar', slug: 'financial-white-collar' },
          { name: 'Cybercrime', slug: 'cybercrime' },
          { name: 'Organized Crime', slug: 'organized-crime' }
        ]
      },
      {
        name: 'Law Enforcement',
        slug: 'law-enforcement',
        children: [
          { name: 'Police Procedure', slug: 'police-procedure' },
          { name: 'Brutality & Misconduct', slug: 'brutality-misconduct' },
          { name: 'Surveillance', slug: 'surveillance' },
          { name: 'Arrests', slug: 'arrests' }
        ]
      },
      {
        name: 'Justice System',
        slug: 'justice-system',
        children: [
          { name: 'Trials', slug: 'trials' },
          { name: 'Verdicts', slug: 'verdicts' },
          { name: 'Sentencing', slug: 'sentencing' },
          { name: 'Prisons & Corrections', slug: 'prisons-corrections' },
          { name: 'Capital Punishment', slug: 'capital-punishment' },
          { name: 'Civil Litigation', slug: 'civil-litigation' }
        ]
      },
      {
        name: 'Terrorism',
        slug: 'terrorism',
        children: [
          { name: 'Domestic Extremism', slug: 'domestic-extremism' },
          { name: 'International Terrorism', slug: 'international-terrorism' },
          { name: 'Counter-terrorism', slug: 'counter-terrorism' }
        ]
      }
    ]
  },
  {
    name: 'Science & Technology',
    slug: 'science-technology',
    children: [
      {
        name: 'Technology',
        slug: 'technology',
        children: [
          { name: 'Consumer Tech', slug: 'consumer-tech' },
          { name: 'Software & Internet', slug: 'software-internet' },
          { name: 'Hardware', slug: 'hardware' }
        ]
      },
      {
        name: 'Science',
        slug: 'science',
        children: [
          { name: 'Space', slug: 'space' },
          { name: 'Biology & Genetics', slug: 'biology-genetics' },
          { name: 'Physics & Chemistry', slug: 'physics-chemistry' },
          { name: 'Environment', slug: 'environment' }
        ]
      }
    ]
  },
  {
    name: 'Health & Medicine',
    slug: 'health-medicine',
    children: [
      {
        name: 'Public Health',
        slug: 'public-health',
        children: [
          { name: 'Pandemics & Epidemics', slug: 'pandemics-epidemics' },
          { name: 'Vaccines', slug: 'vaccines' },
          { name: 'Health Policy', slug: 'health-policy' },
          { name: 'Obesity', slug: 'obesity' }
        ]
      },
      {
        name: 'Medical Research',
        slug: 'medical-research',
        children: [
          { name: 'Cancer Research', slug: 'cancer-research' },
          { name: "Alzheimer's & Dementia", slug: 'alzheimers-dementia' },
          { name: 'Stem Cells', slug: 'stem-cells' },
          { name: 'Clinical Trials', slug: 'clinical-trials' }
        ]
      },
      {
        name: 'Mental Health',
        slug: 'mental-health',
        children: [
          { name: 'Depression', slug: 'depression' },
          { name: 'Anxiety', slug: 'anxiety' },
          { name: 'Addiction', slug: 'addiction' },
          { name: 'Therapy & Psychology', slug: 'therapy-psychology' }
        ]
      },
      {
        name: 'Nutrition & Fitness',
        slug: 'nutrition-fitness',
        children: [
          { name: 'Diets', slug: 'diets' },
          { name: 'Exercise Trends', slug: 'exercise-trends' },
          { name: 'Supplements', slug: 'supplements' }
        ]
      }
    ]
  },
  {
    name: 'Sports',
    slug: 'sports',
    children: [
      {
        name: 'Team Sports',
        slug: 'team-sports',
        children: [
          { name: 'Football (Soccer)', slug: 'football-soccer' },
          { name: 'Basketball', slug: 'basketball' },
          { name: 'American Football', slug: 'american-football' },
          { name: 'Baseball', slug: 'baseball' },
          { name: 'Hockey', slug: 'hockey' },
          { name: 'Rugby', slug: 'rugby' },
          { name: 'Cricket', slug: 'cricket' }
        ]
      },
      {
        name: 'Individual Sports',
        slug: 'individual-sports',
        children: [
          { name: 'Tennis', slug: 'tennis' },
          { name: 'Golf', slug: 'golf' },
          { name: 'Boxing', slug: 'boxing' },
          { name: 'MMA & UFC', slug: 'mma-ufc' },
          { name: 'Motorsports', slug: 'motorsports' },
          { name: 'Athletics', slug: 'athletics' },
          { name: 'Swimming', slug: 'swimming' }
        ]
      },
      {
        name: 'Events',
        slug: 'sports-events',
        children: [
          { name: 'Olympics', slug: 'olympics' },
          { name: 'World Cup', slug: 'world-cup' },
          { name: 'Super Bowl', slug: 'super-bowl' },
          { name: 'Wimbledon', slug: 'wimbledon' }
        ]
      },
      {
        name: 'Business of Sports',
        slug: 'business-of-sports',
        children: [
          { name: 'Player Contracts', slug: 'player-contracts' },
          { name: 'Stadiums', slug: 'stadiums' },
          { name: 'Sponsorships', slug: 'sponsorships' },
          { name: 'Gambling & Fantasy Sports', slug: 'gambling-fantasy-sports' }
        ]
      }
    ]
  },
  {
    name: 'Arts, Entertainment & Culture',
    slug: 'arts-entertainment-culture',
    children: [
      {
        name: 'Movies',
        slug: 'movies',
        children: [
          { name: 'Box Office', slug: 'box-office' },
          { name: 'Reviews', slug: 'movie-reviews' },
          { name: 'Awards', slug: 'movie-awards' },
          { name: 'Film Festivals', slug: 'film-festivals' },
          { name: 'Streaming Services', slug: 'streaming-services' }
        ]
      },
      {
        name: 'Music',
        slug: 'music',
        children: [
          { name: 'Releases', slug: 'music-releases' },
          { name: 'Concerts & Festivals', slug: 'concerts-festivals' },
          { name: 'Music Awards', slug: 'music-awards' },
          { name: 'Genres', slug: 'music-genres' }
        ]
      },
      {
        name: 'Television',
        slug: 'television',
        children: [
          { name: 'Series Premieres', slug: 'series-premieres' },
          { name: 'Reality TV', slug: 'reality-tv' },
          { name: 'Late Night', slug: 'late-night' },
          { name: 'TV Awards', slug: 'tv-awards' }
        ]
      },
      {
        name: 'Literature',
        slug: 'literature',
        children: [
          { name: 'Book Reviews', slug: 'book-reviews' },
          { name: 'Bestseller Lists', slug: 'bestseller-lists' },
          { name: 'Authors', slug: 'authors' },
          { name: 'Poetry', slug: 'poetry' }
        ]
      },
      {
        name: 'Arts',
        slug: 'arts-culture',
        children: [
          { name: 'Visual Arts', slug: 'visual-arts' },
          { name: 'Performing Arts', slug: 'performing-arts' },
          { name: 'Museums & Galleries', slug: 'museums-galleries' },
          { name: 'Auctions', slug: 'auctions' }
        ]
      },
      {
        name: 'Celebrity & Gossip',
        slug: 'celebrity-gossip',
        children: [
          { name: 'Relationships', slug: 'relationships' },
          { name: 'Scandals', slug: 'scandals' },
          { name: 'Paparazzi', slug: 'paparazzi' },
          { name: 'Influencers', slug: 'influencers' }
        ]
      }
    ]
  },
  {
    name: 'Lifestyle & Leisure',
    slug: 'lifestyle-leisure',
    children: [
      {
        name: 'Travel',
        slug: 'travel',
        children: [
          { name: 'Airlines', slug: 'airlines' },
          { name: 'Hotels & Resorts', slug: 'hotels-resorts' },
          { name: 'Tourism', slug: 'tourism' },
          { name: 'Passports & Visas', slug: 'passports-visas' },
          { name: 'Cruises', slug: 'cruises' },
          { name: 'Adventure Travel', slug: 'adventure-travel' }
        ]
      },
      {
        name: 'Food & Drink',
        slug: 'food-drink',
        children: [
          { name: 'Restaurants', slug: 'restaurants' },
          { name: 'Recipes', slug: 'recipes' },
          { name: 'Wine & Spirits', slug: 'wine-spirits' },
          { name: 'Food Safety', slug: 'food-safety' },
          { name: 'Chefs', slug: 'chefs' }
        ]
      },
      {
        name: 'Fashion & Beauty',
        slug: 'fashion-beauty',
        children: [
          { name: 'Trends', slug: 'trends' },
          { name: 'Fashion Week', slug: 'fashion-week' },
          { name: 'Cosmetics', slug: 'cosmetics' },
          { name: 'Luxury Goods', slug: 'luxury-goods' }
        ]
      },
      {
        name: 'Home & Garden',
        slug: 'home-garden',
        children: [
          { name: 'Interior Design', slug: 'interior-design' },
          { name: 'Real Estate Trends', slug: 'real-estate-trends' },
          { name: 'DIY & Renovation', slug: 'diy-renovation' },
          { name: 'Gardening', slug: 'gardening' }
        ]
      },
      {
        name: 'Automotive',
        slug: 'consumer-automotive',
        children: [
          { name: 'Car Reviews', slug: 'car-reviews' },
          { name: 'Electric Vehicles', slug: 'electric-vehicles' },
          { name: 'Classic Cars', slug: 'classic-cars' }
        ]
      }
    ]
  },
  {
    name: 'Social Issues',
    slug: 'social-issues',
    children: [
      {
        name: 'Civil Rights',
        slug: 'civil-rights',
        children: [
          { name: 'Racial Justice', slug: 'racial-justice' },
          { name: 'LGBTQ+ Rights', slug: 'lgbtq-rights' },
          { name: 'Gender Equality', slug: 'gender-equality' },
          { name: 'Disability Rights', slug: 'disability-rights' }
        ]
      },
      {
        name: 'Education',
        slug: 'education',
        children: [
          { name: 'Student Debt', slug: 'student-debt' },
          { name: 'K-12 Policy', slug: 'k-12-policy' },
          { name: 'Higher Education', slug: 'higher-education' },
          { name: 'Online Learning', slug: 'online-learning' }
        ]
      },
      {
        name: 'Religion & Faith',
        slug: 'religion-faith',
        children: [
          { name: 'Catholic Church', slug: 'catholic-church' },
          { name: 'Islam', slug: 'islam' },
          { name: 'Judaism', slug: 'judaism' },
          { name: 'Religious Holidays', slug: 'religious-holidays' },
          { name: 'Secularism', slug: 'secularism' }
        ]
      },
      {
        name: 'Labor',
        slug: 'labor',
        children: [
          { name: 'Unions & Strikes', slug: 'unions-strikes' },
          { name: 'Minimum Wage', slug: 'minimum-wage' },
          { name: 'Gig Economy', slug: 'gig-economy' },
          { name: 'Remote Work', slug: 'remote-work' }
        ]
      }
    ]
  },
  {
    name: 'Opinion & Editorial',
    slug: 'opinion-editorial',
    children: [
      { name: 'Editorials', slug: 'editorials' },
      { name: 'Op-Eds', slug: 'op-eds' },
      { name: 'Letters to the Editor', slug: 'letters-to-editor' },
      { name: 'Cartoons', slug: 'cartoons' }
    ]
  }
]

async function seedCategory(node: CategoryNode, parentId?: string) {
  // Upsert current category
  const created = await prisma.category.upsert({
    where: { slug: node.slug },
    update: {
      name: node.name,
      parentId: parentId || null
    },
    create: {
      name: node.name,
      slug: node.slug,
      parentId: parentId || null
    },
  })

  // console.log(`  Processed: ${node.name} (${created.id})`)

  // Recursively process children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await seedCategory(child, created.id)
    }
  }
}

async function main() {
  console.log('🌱 Starting IPTC/IAB Taxonomy Seeding...')

  // Optional: Clean up existing categories if you want a fresh start
  // await prisma.article.deleteMany() // Dangerous if you want to keep articles
  // await prisma.category.deleteMany()

  for (const rootCat of TAXONOMY) {
    await seedCategory(rootCat)
  }

  const count = await prisma.category.count()
  console.log(`\n✅ Seeding completed! Total categories: ${count}`)
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
