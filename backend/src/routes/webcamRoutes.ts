// 웹캠 — 공개 read-only API. 어드민 추가/수정은 향후 어드민 라우트에서.
import { annotateLive } from '../utils/youtubeLive';
import { annotateHls, liveCountOf } from '../utils/webcamLive';
import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { pickVertical } from '../utils/vertical';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { vertical } = req.query;
    const verticalSlug = pickVertical(vertical);
    if (!verticalSlug) { res.status(400).json({ error: '잘못된 vertical 입니다.' }); return; }
    const list = await prisma.webcam.findMany({
      where: { active: true, vertical: verticalSlug },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true, slug: true, name: true, region: true,
        slopes: true, elevation: true, camCount: true, externalUrl: true, cameras: true,
      },
    });
    // 지금 실제로 송출 중인 카메라 수 — 목록 LIVE 배지는 이 값으로 (등록 수만 보면 시즌오프에도 LIVE 로 보임). 10분 캐시라 부담 없음.
    const liveCounts = await Promise.all(list.map((c) => liveCountOf(Array.isArray(c.cameras) ? (c.cameras as { stream: string }[]) : [])));
    // 스키장 투어(OverseasResort) 대표 사진을 slug 로 매칭해 붙임 — 웹캠 카드에도 사진 노출.
    // 웹캠 slug ↔ 투어 slug 표기 차이 3곳 보정 (엘리시안·오크·에덴).
    const camToResort: Record<string, string> = { elysian: 'elysian-gangchon', oak: 'oakvalley', eden: 'edenvalley' };
    const resortSlugs = list.map((c) => camToResort[c.slug] || c.slug);
    const resorts = await prisma.overseasResort.findMany({
      where: { slug: { in: resortSlugs } },
      select: { slug: true, image: true },
    });
    const imageBySlug = new Map(resorts.map((r) => [r.slug, r.image]));
    const withImage = list.map(({ cameras: _cams, ...c }, i) => ({ ...c, liveCount: liveCounts[i].live, offCount: liveCounts[i].off, image: imageBySlug.get(camToResort[c.slug] || c.slug) || null }));
    res.json(withImage);
  } catch (error) {
    console.error('Webcam list error:', error);
    res.status(500).json({ error: '웹캠 목록 조회 중 오류가 발생했습니다.' });
  }
});


// ===== 리조트 현재 기온 — Open-Meteo (무료·키 불필요), 10분 캐시 =====
// 슬러그 → 베이스 좌표. 한 번의 업스트림 호출로 전 리조트 조회.
const RESORT_COORDS: Record<string, [number, number]> = {
  yongpyong: [37.643, 128.680],
  alpensia: [37.658, 128.671],
  phoenix: [37.582, 128.323],
  wellihilli: [37.489, 128.245],
  high1: [37.204, 128.837],
  vivaldi: [37.647, 127.687],
  elysian: [37.821, 127.591],
  oak: [37.406, 127.816],
  o2: [37.180, 128.943],
  konjiam: [37.335, 127.290],
  jisan: [37.219, 127.342],
  muju: [35.890, 127.737],
  eden: [35.428, 129.014],
};

let weatherCache: { data: Record<string, number>; at: number } | null = null;
const WEATHER_TTL = 10 * 60 * 1000;

router.get('/weather', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (weatherCache && Date.now() - weatherCache.at < WEATHER_TTL) {
      res.json(weatherCache.data);
      return;
    }
    const slugs = Object.keys(RESORT_COORDS);
    const lats = slugs.map((sl) => RESORT_COORDS[sl][0]).join(',');
    const lons = slugs.map((sl) => RESORT_COORDS[sl][1]).join(',');
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&timezone=Asia%2FSeoul`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const arr = await r.json();
    const list = Array.isArray(arr) ? arr : [arr];
    const data: Record<string, number> = {};
    slugs.forEach((sl, i) => {
      const t = list[i]?.current?.temperature_2m;
      if (typeof t === 'number') data[sl] = Math.round(t);
    });
    weatherCache = { data, at: Date.now() };
    res.json(data);
  } catch (e) {
    console.error('Webcam weather error:', e);
    // 실패 시 빈 객체 — 프론트는 기온 표시만 생략
    res.json(weatherCache?.data || {});
  }
});

router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    if (!/^[a-z0-9_-]{1,32}$/i.test(slug)) {
      res.status(400).json({ error: '잘못된 식별자입니다.' });
      return;
    }
    const cam = await prisma.webcam.findUnique({
      where: { slug },
    });
    if (!cam || !cam.active) {
      res.status(404).json({ error: '존재하지 않는 웹캠입니다.' });
      return;
    }
    // 유튜브 채널 라이브 카메라(엘리시안·알펜시아 등)는 Data API 로 지금 방송 중인 영상 ID 를 붙여 준다 — 채널 임베드가 '동영상을 볼 수 없습니다' 로 뜨는 문제 방지, 방송 없으면 liveNow:false (2026-10-02)
    const cameras = Array.isArray(cam.cameras) ? (cam.cameras as { label: string; stream: string }[]) : [];
    const annotated = cameras.length ? await annotateHls(await annotateLive(cameras)) : cameras;
    res.json({ ...cam, cameras: annotated, camCount: annotated.length, liveCount: annotated.filter((c) => (c as { liveNow?: boolean | null }).liveNow === true).length });
  } catch (error) {
    console.error('Webcam detail error:', error);
    res.status(500).json({ error: '웹캠 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
