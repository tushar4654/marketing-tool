# Content Intelligence Engine

## What This Is
AI-powered social content intelligence platform for DevTool GTM teams. Scrapes LinkedIn, Twitter/X, and blogs (RSS) to generate persona-tailored content suggestions using Claude AI.

## Context
- **Stack:** Next.js 16, Prisma (SQLite), Claude API (Anthropic), Apify (scraping), Mem0 (memory)
- **Status:** v2 deployed, core features working. Now doing UX refinements.
- **Users:** Social media managers at DevTool companies

## Requirements

### Validated
- ✓ Multi-source scraping (LinkedIn, Twitter, RSS)
- ✓ Persona-based content suggestions via Claude
- ✓ Trending intelligence with topic extraction
- ✓ Hook variations & content repurposing
- ✓ Mem0 memory layer
- ✓ Server-side caching for trending
- ✓ Post compression for token optimization

### Active
- [ ] Content Sources: CSV export, flat table view with delete
- [ ] All Feed: Rename from "Content Feed", add date filter
- [ ] Suggestions: Original-post-first layout, dismiss reasons, unused filter
- [ ] Trending: Topic buttons with post previews, remove Most Active Sources, channel filter
- [ ] API cost optimization across all Claude/Apify calls

### Out of Scope
- Production deployment
- Authentication/multi-tenant

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite for DB | Simple, portable | ✓ Working |
| Claude Sonnet for suggestions | Best quality | ✓ Working |
| Keyword matching for trending posts | Zero Claude cost | Pending |
| Apify batched scraping | Cost optimization | ✓ Working |

---
*Last updated: 2026-04-15 after initialization*
