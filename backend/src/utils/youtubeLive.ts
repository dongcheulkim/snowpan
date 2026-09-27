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
      // 데이터센터 IP 로 받으면 canonical 없는 껍데기 페이지가 온다 — 그땐 목록 안에서 LIVE 배지가 붙은 영상 ID 를 고른다
      if (live && !videoId && owned) { const c = findLiveVideoIds(html); if (c.length) videoId = c[0]; }
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

// 웹캠 목록에 liveNow 를 붙인다 (유튜브 채널만 판정, 나머지는 null)
export async function annotateLive<T extends { stream: string }>(cams: T[]): Promise<(T & { liveNow: boolean | null; liveVideoId: string | null })[]> {
  return Promise.all(cams.map(async (c) => {
    const ch = youtubeChannelOf(c.stream);
    if (!ch) return { ...c, liveNow: null, liveVideoId: null };
    const r = await resolveYoutubeLive(ch);
    return { ...c, liveNow: r.live, liveVideoId: r.videoId };
  }));
}
