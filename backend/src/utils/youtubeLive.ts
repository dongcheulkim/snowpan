// 유튜브 채널 라이브 여부 — 스키장 투어 웹캠(embed/live_stream?channel=UC...)이 지금 방송 중인지.
// 채널의 /live 페이지 HTML 에 "isLive":true 가 있으면 방송 중. 10분 캐시, 실패하면 null(모름).
// 시즌오프엔 방송이 없어 임베드가 "동영상을 볼 수 없습니다"로 보이므로, 프론트가 이 값으로 안내 화면을 대신 보여준다 (2026-09-27).
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; live: boolean | null }>();

export function youtubeChannelOf(stream: string): string | null {
  const m = stream.match(/youtube\.com\/embed\/live_stream\?channel=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

export async function isYoutubeChannelLive(channelId: string): Promise<boolean | null> {
  const hit = cache.get(channelId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.live;
  let live: boolean | null = null;
  try {
    const res = await fetch(`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      const html = await res.text();
      live = /"isLive":true/.test(html) || /"isLiveNow":true/.test(html);
    }
  } catch { live = null; }
  cache.set(channelId, { at: Date.now(), live });
  return live;
}

// 웹캠 목록에 liveNow 를 붙인다 (유튜브 채널만 판정, 나머지는 null)
export async function annotateLive<T extends { stream: string }>(cams: T[]): Promise<(T & { liveNow: boolean | null })[]> {
  return Promise.all(cams.map(async (c) => {
    const ch = youtubeChannelOf(c.stream);
    return { ...c, liveNow: ch ? await isYoutubeChannelLive(ch) : null };
  }));
}
