# 📰 PH-NewsHub

A comprehensive Philippine news aggregation platform built with Next.js 16, designed for production deployment with monetization support.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Complete deployment instructions for Vercel, Supabase, and Render
- **[PH-NEWSHUB-DELIVERABLES.md](./PH-NEWSHUB-DELIVERABLES.md)** - Technical architecture and implementation details
- **[COPILOT-ALTERNATIVES.md](./COPILOT-ALTERNATIVES.md)** - GitHub Copilot quota solutions and alternative development tools

## 🛠️ Development

### GitHub Copilot Quota Issues?

If you've reached your GitHub Copilot monthly quota, check out our comprehensive guide:

👉 **[COPILOT-ALTERNATIVES.md](./COPILOT-ALTERNATIVES.md)**

This guide covers:
- How to upgrade to GitHub Copilot Pro
- Free alternative AI coding assistants (Codeium, Cursor, etc.)
- Manual development workflows without AI
- Testing strategies for deployment

### Tech Stack

- **Framework:** Next.js 16
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (via Prisma)
- **Authentication:** Next-Auth
- **UI Components:** Radix UI + shadcn/ui
- **Deployment:** Vercel (frontend) + Render (scraper) + Supabase (database)

## 📦 Project Structure

```
ph-newshub/
├── src/
│   ├── app/              # Next.js 16 app directory
│   ├── components/       # React components
│   └── lib/             # Utility functions
├── prisma/              # Database schema
├── public/              # Static assets
├── mini-services/       # Scraper services
└── docs/               # Documentation
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

For comprehensive testing and deployment procedures, see [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md).

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

This project is for educational and development purposes.

## 🆘 Need Help?

- **Development issues:** Check [COPILOT-ALTERNATIVES.md](./COPILOT-ALTERNATIVES.md)
- **Deployment issues:** Check [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- **Architecture questions:** Check [PH-NEWSHUB-DELIVERABLES.md](./PH-NEWSHUB-DELIVERABLES.md)
