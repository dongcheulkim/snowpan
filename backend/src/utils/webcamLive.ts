// 국내 웹캠 스트림이 지금 살아 있는지 — HLS 는 플레이리스트를 받아 #EXTM3U 확인, 유튜브는 Data API/채널 페이지(youtubeLive), iframe 류는 확인 불가(null).
// 목록의 "LIVE" 배지가 카메라 등록 수만 보고 켜져서 시즌오프(지산 5개 전부 404)에도 LIVE 로 보이던 문제 대응 (2026-10-02). 10분 캐시, 프록시(snowpan.kr/cam/..)는 원본 주소로 바꿔 서버에서 직접 확인.
import { youtubeChannelOf, listLiveViaApi, resolveYoutubeLive } from './youtubeLive';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; live: boolean | null }>();
const PROXY: [RegExp, string][] = [
  [/^https:\/\/snowpan\.kr\/cam\/high1\//, 'http://59.30.12.195:1935/'],
  [/^https:\/\/snowpan\.kr\/cam\/konjiam\//, 'http://konjiam.live.cdn.cloudn.co.kr/'],
  [/^https:\/\/snowpan\.kr\/cam\/oak\//, 'http://cctv-oak9.ktcdn.co.kr/'],
];

export async function probeStream(stream: string): Promise<boolean | null> {
  const hit = cache.get(stream);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.live;
  let live: boolean | null = null;
  try {
    const ch = youtubeChannelOf(stream);
    if (ch) {
      const lives = await listLiveViaApi(ch);
      live = lives ? lives.length > 0 : (await resolveYoutubeLive(ch)).live;
    } else if (/\.m3u8(\?|$)/i.test(stream) || /\.stream\/?$/.test(stream)) {
      let url = stream;
      for (const [re, origin] of PROXY) if (re.test(stream)) url = stream.replace(re, origin);
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000), headers: { 'User-Agent': 'snowpan-webcam-probe/1.0' } });
      live = res.ok && (await res.text()).includes('#EXTM3U');
    }
  } catch { live = /\.m3u8|\.stream/.test(stream) ? false : null; }
  cache.set(stream, { at: Date.now(), live });
  return live;
}

// 카메라 배열에 liveNow 를 붙인다 (유튜브는 youtubeLive.annotateLive 가 영상 ID 까지 붙이므로 여기선 HLS 만)
export async function annotateHls<T extends { stream: string }>(cams: T[]): Promise<(T & { liveNow?: boolean | null })[]> {
  return Promise.all(cams.map(async (c) => (youtubeChannelOf(c.stream) ? c : { ...c, liveNow: await probeStream(c.stream) })));
}

export async function liveCountOf(cams: { stream: string }[]): Promise<number> {
  const r = await Promise.all(cams.map((c) => probeStream(c.stream)));
  return r.filter((x) => x === true).length;
}
