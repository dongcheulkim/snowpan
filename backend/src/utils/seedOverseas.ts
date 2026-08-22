import prisma from '../config/database';

// 해외 스키 여행 콘텐츠 시드 — 부팅 시 실행(멱등).
// - 없는 리조트는 새로 추가, 이미 있는 리조트는 이미지가 비어있을 때만 이미지 채움
//   (관리자가 수정한 본문/설정은 덮지 않음).
// - 가이드는 사실 기반. 딜은 날조하지 않고 '공식 사이트' 링크(실제 클릭 가능)로만 시드하며,
//   가격이 붙는 파트너 상품은 관리자(에디터)가 어드민에서 등록.
// 이미지는 위키미디어 공용(upload.wikimedia.org, CC/핫링크 허용)에서 가져온 뒤 썸네일로 축소.

// 위키미디어 원본/썸네일 URL → 공식 리사이즈 엔드포인트(Special:FilePath?width=)로 변환.
// upload.wikimedia.org 의 임의 폭 썸네일은 온디맨드 생성이 막혀 400 이 날 수 있어,
// 리다이렉트로 적정 크기를 내려주는 Special:FilePath 를 쓴다(용량↓ + 안정).
function wikiThumb(url: string | null, width = 800): string | null {
  if (!url) return null;
  const u = url.split('?')[0];
  let file: string | undefined;
  const thumbM = u.match(/\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/[^/]+$/);
  if (thumbM) file = thumbM[1];
  else {
    const m = u.match(/\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/);
    if (m) file = m[1];
  }
  if (!file) return u;
  let name: string;
  try { name = decodeURIComponent(file); } catch { name = file; } // 이중 인코딩 방지
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

interface SeedResort {
  slug: string; name: string; country: string; region: string;
  summary: string; season: string; snowType: string; highlights: string;
  slopes: number; bestFor: string; description: string;
  image: string | null; official?: string; featured?: boolean;
}

const RESORTS: SeedResort[] = [
  // ===== 일본 (가까움) =====
  {
    slug: 'niseko', name: '니세코', country: '일본', region: '홋카이도',
    summary: '세계가 인정한 최고의 파우더', season: '12월 ~ 4월 초', snowType: '건설(파우더)',
    highlights: '파우더,나이트스키,백컨트리,온천', slopes: 30, bestFor: '파우더 매니아,중상급자',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Niseko-Annupuri.JPG',
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
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hakuba_Happo-one_Winter_Resort.JPG/3840px-Hakuba_Happo-one_Winter_Resort.JPG',
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
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Furano_Snow_Resort_view2.JPG',
    official: 'https://www.snowfurano.com/',
    description:
      '홋카이도 중앙부의 후라노는 내륙성 기후로 설질이 매우 건조하고 가볍습니다.\n' +
      '정설(그루밍)이 훌륭해 초·중급자와 가족 단위 여행객이 편하게 즐기기 좋고, 관광지 후라노·비에이와 가까워 겨울 여행 코스로도 인기입니다.',
  },
  {
    slug: 'rusutsu', name: '루스츠', country: '일본', region: '홋카이도',
    summary: '트리런과 파우더의 리조트 일체형', season: '11월 말 ~ 4월 초', snowType: '건설(파우더)',
    highlights: '트리런,파우더,리조트일체형,가족', slopes: 37, bestFor: '중상급,가족',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Rusutsu_WestMt%28200703%29.jpg',
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
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Nozawa_Onsen_01.jpg',
    official: 'https://nozawaski.com/',
    description:
      '나가노현 노자와온천은 옛 정취가 남은 온천 마을과 스키장이 한데 있는 독특한 목적지입니다.\n' +
      '마을 곳곳에 무료 공중온천(소토유)이 있어 스키 후 온천 문화를 제대로 즐길 수 있고, 표고차가 커 다양한 코스를 갖췄습니다.',
  },
  {
    slug: 'myoko', name: '묘코고원', country: '일본', region: '니가타',
    summary: '폭설 지대의 한적한 가성비 코스', season: '12월 ~ 5월(폭설)', snowType: '파우더(습설 섞임)',
    highlights: '폭설,한적함,가성비,온천', slopes: 30, bestFor: '중급,조용한 여행',
    image: null,
    official: 'https://myoko-kogen.com/',
    description:
      '니가타현 묘코고원은 일본에서도 손꼽히는 폭설 지대로, 시즌 적설량이 압도적입니다.\n' +
      '니세코·하쿠바보다 붐비지 않아 한적하게 파우더를 즐기려는 스키어에게 좋고, 물가도 상대적으로 합리적입니다.',
  },
  {
    slug: 'zao', name: '자오온천', country: '일본', region: '야마가타',
    summary: '스노우몬스터(수빙)와 온천의 설국', season: '12월 ~ 4월', snowType: '파우더~습설',
    highlights: '수빙,온천,나이트라이트업,광대한슬로프', slopes: 25, bestFor: '전 레벨,설경 여행',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg/3840px-220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg',
    description:
      '야마가타현 자오온천은 겨울이면 나무에 눈과 얼음이 겹겹이 얼어붙어 만들어지는 "수빙(스노우몬스터)"으로 세계적으로 유명합니다.\n' +
      '밤에는 수빙에 조명을 비추는 라이트업이 장관이고, 스키 후엔 강산성 온천으로 몸을 녹일 수 있습니다.\n' +
      '표고차가 크고 코스가 다양해 초보부터 상급자까지 즐기기 좋습니다.',
  },
  {
    slug: 'kiroro', name: '키로로', country: '일본', region: '홋카이도',
    summary: '홋카이도 폭설의 파우더 리조트', season: '11월 말 ~ 5월 초', snowType: '건설(파우더)',
    highlights: '폭설,파우더,가족,리조트일체형', slopes: 23, bestFor: '초중급,가족',
    image: null,
    official: 'https://www.kiroro.co.jp/',
    description:
      '삿포로에서 가까운 키로로는 홋카이도에서도 적설량이 많기로 손꼽히는 리조트입니다.\n' +
      '잘 정비된 슬로프와 깊은 파우더를 함께 즐길 수 있고, 숙소·온천이 리조트 안에 모여 있어 가족 여행에 편리합니다.',
  },
  // ===== 중국 (가까움) =====
  {
    slug: 'yabuli', name: '야불리', country: '중국', region: '헤이룽장',
    summary: '중국을 대표하는 대형 스키 리조트', season: '11월 말 ~ 3월', snowType: '자연설+인공설',
    highlights: '대형슬로프,국가대표훈련지,인프라,빙설관광', slopes: 40, bestFor: '초중급,단체',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Sun_Mountain_Yabuli.jpg',
    description:
      '헤이룽장성 야불리는 중국에서 가장 오래되고 규모가 큰 스키 리조트 중 하나로, 국가대표 훈련지로도 쓰입니다.\n' +
      '하얼빈에서 접근이 좋아 하얼빈 빙등제 같은 빙설 관광과 묶어 다니기 좋고, 초·중급 코스가 잘 갖춰져 있습니다.',
  },
  {
    slug: 'chongli', name: '충리', country: '중국', region: '허베이',
    summary: '베이징 2022 동계올림픽의 무대', season: '11월 말 ~ 3월', snowType: '인공설 위주',
    highlights: '올림픽개최지,대형리조트밀집,베이징근접', slopes: 100, bestFor: '전 레벨,도시 근접',
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Golden_forests_at_Chongli_%E5%B4%87%E7%A4%BC%E9%87%91%E7%A7%8B_%288181860966%29.jpg',
    description:
      '허베이성 충리는 2022 베이징 동계올림픽의 설상 종목이 열린 곳으로, 완룽·타이우·겐팅 등 대형 리조트가 모여 있습니다.\n' +
      '베이징에서 고속철로 접근이 좋아 도시 관광과 함께 즐기기 좋고, 올림픽 이후 시설이 크게 확충됐습니다.',
  },
  {
    slug: 'changbaishan', name: '창바이산', country: '중국', region: '지린',
    summary: '백두산 자락의 자연설 리조트', season: '11월 말 ~ 4월', snowType: '자연설(파우더)',
    highlights: '백두산,자연설,파우더,온천', slopes: 40, bestFor: '중급,자연설 선호',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Laika_ac_Mt._Paekdu_%287998657081%29.jpg/3840px-Laika_ac_Mt._Paekdu_%287998657081%29.jpg',
    description:
      '지린성 창바이산(백두산)은 자연설이 풍부하고 설질이 좋아 최근 빠르게 성장하는 목적지입니다.\n' +
      '완다·루예탄 등 리조트가 있고, 화산 온천과 백두산 관광을 겨울 여행 코스로 함께 묶을 수 있습니다.',
  },
  // ===== 세계 유명 =====
  {
    slug: 'chamonix', name: '샤모니', country: '프랑스', region: '몽블랑',
    summary: '몽블랑 아래, 알파인 스키의 성지', season: '12월 ~ 4월(빙하는 더 김)', snowType: '알파인',
    highlights: '몽블랑,빙하코스,백컨트리,절경', slopes: 100, bestFor: '중상급,파노라마',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Chamonix_valley_from_la_Fl%C3%A9g%C3%A8re%2C2010_07.JPG',
    official: 'https://www.chamonix.com/',
    description:
      '프랑스 샤모니는 몽블랑(4,808m) 기슭에 자리한 알파인 스키의 발상지로, 1924 제1회 동계올림픽 개최지입니다.\n' +
      '에귀디미디 전망대와 빙하 코스(발레블랑슈), 광대한 백컨트리로 상급 스키어에게 성지 같은 곳입니다.\n' +
      '마을 자체가 유서 깊어 관광 매력도 큽니다.',
  },
  {
    slug: 'valdisere', name: '발디제르', country: '프랑스', region: '사부아',
    summary: '에스파스 킬리, 광대한 프렌치 알프스', season: '12월 ~ 4월(고지대 5월)', snowType: '알파인(고설질)',
    highlights: '대형연결,고지대설질,롱런,애프터스키', slopes: 300, bestFor: '전 레벨,롱스테이',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/RGA_231.JPG',
    official: 'https://www.valdisere.com/',
    description:
      '발디제르는 티뉴와 연결된 "에스파스 킬리"로 300km가 넘는 슬로프를 자랑하는 프랑스 대표 스키장입니다.\n' +
      '고지대라 시즌이 길고 설질이 안정적이며, 활기찬 애프터스키 문화로도 유명합니다.',
  },
  {
    slug: 'zermatt', name: '체르마트', country: '스위스', region: '발레',
    summary: '마터호른 아래 무공해 스키 마을', season: '연중(여름 빙하 스키 포함)', snowType: '알파인·빙하',
    highlights: '마터호른,빙하스키,무공해마을,절경', slopes: 300, bestFor: '전 레벨,절경 여행',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/1_zermatt_evening_2022.jpg/3840px-1_zermatt_evening_2022.jpg',
    official: 'https://www.zermatt.ch/',
    description:
      '스위스 체르마트는 상징적인 마터호른(4,478m)을 배경으로 한 무공해(가솔린 차량 통제) 산악 마을입니다.\n' +
      '빙하 지대라 여름에도 스키가 가능하고, 이탈리아 체르비니아까지 국경을 넘나드는 코스도 있습니다.\n' +
      '산악 열차와 전망대 인프라가 세계 최고 수준입니다.',
  },
  {
    slug: 'stanton', name: '생안톤', country: '오스트리아', region: '티롤',
    summary: '아를베르크, 알파인 스키의 요람', season: '12월 ~ 4월', snowType: '알파인(파우더)',
    highlights: '오프피스트,파우더,애프터스키,대형연결', slopes: 300, bestFor: '중상급,파우더',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/67/St_anton_skiroute_3_galzigbahn_v2.png',
    official: 'https://www.stantonamarlberg.com/',
    description:
      '오스트리아 생안톤은 아를베르크 스키 지역의 중심으로, 근대 스키 기술이 태동한 "스키의 요람"으로 불립니다.\n' +
      '도전적인 오프피스트와 깊은 파우더, 뜨거운 애프터스키 문화로 유럽 스키어들이 사랑하는 곳입니다.',
  },
  {
    slug: 'cortina', name: '코르티나담페초', country: '이탈리아', region: '돌로미티',
    summary: '돌로미티의 여왕, 2026 올림픽 개최지', season: '12월 ~ 4월', snowType: '알파인',
    highlights: '돌로미티절경,2026올림픽,셀라론다,미식', slopes: 100, bestFor: '중급,경관·미식 여행',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Faloria_Cortina_d%27Ampezzo_10.jpg/3840px-Faloria_Cortina_d%27Ampezzo_10.jpg',
    official: 'https://www.dolomitisuperski.com/',
    description:
      '이탈리아 코르티나담페초는 유네스코 세계자연유산 돌로미티의 절경으로 유명하며, 2026 밀라노-코르티나 동계올림픽 개최지입니다.\n' +
      '"돌로미티 수페르스키" 연결권으로 광대한 지역을 누빌 수 있고, 이탈리아다운 미식과 우아한 분위기가 매력입니다.',
  },
  {
    slug: 'whistler', name: '휘슬러 블랙콤', country: '캐나다', region: 'BC',
    summary: '북미 최대 규모의 스키 리조트', season: '11월 말 ~ 5월(빙하 여름)', snowType: '알파인(습설~파우더)',
    highlights: '북미최대,2010올림픽,빙하,롱런', slopes: 200, bestFor: '전 레벨,롱스테이',
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Whistler_Skilift_040.jpg',
    official: 'https://www.whistlerblackcomb.com/', featured: true,
    description:
      '캐나다 휘슬러 블랙콤은 두 개의 산으로 이루어진 북미 최대급 스키 리조트로, 2010 밴쿠버 동계올림픽 개최지입니다.\n' +
      '방대한 슬로프와 긴 활강, 잘 갖춰진 빌리지로 초보부터 상급자까지 오래 머물기 좋습니다.',
  },
  {
    slug: 'aspen', name: '아스펜', country: '미국', region: '콜로라도',
    summary: '콜로라도의 상징, 럭셔리 스키 타운', season: '11월 말 ~ 4월', snowType: '건설(콜로라도 파우더)',
    highlights: '4개산,파우더,럭셔리타운,다양한난이도', slopes: 300, bestFor: '전 레벨,고급 여행',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Downtown_of_Aspen%2C_Colorado.jpg',
    official: 'https://www.aspensnowmass.com/',
    description:
      '미국 콜로라도 아스펜은 4개의 스키장(아스펜 마운틴·스노우매스·하이랜즈·버터밀크)으로 이루어진 세계적인 스키 타운입니다.\n' +
      '건조한 로키산맥의 파우더와 세련된 다운타운, 다양한 난이도로 미국 스키의 상징으로 꼽힙니다.',
  },
];

export async function seedOverseas(): Promise<void> {
  try {
    for (let i = 0; i < RESORTS.length; i++) {
      const r = RESORTS[i];
      const img = wikiThumb(r.image);
      const existing = await prisma.overseasResort.findUnique({ where: { slug: r.slug }, select: { id: true, image: true } });
      if (existing) {
        // 이미 있으면 이미지 비어있을 때만 채움 (관리자 수정 보존).
        if (!existing.image && img) {
          await prisma.overseasResort.update({ where: { id: existing.id }, data: { image: img } });
        }
        continue;
      }
      const resort = await prisma.overseasResort.create({
        data: {
          slug: r.slug, name: r.name, country: r.country, region: r.region,
          summary: r.summary, season: r.season, snowType: r.snowType, highlights: r.highlights,
          slopes: r.slopes, bestFor: r.bestFor, description: r.description,
          image: img, published: true, order: i,
        },
      });
      // 정직한 시드 딜 — 공식 사이트 링크(실제 클릭 가능). 확실한 공식 URL 있는 곳만.
      if (r.official) {
        await prisma.overseasDeal.create({
          data: {
            title: `${r.name} 공식 사이트 · 정보/예약`,
            partner: '공식 사이트',
            link: r.official,
            resortId: resort.id,
            featured: !!r.featured,
            order: 0,
          },
        });
      }
    }
    console.log('[seedOverseas] 해외 스키장 시드 점검 완료');
  } catch (error) {
    console.error('[seedOverseas] 실패:', error);
  }
}
