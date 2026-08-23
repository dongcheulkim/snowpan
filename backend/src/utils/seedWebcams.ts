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
