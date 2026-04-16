---
quick_id: 260415-moo
description: "UX overhaul across 4 sections"
tasks: 3
---

# Quick Task: UX Overhaul

## Task 1: Content Sources + All Feed
- **files:** src/app/content-sources/page.js, src/app/api/content-sources/route.js, src/app/content-feed/page.js, src/app/api/content-feed/route.js, src/app/layout.js
- **action:** Add CSV export button + API, flat table view with delete, rename "Content Feed" → "All Feed", add date filter UI + API
- **verify:** CSV downloads, date filter works, sidebar shows "All Feed"
- **done:** All 4 changes shipped

## Task 2: Suggestions Redesign
- **files:** src/app/suggestions/page.js, src/app/api/suggestions/route.js, prisma/schema.prisma
- **action:** Flip card layout (original post primary, suggestion secondary), add dismiss reason dropdown + DB field, add "Not Used" filter
- **verify:** Cards show source first, dismiss saves reason, unused filter works
- **done:** New suggestion layout live

## Task 3: Trending Intelligence Upgrade
- **files:** src/app/trending/page.js, src/app/api/trending/route.js
- **action:** Remove Most Active Sources, add topic filter buttons, show real posts per topic via keyword matching (zero Claude cost), add channel filter inside topics
- **verify:** Topics clickable, posts appear, channel filter works
- **done:** Trending page fully upgraded
