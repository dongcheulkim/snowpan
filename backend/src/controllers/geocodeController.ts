// 관리자: 좌표가 없는 매장 일괄 지오코딩. 한 번에 limit 개(기본 150) — 반복 호출로 전체 처리.
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { geocodeAddress, geocodeConfigured, geocodeDebug, geocodeKeyword, nearestResortId, distanceKm, RESORT_LINK_KM } from '../utils/geocode';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const geocodeBackfill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!geocodeConfigured()) { res.json({ configured: false, processed: 0, found: 0, remaining: 0 }); return; }
    if (req.body?.debug) { res.json(await geocodeDebug(String(req.body.debug))); return; }
    const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '150'), 10) || 150, 1), 500);
    // 스키샵·정비샵은 주소 필수(non-null), 렌탈은 주소 선택 — where 를 나눔
    const whereShop = { lat: null } as const;
    const whereRental = { lat: null, address: { not: null } } as const;
    const sel = { id: true, address: true } as const;
    const [ski, rep, ren] = await Promise.all([
      prisma.skiShop.findMany({ where: whereShop, select: sel, take: limit }),
      prisma.repairShop.findMany({ where: whereShop, select: sel, take: limit }),
      prisma.rental.findMany({ where: whereRental, select: sel, take: limit }),
    ]);
    const targets = [
      ...ski.map((s) => ({ kind: 'skishop' as const, ...s })),
      ...rep.map((s) => ({ kind: 'repair' as const, ...s })),
      ...ren.map((s) => ({ kind: 'rental' as const, ...s })),
    ].slice(0, limit);
    let found = 0;
    const missed: string[] = [];
    for (const t of targets) {
      const c = await geocodeAddress(t.address || '');
      if (c) {
        const data = { lat: c.lat, lng: c.lng };
        if (t.kind === 'skishop') await prisma.skiShop.update({ where: { id: t.id }, data });
        else if (t.kind === 'repair') await prisma.repairShop.update({ where: { id: t.id }, data });
        else await prisma.rental.update({ where: { id: t.id }, data });
        found++;
      } else {
        // 못 찾은 건 다음 호출에서 또 시도하지 않도록 0,0 대신 그대로 두되, 응답에 남김
        missed.push(`${t.kind}:${t.id}`);
      }
      await sleep(60);
    }
    const [r1, r2, r3] = await Promise.all([
      prisma.skiShop.count({ where: whereShop }), prisma.repairShop.count({ where: whereShop }), prisma.rental.count({ where: whereRental }),
    ]);
    res.json({ configured: true, processed: targets.length, found, missed, remaining: r1 + r2 + r3 });
  } catch (error) {
    console.error('Geocode backfill error:', error);
    res.status(500).json({ error: '좌표 변환 중 오류가 발생했습니다.' });
  }
};

// 관리자: 리조트 좌표 채우기 — 리조트명 키워드 검색, 결과 주소가 리조트 소재 시/군과 맞을 때만 채택
export const resortsGeocode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!geocodeConfigured()) { res.json({ configured: false }); return; }
    const force = Boolean(req.body?.force);
    const resorts = await prisma.skiResort.findMany({ select: { id: true, name: true, location: true, lat: true } });
    const out: Record<string, unknown>[] = [];
    for (const r of resorts) {
      if (r.lat != null && !force) { out.push({ name: r.name, skipped: true }); continue; }
      const region = (r.location.split(/\s+/).find((t) => /(시|군|구)$/.test(t)) || '').trim();
      const hit = (await geocodeKeyword(`${r.name} 스키장`, region)) || (await geocodeKeyword(r.name, region));
      if (hit) await prisma.skiResort.update({ where: { id: r.id }, data: { lat: hit.lat, lng: hit.lng } });
      out.push({ name: r.name, region, found: !!hit, lat: hit?.lat, lng: hit?.lng, address: hit?.address });
      await sleep(80);
    }
    res.json({ configured: true, resorts: out });
  } catch (error) {
    console.error('Resorts geocode error:', error);
    res.status(500).json({ error: '리조트 좌표 변환 중 오류가 발생했습니다.' });
  }
};

// 관리자: 리조트 미연결 매장(좌표 있음)을 반경 내 가장 가까운 리조트에 자동 연결. dryRun 이면 계획만.
export const autoResort = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dryRun = Boolean(req.body?.dryRun);
    const sel = { id: true, name: true, address: true, lat: true, lng: true, resortId: true } as const;
    const where = { resortId: null, lat: { not: null } } as const;
    const [ski, rep, ren, resorts] = await Promise.all([
      prisma.skiShop.findMany({ where, select: sel }), prisma.repairShop.findMany({ where, select: sel }), prisma.rental.findMany({ where, select: sel }),
      prisma.skiResort.findMany({ where: { lat: { not: null } }, select: { id: true, name: true, lat: true, lng: true } }),
    ]);
    const nameOf = new Map(resorts.map((r) => [r.id, r.name]));
    const plan: { kind: string; id: string; name: string; address: string | null; resort: string; km: number }[] = [];
    const targets = [
      ...ski.map((s) => ({ kind: 'skishop' as const, ...s })), ...rep.map((s) => ({ kind: 'repair' as const, ...s })), ...ren.map((s) => ({ kind: 'rental' as const, ...s })),
    ];
    for (const t of targets) {
      const rid = await nearestResortId({ lat: t.lat as number, lng: t.lng as number });
      if (!rid) continue;
      const r = resorts.find((x) => x.id === rid)!;
      plan.push({ kind: t.kind, id: t.id, name: t.name, address: t.address, resort: nameOf.get(rid) || rid, km: Math.round(distanceKm({ lat: t.lat as number, lng: t.lng as number }, { lat: r.lat as number, lng: r.lng as number }) * 10) / 10 });
      if (!dryRun) {
        const data = { resortId: rid };
        if (t.kind === 'skishop') await prisma.skiShop.update({ where: { id: t.id }, data });
        else if (t.kind === 'repair') await prisma.repairShop.update({ where: { id: t.id }, data });
        else await prisma.rental.update({ where: { id: t.id }, data });
      }
    }
    res.json({ dryRun, radiusKm: RESORT_LINK_KM, candidates: targets.length, linked: plan.length, plan });
  } catch (error) {
    console.error('Auto resort error:', error);
    res.status(500).json({ error: '리조트 자동 연결 중 오류가 발생했습니다.' });
  }
};
