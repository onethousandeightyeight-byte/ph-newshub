/**
 * Migration Script: Recategorize Existing Articles
 * 
 * This script re-classifies all existing articles using the new
 * hierarchical leaf-level category matching logic.
 * 
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-recategorize-articles.ts
 */

import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

/**
 * Determine article category based on keywords in title and content.
 * Uses hierarchical matching - most specific (leaf) categories are checked first.
 */
function determineCategory(title: string, content: string): string {
    const textToSearch = (title + " " + content).toLowerCase()

    // LEAF-LEVEL CATEGORIES (Level 3-4) - Most specific, checked first
    const leafCategories: Record<string, string[]> = {
        // World & Current Affairs > International Relations
        'diplomacy': ['diplomacy', 'diplomatic', 'ambassador', 'embassy', 'consulate'],
        'summits': ['summit', 'g7', 'g20', 'asean summit', 'apec summit'],
        'treaties': ['treaty', 'accord', 'bilateral agreement', 'trade deal'],
        'foreign-aid': ['foreign aid', 'humanitarian aid', 'development assistance'],
        'sanctions': ['sanctions', 'embargo', 'trade restrictions'],
        'united-nations': ['united nations', 'un security council', 'unesco', 'unicef', 'who'],
        'nato': ['nato', 'north atlantic treaty'],

        // World & Current Affairs > Armed Conflict & War
        'civil-wars': ['civil war', 'insurgency', 'rebel', 'militia'],
        'peacekeeping': ['peacekeeping', 'peace talks', 'ceasefire', 'armistice'],
        'wmds': ['nuclear weapon', 'chemical weapon', 'biological weapon', 'wmd'],
        'refugees-displacement': ['refugee', 'displaced', 'asylum seeker', 'migrant crisis'],
        'war-crimes': ['war crime', 'genocide', 'ethnic cleansing', 'crimes against humanity'],
        'coups-detat': ['coup', 'military takeover', 'junta', 'overthrow'],

        // World & Current Affairs > Politics & Government > Elections
        'voting': ['voting', 'ballot', 'precinct', 'comelec', 'electoral'],
        'polling': ['poll', 'survey', 'approval rating', 'exit poll'],
        'campaign-finance': ['campaign finance', 'political donation', 'super pac'],
        'voter-fraud': ['voter fraud', 'election fraud', 'rigging', 'vote buying'],

        // World & Current Affairs > Politics & Government > Legislative
        'parliaments-congresses': ['congress', 'senate', 'house of representatives', 'parliament', 'lawmaker', 'senator', 'congressman'],
        'bills': ['bill', 'proposed law', 'legislation', 'house bill', 'senate bill'],
        'amendments': ['amendment', 'constitutional amendment'],
        'vetoes': ['veto', 'pocket veto'],

        // World & Current Affairs > Politics & Government > Executive
        'heads-of-state': ['president', 'prime minister', 'marcos', 'duterte', 'bongbong', 'bbm'],
        'cabinets': ['cabinet', 'secretary', 'department head', 'minister'],
        'executive-orders': ['executive order', 'presidential proclamation', 'administrative order'],

        // World & Current Affairs > Politics & Government > Judicial
        'supreme-courts': ['supreme court', 'chief justice', 'associate justice'],
        'constitutional-law': ['constitutional', 'constitution', 'charter change', 'cha-cha'],
        'nominations': ['judicial nomination', 'court appointment'],

        // World & Current Affairs > Disasters & Emergencies > Natural
        'earthquakes': ['earthquake', 'tremor', 'seismic', 'magnitude', 'phivolcs'],
        'hurricanes-typhoons': ['typhoon', 'hurricane', 'cyclone', 'storm signal', 'pagasa', 'super typhoon'],
        'floods': ['flood', 'flooding', 'flash flood', 'overflow'],
        'wildfires': ['wildfire', 'forest fire', 'bushfire'],
        'droughts': ['drought', 'water shortage', 'el nino', 'dry spell'],
        'tsunamis': ['tsunami', 'tidal wave'],

        // World & Current Affairs > Disasters & Emergencies > Man-made
        'industrial-accidents': ['industrial accident', 'factory explosion', 'chemical spill', 'oil spill'],
        'structural-failures': ['building collapse', 'bridge collapse', 'structural failure'],
        'transport-accidents': ['plane crash', 'train derailment', 'ship sinking', 'ferry accident', 'bus accident'],

        // Business, Finance & Economy > Economy
        'inflation': ['inflation', 'consumer price', 'cpi', 'price hike', 'cost of living'],
        'interest-rates': ['interest rate', 'bsp rate', 'lending rate', 'monetary policy'],
        'gdp': ['gdp', 'gross domestic product', 'economic growth', 'economic output'],
        'recession': ['recession', 'economic downturn', 'depression', 'economic crisis'],
        'unemployment-rates': ['unemployment', 'jobless', 'layoff', 'retrenchment'],
        'trade-deficits': ['trade deficit', 'trade surplus', 'trade balance', 'export', 'import'],
        'central-banks': ['central bank', 'bsp', 'bangko sentral', 'federal reserve'],

        // Business, Finance & Economy > Markets & Investing
        'stocks': ['stock', 'pse', 'psei', 'share price', 'equity', 'wall street', 'nasdaq', 'dow jones'],
        'bonds': ['bond', 'treasury', 'debt securities', 'fixed income'],
        'commodities': ['commodity', 'gold price', 'oil price', 'copper', 'nickel'],
        'mutual-funds': ['mutual fund', 'uitf', 'investment fund'],
        'ipos': ['ipo', 'initial public offering', 'stock listing'],
        'cryptocurrency-blockchain': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'nft', 'defi'],
        'forex': ['forex', 'peso dollar', 'exchange rate', 'currency'],

        // Business, Finance & Economy > Corporate Business
        'mergers-acquisitions': ['merger', 'acquisition', 'buyout', 'takeover'],
        'earnings-reports': ['earnings', 'quarterly report', 'financial results', 'profit', 'revenue'],
        'executive-changes': ['ceo', 'executive appointment', 'board of directors'],
        'startups-venture-capital': ['startup', 'venture capital', 'seed funding', 'series a', 'unicorn'],
        'bankruptcy': ['bankruptcy', 'insolvency', 'debt restructuring', 'chapter 11'],

        // Business, Finance & Economy > Personal Finance
        'real-estate-mortgages': ['mortgage', 'home loan', 'real estate', 'property prices', 'housing'],
        'taxes': ['tax', 'bir', 'income tax', 'vat', 'tax filing', 'tax evasion'],
        'retirement-pensions': ['retirement', 'pension', 'sss', 'gsis', '401k'],
        'credit-cards-debt': ['credit card', 'debt', 'loan', 'lending'],
        'insurance': ['insurance', 'life insurance', 'health insurance', 'philhealth'],

        // Business, Finance & Economy > Industries
        'automotive-industry': ['automotive industry', 'car sales', 'vehicle production'],
        'energy-industry': ['energy sector', 'oil company', 'power plant', 'meralco'],
        'retail-industry': ['retail', 'mall', 'sm', 'ayala malls', 'robinsons'],
        'manufacturing': ['manufacturing', 'factory', 'industrial production'],
        'logistics-supply-chain': ['logistics', 'supply chain', 'shipping', 'freight'],
        'agriculture': ['agriculture', 'farming', 'crop', 'harvest', 'rice', 'palay'],

        // Law, Crime & Justice > Crime
        'violent-crime': ['murder', 'homicide', 'assault', 'robbery', 'kidnapping', 'rape'],
        'financial-white-collar': ['fraud', 'embezzlement', 'money laundering', 'corruption', 'graft'],
        'cybercrime': ['cybercrime', 'hacking', 'phishing', 'ransomware', 'data breach'],
        'organized-crime': ['syndicate', 'cartel', 'mafia', 'gang', 'drug lord'],

        // Law, Crime & Justice > Law Enforcement
        'police-procedure': ['police', 'pnp', 'law enforcement', 'investigation'],
        'brutality-misconduct': ['police brutality', 'misconduct', 'abuse of power'],
        'surveillance': ['surveillance', 'wiretapping', 'cctv', 'monitoring'],
        'arrests': ['arrest', 'apprehension', 'warrant', 'detained'],

        // Law, Crime & Justice > Justice System
        'trials': ['trial', 'hearing', 'court case', 'prosecution'],
        'verdicts': ['verdict', 'guilty', 'acquittal', 'conviction'],
        'sentencing': ['sentence', 'imprisonment', 'life sentence', 'death penalty'],
        'prisons-corrections': ['prison', 'jail', 'inmate', 'bucor', 'bjmp'],
        'capital-punishment': ['death penalty', 'execution', 'lethal injection'],
        'civil-litigation': ['lawsuit', 'civil case', 'damages', 'settlement'],

        // Law, Crime & Justice > Terrorism
        'domestic-extremism': ['domestic terrorism', 'extremist', 'radical'],
        'international-terrorism': ['terrorist attack', 'isis', 'al-qaeda', 'bombing'],
        'counter-terrorism': ['counter-terrorism', 'anti-terrorism', 'atr'],

        // Science & Technology > Technology
        'consumer-tech': ['smartphone', 'iphone', 'samsung', 'gadget', 'tablet', 'laptop'],
        'software-internet': ['software', 'app', 'website', 'social media', 'facebook', 'tiktok', 'google'],
        'hardware': ['processor', 'chip', 'semiconductor', 'cpu', 'gpu', 'nvidia'],

        // Science & Technology > Science
        'space': ['space', 'nasa', 'rocket', 'satellite', 'astronaut', 'mars', 'moon'],
        'biology-genetics': ['biology', 'genetics', 'dna', 'gene', 'evolution', 'species'],
        'physics-chemistry': ['physics', 'chemistry', 'particle', 'quantum', 'element'],
        'environment': ['climate change', 'global warming', 'carbon', 'emissions', 'pollution', 'environmental'],

        // Health & Medicine > Public Health
        'pandemics-epidemics': ['pandemic', 'epidemic', 'outbreak', 'covid', 'coronavirus', 'mpox', 'monkeypox'],
        'vaccines': ['vaccine', 'vaccination', 'immunization', 'booster', 'pfizer', 'moderna'],
        'health-policy': ['health policy', 'doh', 'healthcare reform', 'universal health'],
        'obesity': ['obesity', 'overweight', 'weight loss'],

        // Health & Medicine > Medical Research
        'cancer-research': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'carcinoma'],
        'alzheimers-dementia': ['alzheimer', 'dementia', 'cognitive decline', 'memory loss'],
        'stem-cells': ['stem cell', 'regenerative medicine'],
        'clinical-trials': ['clinical trial', 'drug trial', 'fda approval'],

        // Health & Medicine > Mental Health
        'depression': ['depression', 'depressed', 'major depressive'],
        'anxiety': ['anxiety', 'panic attack', 'anxious'],
        'addiction': ['addiction', 'substance abuse', 'rehabilitation', 'rehab'],
        'therapy-psychology': ['therapy', 'psychologist', 'psychiatrist', 'counseling', 'mental health'],

        // Health & Medicine > Nutrition & Fitness
        'diets': ['diet', 'keto', 'intermittent fasting', 'weight loss'],
        'exercise-trends': ['exercise', 'workout', 'gym', 'fitness'],
        'supplements': ['supplement', 'vitamin', 'protein powder'],

        // Sports > Team Sports
        'football-soccer': ['football', 'soccer', 'fifa', 'premier league', 'la liga', 'champions league', 'azkals'],
        'basketball': ['basketball', 'nba', 'pba', 'gilas', 'uaap basketball', 'ncaa basketball', 'lakers', 'warriors'],
        'american-football': ['nfl', 'american football', 'super bowl', 'touchdown'],
        'baseball': ['baseball', 'mlb', 'home run'],
        'hockey': ['hockey', 'nhl', 'ice hockey'],
        'rugby': ['rugby', 'world rugby'],
        'cricket': ['cricket', 'ipl', 'test match'],

        // Sports > Individual Sports
        'tennis': ['tennis', 'wimbledon', 'us open', 'australian open', 'french open', 'nadal', 'djokovic'],
        'golf': ['golf', 'pga', 'masters', 'tiger woods'],
        'boxing': ['boxing', 'pacquiao', 'manny pacquiao', 'heavyweight', 'knockout', 'wbc', 'wba'],
        'mma-ufc': ['mma', 'ufc', 'mixed martial arts', 'brandon vera'],
        'motorsports': ['formula 1', 'f1', 'nascar', 'motogp', 'racing'],
        'athletics': ['athletics', 'track and field', 'marathon', 'olympics 100m'],
        'swimming': ['swimming', 'swimmer', 'olympic swimming'],

        // Sports > Events
        'olympics': ['olympic', 'olympics', 'tokyo 2020', 'paris 2024', 'olympic games'],
        'world-cup': ['world cup', 'fifa world cup'],
        'super-bowl': ['super bowl'],
        'wimbledon': ['wimbledon'],

        // Sports > Business of Sports
        'player-contracts': ['player contract', 'signing', 'trade', 'free agent'],
        'stadiums': ['stadium', 'arena', 'sports venue'],
        'sponsorships': ['sponsorship', 'endorsement', 'athlete endorsement'],
        'gambling-fantasy-sports': ['sports betting', 'fantasy sports', 'gambling'],

        // Arts, Entertainment & Culture > Movies
        'box-office': ['box office', 'opening weekend', 'blockbuster'],
        'movie-reviews': ['movie review', 'film review', 'film critique'],
        'movie-awards': ['oscar', 'academy awards', 'golden globe', 'best picture', 'best actor'],
        'film-festivals': ['film festival', 'cannes', 'venice film festival', 'sundance'],
        'streaming-services': ['netflix', 'disney+', 'hbo max', 'amazon prime video', 'streaming'],

        // Arts, Entertainment & Culture > Music
        'music-releases': ['album release', 'single release', 'new song', 'music video'],
        'concerts-festivals': ['concert', 'music festival', 'tour', 'live performance'],
        'music-awards': ['grammy', 'billboard', 'mtv awards', 'brit awards'],
        'music-genres': ['pop music', 'rock music', 'hip hop', 'k-pop', 'opm'],

        // Arts, Entertainment & Culture > Television
        'series-premieres': ['series premiere', 'new show', 'tv series', 'premiere'],
        'reality-tv': ['reality tv', 'reality show', 'survivor', 'big brother'],
        'late-night': ['late night', 'talk show', 'jimmy fallon', 'jimmy kimmel'],
        'tv-awards': ['emmy', 'emmy awards', 'tv award'],

        // Arts, Entertainment & Culture > Literature
        'book-reviews': ['book review', 'literary review'],
        'bestseller-lists': ['bestseller', 'best seller', 'nyt bestseller'],
        'authors': ['author', 'novelist', 'writer', 'book signing'],
        'poetry': ['poetry', 'poem', 'poet'],

        // Arts, Entertainment & Culture > Arts
        'visual-arts': ['painting', 'sculpture', 'art exhibit', 'gallery'],
        'performing-arts': ['theater', 'theatre', 'ballet', 'opera', 'broadway'],
        'museums-galleries': ['museum', 'gallery', 'exhibit', 'exhibition'],
        'auctions': ['art auction', 'sotheby', 'christie'],

        // Arts, Entertainment & Culture > Celebrity & Gossip
        'relationships': ['celebrity relationship', 'dating', 'engaged', 'wedding', 'divorce'],
        'scandals': ['scandal', 'controversy', 'affair'],
        'paparazzi': ['paparazzi', 'spotted', 'candid'],
        'influencers': ['influencer', 'content creator', 'youtuber', 'tiktoker', 'vlogger'],

        // Lifestyle & Leisure > Travel
        'airlines': ['airline', 'flight', 'airfare', 'philippine airlines', 'cebu pacific'],
        'hotels-resorts': ['hotel', 'resort', 'accommodation', 'booking'],
        'tourism': ['tourism', 'tourist', 'destination', 'vacation'],
        'passports-visas': ['passport', 'visa', 'travel document', 'immigration'],
        'cruises': ['cruise', 'cruise ship', 'ocean liner'],
        'adventure-travel': ['adventure travel', 'trekking', 'hiking', 'backpacking'],

        // Lifestyle & Leisure > Food & Drink
        'restaurants': ['restaurant', 'dining', 'eatery', 'cafe'],
        'recipes': ['recipe', 'cooking', 'how to cook'],
        'wine-spirits': ['wine', 'whiskey', 'cocktail', 'beer', 'brewery'],
        'food-safety': ['food safety', 'food poisoning', 'contamination'],
        'chefs': ['chef', 'culinary', 'celebrity chef'],

        // Lifestyle & Leisure > Fashion & Beauty
        'trends': ['fashion trend', 'style trend', 'trending'],
        'fashion-week': ['fashion week', 'runway', 'model', 'designer'],
        'cosmetics': ['makeup', 'cosmetics', 'skincare', 'beauty products'],
        'luxury-goods': ['luxury', 'designer bag', 'rolex', 'gucci', 'louis vuitton'],

        // Lifestyle & Leisure > Home & Garden
        'interior-design': ['interior design', 'home decor', 'furniture'],
        'real-estate-trends': ['real estate trend', 'property market', 'condo'],
        'diy-renovation': ['diy', 'renovation', 'home improvement'],
        'gardening': ['gardening', 'plants', 'landscaping'],

        // Lifestyle & Leisure > Automotive (Consumer)
        'car-reviews': ['car review', 'test drive', 'vehicle review'],
        'electric-vehicles': ['electric vehicle', 'ev', 'tesla', 'hybrid car'],
        'classic-cars': ['classic car', 'vintage car', 'collector car'],

        // Social Issues > Civil Rights
        'racial-justice': ['racial justice', 'racism', 'discrimination', 'racial equality'],
        'lgbtq-rights': ['lgbtq', 'gay rights', 'same-sex', 'pride', 'transgender'],
        'gender-equality': ['gender equality', 'feminism', 'women rights', 'metoo'],
        'disability-rights': ['disability rights', 'pwd', 'accessibility'],

        // Social Issues > Education
        'student-debt': ['student debt', 'student loan', 'tuition'],
        'k-12-policy': ['k-12', 'deped', 'elementary', 'high school', 'public school'],
        'higher-education': ['university', 'college', 'ched', 'state university'],
        'online-learning': ['online learning', 'e-learning', 'distance learning', 'modular'],

        // Social Issues > Religion & Faith
        'catholic-church': ['catholic', 'pope', 'vatican', 'bishop', 'cbcp'],
        'islam': ['islam', 'muslim', 'mosque', 'ramadan', 'eid'],
        'judaism': ['jewish', 'synagogue', 'rabbi'],
        'religious-holidays': ['christmas', 'easter', 'holy week', 'all saints'],
        'secularism': ['secular', 'separation of church and state'],

        // Social Issues > Labor
        'unions-strikes': ['union', 'strike', 'labor union', 'walkout', 'picket'],
        'minimum-wage': ['minimum wage', 'wage hike', 'salary increase'],
        'gig-economy': ['gig economy', 'freelance', 'grab', 'uber', 'delivery rider'],
        'remote-work': ['remote work', 'work from home', 'wfh', 'hybrid work'],

        // Opinion & Editorial
        'editorials': ['editorial', 'editor opinion'],
        'op-eds': ['op-ed', 'opinion piece', 'commentary'],
        'letters-to-editor': ['letter to editor', 'reader letter'],
        'cartoons': ['editorial cartoon', 'political cartoon'],
    }

    // PARENT-LEVEL CATEGORIES (Level 2) - Checked if no leaf match
    const parentCategories: Record<string, string[]> = {
        // World & Current Affairs children
        'international-relations': ['diplomacy', 'foreign policy', 'bilateral', 'multilateral'],
        'armed-conflict-war': ['war', 'conflict', 'military', 'troops', 'soldier'],
        'politics-government': ['politics', 'government', 'political', 'administration'],
        'disasters-emergencies': ['disaster', 'emergency', 'calamity', 'rescue'],
        'natural-disasters': ['natural disaster', 'nature disaster'],
        'man-made-disasters': ['accident', 'disaster'],

        // Business children
        'economy': ['economy', 'economic', 'macroeconomic'],
        'markets-investing': ['market', 'investing', 'investment', 'investor'],
        'corporate-business': ['corporate', 'company', 'business', 'firm'],
        'personal-finance': ['personal finance', 'savings', 'budget'],
        'industries': ['industry', 'sector'],

        // Law children
        'crime': ['crime', 'criminal', 'illegal'],
        'law-enforcement': ['law enforcement', 'police'],
        'justice-system': ['justice', 'court', 'legal'],
        'terrorism': ['terror', 'terrorist'],

        // Science children
        'technology': ['technology', 'tech', 'digital', 'innovation'],
        'science': ['science', 'scientific', 'research', 'discovery'],

        // Health children
        'public-health': ['public health', 'doh', 'health department'],
        'medical-research': ['medical research', 'study', 'clinical'],
        'mental-health': ['mental health', 'psychological'],
        'nutrition-fitness': ['nutrition', 'fitness', 'health'],

        // Sports children
        'team-sports': ['team sport', 'league', 'championship'],
        'individual-sports': ['individual sport', 'athlete'],
        'sports-events': ['sports event', 'tournament', 'championship'],
        'business-of-sports': ['sports business', 'sports industry'],

        // Entertainment children
        'movies': ['movie', 'film', 'cinema', 'hollywood'],
        'music': ['music', 'song', 'singer', 'band', 'album'],
        'television': ['television', 'tv show', 'series'],
        'literature': ['book', 'novel', 'literature', 'reading'],
        'arts-culture': ['art', 'culture', 'cultural'],
        'celebrity-gossip': ['celebrity', 'showbiz', 'entertainment'],

        // Lifestyle children
        'travel': ['travel', 'trip', 'vacation', 'tourist'],
        'food-drink': ['food', 'drink', 'cuisine', 'dining'],
        'fashion-beauty': ['fashion', 'beauty', 'style'],
        'home-garden': ['home', 'house', 'garden'],
        'consumer-automotive': ['car', 'vehicle', 'automotive'],

        // Social children
        'civil-rights': ['civil rights', 'human rights', 'equality'],
        'education': ['education', 'school', 'student', 'teacher'],
        'religion-faith': ['religion', 'faith', 'church', 'spiritual'],
        'labor': ['labor', 'worker', 'employment', 'job'],

        // Opinion
        'opinion-editorial': ['opinion', 'editorial', 'commentary'],
    }

    // ROOT-LEVEL CATEGORIES (Level 1) - Fallback only
    const rootCategories: Record<string, string[]> = {
        'world-current-affairs': ['world', 'international', 'global', 'foreign', 'nation'],
        'business-finance-economy': ['business', 'finance', 'economy', 'money', 'peso'],
        'law-crime-justice': ['law', 'crime', 'justice', 'legal', 'court'],
        'science-technology': ['science', 'technology', 'tech'],
        'health-medicine': ['health', 'medicine', 'medical', 'hospital', 'doctor'],
        'sports': ['sports', 'athlete', 'game', 'match', 'player'],
        'arts-entertainment-culture': ['entertainment', 'showbiz', 'celebrity', 'star'],
        'lifestyle-leisure': ['lifestyle', 'leisure', 'living'],
        'social-issues': ['social', 'society', 'community', 'issue'],
    }

    // Check leaf categories first (most specific)
    for (const [category, keywords] of Object.entries(leafCategories)) {
        if (keywords.some(keyword => textToSearch.includes(keyword))) {
            return category
        }
    }

    // Check parent categories next
    for (const [category, keywords] of Object.entries(parentCategories)) {
        if (keywords.some(keyword => textToSearch.includes(keyword))) {
            return category
        }
    }

    // Check root categories last
    for (const [category, keywords] of Object.entries(rootCategories)) {
        if (keywords.some(keyword => textToSearch.includes(keyword))) {
            return category
        }
    }

    return 'world-current-affairs' // Default fallback
}

async function main() {
    console.log('🔄 Starting Article Recategorization Migration...\n')

    // Fetch all categories and build slug -> id map
    const categories = await prisma.category.findMany()
    const categoryMap = new Map<string, string>()
    for (const cat of categories) {
        categoryMap.set(cat.slug, cat.id)
    }
    console.log(`📂 Loaded ${categoryMap.size} categories\n`)

    // Fetch all articles
    const articles = await prisma.article.findMany({
        include: { category: true }
    })
    console.log(`📰 Found ${articles.length} articles to process\n`)

    let updated = 0
    let unchanged = 0
    let notFound = 0
    const categoryChanges: Record<string, number> = {}

    for (const article of articles) {
        const newCategorySlug = determineCategory(article.title, article.contentBody)
        const newCategoryId = categoryMap.get(newCategorySlug)

        if (!newCategoryId) {
            console.log(`  ⚠️  Category "${newCategorySlug}" not found for: ${article.title.substring(0, 50)}...`)
            notFound++
            continue
        }

        if (article.categoryId === newCategoryId) {
            unchanged++
            continue
        }

        // Update the article
        await prisma.article.update({
            where: { id: article.id },
            data: { categoryId: newCategoryId }
        })

        // Track changes
        const changeKey = `${article.category.slug} → ${newCategorySlug}`
        categoryChanges[changeKey] = (categoryChanges[changeKey] || 0) + 1
        updated++

        if (updated % 10 === 0) {
            console.log(`  ✓ Updated ${updated} articles...`)
        }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`  ✅ Updated:   ${updated}`)
    console.log(`  ⏸️  Unchanged: ${unchanged}`)
    console.log(`  ⚠️  Not found: ${notFound}`)
    console.log(`  📰 Total:     ${articles.length}`)

    if (Object.keys(categoryChanges).length > 0) {
        console.log('\n📋 Category Changes:')
        const sorted = Object.entries(categoryChanges).sort((a, b) => b[1] - a[1])
        for (const [change, count] of sorted.slice(0, 20)) {
            console.log(`    ${count}x ${change}`)
        }
        if (sorted.length > 20) {
            console.log(`    ... and ${sorted.length - 20} more`)
        }
    }

    console.log('\n✅ Migration completed!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Migration failed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
