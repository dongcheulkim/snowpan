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
  scope?: '국내' | '해외';
  address?: string; liftPrice?: string; website?: string; phone?: string; nightSki?: boolean; lifts?: number;
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

  // ===== 국내 =====
  {
    slug: 'yongpyong', name: '용평리조트', scope: '국내', country: '한국', region: '강원',
    address: '강원 평창군 대관령면 올림픽로 715', liftPrice: '성인 주간권 96,000원 · 오전/오후/야간 각 68,000원 (25/26)',
    website: 'https://www.yongpyong.co.kr/kor/skiNboard/utilizationFee/rentCharge.do', nightSki: true, slopes: 28,
    summary: '국내 최대급, 발왕산의 롱코스', season: '11월 말 ~ 4월 초', snowType: '정설(인공설)',
    highlights: '대형슬로프,발왕산,롱코스,드라마촬영지', bestFor: '전 레벨,롱런',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Winter_2014_Candidate_City-_PyeongChang_Dragon_Valley_ski_resort.jpg',
    description:
      '강원 평창의 용평리조트는 국내에서 가장 오래되고 규모가 큰 스키장 중 하나로, 발왕산 정상에서 이어지는 긴 코스가 매력입니다.\n' +
      '초급부터 상급까지 슬로프가 다양하고 야간 스키도 운영해 하루 종일 즐길 수 있습니다.',
  },
  {
    slug: 'high1', name: '하이원리조트', scope: '국내', country: '한국', region: '강원',
    address: '강원 정선군 고한읍 하이원길 265', liftPrice: '성인 전일권 104,000원 · 시간권 62,000~82,000원 (25/26)',
    website: 'https://www.high1.com/ski/contents.do?key=750', nightSki: true, slopes: 18,
    summary: '고지대 설질과 탁 트인 경관', season: '11월 말 ~ 4월', snowType: '정설(설질 우수)',
    highlights: '고지대설질,경관,롱코스,쾌적', bestFor: '중상급,경관',
    image: null,
    description:
      '강원 정선의 하이원리조트는 해발이 높아 설질이 좋고, 백운산 능선을 따라 탁 트인 경관을 즐길 수 있습니다.\n' +
      '슬로프 폭이 넓고 정비가 잘 돼 있어 쾌적하게 라이딩하기 좋습니다.',
  },
  {
    slug: 'phoenix', name: '휘닉스 평창', scope: '국내', country: '한국', region: '강원',
    address: '강원 평창군 봉평면 태기로 174', liftPrice: '성인 종일권 약 76,000원 (시즌별 상이)',
    website: 'https://www.phoenixhnr.co.kr/ski/', nightSki: true, slopes: 21,
    summary: '2018 올림픽 스노보드 개최지', season: '11월 말 ~ 4월', snowType: '정설(인공설)',
    highlights: '올림픽개최지,보드,다양한코스,수도권2시간', bestFor: '전 레벨,보더',
    image: null,
    description:
      '강원 평창의 휘닉스 평창은 2018 동계올림픽 스노보드·프리스타일 종목이 열린 곳으로, 보더에게 인기가 높습니다.\n' +
      '난이도별 코스가 고르게 갖춰져 있고 수도권에서 접근이 좋습니다.',
  },
  {
    slug: 'alpensia', name: '알펜시아', scope: '국내', country: '한국', region: '강원',
    address: '강원 평창군 대관령면 솔봉로 325', liftPrice: '성인 1일권 약 7~8만원대',
    website: 'https://www.alpensia.com/', nightSki: true, slopes: 6,
    summary: '2018 올림픽 스키점프, 가족형', season: '12월 ~ 3월', snowType: '정설(인공설)',
    highlights: '올림픽,가족,리조트,입문', bestFor: '입문,가족',
    image: null,
    description:
      '강원 평창의 알펜시아는 2018 올림픽 스키점프·바이애슬론이 열린 리조트로, 규모는 아담하지만 가족 단위로 편하게 즐기기 좋습니다.\n' +
      '숙소·워터파크 등 부대시설이 잘 갖춰져 있습니다.',
  },
  {
    slug: 'vivaldi', name: '비발디파크', scope: '국내', country: '한국', region: '강원',
    address: '강원 홍천군 서면 한치골길 262', liftPrice: '타임패스 4/5/6시간제 · 약 8만원대 (정가 공식 확인)',
    website: 'https://www.sonohotelsresorts.com/daemyung.vp.skiworld.04_04_01.ds/dmparse.dm', nightSki: true, slopes: 13,
    summary: '수도권 최근접급, 활기찬 나이트', season: '11월 말 ~ 3월', snowType: '정설(인공설)',
    highlights: '수도권근접,나이트,보드,오션월드', bestFor: '입문,수도권 당일',
    image: null,
    description:
      '강원 홍천의 비발디파크는 수도권에서 1시간대로 가까워 당일 스키로 인기가 높습니다.\n' +
      '야간 슬로프와 보드 파크가 활발하고, 여름엔 오션월드로도 유명합니다.',
  },
  {
    slug: 'wellihilli', name: '웰리힐리파크', scope: '국내', country: '한국', region: '강원',
    address: '강원 횡성군 둔내면 서동로 891', liftPrice: '3/4/6/8시간권제 · 약 8만원대 (정가 공식 확인)',
    website: 'https://www.wellihillipark.com/', nightSki: true, slopes: 18,
    summary: '넓은 슬로프, 수도권 접근 양호', season: '11월 말 ~ 3월', snowType: '정설(인공설)',
    highlights: '넓은슬로프,수도권근접,다양한코스', bestFor: '전 레벨',
    image: null,
    description:
      '강원 횡성의 웰리힐리파크는 슬로프가 넓고 코스가 다양해 실력별로 즐기기 좋습니다.\n' +
      '수도권에서 접근이 무난해 주말 스키어에게 인기입니다.',
  },
  {
    slug: 'elysian-gangchon', name: '엘리시안 강촌', scope: '국내', country: '한국', region: '강원',
    address: '강원 춘천시 남산면 북한강변길 688', liftPrice: '성인 4시간 70,000 · 6시간 80,000 · 8시간 90,000원 (25/26)',
    website: 'https://www.elysian.co.kr/', nightSki: true, slopes: 10,
    summary: '전철로 가는 입문자 친화 스키장', season: '12월 ~ 3월', snowType: '정설(인공설)',
    highlights: '전철접근,입문,춘천,가성비', bestFor: '입문,가족',
    image: null,
    description:
      '강원 춘천의 엘리시안 강촌은 경춘선 전철로 접근할 수 있어 차 없이도 가기 좋은 스키장입니다.\n' +
      '완만한 슬로프가 많아 입문자·가족에게 잘 맞습니다.',
  },
  {
    slug: 'jisan', name: '지산 포레스트', scope: '국내', country: '한국', region: '경기',
    address: '경기 이천시 마장면 지산로 267', liftPrice: '성인 주간권 69,000 · 4.5시간권 58,000 · 6.5시간권 66,000 · 1회권 12,000',
    website: 'https://www.jisanresort.co.kr/w/ski/use/lift.asp', nightSki: true, slopes: 10,
    summary: '수도권 최근접, 야간 스키 활발', season: '12월 ~ 3월', snowType: '정설(인공설)',
    highlights: '수도권최근접,야간,입문,보드', bestFor: '입문,수도권 당일',
    image: null,
    description:
      '경기 이천의 지산 포레스트 리조트는 서울에서 40분대로 가까워 야간·당일 스키로 특히 인기가 많습니다.\n' +
      '완만한 코스 위주라 입문자와 보더가 즐기기 좋습니다.',
  },
  {
    slug: 'konjiam', name: '곤지암리조트', scope: '국내', country: '한국', region: '경기',
    address: '경기 광주시 도척면 도척윗로 278', liftPrice: '성인 6시간권 평일 87,000·주말 105,000원 · 4시간 81,000~96,000원 (25/26)',
    website: 'https://m.konjiamresort.co.kr/ski/skiInfo.dev', nightSki: false, slopes: 11,
    summary: '예약제로 쾌적한 프리미엄 스키장', season: '12월 ~ 3월', snowType: '정설(인공설)',
    highlights: '예약제쾌적,수도권,프리미엄,렌탈편의', bestFor: '쾌적함 선호,가족',
    image: null,
    description:
      '경기 광주의 곤지암리조트는 리프트 탑승 인원을 예약제로 제한해 붐비지 않고 쾌적하게 탈 수 있는 것이 특징입니다.\n' +
      '렌탈·편의시설이 잘 갖춰져 있어 가족·입문자에게 인기입니다.',
  },
  {
    slug: 'muju', name: '무주 덕유산', scope: '국내', country: '한국', region: '전북',
    address: '전북 무주군 설천면 만선로 185', liftPrice: '성인 1일권 약 8만원대 (공식 요금표 확인)',
    website: 'https://www.mdysresort.com/ski/charge.asp', nightSki: true, slopes: 23,
    summary: '남부 최대, 덕유산 설천봉 경관', season: '11월 말 ~ 3월', snowType: '정설(인공설)',
    highlights: '남부최대,덕유산,설천봉경관,롱코스', bestFor: '전 레벨,경관',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/%EB%8D%95%EC%9C%A0%EC%82%B0_%EC%84%A4%EC%B2%9C%EB%B4%89.jpg',
    description:
      '전북 무주의 덕유산리조트는 남부권 최대 규모로, 덕유산 설천봉으로 이어지는 경관과 긴 코스가 매력입니다.\n' +
      '영·호남권에서 접근이 좋아 남부 스키어에게 대표적인 목적지입니다.',
  },
  {
    slug: 'oakvalley', name: '오크밸리', scope: '국내', country: '한국', region: '강원',
    address: '강원 원주시 지정면 오크밸리2길 58', liftPrice: '성인 종일권 76,000 · 오전/오후/야간 각 58,000원',
    website: 'https://www.oakvalley.co.kr/', nightSki: true, slopes: 9,
    summary: '원주의 가족형 리조트', season: '12월 ~ 3월', snowType: '정설(인공설)',
    highlights: '원주,가족,골프,입문', bestFor: '입문,가족',
    image: null,
    description:
      '강원 원주의 오크밸리는 수도권 남부에서 접근이 좋은 가족형 리조트입니다.\n' +
      '완만한 슬로프 위주로 입문자와 가족 단위 방문객에게 알맞습니다.',
  },
  {
    slug: 'edenvalley', name: '에덴밸리', scope: '국내', country: '한국', region: '경남',
    address: '경남 양산시 원동면 원동로 1206-30', liftPrice: '성인 1일권 약 6~7만원대',
    website: 'https://www.edenvalley.co.kr/', nightSki: true, slopes: 7,
    summary: '영남권에서 가까운 스키장', season: '12월 ~ 2월', snowType: '정설(인공설)',
    highlights: '영남권,부산근접,풍력단지,입문', bestFor: '입문,부산·경남권',
    image: null,
    description:
      '경남 양산의 에덴밸리는 부산·경남권에서 가장 가까운 스키장으로, 남부권 스키어에게 편리합니다.\n' +
      '규모는 아담하지만 야간 스키와 풍력단지 경관으로 나들이 코스로도 인기입니다.',
  },
];

// 국가 → 대륙 카테고리
const CONTINENT: Record<string, string> = {
  '일본': '아시아', '중국': '아시아',
  '프랑스': '유럽', '스위스': '유럽', '오스트리아': '유럽', '이탈리아': '유럽',
  '캐나다': '북미', '미국': '북미',
};
// '인기(가장 많이 가는)' 카테고리 — 한국 스키어가 가장 많이 가는 곳 + 세계적 명소
const POPULAR = new Set(['niseko', 'hakuba', 'furano', 'rusutsu', 'nozawa-onsen', 'zao', 'whistler', 'zermatt',
  'yongpyong', 'high1', 'phoenix', 'muju', 'vivaldi']);

// 해외 리프트권 — 나라별 현지 통화(약값·시즌/날짜별 상이). 정확값은 각 공식 사이트로.
const LIFT_PRICE: Record<string, string> = {
  niseko: '1일권 약 ¥9,000 (엔 · 시즌별 상이)',
  hakuba: '1일권 약 ¥8,000 (엔 · 시즌별 상이)',
  furano: '1일권 약 ¥7,000 (엔 · 시즌별 상이)',
  rusutsu: '1일권 약 ¥8,000 (엔 · 시즌별 상이)',
  'nozawa-onsen': '1일권 약 ¥6,500 (엔 · 시즌별 상이)',
  myoko: '1일권 약 ¥5,500 (엔 · 시즌별 상이)',
  zao: '1일권 약 ¥6,000 (엔 · 시즌별 상이)',
  kiroro: '1일권 약 ¥8,000 (엔 · 시즌별 상이)',
  yabuli: '1일권 약 400元 (위안 · 시즌별 상이)',
  chongli: '1일권 약 500元 (위안 · 시즌별 상이)',
  changbaishan: '1일권 약 450元 (위안 · 시즌별 상이)',
  chamonix: '1일권 약 €65 (유로 · 시즌별 상이)',
  valdisere: '1일권 약 €70 (유로 · 시즌별 상이)',
  zermatt: '1일권 약 CHF 92 (스위스프랑 · 시즌별 상이)',
  stanton: '1일권 약 €72 (유로 · 시즌별 상이)',
  cortina: '1일권 약 €80 (유로 · 시즌별 상이)',
  whistler: '현지 다이내믹 요금 · 약 C$200~ (캐나다달러)',
  aspen: '현지 다이내믹 요금 · 약 US$200~ (미국달러)',
};

// 요금 페이지 딥링크 우선(공식 사이트 버튼이 바로 요금표로). 확보된 국내 위주.
const PRICE_URL: Record<string, string> = {
  alpensia: 'https://www.alpensia.com/ski/use-cost-lift.do',
  'elysian-gangchon': 'https://www.elysian.co.kr/gangchon/ski/ski_cost.asp',
  oakvalley: 'https://oakvalley.co.kr/ski/introduction/charge-info',
  edenvalley: 'https://www.edenvalley.co.kr/ski/View.asp?location=01',
};

export async function seedOverseas(): Promise<void> {
  try {
    for (let i = 0; i < RESORTS.length; i++) {
      const r = RESORTS[i];
      const img = wikiThumb(r.image);
      const continent = CONTINENT[r.country] || null;
      const popular = POPULAR.has(r.slug);
      const existing = await prisma.overseasResort.findUnique({
        where: { slug: r.slug },
        select: { id: true, image: true, continent: true, liftPrice: true, website: true, address: true, phone: true, lifts: true },
      });
      if (existing) {
        // 큐레이션 필드는 "비어있을 때만" 시드값으로 백필 — 관리자가 편집한 값은 재부팅에도 보존.
        // (매 부팅마다 덮어쓰면 AdminOverseas 편집이 revert 되던 버그 수정)
        const data: Record<string, unknown> = {};
        if (!existing.image && img) data.image = img;
        if (!existing.continent) { data.continent = continent; data.popular = popular; }
        if (!existing.liftPrice) { const v = r.liftPrice || LIFT_PRICE[r.slug]; if (v) data.liftPrice = v; }
        if (!existing.website) { const v = PRICE_URL[r.slug] || r.website || r.official; if (v) data.website = v; }
        if (!existing.address && r.address) data.address = r.address;
        if (!existing.phone && r.phone) data.phone = r.phone;
        if (!existing.lifts && r.lifts) data.lifts = r.lifts;
        if (Object.keys(data).length) await prisma.overseasResort.update({ where: { id: existing.id }, data });
        continue;
      }
      const resort = await prisma.overseasResort.create({
        data: {
          slug: r.slug, name: r.name, scope: r.scope || '해외', country: r.country, continent, popular, region: r.region,
          address: r.address || null, liftPrice: r.liftPrice || LIFT_PRICE[r.slug] || null,
          website: PRICE_URL[r.slug] || r.website || r.official || null,
          phone: r.phone || null, nightSki: !!r.nightSki, lifts: r.lifts || null,
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
