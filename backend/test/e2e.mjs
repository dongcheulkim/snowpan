// ===================================================================
// 스노우판 전 기능 E2E (111 케이스) — 실제 API 호출로 전 흐름 실행
//
// 실행법 (로컬 임시 DB — 프로덕션 절대 아님):
//  1) brew install postgresql@16 (1회)
//  2) initdb + pg_ctl start (port 5433) + createdb snowpan_test
//  3) backend/.env 를 테스트용으로 잠시 교체:
//     DATABASE_URL/DIRECT_URL=postgresql://snowtest@localhost:5433/snowpan_test
//     PORT=4001, JWT 시크릿 임의값, LOADTEST_BYPASS_KEY=e2e-local-bypass
//  4) npx prisma db push && npx tsx src/index.ts (로컬 기동)
//  5) 사전시드: ski_resorts 1+개, phone_verifications(01011110001~3 verified),
//     e2e_3@test.snowpan.kr 가입 후 role='admin' UPDATE
//  6) npm i socket.io-client 후 node e2e.mjs
//  7) 끝나면 .env 원복!
//  * 재실행 시 주의: phone_verifications 은 1시간 유효 — 오래된 시드면
//    UPDATE phone_verifications SET "createdAt"=now(), "expiresAt"=now()+interval '1 hour', verified=true;
// ===================================================================
// 스노우판 전 기능 E2E — 로컬 서버(4001) + 임시 DB. 실제 API 호출로 전 흐름 실행.
import { io as ioClient } from 'socket.io-client';

const BASE = 'http://localhost:4001/api';
const BYPASS = { 'X-Loadtest-Key': 'e2e-local-bypass' };
const results = [];
let pass = 0, fail = 0;

function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  if (cond) pass++; else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', ...BYPASS };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

const IMG = '/icons/placeholder-card.svg';
const nl = (r) => Array.isArray(r.json) ? r.json : (r.json?.notifications || r.json?.items || []);

async function main() {
  // ============ 1. 인증 ============
  console.log('[1] 인증');
  const users = {};
  const mk = (n) => ({ email: `e2e_${n}@test.snowpan.kr`, password: 'testpass1234', name: `테스터${n}`, nickname: `e2e닉${n}`, phone: `0101111000${n}` });
  for (const n of [1, 2, 3]) {
    const r = await req('POST', '/auth/register', { body: mk(n) });
    const dupMsg = r.status >= 400 && r.status < 500 && /이미|중복/.test(JSON.stringify(r.json) || '');
    check(`가입 user${n}`, r.status === 201 || r.status === 200 || dupMsg, `${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`);
  }
  // 중복 이메일 가입 → 4xx
  const dup = await req('POST', '/auth/register', { body: mk(1) });
  check('중복 이메일 가입 거절', dup.status >= 400 && dup.status < 500, `${dup.status}`);

  for (const n of [1, 2, 3]) {
    const r = await req('POST', '/auth/login', { body: { email: mk(n).email, password: mk(n).password } });
    check(`로그인 user${n}`, r.status === 200 && r.json?.token, `${r.status}`);
    users[n] = { token: r.json?.token, id: r.json?.user?.id, ...mk(n) };
  }
  const wrong = await req('POST', '/auth/login', { body: { email: mk(1).email, password: 'wrongpass1' } });
  check('틀린 비번 로그인 401', wrong.status === 401, `${wrong.status}`);

  // user3 → 관리자로 승격 (DB 직접) — psql 은 셸에서 미리 못 하니 여기선 표시만 하고 아래서 실제 수행됨
  // (이 스크립트 실행 전 셸이 user3 이메일을 admin 으로 UPDATE 해둠)
  const A = users[1], B = users[2], ADM = users[3];

  // 관리자 확인
  const admCheck = await req('GET', '/admin/stats', { token: ADM.token });
  check('관리자 권한(stats 200)', admCheck.status === 200, `${admCheck.status} — user3 role 승격 확인`);
  const nonAdm = await req('GET', '/admin/stats', { token: A.token });
  check('일반유저 admin 차단 403', nonAdm.status === 403, `${nonAdm.status}`);

  // FCM 토큰 검증 (최근 수정)
  check('FCM 토큰 문자열 저장', (await req('POST', '/auth/fcm-token', { token: A.token, body: { fcmToken: 'x'.repeat(150) } })).status === 200);
  check('FCM 토큰 숫자 400', (await req('POST', '/auth/fcm-token', { token: A.token, body: { fcmToken: 12345 } })).status === 400);
  check('FCM 토큰 null 해제', (await req('POST', '/auth/fcm-token', { token: A.token, body: { fcmToken: null } })).status === 200);

  // 프로필: 닉네임 중복 409
  const nickDup = await req('PUT', '/auth/profile', { token: A.token, body: { nickname: B.nickname } });
  check('닉네임 중복 409', nickDup.status === 409, `${nickDup.status}`);
  // 미보유 뱃지 노출 시도 403
  const badBadge = await req('PUT', '/auth/profile', { token: A.token, body: { activeBadge: 'lv3' } });
  check('미보유 뱃지 노출 403', badBadge.status === 403, `${badBadge.status}`);

  // 뱃지 신청 → 관리자 승인 → 노출
  const bReq = await req('POST', '/auth/badge-request', { token: A.token, body: { badgeType: 'lv1', image: IMG } });
  check('뱃지 신청', bReq.status === 200 || bReq.status === 201, `${bReq.status} ${JSON.stringify(bReq.json)?.slice(0, 100)}`);
  const pendingBadges = await req('GET', '/admin/badges/pending', { token: ADM.token });
  const myBadgeReq = (pendingBadges.json || []).find(b => b.userId === A.id);
  check('뱃지 승인 대기 목록', !!myBadgeReq, JSON.stringify(pendingBadges.json)?.slice(0, 100));
  if (myBadgeReq) {
    check('뱃지 승인', (await req('PUT', `/admin/badges/${myBadgeReq.id}/approve`, { token: ADM.token })).status === 200);
    check('승인 뱃지 노출 OK', (await req('PUT', '/auth/profile', { token: A.token, body: { activeBadge: 'lv1' } })).status === 200);
  }

  // ============ 2. 중고거래 ============
  console.log('[2] 중고거래');
  const pCreate = await req('POST', '/products/used', {
    token: B.token,
    body: { name: 'E2E 테스트 스키', brand: 'Atomic', subcategory: 'ski', price: '350000', image: IMG, images: IMG, description: '테스트 매물', condition: '중', usageCount: '2023년식', tradeMethod: '직거래', location: '서울 강남구', category: 'used', size: '170cm' },
  });
  check('매물 등록', pCreate.status === 201 || pCreate.status === 200, `${pCreate.status} ${JSON.stringify(pCreate.json)?.slice(0, 150)}`);
  const prodId = pCreate.json?.id || pCreate.json?.product?.id;
  const pList = await req('GET', '/products?category=used&limit=10');
  const pGroup = await req('GET', '/products?category=used&subcategory=ski,ski_boots,pole&limit=10');
  check('중고 대분류(콤마) 필터', pGroup.status === 200 && (pGroup.json?.products || []).some(x => x.id === prodId), `${pGroup.status}`);
  const pGroupMiss = await req('GET', '/products?category=used&subcategory=helmet,goggles&limit=10');
  check('타 대분류엔 미노출', !(pGroupMiss.json?.products || []).some(x => x.id === prodId));
  // 길이 필터 — size 필드("170cm")에서 숫자 추출 매칭 (length 컬럼은 미사용)
  const pLen = await req('GET', '/products?category=used&lengthMin=165&lengthMax=175&limit=10');
  check('길이 필터(165~175, size 매칭)', pLen.status === 200 && (pLen.json?.products || []).some(x => x.id === prodId), `${pLen.status}`);
  const pLenMiss = await req('GET', '/products?category=used&lengthMin=150&lengthMax=159&limit=10');
  check('길이 필터 범위 밖 미노출', pLenMiss.status === 200 && !(pLenMiss.json?.products || []).some(x => x.id === prodId), `${pLenMiss.status}`);
  const pBrand = await req('GET', '/products?category=used&brand=atomic&limit=10');
  check('브랜드 필터(대소문자 무관)', pBrand.status === 200 && (pBrand.json?.products || []).some(x => x.id === prodId), `${pBrand.status}`);
  check('매물 목록 노출', (pList.json?.products || []).some(p => p.id === prodId));
  const pDetail = await req('GET', `/products/${prodId}`, { token: A.token });
  check('매물 상세 + 거래정보', pDetail.status === 200 && pDetail.json?.tradeMethod === '직거래' && pDetail.json?.location === '서울 강남구', JSON.stringify({ t: pDetail.json?.tradeMethod, l: pDetail.json?.location }));
  // 찜: 본인 차단 / 타인 OK
  check('본인 매물 찜 차단', (await req('POST', `/products/${prodId}/wishlist`, { token: B.token })).status >= 400);
  check('찜 토글 ON', (await req('POST', `/products/${prodId}/wishlist`, { token: A.token })).status === 200);
  // 수정: 연식 비우기(null) + 가격 인하
  const pUpd = await req('PUT', `/products/${prodId}`, { token: B.token, body: { price: '300000', usageCount: null } });
  check('매물 수정(가격인하+연식삭제)', pUpd.status === 200 && pUpd.json?.usageCount === null, `${pUpd.status} usage=${pUpd.json?.usageCount}`);
  // 가격인하 알림 (찜한 A 에게)
  await new Promise(r => setTimeout(r, 300));
  const aNoti = await req('GET', '/notifications', { token: A.token });
  check('가격인하 알림 수신', nl(aNoti).some(n => (n.type || '').includes('price') || (n.message || '').includes('인하') || (n.title || '').includes('가격')), JSON.stringify(nl(aNoti).map(n => n.title))?.slice(0, 150));
  // 비소유자 수정 403
  check('타인 매물 수정 403', (await req('PUT', `/products/${prodId}`, { token: A.token, body: { price: '1000' } })).status === 403);
  // 끌올 — 등록 시 bumpedAt=now 라 24h 쿨다운부터 시작 (의도된 설계: 새 매물은 이미 최상단)
  check('끌올 쿨다운(등록직후 429)', (await req('PUT', `/products/${prodId}/bump`, { token: B.token })).status === 429);
  check('타인 매물 끌올 403', (await req('PUT', `/products/${prodId}/bump`, { token: A.token })).status === 403);
  // 상태 변경 → sold
  check('판매완료 처리', (await req('PUT', `/products/${prodId}`, { token: B.token, body: { status: 'sold' } })).status === 200);
  // 시세
  check('시세 API', (await req('GET', '/products/market-stats?subcategory=ski')).status === 200);
  // 판매내역 (vertical 무관 — 최근 수정)
  const mySales = await req('GET', `/products?userId=${B.id}&category=used`);
  check('판매내역 조회', (mySales.json?.products || []).some(p => p.id === prodId));

  // ============ 3. 커뮤니티 (댓글·대댓글 포함) ============
  console.log('[3] 커뮤니티');
  const post = await req('POST', '/community', { token: A.token, body: { title: 'E2E 게시글', content: '본문입니다 테스트', category: 'free', sport: 'ski' } });
  check('글 작성', post.status === 201 || post.status === 200, `${post.status}`);
  const postId = post.json?.id;
  // 댓글 → 같은 사람 두 번째 댓글(다른 내용) → OK
  const c1 = await req('POST', `/community/${postId}/comments`, { token: B.token, body: { content: '첫 댓글' } });
  check('댓글 작성', c1.status === 201, `${c1.status}`);
  const c2 = await req('POST', `/community/${postId}/comments`, { token: B.token, body: { content: '두 번째 댓글 (다른 내용)' } });
  check('같은 사람 두 번째 댓글 OK', c2.status === 201, `${c2.status} — 여러 댓글 가능 확인`);
  const cDup = await req('POST', `/community/${postId}/comments`, { token: B.token, body: { content: '첫 댓글' } });
  check('같은 내용 1분내 반복 409', cDup.status === 409, `${cDup.status}`);
  // 대댓글 (신규 기능)
  const reply = await req('POST', `/community/${postId}/comments`, { token: A.token, body: { content: '답글입니다', parentId: c1.json?.id } });
  check('대댓글 작성', reply.status === 201 && reply.json?.parentId === c1.json?.id, `${reply.status} parentId=${reply.json?.parentId}`);
  // 답글의 답글 → 같은 부모로 평탄화
  const reply2 = await req('POST', `/community/${postId}/comments`, { token: B.token, body: { content: '답글의 답글', parentId: reply.json?.id } });
  check('답글의 답글 → 평탄화', reply2.status === 201 && reply2.json?.parentId === c1.json?.id, `parentId=${reply2.json?.parentId}`);
  // 댓글 알림 (B: 자기 댓글에 A가 답글)
  const bNoti = await req('GET', '/notifications', { token: B.token });
  check('답글 알림 수신', nl(bNoti).some(n => (n.title || '').includes('답글')), JSON.stringify(nl(bNoti).map(n => n.title))?.slice(0, 120));
  // 좋아요 토글
  const like1 = await req('PUT', `/community/${postId}/like`, { token: B.token });
  check('글 좋아요', like1.status === 200 && like1.json?.liked === true);
  // 본인 글 좋아요 허용 (정책 변경 — 1인 1개라 조작 여지 없음)
  const selfLike = await req('PUT', `/community/${postId}/like`, { token: A.token });
  check('본인 글 좋아요 허용', selfLike.status === 200 && selfLike.json?.liked === true, `${selfLike.status}`);
  // 글 수정 (신규 편집 흐름 — PUT + images)
  const pEdit = await req('PUT', `/community/${postId}`, { token: A.token, body: { title: 'E2E 게시글(수정)', content: '수정된 본문', category: 'free', images: '' } });
  check('글 수정', pEdit.status === 200, `${pEdit.status}`);
  const postAfter = await req('GET', `/community/${postId}`);
  check('수정 반영 + 댓글 parentId 응답', postAfter.json?.title === 'E2E 게시글(수정)' && (postAfter.json?.comments || []).some(c => c.parentId), `title=${postAfter.json?.title}`);
  // 신고 + 24h 중복 차단
  const rep = await req('POST', '/reports', { token: B.token, body: { type: 'post', targetId: postId, reason: '스팸/도배', description: 'e2e' } });
  check('신고 접수', rep.status === 201 || rep.status === 200, `${rep.status} ${JSON.stringify(rep.json)?.slice(0, 100)}`);
  const repDup = await req('POST', '/reports', { token: B.token, body: { type: 'post', targetId: postId, reason: '스팸/도배', description: 'e2e' } });
  check('중복 신고 차단', repDup.status >= 400, `${repDup.status}`);
  // 댓글 삭제 (작성자)
  check('댓글 삭제', (await req('DELETE', `/community/comments/${c2.json?.id}`, { token: B.token })).status === 200);
  check('타인 댓글 삭제 403', (await req('DELETE', `/community/comments/${c1.json?.id}`, { token: A.token })).status === 403);

  // ============ 4. 투표 ============
  console.log('[4] 투표');
  const poll = await req('POST', '/polls', { token: A.token, body: { title: 'E2E 투표', options: ['스키', '보드'] } });
  check('투표 생성', poll.status === 201 || poll.status === 200, `${poll.status} ${JSON.stringify(poll.json)?.slice(0, 120)}`);
  const pollId = poll.json?.id;
  const pollDetail = await req('GET', `/polls/${pollId}`, { token: B.token });
  const optId = pollDetail.json?.options?.[0]?.id;
  const vote = await req('POST', `/polls/${pollId}/vote`, { token: B.token, body: { optionId: optId } });
  check('투표하기', vote.status === 200 || vote.status === 201, `${vote.status}`);
  check('중복 투표 409', (await req('POST', `/polls/${pollId}/vote`, { token: B.token, body: { optionId: optId } })).status === 409);
  // 좋아요 + myLike (최근 수정)
  await req('POST', `/polls/${pollId}/like`, { token: B.token });
  const pd2 = await req('GET', `/polls/${pollId}`, { token: B.token });
  check('투표 myLike 복원', pd2.json?.myLike === true && pd2.json?.myVote === optId, JSON.stringify({ myLike: pd2.json?.myLike, myVote: !!pd2.json?.myVote }));
  const unlike = await req('POST', `/polls/${pollId}/like`, { token: B.token });
  check('좋아요 토글 해제', unlike.json?.liked === false);
  // 본인 투표 좋아요 허용 (정책 변경)
  const pollSelfLike = await req('POST', `/polls/${pollId}/like`, { token: A.token });
  check('본인 투표 좋아요 허용', pollSelfLike.status === 200 && pollSelfLike.json?.liked === true, `${pollSelfLike.status}`);
  check('투표 삭제(작성자)', (await req('DELETE', `/polls/${pollId}`, { token: A.token })).status === 200);

  // ============ 5. 매장 4종 + 승인 흐름 ============
  console.log('[5] 매장 4종');
  const resorts = await req('GET', '/resorts');
  const resortId = resorts.json?.[0]?.id;
  check('리조트 목록', !!resortId, JSON.stringify(resorts.json)?.slice(0, 80));

  // 스키샵
  const shop = await req('POST', '/ski-shops', { token: B.token, body: { name: 'E2E스키샵', area: '강원', address: '주소1', description: '설명', businessLicense: IMG, image: IMG, images: IMG, phone: '033-111-2222' } });
  check('스키샵 등록', shop.status === 201 || shop.status === 200, `${shop.status} ${JSON.stringify(shop.json)?.slice(0, 120)}`);
  const shopId = shop.json?.id;
  const pubList0 = await req('GET', '/ski-shops');
  check('미승인 매장 공개목록 미노출', !(pubList0.json || []).some(s => s.id === shopId));
  const shopPending = await req('GET', '/ski-shops/pending', { token: ADM.token });
  check('스키샵 승인 대기 목록', (shopPending.json || []).some(s => s.id === shopId));
  check('스키샵 승인', (await req('PUT', `/ski-shops/${shopId}/approve`, { token: ADM.token })).status === 200);
  // 승인 알림 (최근 수정)
  const bNoti2 = await req('GET', '/notifications', { token: B.token });
  check('스키샵 승인 알림', nl(bNoti2).some(n => (n.title || '').includes('스키샵 승인')), JSON.stringify(nl(bNoti2).map(n => n.title))?.slice(0, 150));
  const pubList1 = await req('GET', '/ski-shops');
  check('승인 후 공개 노출', (pubList1.json || []).some(s => s.id === shopId));
  // 소유자 수정 → 재심사(approved false)
  const shopEdit = await req('PUT', `/ski-shops/${shopId}`, { token: B.token, body: { name: 'E2E스키샵(수정)' } });
  check('스키샵 소유자 수정', shopEdit.status === 200 && shopEdit.json?.approved === false, `approved=${shopEdit.json?.approved}`);
  await req('PUT', `/ski-shops/${shopId}/approve`, { token: ADM.token }); // 재승인
  check('타인 매장 수정 403', (await req('PUT', `/ski-shops/${shopId}`, { token: A.token, body: { name: 'x' } })).status === 403);

  // 렌탈(매장형) / 레슨(포스터형)
  const rental = await req('POST', '/rentals', { token: B.token, body: { name: 'E2E렌탈샵', area: '강원', businessLicense: IMG, phone: '033-222-3333', images: IMG, image: IMG } });
  check('렌탈샵 등록(매장형)', rental.status === 201 || rental.status === 200, `${rental.status} ${JSON.stringify(rental.json)?.slice(0, 120)}`);
  const rentalId = rental.json?.id || rental.json?.rental?.id;
  const lesson = await req('POST', '/lessons', { token: B.token, body: { name: 'E2E레슨', resortId, type: '스키', specialties: '인터,레이싱,없는분야', description: '레슨 설명 (가격/시간 자유)', images: IMG, image: IMG } });
  check('레슨 등록(포스터형·가격 없이)', lesson.status === 201 || lesson.status === 200, `${lesson.status} ${JSON.stringify(lesson.json)?.slice(0, 120)}`);
  check('강습 분야 화이트리스트 필터링', lesson.json?.specialties === '인터,레이싱', `specialties=${lesson.json?.specialties}`);
  const lessonId = lesson.json?.id || lesson.json?.lesson?.id;
  check('렌탈 승인', (await req('PUT', `/admin/rentals/${rentalId}/approve`, { token: ADM.token })).status === 200);
  check('레슨 승인', (await req('PUT', `/admin/lessons/${lessonId}/approve`, { token: ADM.token })).status === 200);
  const lDetail = await req('GET', `/lessons/${lessonId}`);
  check('레슨 상세(가격 null 안전)', lDetail.status === 200 && lDetail.json?.price === null, `price=${lDetail.json?.price}`);
  // 종목·분야 필터 (신규)
  const lSki = await req('GET', '/lessons?type=스키');
  check('레슨 스키 탭 필터', (lSki.json?.items || []).some(l => l.id === lessonId), `${(lSki.json?.items || []).length}건`);
  const lBoard = await req('GET', '/lessons?type=보드');
  check('레슨 보드 탭엔 미노출', !(lBoard.json?.items || []).some(l => l.id === lessonId));
  const lSpec = await req('GET', '/lessons?specialty=인터');
  check('강습 분야 필터(인터)', (lSpec.json?.items || []).some(l => l.id === lessonId));
  const lSpec2 = await req('GET', '/lessons?specialty=모글');
  check('미보유 분야 필터 제외', !(lSpec2.json?.items || []).some(l => l.id === lessonId));

  // 정비샵 + 거절(관리자 삭제) 알림
  const repair = await req('POST', '/repair-shops', { token: B.token, body: { name: 'E2E정비샵', area: '서울', address: '주소2', description: '설명', businessLicense: IMG } });
  const repairId = repair.json?.id;
  check('정비샵 등록', repair.status === 201 || repair.status === 200);
  check('정비샵 거절(관리자 삭제)', (await req('DELETE', `/repair-shops/${repairId}`, { token: ADM.token })).status === 200);
  const bNoti3 = await req('GET', '/notifications', { token: B.token });
  check('정비샵 거부 알림', nl(bNoti3).some(n => (n.title || '').includes('정비샵 거부')), JSON.stringify(nl(bNoti3).map(n => n.title))?.slice(0, 200));

  // 매장 소식 (shop posts)
  const sp = await req('POST', '/shop-posts', { token: B.token, body: { shopType: 'skishop', shopId, title: 'E2E 소식', content: '소식 내용', postType: 'general' } });
  check('매장 소식 작성(소유자)', sp.status === 201 || sp.status === 200, `${sp.status} ${JSON.stringify(sp.json)?.slice(0, 100)}`);
  const spBad = await req('POST', '/shop-posts', { token: A.token, body: { shopType: 'skishop', shopId, title: 'x', content: 'y', postType: 'general' } });
  check('매장 소식 비소유자 403', spBad.status === 403, `${spBad.status}`);
  const spList = await req('GET', `/shop-posts?shopType=skishop&shopId=${shopId}&limit=5`);
  check('매장 소식 목록', (spList.json?.items || []).length === 1);

  // ============ 6. 채팅 (REST + 소켓) ============
  console.log('[6] 채팅');
  const room = await req('POST', '/chat/rooms', { token: A.token, body: { targetUserId: B.id, productName: 'E2E 테스트 스키', productPath: `/used/${prodId}` } });
  check('채팅방 생성', room.status === 200 || room.status === 201, `${room.status}`);
  const roomId = room.json?.id;
  check('자기 자신과 채팅 차단', (await req('POST', '/chat/rooms', { token: A.token, body: { targetUserId: A.id } })).status >= 400);

  // 소켓: A 전송 → 서버 브로드캐스트 수신 + B 에게 알림
  const sockResult = await new Promise((resolve) => {
    const s = ioClient('http://localhost:4001', { auth: { token: A.token }, transports: ['websocket'] });
    const timeout = setTimeout(() => { s.disconnect(); resolve({ ok: false, why: 'timeout' }); }, 5000);
    s.on('connect_error', (e) => { clearTimeout(timeout); s.disconnect(); resolve({ ok: false, why: `connect_error ${e.message}` }); });
    s.on('connect', () => {
      s.emit('join_room', roomId);
      setTimeout(() => s.emit('send_message', { roomId, content: '소켓 E2E 메시지' }), 300);
    });
    s.on('new_message', (m) => { clearTimeout(timeout); s.disconnect(); resolve({ ok: m?.content === '소켓 E2E 메시지', why: m?.content }); });
  });
  check('소켓 메시지 송수신', sockResult.ok, sockResult.why || '');
  const msgs = await req('GET', `/chat/rooms/${roomId}/messages`, { token: B.token });
  check('메시지 REST 조회', (msgs.json || []).some(m => m.content === '소켓 E2E 메시지'));
  const bNoti4 = await req('GET', '/notifications', { token: B.token });
  check('채팅 알림(방 밖 상대)', nl(bNoti4).some(n => (n.type || '') === 'chat'), JSON.stringify(nl(bNoti4).filter(n => n.type === 'chat').map(n => n.title))?.slice(0, 100));
  check('읽음 처리', (await req('PUT', `/chat/rooms/${roomId}/read`, { token: B.token })).status === 200);
  check('알림 전체 읽음', (await req('PUT', '/notifications/read-all', { token: B.token })).status === 200);

  // ============ 7. 숙소 ============
  console.log('[7] 숙소');
  const accom = await req('POST', '/accommodations', { token: B.token, body: { name: 'E2E펜션', type: 'pension', price: '150000', originalPrice: '200000', guests: '4인', features: 'wifi,주차', image: IMG, images: IMG, resortId } });
  check('숙소 등록(다중사진)', accom.status === 201 || accom.status === 200, `${accom.status} ${JSON.stringify(accom.json)?.slice(0, 120)}`);
  const accomId = accom.json?.id;
  check('숙소 승인', (await req('PUT', `/admin/${accomId}/approve`, { token: ADM.token })).status === 200 || (await req('PUT', `/admin/accommodations/${accomId}/approve`, { token: ADM.token })).status === 200);
  const accomDetail = await req('GET', `/accommodations/${accomId}`);
  check('숙소 상세 + images', accomDetail.status === 200 && !!accomDetail.json?.images, `images=${accomDetail.json?.images}`);
  check('숙소 상세 비공개필드 제거', accomDetail.json?.businessLicense === undefined);

  // ============ 8. 스키장 정보 + 여행사 ============
  console.log('[8] 스키장 정보·여행사');
  const ovs = await req('GET', '/overseas/resorts');
  check('스키장 정보 시드', (ovs.json || []).length >= 25, `count=${(ovs.json || []).length}`);
  const domestic = (ovs.json || []).find(r => r.scope === '국내');
  const overseas = (ovs.json || []).find(r => r.scope !== '국내');
  check('국내 리조트 liftPrice', !!domestic?.liftPrice, domestic?.slug);
  const ovsDetail = await req('GET', `/overseas/resorts/${overseas?.slug}`);
  check('해외 상세(딜·여행사 포함)', ovsDetail.status === 200 && Array.isArray(ovsDetail.json?.deals) && Array.isArray(ovsDetail.json?.agencies));

  const agency = await req('POST', '/agencies', { token: B.token, body: { name: 'E2E여행사', businessLicense: IMG, countries: '일본,캐나다', resortSlugs: overseas?.slug || '', description: '설명', website: 'https://example.com' } });
  check('여행사 등록', agency.status === 201 || agency.status === 200, `${agency.status} ${JSON.stringify(agency.json)?.slice(0, 120)}`);
  const agencyId = agency.json?.id;
  check('여행사 공개목록 미노출(미승인)', !((await req('GET', '/agencies')).json || []).some(a => a.id === agencyId));
  check('여행사 승인', (await req('PUT', `/agencies/${agencyId}/approve`, { token: ADM.token })).status === 200);
  check('여행사 공개목록 노출(베타 무료)', ((await req('GET', '/agencies')).json || []).some(a => a.id === agencyId));
  // 페이지 꾸미기 (pageBlocks) + /my 로 재로드 (최근 수정 검증)
  const blocks = [{ type: 'text', text: '안녕하세요 E2E', font: 'sans', size: 'base', align: 'left', bold: false }];
  check('페이지블록 저장', (await req('PUT', `/agencies/${agencyId}`, { token: B.token, body: { pageBlocks: blocks } })).status === 200);
  const myAgency = await req('GET', '/agencies/my', { token: B.token });
  check('페이지블록 /my 재로드', Array.isArray(myAgency.json?.[0]?.pageBlocks) && myAgency.json[0].pageBlocks.length === 1);
  // 딜 등록 (승인+베타 → 활성)
  const deal = await req('POST', `/agencies/${agencyId}/deals`, { token: B.token, body: { title: 'E2E 니세코 특가', link: 'https://example.com/deal', price: '1500000', resortId: ovsDetail.json?.id } });
  check('여행사 딜 등록', deal.status === 201 || deal.status === 200, `${deal.status} ${JSON.stringify(deal.json)?.slice(0, 100)}`);
  const ovsDetail2 = await req('GET', `/overseas/resorts/${overseas?.slug}`);
  check('리조트 상세에 딜 노출', (ovsDetail2.json?.deals || []).some(d => d.title === 'E2E 니세코 특가'));

  // ============ 9. 광고 예약 ============
  console.log('[9] 광고');
  check('가격 설정(관리자)', (await req('POST', '/ad-booking/admin/pricings', { token: ADM.token, body: { slotType: 'main_banner', category: 'none', pricePerDay: 10000, maxConcurrent: 3 } })).status < 300);
  const slots = await req('GET', '/ad-booking/slots');
  check('슬롯 조회', slots.status === 200);
  const start = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const mkBooking = (title) => req('POST', '/ad-booking/create', { token: B.token, body: { slotType: 'main_banner', category: 'none', title, description: 'E2E 광고 설명', url: 'https://example.com', desiredStart: start, periodMonths: 12, payMethod: 'TRANSFER' } });
  const bk1 = await mkBooking('E2E광고1');
  check('광고 예약1', bk1.status === 201 || bk1.status === 200, `${bk1.status} ${JSON.stringify(bk1.json)?.slice(0, 150)}`);
  const bk2 = await mkBooking('E2E광고2');
  check('광고 예약2', bk2.status === 201 || bk2.status === 200, `${bk2.status}`);
  const myBk = await req('GET', '/ad-booking/my-bookings', { token: B.token });
  const alive = (myBk.json || []).filter(b => b.status === 'pending_payment');
  check('예약2개 공존(자동취소 제거)', alive.length === 2, `pending=${alive.length} — 이전엔 두번째가 첫번째를 취소했음`);
  const bk1Id = bk1.json?.bookingId || bk1.json?.id;
  check('사용자 취소', (await req('POST', `/ad-booking/${bk1Id}/cancel`, { token: B.token })).status === 200);
  const bk2Id = bk2.json?.bookingId || bk2.json?.id;
  const adminBk = await req('POST', `/ad-booking/admin/bookings/${bk2Id}/approve`, { token: ADM.token });
  check('관리자 입금승인(TTL 내)', adminBk.status === 200, `${adminBk.status} ${JSON.stringify(adminBk.json)?.slice(0, 100)}`);

  // ============ 10. 검색·기타 ============
  console.log('[10] 검색·기타');
  const search = await req('GET', '/search?q=E2E');
  check('통합 검색', search.status === 200 && ((search.json?.products || []).length + (search.json?.posts || []).length + (search.json?.shops || []).length) > 0, JSON.stringify({ p: search.json?.products?.length, po: search.json?.posts?.length, s: search.json?.shops?.length }));
  // 추천인
  const refMe = await req('GET', '/referral/me', { token: A.token });
  check('추천 코드 발급', refMe.status === 200 && !!refMe.json?.code);
  const selfRef = await req('POST', '/auth/apply-referral', { token: A.token, body: { code: refMe.json?.code } });
  check('자기 추천 차단', selfRef.status >= 400);
  // 비밀번호 변경: 약한 비번 400 (최근 수정) → 정상 변경 → 옛 토큰 무효화
  check('약한 비번 400', (await req('PUT', '/auth/change-password', { token: A.token, body: { currentPassword: A.password, newPassword: '1' } })).status === 400);
  check('비번 변경', (await req('PUT', '/auth/change-password', { token: A.token, body: { currentPassword: A.password, newPassword: 'newpass5678' } })).status === 200);
  await new Promise(r => setTimeout(r, 200));
  check('옛 토큰 무효화', (await req('GET', '/auth/my-badges', { token: A.token })).status === 401);
  const relogin = await req('POST', '/auth/login', { body: { email: A.email, password: 'newpass5678' } });
  check('새 비번 재로그인', relogin.status === 200);
  A.token = relogin.json?.token;
  // 탈퇴
  const del = await req('DELETE', '/auth/account', { token: A.token, body: { password: 'newpass5678' } });
  check('회원 탈퇴', del.status === 200, `${del.status}`);
  check('탈퇴 후 로그인 차단', (await req('POST', '/auth/login', { body: { email: A.email, password: 'newpass5678' } })).status >= 400);
  // 탈퇴 상대와의 채팅방 REST 열람 (최근 수정 관련 — 방 직접 조회는 가능해야)
  const roomAfter = await req('GET', `/chat/rooms/${roomId}`, { token: B.token });
  check('탈퇴 상대 채팅방 열람', roomAfter.status === 200, `${roomAfter.status}`);

  // ============ 11. 개인정보 가드 ============
  // 공개 API 응답에 서류·내부심사 필드·이메일·실명이 실려나가면 즉시 실패.
  // (2026-09-04 리조트 상세 서류 URL 공개 유출 사고 재발 방지 — 새 공개 엔드포인트를
  //  만들면 여기 목록에도 추가할 것)
  console.log('[11] 개인정보 가드');
  {
    const resortsAll = await req('GET', '/resorts');
    const rid0 = resortsAll.json?.[0]?.id;
    const publicPaths = [
      '/products?category=used&limit=20',
      rid0 ? `/resorts/${rid0}` : '/resorts',
      '/rentals?limit=20', '/lessons?limit=20', '/accommodations?limit=20',
      '/ski-shops', '/repair-shops', '/shop-posts/recent?limit=20',
      '/community?limit=20', '/banners',
    ];
    // phone 은 매장 사업 연락처로 의도된 공개 — 금지 목록에서 제외
    const FORBIDDEN_KEYS = ['"businessLicense"', '"instructorCert"', '"accommodationPermit"', '"aiNote"', '"aiReviewedAt"', '"email"', '"fcmToken"', '"sessionInvalidBefore"'];
    // 실명(테스터N)은 어떤 공개 응답에도 나오면 안 됨 — 표시명은 항상 e2e닉N
    const FORBIDDEN_NAMES = ['테스터1', '테스터2', '테스터3'];
    for (const path of publicPaths) {
      const r = await req('GET', path);
      const body = JSON.stringify(r.json ?? {});
      const badKey = FORBIDDEN_KEYS.find((k) => body.includes(k));
      const badName = FORBIDDEN_NAMES.find((n) => body.includes(n));
      check(`공개응답 무유출 ${path.split('?')[0]}`, r.status === 200 && !badKey && !badName,
        `${r.status}${badKey ? ' 금지키 ' + badKey : ''}${badName ? ' 실명 ' + badName : ''}`);
    }
    // 채팅 메시지 — 상대 실명 비노출 (표시명 치환 확인)
    const msgsGuard = await req('GET', `/chat/rooms/${roomId}/messages`, { token: B.token });
    const msgsBody = JSON.stringify(msgsGuard.json ?? {});
    check('채팅 메시지 실명 비노출', msgsGuard.status === 200 && !FORBIDDEN_NAMES.some((n) => msgsBody.includes(n)), `${msgsGuard.status}`);
  }

  // ============ 결과 ============
  console.log('\n========== 결과 ==========');
  console.log(`PASS ${pass} / FAIL ${fail} / TOTAL ${pass + fail}`);
  if (fail > 0) {
    console.log('\n실패 목록:');
    for (const r of results.filter(r => !r.ok)) console.log(` - ${r.name}: ${r.detail}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('E2E 스크립트 오류:', e); process.exit(2); });
