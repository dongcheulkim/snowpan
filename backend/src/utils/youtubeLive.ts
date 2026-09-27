// 유튜브 채널 라이브 여부 — 스키장 투어 웹캠(embed/live_stream?channel=UC...)이 지금 방송 중인지.
// 채널의 /live 페이지 HTML 에 "isLive":true 가 있으면 방송 중. 10분 캐시, 실패하면 null(모름).
// 시즌오프엔 방송이 없어 임베드가 "동영상을 볼 수 없습니다"로 보이므로, 프론트가 이 값으로 안내 화면을 대신 보여준다 (2026-09-27).
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; live: boolean | null; videoId: string | null }>();

export function youtubeChannelOf(stream: string): string | null {
  const m = stream.match(/youtube\.com\/embed\/live_stream\?channel=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

// 방송 중이면 지금 라이브 영상 ID 도 같이 (canonical 링크가 watch?v=ID 를 가리킴) — 채널 임베드 대신 영상 임베드가 더 안정적이라 프론트가 이걸 우선 쓴다
export async function resolveYoutubeLive(channelId: string): Promise<{ live: boolean | null; videoId: string | null }> {
  const hit = cache.get(channelId);
  if (hit && Date.now() - hit.at < TTL_MS) return { live: hit.live, videoId: hit.videoId };
  let live: boolean | null = null; let videoId: string | null = null;
  try {
    const res = await fetch(`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const html = await res.text();
      live = /"isLive":true/.test(html) || /"isLiveNow":true/.test(html);
      // 영상 ID 는 "이 페이지가 그 채널의 라이브 시청 페이지"일 때만 믿는다 — canonical/itemprop 이 watch?v= 를 가리키고,
      // 페이지 소유 채널이 요청한 채널과 같아야 한다. (첫 "videoId" 를 잡으면 추천 영상 등 엉뚱한 영상이 붙는다 — 2026-09-27 실제 발생)
      const m = html.match(/<link rel="canonical" href="https:\/\/(?:www|m)\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})"/)
        || html.match(/<meta itemprop="identifier" content="([A-Za-z0-9_-]{6,})"/);
      const owned = html.includes(`"channelId":"${channelId}"`) || html.includes(`"externalChannelId":"${channelId}"`);
      if (live && m && owned) videoId = m[1];
      // 데이터센터 IP 로 받는 껍데기 페이지의 영상 목록에서 고르는 건 금지 — 다른 채널의 추천 라이브(마쓰모토성 등)가 붙었음 (2026-09-27).
      // 껍데기 페이지면 영상 ID 없이 채널 임베드로 두고, 정확한 판정은 YOUTUBE_API_KEY(Data API) 로 한다.
      if (live && !videoId) console.warn(`youtube live: videoId 미확정 channel=${channelId} canonical=${m ? m[1] : '-'} owned=${owned} title=${(html.match(/<title>([^<]*)/) || [])[1] || '-'}`);
    }
  } catch { live = null; }
  cache.set(channelId, { at: Date.now(), live, videoId });
  return { live, videoId };
}
// HTML 의 "videoId":"X" 조각마다 그 뒤(다음 videoId 전까지)에 LIVE NOW 배지가 있으면 방송 중인 영상으로 본다
export function findLiveVideoIds(html: string): string[] {
  const out: string[] = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  const hits: { id: string; at: number }[] = [];
  for (let m = re.exec(html); m; m = re.exec(html)) hits.push({ id: m[1], at: m.index });
  for (let i = 0; i < hits.length; i++) {
    const seg = html.slice(hits[i].at, Math.min(hits[i + 1]?.at ?? html.length, hits[i].at + 6000));
    if (/BADGE_STYLE_TYPE_LIVE_NOW|"style":"LIVE"|"isLiveNow":true|thumbnailOverlayTimeStatusRenderer":\{"text":\{"runs":\[\{"text":"LIVE"/.test(seg) && !out.includes(hits[i].id)) out.push(hits[i].id);
  }
  return out;
}

export async function isYoutubeChannelLive(channelId: string): Promise<boolean | null> { return (await resolveYoutubeLive(channelId)).live; }

// YouTube Data API(키가 있을 때) — 채널의 지금 라이브 영상 목록을 정확히 준다. search.list 는 100 유닛이라 2시간 캐시 (일 1만 유닛 한도 안).
const API_TTL_MS = 2 * 60 * 60 * 1000;
const apiCache = new Map<string, { at: number; lives: { id: string; title: string }[] | null }>();
export async function listLiveViaApi(channelId: string): Promise<{ id: string; title: string }[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const hit = apiCache.get(channelId);
  if (hit && Date.now() - hit.at < API_TTL_MS) return hit.lives;
  let lives: { id: string; title: string }[] | null = null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&eventType=live&type=video&maxResults=5&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (res.ok) {
      const data = (await res.json()) as { items?: { id?: { videoId?: string }; snippet?: { title?: string } }[] };
      lives = (data.items || []).map((it) => ({ id: String(it.id?.videoId || ''), title: String(it.snippet?.title || '') })).filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.id));
    } else {
      console.warn('youtube api', res.status, (await res.text()).slice(0, 200));
    }
  } catch (e) { console.warn('youtube api error:', e instanceof Error ? e.message : e); }
  apiCache.set(channelId, { at: Date.now(), lives });
  return lives;
}

// 웹캠 목록에 liveNow 를 붙인다 (유튜브 채널만 판정, 나머지는 null). API 키가 있으면 채널의 라이브를 전부 탭으로 펼친다.
export async function annotateLive<T extends { label: string; stream: string }>(cams: T[]): Promise<(T & { liveNow: boolean | null; liveVideoId: string | null })[]> {
  const rows = await Promise.all(cams.map(async (c) => {
    const ch = youtubeChannelOf(c.stream);
    if (!ch) return [{ ...c, liveNow: null, liveVideoId: null }];
    const lives = await listLiveViaApi(ch);
    if (lives) {
      if (lives.length === 0) return [{ ...c, liveNow: false, liveVideoId: null }];
      return lives.map((v, i) => ({ ...c, label: lives.length > 1 ? `${c.label} ${i + 1}` : c.label, liveNow: true, liveVideoId: v.id }));
    }
    const r = await resolveYoutubeLive(ch);
    return [{ ...c, liveNow: r.live, liveVideoId: r.videoId }];
  }));
  return rows.flat();
}
