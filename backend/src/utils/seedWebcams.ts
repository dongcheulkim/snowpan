import prisma from '../config/database';

// 웹캠 스트림 시드 — 실측 검증된(2026-08-23, curl + CORS 확인) 임베드 가능 스트림만.
// cameras 는 이 시드가 진실원(source of truth): 부팅마다 해당 slug 의 cameras/camCount 를 갱신.
// 여기 없는 slug 는 건드리지 않음(외부 링크 폴백 유지).
//
// 검증 기준:
//  - HLS: HTTPS + Access-Control-Allow-Origin(*) 확인된 것만 (브라우저 크로스오리진 재생 가능)
//  - 유튜브: 공식 채널 라이브. embed/live_stream?channel= 형식은 방송 ID 가 바뀌어도 유효.
//  - high1 은 스트림이 살아있으나 HTTP 전용(혼합콘텐츠 차단)이라 제외 — 외부 링크 유지.
//  - 시즌오프(404) 스트림도 포함 — 겨울에 자동으로 살아나고, 꺼진 동안은 플레이어가
//    "지금은 방송 중이 아니에요" 안내를 보여줌.

type Cam = { label: string; stream: string };

const WEBCAM_STREAMS: Record<string, Cam[]> = {
  yongpyong: [
    { label: '베이스 전경 · 레드 슬로프', stream: 'https://live.yongpyong.co.kr/cam08/index.m3u8' },
    { label: '옐로우 슬로프', stream: 'https://live.yongpyong.co.kr/cam11/index.m3u8' },
    { label: '발왕산 스카이워크', stream: 'https://live.yongpyong.co.kr/cam01/index.m3u8' },
    { label: '발왕산 천년주목숲길', stream: 'https://live.yongpyong.co.kr/cam02/index.m3u8' },
    { label: '모나용평 진입로', stream: 'https://live.yongpyong.co.kr/cam05/index.m3u8' },
  ],
  wellihilli: [
    { label: '알파 슬로프', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam02.stream/playlist.m3u8' },
    { label: '베이스', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam03.stream/playlist.m3u8' },
    { label: '슬로프 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam04.stream/playlist.m3u8' },
    { label: '정상 광장', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam05.stream/playlist.m3u8' },
    { label: '슬로프 전경', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam06.stream/playlist.m3u8' },
    { label: '워터플래닛', stream: 'https://live.wellihillipark.com/wellihillipark/_definst_/cam07.stream/playlist.m3u8' },
  ],
  phoenix: [
    { label: '펭귄 · 베이스', stream: 'https://streaming.phoenixhnr.co.kr/hls/bc_01.m3u8' },
    // 아래는 시즌 중에만 송출 (여름엔 404 → 플레이어가 안내 표시)
    { label: '베이스', stream: 'https://streaming.phoenixhnr.co.kr/hls/bc_02.m3u8' },
    { label: '호크 · 스패로우', stream: 'https://streaming.phoenixhnr.co.kr/hls/yh_02.m3u8' },
    { label: '도도', stream: 'https://streaming.phoenixhnr.co.kr/hls/sp_01.m3u8' },
    { label: '불새마루', stream: 'https://streaming.phoenixhnr.co.kr/hls/ht_01.m3u8' },
    { label: '스노우 빌리지', stream: 'https://streaming.phoenixhnr.co.kr/hls/yh_01.m3u8' },
    { label: '몽블랑 정상', stream: 'https://streaming.phoenixhnr.co.kr/hls/mb_03.m3u8' },
  ],
  alpensia: [
    { label: '스키700 전경 (유튜브 라이브)', stream: 'https://www.youtube.com/embed/live_stream?channel=UCrmFQpznvkrLQSjJG1wGdGg' },
  ],
  // 엘리시안 — 공식 유튜브 채널('1엘리시안1')이 시즌 중 슬로프 라이브 송출.
  // 채널 임베드 방식이라 방송 ID 가 시즌마다 바뀌어도 유효. 오프시즌엔 유튜브가 "오프라인" 표시.
  elysian: [
    { label: '슬로프 실시간 (유튜브 라이브)', stream: 'https://www.youtube.com/embed/live_stream?channel=UCS2jAqQUUyWgtN36tzpH8KA' },
  ],
  // 지산 — 유효한 HTTPS 인증서 + CORS(*) 의 정석 HLS. 시즌 중에만 송출 (여름 404 → 안내 표시).
  jisan: [
    { label: '레몬 탑승장', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan1.m3u8' },
    { label: '슬로프 캠 2', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan2.m3u8' },
    { label: '슬로프 캠 3', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan3.m3u8' },
    { label: '슬로프 캠 4', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan4.m3u8' },
    { label: '실버 탑승장', stream: 'https://ant.livecity.co.kr:5443/jisancam/streams/jisan5.m3u8' },
  ],
  // 에덴밸리 — 공식 웹캠 팝업이 쓰는 rtsp.me 임베드 (임베드 전용 서비스, HTTPS iframe OK).
  eden: [
    { label: '슬로프 캠 1', stream: 'https://rtsp.ru/embed/nKGZGiRD/' },
    { label: '슬로프 캠 2', stream: 'https://rtsp.ru/embed/dh6R7d4k' },
  ],
  // 하이원 — 원 서버가 HTTP 전용이라 브라우저 차단 → snowpan.kr Vercel 프록시(/cam/high1) 경유.
  // 18캠 중 주요 지점 8곳. 지금도 1080p 송출 중 (연중).
  high1: [
    { label: '하이원탑 (제우스1 입구)', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch1.stream/playlist.m3u8' },
    { label: '마운틴 베이스 (아테나 리프트)', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch7.stream/playlist.m3u8' },
    { label: '밸리탑 (빅토리아1 입구)', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch9.stream/playlist.m3u8' },
    { label: '마운틴허브 (스노우월드 입구)', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch4.stream/playlist.m3u8' },
    { label: '밸리허브 (헤라 리프트 입구)', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch11.stream/playlist.m3u8' },
    { label: '제우스2 합류구간', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch10.stream/playlist.m3u8' },
    { label: '아폴로 베이스', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch16.stream/playlist.m3u8' },
    { label: '밸리 베이스', stream: 'https://snowpan.kr/cam/high1/live/_definst_/ch18.stream/playlist.m3u8' },
  ],
  // 곤지암 — CDN 이 HTTP 전용(인증서 불일치) → 프록시(/cam/konjiam) 경유. cam01/04/05 는 연중 송출.
  konjiam: [
    { label: '정상 휴게소', stream: 'https://snowpan.kr/cam/konjiam/konjiam/cam01.stream/playlist.m3u8' },
    { label: '중상급 베이스', stream: 'https://snowpan.kr/cam/konjiam/konjiam/cam04.stream/playlist.m3u8' },
    { label: '중간 슬로프', stream: 'https://snowpan.kr/cam/konjiam/konjiam/cam05.stream/playlist.m3u8' },
    { label: '정상부 슬로프', stream: 'https://snowpan.kr/cam/konjiam/konjiam/cam02.stream/playlist.m3u8' },
    { label: '초중급 베이스', stream: 'https://snowpan.kr/cam/konjiam/konjiam/cam03.stream/playlist.m3u8' },
  ],
};

export async function seedWebcams(): Promise<void> {
  try {
    for (const [slug, cameras] of Object.entries(WEBCAM_STREAMS)) {
      await prisma.webcam.updateMany({
        where: { slug },
        data: { cameras, camCount: cameras.length },
      });
    }
    console.log('[seedWebcams] 웹캠 스트림 시드 완료');
  } catch (err) {
    console.error('[seedWebcams] 실패:', err);
  }
}
