// 카테고리별 샘플 데이터 시드 — rental/lesson/accommodation/skishop/repair.
// 모두 admin 계정 소유 + approved=true 로 즉시 노출.
// idempotent — 같은 name 이 이미 있으면 skip.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 카테고리 샘플 데이터 시드 시작...');

  // 1) admin 계정 + 스키장 ID 매핑 가져오기
  const admin = await prisma.user.findUnique({ where: { email: 'admin@snowpan.com' } });
  if (!admin) {
    console.error('❌ admin@snowpan.com 계정이 없습니다. 먼저 prisma/seed.ts 를 실행하세요.');
    process.exit(1);
  }

  const resorts = await prisma.skiResort.findMany();
  if (resorts.length === 0) {
    console.error('❌ 스키장 데이터가 없습니다. 먼저 prisma/seed.ts 를 실행하세요.');
    process.exit(1);
  }
  const resortByName = new Map(resorts.map((r) => [r.name, r.id]));
  const pickResort = (name: string) => resortByName.get(name) || resorts[0].id;

  let stats = { rental: 0, lesson: 0, accommodation: 0, skishop: 0, repair: 0, skipped: 0 };

  // === 렌탈 ===
  const rentals = [
    { name: '용평 풀세트 렌탈 (스키)', price: 35000, duration: '1일', equipment: '스키, 부츠, 폴', resort: '용평리조트' },
    { name: '하이원 풀세트 렌탈 (보드)', price: 35000, duration: '1일', equipment: '보드, 부츠', resort: '하이원' },
    { name: '비발디파크 부츠+보드 렌탈', price: 25000, duration: '1일', equipment: '보드, 부츠', resort: '비발디파크' },
    { name: '곤지암 야간권 + 풀세트', price: 45000, duration: '1일', equipment: '스키, 부츠, 폴, 헬멧', resort: '곤지암리조트' },
    { name: '엘리시안 키즈 세트', price: 20000, duration: '1일', equipment: '키즈 스키, 부츠, 폴', resort: '엘리시안강촌' },
  ];
  for (const r of rentals) {
    const exists = await prisma.rental.findFirst({ where: { name: r.name } });
    if (exists) { stats.skipped++; continue; }
    await prisma.rental.create({
      data: {
        name: r.name,
        price: r.price,
        duration: r.duration,
        equipment: r.equipment,
        image: '/icons/placeholder-card.svg',
        resortId: pickResort(r.resort),
        userId: admin.id,
        approved: true,
      },
    });
    stats.rental++;
  }

  // === 레슨 ===
  const lessons = [
    { name: '용평 1:1 입문 레슨 (1시간)', price: 80000, duration: '1시간', level: 'beginner', max: 1, resort: '용평리조트' },
    { name: '하이원 그룹 초급 (3시간)', price: 60000, duration: '3시간', level: 'beginner', max: 6, resort: '하이원' },
    { name: '비발디 카빙 중급', price: 90000, duration: '2시간', level: 'intermediate', max: 4, resort: '비발디파크' },
    { name: '곤지암 데몬 클래스', price: 150000, duration: '2시간', level: 'advanced', max: 3, resort: '곤지암리조트' },
    { name: '엘리시안 보드 입문', price: 70000, duration: '2시간', level: 'beginner', max: 5, resort: '엘리시안강촌' },
  ];
  for (const l of lessons) {
    const exists = await prisma.lesson.findFirst({ where: { name: l.name } });
    if (exists) { stats.skipped++; continue; }
    await prisma.lesson.create({
      data: {
        name: l.name,
        price: l.price,
        duration: l.duration,
        level: l.level,
        maxStudents: l.max,
        image: '/icons/placeholder-card.svg',
        resortId: pickResort(l.resort),
        userId: admin.id,
        approved: true,
      },
    });
    stats.lesson++;
  }

  // === 숙소 ===
  const accommodations = [
    { name: '용평 콘도 2인실', type: 'condo', price: 120000, original: 150000, guests: '2인', features: '조식,주차,WiFi', resort: '용평리조트' },
    { name: '하이원 호텔 더블', type: 'hotel', price: 200000, original: 250000, guests: '2인', features: '조식,수영장,사우나', resort: '하이원' },
    { name: '비발디 펜션 4인 풀빌라', type: 'pension', price: 250000, original: 300000, guests: '4인', features: '바베큐,거실,주차', resort: '비발디파크' },
    { name: '곤지암 가족형 콘도 6인', type: 'condo', price: 180000, original: 220000, guests: '6인', features: '주방,세탁기,주차', resort: '곤지암리조트' },
    { name: '휘닉스 시즌방 (3개월)', type: 'season', price: 1500000, original: 1800000, guests: '4인', features: '풀시즌,상비실,주차', resort: '휘닉스평창' },
  ];
  for (const a of accommodations) {
    const exists = await prisma.accommodation.findFirst({ where: { name: a.name } });
    if (exists) { stats.skipped++; continue; }
    await prisma.accommodation.create({
      data: {
        name: a.name,
        type: a.type,
        price: a.price,
        originalPrice: a.original,
        guests: a.guests,
        features: a.features,
        image: '/icons/placeholder-card.svg',
        businessLicense: '/icons/placeholder-card.svg', // 시드용 placeholder
        resortId: pickResort(a.resort),
        userId: admin.id,
        approved: true,
      },
    });
    stats.accommodation++;
  }

  // === 스키샵 ===
  const skiShops = [
    { name: '용평 프로샵', area: '강원', resort: '용평리조트', address: '강원도 평창군 대관령면 올림픽로 715', description: '용평리조트 정문 앞. 전 브랜드 시즌 신상 + 튜닝 서비스.', brands: '아토믹,헤드,로시뇰,살로몬', hours: '09:00-22:00', phone: '033-335-5757' },
    { name: '강남 스키하우스', area: '서울', address: '서울특별시 강남구 테헤란로 123', description: '강남 지역 1호 스키 종합샵. 시즌 전 튜닝/왁싱 예약 필수.', brands: '아토믹,피셔,블리자드,K2', hours: '11:00-22:00 (화-일)', phone: '02-555-1234' },
    { name: '곤지암 스키마스터', area: '경기', resort: '곤지암리조트', address: '경기도 광주시 도척면 도척윗로 278', description: '곤지암리조트 인근 데몬 출신이 직접 튜닝. 부츠 캔팅 전문.', brands: 'SG,니데커,잭슨,서먼', hours: '09:00-22:00 (연중무휴)', phone: '031-770-5555' },
    { name: '하이원 보드숍', area: '강원', resort: '하이원', address: '강원도 정선군 고한읍 하이원길 424', description: '하이원 슬로프 인근. 보드 풀세트 + 의류 매장 통합.', brands: '버튼,라이드,K2,GNU', hours: '09:00-21:00', phone: '033-590-7777' },
    { name: '판교 스키부티크', area: '경기', address: '경기도 성남시 분당구 판교로 256', description: '판교역 도보 5분. 가족 단위 픽업 친화. 시즌 종료 후 보관 서비스.', brands: '로시뇰,피셔,헤드,살로몬', hours: '10:00-21:00', phone: '031-700-9090' },
  ];
  for (const s of skiShops) {
    const exists = await prisma.skiShop.findFirst({ where: { name: s.name } });
    if (exists) { stats.skipped++; continue; }
    await prisma.skiShop.create({
      data: {
        name: s.name,
        area: s.area,
        resort: s.resort || null,
        address: s.address,
        description: s.description,
        brands: s.brands,
        phone: s.phone,
        hours: s.hours,
        image: null,
        businessLicense: '/icons/placeholder-card.svg',
        userId: admin.id,
        approved: true,
      },
    });
    stats.skishop++;
  }

  // === 정비샵 ===
  const repairShops = [
    { name: '용평 튜닝센터', area: '강원', address: '강원도 평창군 대관령면 올림픽로 720', description: '돌가공 머신 보유. 데몬 출신 튜너 상주. 평일 당일 픽업 가능.', services: '튜닝,왁싱,엣지,바인딩', hours: '09:00-21:00', phone: '033-335-1234' },
    { name: '곤지암 정비실', area: '경기', address: '경기도 광주시 도척면 도척윗로 280', description: '곤지암 슬로프 옆. 스토닝 + 핫왁싱 한번에. 시즌권 회원 할인.', services: '튜닝,왁싱,베이스 보수', hours: '10:00-22:00', phone: '031-770-9000' },
    { name: '강남 보드정비소', area: '서울', address: '서울특별시 강남구 논현로 567', description: '보드 전문 정비. 데크 보수, P텍스 채움 가능.', services: '보드 튜닝,왁싱,P텍스 보수', hours: '12:00-21:00 (월 휴무)', phone: '02-540-7777' },
    { name: '하이원 워크숍', area: '강원', address: '강원도 정선군 고한읍 하이원길 100', description: '하이원리조트 인근. 시즌 첫 정비 + 시즌 후 보관 + 봄 튜닝 패키지.', services: '튜닝,왁싱,바인딩 점검', hours: '09:00-21:00', phone: '033-590-1500' },
  ];
  for (const r of repairShops) {
    const exists = await prisma.repairShop.findFirst({ where: { name: r.name } });
    if (exists) { stats.skipped++; continue; }
    await prisma.repairShop.create({
      data: {
        name: r.name,
        area: r.area,
        address: r.address,
        description: r.description,
        services: r.services,
        phone: r.phone,
        hours: r.hours,
        image: null,
        businessLicense: '/icons/placeholder-card.svg',
        userId: admin.id,
        approved: true,
      },
    });
    stats.repair++;
  }

  console.log('✅ 카테고리 시드 완료:', stats);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ 시드 실패:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
