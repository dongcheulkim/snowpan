import { Router, Request, Response } from 'express';
import prisma from '../config/database';

const router = Router();

const SITE_URL = process.env.FRONTEND_URL || 'https://pansports.vercel.app';

const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/used', priority: 0.9, changefreq: 'daily' },
  { path: '/rental', priority: 0.8, changefreq: 'daily' },
  { path: '/lesson', priority: 0.8, changefreq: 'daily' },
  { path: '/accommodation', priority: 0.8, changefreq: 'daily' },
  { path: '/skishop', priority: 0.7, changefreq: 'weekly' },
  { path: '/repair', priority: 0.7, changefreq: 'weekly' },
  { path: '/webcam', priority: 0.6, changefreq: 'daily' },
  { path: '/community', priority: 0.7, changefreq: 'daily' },
  { path: '/new', priority: 0.6, changefreq: 'weekly' },
  { path: '/gear-guide', priority: 0.5, changefreq: 'monthly' },
  { path: '/competitions', priority: 0.5, changefreq: 'weekly' },
];

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

function urlEntry(loc: string, lastmod?: Date, changefreq?: string, priority?: number): string {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority !== undefined ? `    <priority>${priority.toFixed(1)}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    for (const r of STATIC_ROUTES) {
      parts.push(urlEntry(`${SITE_URL}${r.path}`, undefined, r.changefreq, r.priority));
    }

    // 중고매물 (판매중만)
    const products = await prisma.product.findMany({
      where: { status: 'selling', category: 'used' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    for (const p of products) {
      parts.push(urlEntry(`${SITE_URL}/used/${p.id}`, p.updatedAt, 'weekly', 0.7));
    }

    // 숙소
    const accommodations = await prisma.accommodation.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    for (const a of accommodations) {
      parts.push(urlEntry(`${SITE_URL}/accommodation/${a.id}`, a.updatedAt, 'weekly', 0.6));
    }

    // 레슨
    const lessons = await prisma.lesson.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    for (const l of lessons) {
      parts.push(urlEntry(`${SITE_URL}/lesson/${l.id}`, l.updatedAt, 'weekly', 0.6));
    }

    // 렌탈
    const rentals = await prisma.rental.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    for (const r of rentals) {
      parts.push(urlEntry(`${SITE_URL}/rental/${r.id}`, r.updatedAt, 'weekly', 0.6));
    }

    // 스키샵
    const skiShops = await prisma.skiShop.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    for (const s of skiShops) {
      parts.push(urlEntry(`${SITE_URL}/skishop/${s.id}`, s.updatedAt, 'weekly', 0.5));
    }

    // 정비샵
    const repairShops = await prisma.repairShop.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    for (const r of repairShops) {
      parts.push(urlEntry(`${SITE_URL}/repair/${r.id}`, r.updatedAt, 'weekly', 0.5));
    }

    // 커뮤니티 게시글
    const posts = await prisma.post.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });
    for (const p of posts) {
      parts.push(urlEntry(`${SITE_URL}/community/${p.id}`, p.updatedAt, 'weekly', 0.4));
    }

    parts.push('</urlset>');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
    res.send(parts.join('\n'));
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Sitemap generation failed');
  }
});

export default router;
