import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);

    // Pending suggestions (ready to use)
    const pendingSuggestions = await prisma.contentSuggestion.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        persona: { select: { name: true, role: true } },
        contentPost: { select: { platform: true, authorName: true, source: { select: { name: true } } } },
      },
    });

    // Stats
    const [totalSources, totalPosts, totalSuggestions, usedThisWeek, usedThisMonth, pendingCount, dismissedCount] = await Promise.all([
      prisma.contentSource.count(),
      prisma.contentPost.count(),
      prisma.contentSuggestion.count(),
      prisma.contentSuggestion.count({ where: { status: 'used', createdAt: { gte: weekAgo } } }),
      prisma.contentSuggestion.count({ where: { status: 'used', createdAt: { gte: monthAgo } } }),
      prisma.contentSuggestion.count({ where: { status: 'pending' } }),
      prisma.contentSuggestion.count({ where: { status: 'dismissed' } }),
    ]);

    // Streak: count consecutive days with "used" suggestions going backwards
    const usedByDay = await prisma.contentSuggestion.findMany({
      where: { status: 'used' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    let streak = 0;
    const daySet = new Set(usedByDay.map(s => s.createdAt.toISOString().split('T')[0]));
    const checkDate = new Date(now);
    // Allow today to not have a post yet — start checking from yesterday if today has none
    if (!daySet.has(checkDate.toISOString().split('T')[0])) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 60; i++) {
      const key = checkDate.toISOString().split('T')[0];
      if (daySet.has(key)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    // Trending topics from cache (ZERO Claude cost)
    let hotTopics = [];
    try {
      const cacheDir = join(process.cwd(), '.cache');
      const files = ['trending_default.json', ...Array.from({ length: 20 }, (_, i) => `trending_${i}.json`)];
      for (const f of files) {
        const fpath = join(cacheDir, f);
        if (existsSync(fpath)) {
          const cached = JSON.parse(readFileSync(fpath, 'utf-8'));
          if (cached.topics) {
            hotTopics = cached.topics.filter(t => t.heat >= 7).slice(0, 3).map(t => ({
              topic: t.topic, emoji: t.emoji, heat: t.heat, description: t.description,
              topDraft: t.suggestions?.[0] || null,
            }));
            break;
          }
        }
      }
    } catch {}

    // Recent posts (last 24h)
    const recentPosts = await prisma.contentPost.count({ where: { scrapedAt: { gte: todayStart } } });

    return NextResponse.json({
      pendingSuggestions,
      hotTopics,
      stats: { totalSources, totalPosts, totalSuggestions, usedThisWeek, usedThisMonth, pendingCount, dismissedCount, recentPosts, streak },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
