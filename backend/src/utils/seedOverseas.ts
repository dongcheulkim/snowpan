import prisma from '../config/database';

// 해외 스키 여행 초기 콘텐츠 시드 — 부팅 시 1회(비어있을 때만) 실행해 빈 화면 방지.
// 가이드는 사실 기반. 딜은 날조하지 않고 '공식 사이트' 링크(실제 클릭 가능)로만 시드하며,
// 가격이 붙는 파트너 상품은 관리자(에디터)가 어드민에서 직접 등록한다.

interface SeedResort {
  slug: string; name: string; country: string; region: string;
  summary: string; season: string; snowType: string; highlights: string;
  slopes: number; bestFor: string; description: string; official: string; featured?: boolean;
}

const RESORTS: SeedResort[] = [
  {
    slug: 'niseko', name: '니세코', country: '일본', region: '홋카이도',
    summary: '세계가 인정한 최고의 파우더', season: '12월 ~ 4월 초', snowType: '건설(파우더)',
    highlights: '파우더,나이트스키,백컨트리,온천', slopes: 30, bestFor: '파우더 매니아,중상급자',
    official: 'https://www.grandhirafu.jp/', featured: true,
    description:
      '홋카이도 서쪽에 자리한 니세코는 "재패나우(Japanuary)"라는 말을 만들 만큼 가볍고 건조한 파우더로 유명합니다.\n' +
      '4개 지역(그란히라후·비레이지·안누푸리·하나조노)이 하나의 산으로 이어져 다양한 코스를 즐길 수 있고, 나이트스키와 백컨트리도 활발합니다.\n' +
      '스키 후에는 천연 온천으로 피로를 풀 수 있어 한국 스키어에게 가장 인기 있는 해외 목적지입니다.',
  },
  {
    slug: 'hakuba', name: '하쿠바', country: '일본', region: '나가노',
    summary: '1998 동계올림픽의 무대, 광활한 슬로프', season: '12월 ~ 5월(고지대)', snowType: '파우더~정설',
    highlights: '대규모슬로프,올림픽코스,절경,백컨트리', slopes: 200, bestFor: '전 레벨',
    official: 'https://www.hakubavalley.com/', featured: true,
    description:
      '나가노현 하쿠바 밸리는 1998 동계올림픽 개최지로, 10개 스키장이 하나의 밸리로 묶여 있습니다.\n' +
      '초급부터 올림픽 활강 코스까지 난이도 폭이 넓어 전 레벨이 함께 가기 좋고, 3,000m급 북알프스의 절경이 압권입니다.\n' +
      '도쿄에서 열차·버스로 접근이 좋아 도시 관광과 묶기에도 좋습니다.',
  },
  {
    slug: 'furano', name: '후라노', country: '일본', region: '홋카이도',
    summary: '뽀송한 파우더 + 잘 정비된 슬로프', season: '11월 말 ~ 5월 초', snowType: '건설(파우더)',
    highlights: '뽀송파우더,정설,가족여행,설질', slopes: 24, bestFor: '초중급,가족',
    official: 'https://www.snowfurano.com/',
    description:
      '홋카이도 중앙부의 후라노는 내륙성 기후로 설질이 매우 건조하고 가볍습니다.\n' +
      '정설(그루밍)이 훌륭해 초·중급자와 가족 단위 여행객이 편하게 즐기기 좋고, 관광지 후라노·비에이와 가까워 겨울 여행 코스로도 인기입니다.',
  },
  {
    slug: 'rusutsu', name: '루스츠', country: '일본', region: '홋카이도',
    summary: '트리런과 파우더의 리조트 일체형', season: '11월 말 ~ 4월 초', snowType: '건설(파우더)',
    highlights: '트리런,파우더,리조트일체형,가족', slopes: 37, bestFor: '중상급,가족',
    official: 'https://rusutsu.com/',
    description:
      '3개의 산으로 이루어진 루스츠는 나무 사이를 누비는 트리런과 파우더로 사랑받는 곳입니다.\n' +
      '숙소·온천·식당이 리조트 안에 모여 있어 이동 없이 스키에 집중하기 좋고, 가족 여행객에게도 편리합니다.\n' +
      '니세코와 가까워 함께 묶어 다니기도 좋습니다.',
  },
  {
    slug: 'nozawa-onsen', name: '노자와온천', country: '일본', region: '나가노',
    summary: '전통 온천 마을에서 즐기는 스키', season: '12월 ~ 4월', snowType: '파우더~정설',
    highlights: '온천,전통마을,다양한코스,나이트스키', slopes: 44, bestFor: '전 레벨,온천 여행',
    official: 'https://nozawaski.com/',
    description:
      '나가노현 노자와온천은 옛 정취가 남은 온천 마을과 스키장이 한데 있는 독특한 목적지입니다.\n' +
      '마을 곳곳에 무료 공중온천(소토유)이 있어 스키 후 온천 문화를 제대로 즐길 수 있고, 표고차가 커 다양한 코스를 갖췄습니다.',
  },
  {
    slug: 'myoko', name: '묘코고원', country: '일본', region: '니가타',
    summary: '폭설 지대의 한적한 가성비 코스', season: '12월 ~ 5월(폭설)', snowType: '파우더(습설 섞임)',
    highlights: '폭설,한적함,가성비,온천', slopes: 30, bestFor: '중급,조용한 여행',
    official: 'https://myoko-kogen.com/',
    description:
      '니가타현 묘코고원은 일본에서도 손꼽히는 폭설 지대로, 시즌 적설량이 압도적입니다.\n' +
      '니세코·하쿠바보다 붐비지 않아 한적하게 파우더를 즐기려는 스키어에게 좋고, 물가도 상대적으로 합리적입니다.',
  },
];

export async function seedOverseas(): Promise<void> {
  try {
    const count = await prisma.overseasResort.count();
    if (count > 0) return; // 이미 있으면 스킵 (관리자 수정본 보존)

    for (let i = 0; i < RESORTS.length; i++) {
      const r = RESORTS[i];
      const resort = await prisma.overseasResort.create({
        data: {
          slug: r.slug, name: r.name, country: r.country, region: r.region,
          summary: r.summary, season: r.season, snowType: r.snowType, highlights: r.highlights,
          slopes: r.slopes, bestFor: r.bestFor, description: r.description,
          published: true, order: i,
        },
      });
      // 정직한 시드 딜 — 공식 사이트 정보/예약 링크(실제 클릭 가능), 가격 없음.
      await prisma.overseasDeal.create({
        data: {
          title: `${r.name} 공식 사이트 · 리프트권/예약 정보`,
          partner: '공식 사이트',
          link: r.official,
          resortId: resort.id,
          featured: !!r.featured,
          order: 0,
        },
      });
    }
    console.log(`[seedOverseas] ${RESORTS.length}개 해외 스키장 시드 완료`);
  } catch (error) {
    console.error('[seedOverseas] 실패:', error);
  }
}
