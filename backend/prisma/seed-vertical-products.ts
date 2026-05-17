// 각 vertical 의 더미 제품 시드 — 사용자가 빈 상태가 아닌 실제 매물 구조를 볼 수 있도록.
// idempotent — 같은 name+vertical 이미 있으면 skip.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed {
  vertical: string;
  name: string;
  brand: string;
  subcategory: string;
  price: number;
  image: string;
  description: string;
}

const IMG = '/seed-images';

const SEEDS: Seed[] = [
  // ── BIKE ─────────────────────────────────────────
  { vertical: 'bike', name: '캐년 얼티메이트 CF SLX', brand: '캐년', subcategory: 'frame', price: 2800000, image: `${IMG}/alpine-slope.jpg`, description: '카본 프레임. 시즌 1 사용. 무사고.' },
  { vertical: 'bike', name: '시마노 듀라에이스 R9200 휠셋', brand: '시마노', subcategory: 'wheel', price: 1200000, image: `${IMG}/alpine-slope.jpg`, description: '듀라 카본 휠셋. 림 클리닝 완료.' },
  { vertical: 'bike', name: '스피드플레이 제로 페달', brand: '스피드플레이', subcategory: 'drivetrain', price: 180000, image: `${IMG}/alpine-slope.jpg`, description: '클릿 신품 동봉.' },
  { vertical: 'bike', name: '카스크 프로톤 헬멧 M', brand: '카스크', subcategory: 'helmet', price: 220000, image: `${IMG}/helmet-goggles.jpg`, description: '무사고. 사이즈 56-58.' },
  { vertical: 'bike', name: '시디 윈드 슈즈 43', brand: '시디', subcategory: 'shoes', price: 280000, image: `${IMG}/skis-on-snow.jpg`, description: '로드 클릿 슈즈. 43 사이즈.' },
  { vertical: 'bike', name: '라파 코어 저지 M', brand: '라파', subcategory: 'apparel', price: 95000, image: `${IMG}/ski-jacket.jpg`, description: '여름 저지 미디엄. 깨끗.' },

  // ── RUN ──────────────────────────────────────────
  { vertical: 'run', name: '나이키 알파플라이 3 280', brand: '나이키', subcategory: 'shoes', price: 220000, image: `${IMG}/skis-on-snow.jpg`, description: '50km 미만 사용. 마라톤 PB 슈즈.' },
  { vertical: 'run', name: '호카 본디 8 270', brand: '호카', subcategory: 'shoes', price: 130000, image: `${IMG}/skis-on-snow.jpg`, description: '데일리 슈즈. 200km 사용.' },
  { vertical: 'run', name: '가민 페닉스 7X', brand: '가민', subcategory: 'watch', price: 580000, image: `${IMG}/helmet-goggles.jpg`, description: '솔라 챔질. 박스 풀구성.' },
  { vertical: 'run', name: '살로몬 어드밴스드 스킨 12L', brand: '살로몬', subcategory: 'pack', price: 180000, image: `${IMG}/ski-jacket.jpg`, description: '트레일 베스트. 무사고.' },
  { vertical: 'run', name: '카브론 컴프레션 슬리브', brand: '카브론', subcategory: 'apparel', price: 35000, image: `${IMG}/ski-jacket.jpg`, description: '신품 미사용.' },

  // ── SURF ─────────────────────────────────────────
  { vertical: 'surf', name: 'JS 인더스트리 보드 6\'1', brand: 'JS', subcategory: 'board', price: 850000, image: `${IMG}/alpine-slope.jpg`, description: '숏보드. 미세 디그 1개. 라이딩 가능.' },
  { vertical: 'surf', name: '오닐 슈프림 풀슈트 4/3', brand: '오닐', subcategory: 'suit', price: 280000, image: `${IMG}/ski-jacket.jpg`, description: '한 시즌. 보관 양호.' },
  { vertical: 'surf', name: 'FCS 리쉬 6피트', brand: 'FCS', subcategory: 'leash', price: 35000, image: `${IMG}/alpine-slope.jpg`, description: '신품 박스 미개봉.' },
  { vertical: 'surf', name: 'FCS II 휘파람 핀 트라이', brand: 'FCS', subcategory: 'fin', price: 80000, image: `${IMG}/alpine-slope.jpg`, description: '트라이 핀 셋트.' },
  { vertical: 'surf', name: 'Vans 슬립온 서핑 의류', brand: 'Vans', subcategory: 'apparel', price: 65000, image: `${IMG}/ski-jacket.jpg`, description: '비치 의류 M 사이즈.' },

  // ── GOLF ─────────────────────────────────────────
  { vertical: 'golf', name: '테일러메이드 스텔스 2 드라이버', brand: '테일러메이드', subcategory: 'driver', price: 480000, image: `${IMG}/skis-on-snow.jpg`, description: '10.5도 / 스피더 R. 1년 사용.' },
  { vertical: 'golf', name: '미즈노 JPX 923 아이언 5-PW', brand: '미즈노', subcategory: 'iron', price: 850000, image: `${IMG}/skis-on-snow.jpg`, description: '6개 아이언 풀세트. 그립 교체 완료.' },
  { vertical: 'golf', name: '오디세이 화이트 호트 OG #7', brand: '오디세이', subcategory: 'putter', price: 180000, image: `${IMG}/skis-on-snow.jpg`, description: '34인치. 깨끗.' },
  { vertical: 'golf', name: '보키 SM10 56도 웨지', brand: '보키', subcategory: 'wedge', price: 150000, image: `${IMG}/skis-on-snow.jpg`, description: '신품 컨디션.' },
  { vertical: 'golf', name: '나이키 비전 골프화 270', brand: '나이키', subcategory: 'shoes', price: 95000, image: `${IMG}/skis-on-snow.jpg`, description: '스파이크리스. 50회 라운드.' },

  // ── CAMP ─────────────────────────────────────────
  { vertical: 'camp', name: '스노우피크 랜드락 6 텐트', brand: '스노우피크', subcategory: 'tent', price: 1450000, image: `${IMG}/alpine-slope.jpg`, description: 'L 사이즈. 시즌 2 사용. 폴 양호.' },
  { vertical: 'camp', name: 'NEMO 디스코 30 침낭', brand: 'NEMO', subcategory: 'sleeping', price: 280000, image: `${IMG}/ski-jacket.jpg`, description: '동계용. 1시즌 사용.' },
  { vertical: 'camp', name: '헬리녹스 체어 원', brand: '헬리녹스', subcategory: 'chair', price: 95000, image: `${IMG}/alpine-slope.jpg`, description: '정품 박스 포함.' },
  { vertical: 'camp', name: '코베아 알파인 마스터 코펠', brand: '코베아', subcategory: 'cookware', price: 110000, image: `${IMG}/alpine-slope.jpg`, description: '4인용 풀세트. 깨끗.' },
  { vertical: 'camp', name: '제니스 에디션 LED 랜턴', brand: '제니스', subcategory: 'lantern', price: 65000, image: `${IMG}/alpine-slope.jpg`, description: '배터리 + 충전 케이블 포함.' },
  { vertical: 'camp', name: '코오롱 캠핑 자켓 L', brand: '코오롱', subcategory: 'apparel', price: 85000, image: `${IMG}/ski-jacket.jpg`, description: '봄/가을용 미드 자켓.' },
];

async function main() {
  console.log(`🌱 Seeding ${SEEDS.length} vertical products...`);

  const testUser = await prisma.user.findFirst({
    where: { email: { startsWith: 'test', endsWith: '@snowpan.com' } },
    select: { id: true },
  });
  if (!testUser) {
    console.error('❌ No test user found. Run seed-test-users.ts first.');
    process.exit(1);
  }

  let created = 0, skipped = 0;
  for (const s of SEEDS) {
    const existing = await prisma.product.findFirst({ where: { name: s.name, vertical: s.vertical } });
    if (existing) { skipped++; continue; }
    await prisma.product.create({
      data: {
        name: s.name,
        brand: s.brand,
        subcategory: s.subcategory,
        price: s.price,
        image: s.image,
        category: 'used',
        description: s.description,
        vertical: s.vertical,
        condition: '상',
        userId: testUser.id,
      },
    });
    created++;
  }
  console.log(`✅ Done. created=${created} skipped=${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
