// 초기 오픈 데모 매물 8건 + 스노우메타 스키샵 1건 시드.
// admin 계정 (dongcheul97@naver.com) 명의로 등록. 나중에 실물 매물로 교체 가능.
//
// 실행: cd backend && npx tsx prisma/seed-initial.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface P {
  name: string;
  brand: string;
  subcategory: string;
  price: number;
  image: string;
  condition: string;
  length?: string;
  size?: string;
  description: string;
}

// unsplash CDN — vercel.json 의 CSP img-src 에 허용됨.
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=70`;

const PRODUCTS: P[] = [
  {
    name: '아토믹 슈팅스타 165 스키',
    brand: 'ATOMIC', subcategory: 'ski', price: 380000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '상', length: '165',
    description: '2회 사용, 큰 흠집 없음. 데크·엣지 상태 양호. 왁싱 한 번 하면 바로 사용 가능.',
  },
  {
    name: '버튼 커스텀 X 158 스노보드',
    brand: 'BURTON', subcategory: 'board', price: 520000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '중', length: '158',
    description: '한 시즌 사용, 베이스 스크래치 있음. 라이딩엔 지장 없음.',
  },
  {
    name: '살로몬 X-PRO 스키부츠 270',
    brand: 'SALOMON', subcategory: 'ski_boots', price: 240000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '상', size: '270',
    description: '10시간 미만 사용. 인너 부츠 세척 완료. 발볼 넓은 편.',
  },
  {
    name: '오클리 플라이트 데크 고글',
    brand: 'OAKLEY', subcategory: 'goggles', price: 180000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '상',
    description: '2회 사용, 렌즈 깨끗함. 프리즘 렌즈 (설맹 방지). 케이스 포함.',
  },
  {
    name: '나이키 ACG 스키복 상하 세트 M',
    brand: 'NIKE', subcategory: 'wear', price: 190000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '중', size: 'M',
    description: '한 시즌 사용. 방수·투습 원단. 사이즈 M (남성 175/80).',
  },
  {
    name: '스미스 배니시 헬멧 M',
    brand: 'SMITH', subcategory: 'helmet', price: 120000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '상', size: 'M',
    description: 'MIPS 안전 시스템 탑재. 사이즈 M (55-59cm). 3회 사용.',
  },
  {
    name: '락커 보드부츠 265',
    brand: 'BURTON', subcategory: 'board_boots', price: 160000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '중', size: '265',
    description: '한 시즌 착용. 발목 서포트 좋음. Boa 다이얼 정상 작동.',
  },
  {
    name: '레키 스피드 카본 폴',
    brand: 'LEKI', subcategory: 'pole', price: 80000,
    image: IMG('1551524559-8af4e6624178'),
    condition: '상',
    description: '카본 소재. 길이 120cm. 스트랩 정상.',
  },
];

const SNOWMETA_SHOP = {
  name: '스노우메타',
  area: '서울',
  resort: null as string | null,
  address: '서울시 강남구 (정확한 주소는 어드민에서 수정)',
  description: '스노우판 공식 파트너 스키샵. 다양한 브랜드 취급 · 정비/튜닝 서비스 제공.',
  brands: 'ATOMIC,ROSSIGNOL,BURTON,SALOMON',
  phone: null as string | null,
  instagram: null as string | null,
  website: null as string | null,
  naverMap: null as string | null,
  hours: '11:00 - 21:00 (연중무휴)',
  image: null as string | null,
  businessLicense: 'PENDING', // 어드민에서 실제 이미지로 교체
  approved: true, // 관리자 등록이므로 즉시 승인 상태
  isPremium: false,
};

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true, name: true } });
  if (!admin) {
    console.error('admin 계정 없음. 먼저 회원가입 + role=admin 승격 필요.');
    process.exit(1);
  }
  console.log('using admin:', admin.name, admin.id);

  // Products
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, userId: admin.id } });
    if (existing) {
      console.log('SKIP (exists):', p.name);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        name: p.name,
        brand: p.brand,
        subcategory: p.subcategory,
        price: p.price,
        image: p.image,
        category: 'used',
        description: p.description,
        condition: p.condition,
        length: p.length,
        size: p.size,
        status: 'selling',
        userId: admin.id,
        vertical: 'snow',
      },
    });
    console.log('CREATED product:', created.name);
  }

  // Snow Meta shop
  const existingShop = await prisma.skiShop.findFirst({ where: { name: SNOWMETA_SHOP.name } });
  if (existingShop) {
    console.log('SKIP shop (exists):', SNOWMETA_SHOP.name);
  } else {
    const shop = await prisma.skiShop.create({
      data: { ...SNOWMETA_SHOP, userId: admin.id },
    });
    console.log('CREATED shop:', shop.name);
  }

  await prisma.$disconnect();
})();
