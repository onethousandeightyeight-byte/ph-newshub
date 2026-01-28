
# PH-NewsHub AI Agent Instructions

Welcome to PH-NewsHub! This guide will help you understand the project's architecture, conventions, and development workflows.

## 🚀 The Big Picture

PH-NewsHub is a news aggregation platform built on a monorepo architecture. It consists of:

1.  **Next.js Frontend**: The main web application located in the `src/` directory. It serves the UI and API routes.
2.  **News Scraper Microservice**: A hybrid Python/Node.js service in `mini-services/news-scraper` that fetches and processes news articles.
3.  **Database**: Uses PostgreSQL (via Prisma) for data persistence. The schema is defined in `prisma/schema.prisma`.
4.  **Web Server**: Caddy is used as a reverse proxy in development, configured in `Caddyfile`.

## 🛠️ Critical Developer Workflows

### 1. Initial Project Setup

To get the development environment running, follow these steps in order:

```bash
# 1. Install frontend dependencies
npm install

# 2. Push the database schema
npm run db:push

# 3. Seed the database with news categories (VERY IMPORTANT!)
npm run db:seed

# 4. Start the Next.js development server
npm run dev
```

### 2. Running the News Scraper

The scraper is a separate service that needs to be run independently.

```bash
# 1. Navigate to the scraper directory
cd mini-services/news-scraper

# 2. Install Python dependencies (first time only)
# Make sure you have a Python virtual environment activated.
pip install -r requirements.txt

# 3. Run the scraper script
python scraper.py
```

The scraper will run on a schedule to fetch new articles. It communicates with the Next.js application's API.

## 🏗️ Architectural Patterns & Conventions

### Database with Prisma

-   The single source of truth for the database schema is `prisma/schema.prisma`.
-   After any change to the schema, run `npm run db:generate` to update the Prisma client.
-   For local development, the database is typically SQLite, but for production, it's PostgreSQL. The `DEPLOYMENT-GUIDE.md` has more details.

### Scraper Service

-   The core scraping logic is in `scraper.py`.
-   The `historical_scraper.py` is for backfilling data.
-   This Python script is wrapped by a Node.js/Bun server (`index.ts`) which provides an API, for instance for health checks.
-   Configuration for the scraper, including API endpoints and sources, is in `mini-services/news-scraper/config.json`.

### Frontend Components

-   The project uses `shadcn/ui` for UI components. These are located in `src/components/ui`.
-   Reusable, higher-level components are in `src/components`.

### API Routes

-   API routes are built using Next.js API routes and are located in `src/app/api/`. These are the primary way the frontend and scraper service interact with the database.

## 🔑 Key Files & Directories

-   `src/app/`: The Next.js application source code.
-   `prisma/schema.prisma`: The database schema. All data models (`Article`, `Category`, `Source`) are defined here.
-   `mini-services/news-scraper/`: The news scraper microservice.
-   `QUICK-SETUP.md`: Your primary guide for setting up the local development environment.
-   `DEPLOYMENT-GUIDE.md`: Contains detailed instructions for deploying the application to production on Vercel, Supabase, and Render.
-   `Caddyfile`: Configuration for the Caddy reverse proxy used in local development.

By following these guidelines, you should be able to effectively contribute to the PH-NewsHub codebase.
