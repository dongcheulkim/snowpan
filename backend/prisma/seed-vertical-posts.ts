// vertical 별 시드 커뮤니티 게시글 — 각 플랫폼에 실제 콘텐츠 노출.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed { vertical: string; sport: string; category: string; title: string; content: string }

const SEEDS: Seed[] = [
  // bike
  { vertical: 'bike', sport: 'road', category: 'review', title: '캐년 얼티메이트 6개월 사용 후기', content: '풀카본 엔드유 프레임. 첫 그란폰도 도전했고 가벼움+안정성 둘 다 만족.' },
  { vertical: 'bike', sport: 'mtb', category: 'tip', title: 'MTB 입문자 사이즈 추천', content: '키 175라면 M 또는 17.5인치. 시승 꼭 해보세요.' },
  { vertical: 'bike', sport: 'road', category: 'carpool', title: '주말 남한산성 라이딩 동행', content: '토요일 새벽 5시 잠실 집결. 50km 코스. 페이스 30km/h.' },
  { vertical: 'bike', sport: 'gravel', category: 'meetup', title: '그래블 라이딩 동호회 첫 모집', content: '월 1회 정모. 강원/경기 미답사 코스 위주.' },

  // run
  { vertical: 'run', sport: 'road', category: 'review', title: '나이키 알파플라이 3 vs 메타 스피드 엣지', content: '두 모델 둘 다 신어봤는데 다리에 와닿는 느낌은 알파플라이가 좀 더 부드러움.' },
  { vertical: 'run', sport: 'trail', category: 'tip', title: '트레일런 입문 슈즈 추천 베스트 3', content: '호카 스피드고트, 살로몬 센스 라이드, 인노브8 트랙맥스. 가성비는 인노브8.' },
  { vertical: 'run', sport: 'road', category: 'meetup', title: '한강 새벽 런 클럽 (잠수교)', content: '매주 화/목 6시. 6km easy pace. 누구나 환영.' },
  { vertical: 'run', sport: 'road', category: 'review', title: '서울 마라톤 2026 완주 후기', content: '4시간 1분으로 완주. 25km 부근 페이서 잘 따라가면 무난.' },

  // surf
  { vertical: 'surf', sport: 'shortboard', category: 'review', title: 'JS 인더스트리 6\'1 한 시즌 리뷰', content: '양양 라이딩 메인. 적응 빠르고 풀-라이드 짧은 보드.' },
  { vertical: 'surf', sport: 'longboard', category: 'tip', title: '롱보드 입문 보드 사이즈', content: '키+30cm 가 기본. 처음엔 9피트 이상이 안정적.' },
  { vertical: 'surf', sport: 'shortboard', category: 'carpool', title: '양양 주말 카풀 (강남 ↔ 죽도해변)', content: '토 새벽 4시 강남역 출발. 일 저녁 7시 복귀. 4인 카풀.' },

  // golf
  { vertical: 'golf', sport: 'field', category: 'review', title: '스카이72 라운드 후기 + 그린피', content: '오션 9홀+레이크 9홀. 14만원/주중. 잔디 상태 양호.' },
  { vertical: 'golf', sport: 'screen', category: 'tip', title: '카카오VX 신규 클럽 셋업 가이드', content: '드라이버 헤드각 9도 권장. 아이언은 5번 빼고 6-PW.' },
  { vertical: 'golf', sport: 'field', category: 'meetup', title: '주말 1인 라운드 동반자 구해요', content: '인천 베이사이드 8/15 (토). 부킹 완료. 한 자리 남음.' },

  // camp
  { vertical: 'camp', sport: 'car', category: 'tip', title: '차박 추천 코스 — 인제 자작나무숲', content: '주차장 화장실 OK. 야간 별 보기 좋음. 평일이 한산.' },
  { vertical: 'camp', sport: 'hiking', category: 'review', title: 'NEMO 디스코 30 침낭 동계 후기', content: '영하 5도까지 OK. 패딩 슈트 함께 입으면 영하 10도도 가능.' },
  { vertical: 'camp', sport: 'glamping', category: 'meetup', title: '강원도 글램핑 그룹 모집', content: '8월 둘째주. 4가족. 1박2일. 식사는 BBQ.' },
];

async function main() {
  console.log(`🌱 Seeding ${SEEDS.length} vertical posts...`);

  const testUser = await prisma.user.findFirst({
    where: { email: { startsWith: 'test', endsWith: '@snowpan.com' } },
    select: { id: true },
  });
  if (!testUser) {
    console.error('❌ No test user found.');
    process.exit(1);
  }

  let created = 0, skipped = 0;
  for (const s of SEEDS) {
    const existing = await prisma.post.findFirst({ where: { title: s.title, vertical: s.vertical } });
    if (existing) { skipped++; continue; }
    await prisma.post.create({
      data: {
        title: s.title,
        content: s.content,
        category: s.category,
        sport: s.sport,
        vertical: s.vertical,
        userId: testUser.id,
        likes: Math.floor(Math.random() * 20),
        views: Math.floor(Math.random() * 200),
      },
    });
    created++;
  }
  console.log(`✅ Done. created=${created} skipped=${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
