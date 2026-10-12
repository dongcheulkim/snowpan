// 중고 등록·수정 브랜드 자동완성 목록 (2026-10-12).
// 브랜드 가이드(GearGuide)의 스키 52·보드 44 브랜드 + 부츠·바인딩·헬멧·고글·의류·보호구·폴·튜닝 브랜드.
// 저장값은 한글 표기(ko) 하나로 통일 — 시세 통계(brand equals)·브랜드 필터가 표기 차이로 못 잡던 것을 막는다.
export interface GearBrand { ko: string; en: string }

const RAW: Array<[string, string]> = [
  // 스키
  ['오가사카', 'Ogasaka'], ['아이디원', 'ID One'], ['하트', 'Hart'], ['블루모리스', 'Blue Moris'],
  ['아토믹', 'Atomic'], ['살로몬', 'Salomon'], ['피셔', 'Fischer'], ['헤드', 'Head'], ['뵐클', 'Völkl'],
  ['로시뇰', 'Rossignol'], ['노르디카', 'Nordica'], ['엘란', 'Elan'], ['블리자드', 'Blizzard'], ['다이나스타', 'Dynastar'],
  ['캐슬', 'Kästle'], ['케슬러', 'Kessler'], ['반디어', 'Van Deer'], ['K2', 'K2'], ['블랙크로우즈', 'Black Crows'],
  ['데네리아즈', 'Dénériaz'], ['라크로와', 'Lacroix'], ['아르마다', 'Armada'], ['라인', 'Line'], ['팩션', 'Faction'],
  ['무브먼트', 'Movement'], ['DPS', 'DPS'], ['자이', 'Zai'], ['오페라', 'Opera'], ['오그먼트', 'Augment'], ['밤버', 'Bomber'],
  ['케이스키', 'Kei-Ski'], ['스왈로', 'Swallow'], ['벡터글라이드', 'Vector Glide'], ['다이나핏', 'Dynafit'], ['스캇', 'Scott'],
  ['아이슬란틱', 'Icelantic'], ['리버티', 'Liberty'], ['마제스티', 'Majesty'], ['마하', 'MACH'], ['포일', 'Foil'],
  ['인디고', 'Indigo'], ['에델바이저', 'Edelwiser'], ['블로섬', 'Blossom'], ['비스트', 'Vist'], ['엑손드', 'Exonde'],
  ['볼란트', 'Volant'], ['르노운', 'Renoun'], ['와그너 커스텀', 'Wagner Custom'], ['AK 스키', 'AK Ski'], ['피크', 'Peak'],
  ['보그너', 'Bogner'], ['스톡리', 'Stöckli'],
  // 보드
  ['버튼', 'Burton'], ['모스', 'Moss'], ['그레이', 'Gray'], ['BC스트림', 'BC Stream'], ['요넥스', 'Yonex'],
  ['011 아티스틱', '011 Artistic'], ['겐템스틱', 'Gentemstick'], ['라이스28', 'Rice28'], ['노벰버', 'November'], ['FNTC', 'FNTC'],
  ['바탈레온', 'Bataleon'], ['암플리드', 'Amplid'], ['라이드', 'Ride'], ['존스', 'Jones'], ['리브텍', 'Lib Tech'],
  ['카피타', 'Capita'], ['GNU', 'GNU'], ['나이트로', 'Nitro'], ['롬', 'Rome'], ['네버서머', 'Never Summer'],
  ['니데커', 'Nidecker'], ['F2', 'F2'], ['포럼', 'Forum'], ['퍼블릭', 'Public'], ['노빌레', 'Nobile'], ['OES', 'OES'],
  ['GT 스노보드', 'GT Snowboards'], ['데스레이블', 'Death Label'], ['파나틱', 'Fanatic'], ['스쿠터', 'Scooter'],
  ['윈터스틱', 'Winterstick'], ['산타크루즈', 'Santa Cruz'], ['알리안', 'Allian'], ['코루아', 'Korua Shapes'], ['아버', 'Arbor'],
  ['DC', 'DC'], ['슬래시', 'Slash'], ['YES.', 'YES.'],
  // 부츠
  ['랑게', 'Lange'], ['테크니카', 'Tecnica'], ['달벨로', 'Dalbello'], ['풀틸트', 'Full Tilt'], ['렉삼', 'Rexxam'],
  ['서티투', 'ThirtyTwo'], ['디럭스', 'Deeluxe'], ['노스웨이브', 'Northwave'], ['반스', 'Vans'],
  // 바인딩
  ['마커', 'Marker'], ['룩', 'Look'], ['타이롤리아', 'Tyrolia'], ['유니온', 'Union'], ['플럭스', 'Flux'], ['드레이크', 'Drake'],
  ['나우', 'Now'], ['SP 바인딩', 'SP Bindings'],
  // 헬멧·고글·보호구
  ['오클리', 'Oakley'], ['스미스', 'Smith'], ['지로', 'Giro'], ['POC', 'POC'], ['우벡스', 'Uvex'], ['드래곤', 'Dragon'],
  ['애논', 'Anon'], ['일렉트릭', 'Electric'], ['스파이', 'Spy'], ['볼레', 'Bollé'], ['쉬레드', 'Shred'], ['스윗프로텍션', 'Sweet Protection'],
  ['데몬', 'Demon'], ['G-폼', 'G-Form'], ['버즈', 'Burz'],
  // 의류·장갑
  ['디센트', 'Descente'], ['골드윈', 'Goldwin'], ['피닉스', 'Phenix'], ['볼컴', 'Volcom'], ['686', '686'],
  ['노스페이스', 'The North Face'], ['아크테릭스', "Arc'teryx"], ['헬리한센', 'Helly Hansen'], ['스파이더', 'Spyder'],
  ['온요네', 'Onyone'], ['밀레', 'Millet'], ['네프', 'Neff'], ['다카인', 'Dakine'], ['헤스트라', 'Hestra'], ['레벨', 'Level'],
  ['킬슬로프', 'Kjus'], ['콜마', 'Colmar'], ['몽클레르', 'Moncler'], ['피크퍼포먼스', 'Peak Performance'],
  ['DC 슈즈', 'DC Shoes'], ['아날로그', 'Analog'], ['홀든', 'Holden'], ['에어블라스터', 'Airblaster'], ['마이크로폴', 'Micropol'],
  // 폴·튜닝·가방
  ['레키', 'Leki'], ['코페델', 'Komperdell'], ['스윅스', 'Swix'], ['토코', 'Toko'], ['홀멘콜', 'Holmenkol'],
  ['써리', 'Thule'], ['이븐', 'Evoc'], ['오스프리', 'Osprey'],
];

const seen = new Set<string>();
export const GEAR_BRANDS: GearBrand[] = RAW.filter(([ko]) => { if (seen.has(ko)) return false; seen.add(ko); return true; }).map(([ko, en]) => ({ ko, en }));

// 검색 정규화 — 소문자, 공백·점·하이픈 제거, 움라우트 등 발음 기호 제거 (volkl → Völkl)
export function normalizeBrandQuery(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s.'-]/g, '');
}

// 앞글자 일치를 먼저, 그다음 포함 일치. 최대 limit 개.
export function suggestBrands(query: string, limit = 8): GearBrand[] {
  const q = normalizeBrandQuery(query);
  if (!q) return [];
  const starts: GearBrand[] = [];
  const includes: GearBrand[] = [];
  for (const b of GEAR_BRANDS) {
    const ko = normalizeBrandQuery(b.ko);
    const en = normalizeBrandQuery(b.en);
    if (ko.startsWith(q) || en.startsWith(q)) starts.push(b);
    else if (ko.includes(q) || en.includes(q)) includes.push(b);
    if (starts.length >= limit) break;
  }
  return [...starts, ...includes].slice(0, limit);
}
