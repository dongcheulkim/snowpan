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
      const m = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})"/);
      if (live && m) videoId = m[1];
    }
  } catch { live = null; }
  cache.set(channelId, { at: Date.now(), live, videoId });
  return { live, videoId };
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
