import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

// 도움말 센터 — 카테고리별 FAQ + 검색. CS 부담 ↓, self-service 우선.
// Support.tsx (1:1 문의) 와 분리하여 깊이 있는 정적 콘텐츠로 운영.

interface FAQ { q: string; a: string }
interface Category { id: string; label: string; faqs: FAQ[] }

// 문구는 토스 말투(짧은 문장, ~해요). 고객센터 채팅 자동 답변(backend supportAnswers.ts)과 같은 사실만 말한다.
const CATEGORIES: Category[] = [
  {
    id: 'account', label: '계정·로그인',
    faqs: [
      { q: '로그인은 어떻게 하나요?', a: '스노우판은 카카오 로그인으로 시작해요. 로그인 화면에서 "카카오로 시작하기"를 누르면 가입까지 한 번에 돼요. 따로 비밀번호를 만들지 않아요.' },
      { q: '로그인이 안 돼요.', a: '카카오 앱에 로그인돼 있는지 먼저 확인해 주세요. 계속 안 되면 앱을 완전히 닫았다가 다시 열거나, 브라우저에서 snowpan.kr 로 로그인해 보세요. 그래도 안 되면 막히는 화면을 캡처해서 1:1 문의로 보내 주세요.' },
      { q: '비밀번호를 바꾸고 싶어요.', a: '카카오로 가입한 계정은 스노우판에 비밀번호가 따로 없어요. 카카오 계정 비밀번호를 바꾸면 그대로 적용돼요. 이메일로 가입한 계정이면 로그인 화면의 "비밀번호 찾기"에서 재설정할 수 있어요.' },
      { q: '닉네임이나 프로필을 바꾸고 싶어요.', a: '마이 → 프로필 수정에서 닉네임, 사진, 소개를 언제든 바꿀 수 있어요.' },
      { q: '회원 탈퇴는 어떻게 하나요?', a: '마이 → 맨 아래 "회원 탈퇴"에서 바로 할 수 있어요. 탈퇴하면 이메일·전화번호·이름 같은 개인정보는 즉시 지워지고, 거래 기록만 법에 따라 익명으로 보관돼요. 자세한 안내는 snowpan.kr/account-deletion 에 있어요.' },
    ],
  },
  {
    id: 'trade', label: '중고 거래',
    faqs: [
      { q: '중고 장비는 어떻게 사나요?', a: '중고 메뉴에서 마음에 드는 매물을 누르고 "채팅하기"로 판매자와 직접 이야기해요. 가격, 만나는 곳, 결제 방법은 두 분이 정해요.' },
      { q: '결제는 스노우판에서 하나요?', a: '아니요. 스노우판은 거래의 장만 제공하고 돈이 저희를 거치지 않아요. 결제는 판매자와 구매자가 계좌이체나 현금으로 직접 해요.' },
      { q: '시세 비교 배지는 어떻게 계산되나요?', a: '스노우판에 올라온 같은 카테고리·브랜드 매물의 최근 6개월 데이터(중앙값)를 기준으로 해요. 외부 시세 사이트가 아니라 스노우판 자체 데이터예요.' },
      { q: '직거래가 안전한가요?', a: '가능하면 사람이 많은 곳(스키장 입구, 카페)에서 만나고, 거래 전에 사진과 영수증을 충분히 확인해 주세요. 선입금 요구는 한 번 더 의심해 주세요. 자세한 내용은 안전거래 가이드에 있어요.' },
      { q: '판매자가 연락이 끊겼어요.', a: '채팅으로 메시지를 남겨 두고 하루 넘게 답이 없으면 1:1 문의로 매물 링크를 보내 주세요. 반복해서 답하지 않는 계정은 저희가 확인해요.' },
      { q: '산 물건에 하자가 있어요.', a: '먼저 판매자와 채팅으로 정리해 보시고, 합의가 안 되면 1:1 문의로 알려 주세요. 채팅 기록을 근거로 조정을 도와드려요. 스노우판은 거래 당사자가 아니라 대금을 대신 돌려드릴 수는 없지만, 반복 문제 계정은 제재해요.' },
      { q: '사기를 당한 것 같아요.', a: '바로 1:1 문의로 알려 주세요. 상대 닉네임, 매물 링크, 입금 내역(계좌·금액·시간), 대화 캡처가 필요해요. 확인되면 계정을 정지하고, 경찰 신고에 필요한 자료를 정리해 드려요.' },
    ],
  },
  {
    id: 'register', label: '등록·판매',
    faqs: [
      { q: '매물은 어떻게 올리나요?', a: '중고 메뉴의 "등록" 버튼을 누르고 사진(최대 5장), 카테고리, 가격, 상태를 입력하면 바로 올라가요. 사진은 자동으로 압축돼요.' },
      { q: '판매 상태(예약중·판매완료)는 어떻게 바꾸나요?', a: '내가 올린 매물 상세 페이지에서 가격 옆 상태를 눌러 바로 바꿀 수 있어요. 채팅방 위에서도 바꿀 수 있어요.' },
      { q: '우리 매장을 등록하고 싶어요.', a: '매장 등록은 무료예요. 마이 → 사장님 대시보드에서 스키·보드샵, 정비샵, 렌탈샵, 레슨, 숙소를 등록할 수 있어요. 사업자등록증 사진과 매장 정보를 올리면 확인 후 1~2일 안에 공개돼요.' },
      { q: '스노우판에 우리 매장이 이미 올라와 있어요.', a: '새로 등록하지 말고 snowpan.kr/partners/find 에서 상호나 전화번호로 찾아 "직접 관리하기"를 눌러 주세요. 사장님 인증이 끝나면 매장 정보를 직접 고칠 수 있고, 인증 매장은 목록 맨 위에 나와요.' },
      { q: '광고는 어떻게 신청하나요?', a: '광고는 상담 후 진행해요. 고객센터 채팅에서 "광고" 메뉴를 누르고 원하는 자리(메인 배너, 카테고리 배너, 프리미엄 노출)와 매장 이름을 남겨 주세요. 담당자가 조건을 안내한 뒤 광고 문구와 이미지를 작성하는 링크를 채팅으로 보내 드려요.' },
      { q: '광고 비용은 얼마인가요?', a: '고객센터 채팅에서 "광고 > 광고 비용"을 누르면 자리별 금액이 바로 안내돼요. 결제는 계좌이체로 하고 세금계산서를 발행해 드려요. 월결제와 일시불 중에서 고를 수 있어요.' },
      { q: '자격증 뱃지를 받고 싶어요.', a: '마이 → 프로필에서 "인증하기"를 눌러 자격증 사진을 올려 주세요. 확인 후 1~2일 안에 강사·데몬 같은 뱃지가 프로필에 붙어요. 자격증 종류가 사진에 보이게 찍어 주세요.' },
    ],
  },
  {
    id: 'community', label: '커뮤니티·소식',
    faqs: [
      { q: '커뮤니티 글은 어떻게 쓰나요?', a: '커뮤니티에서 "글쓰기"를 누르고 누구에게 보일지(전체·스키·보드)와 카테고리를 고른 뒤 쓰면 돼요. 스키·보드를 고르면 제목 앞에 태그가 붙고, 커뮤니티 안에서 전체·스키·보드로 나눠 볼 수 있어요.' },
      { q: '투표는 어떻게 만드나요?', a: '글쓰기에서 "투표" 버튼을 누르면 아래 입력칸이 투표 형식으로 바뀌어요. 항목을 적고 올리면 돼요.' },
      { q: '홈에 있는 스키장 소식은 뭐예요?', a: '스키장 시즌권, 오픈 일정, 이벤트 같은 소식을 스노우판이 정리해서 올리는 곳이에요. 홈 위쪽 카드를 옆으로 넘겨 보고, 누르면 사진과 설명, 바로 가는 링크가 있어요. 전체 목록은 snowpan.kr/news 에 있어요.' },
    ],
  },
  {
    id: 'safety', label: '안전·신고',
    faqs: [
      { q: '사기나 부적절한 사용자를 신고하고 싶어요.', a: '매물, 게시글, 프로필, 채팅방의 "신고" 버튼으로 바로 신고할 수 있어요. 사유를 고르면 저희에게 접수되고 확인 후 경고나 이용 정지로 처리해요.' },
      { q: '도용된 제 사진이나 글이 올라왔어요.', a: '그 페이지에서 신고하거나 1:1 문의로 알려 주세요. 권리 침해가 확인되면 바로 숨김 처리해요.' },
      { q: '앱에서 오류가 나요.', a: '불편을 드려 죄송해요. 어떤 화면에서, 무엇을 눌렀을 때, 어떻게 됐는지 캡처와 함께 1:1 문의로 보내 주세요. 쓰시는 기기와 앱인지 브라우저인지도 알려 주시면 바로 확인해서 고칠게요.' },
    ],
  },
  {
    id: 'service', label: '서비스 운영',
    faqs: [
      { q: '왜 베타라고 표시돼 있나요?', a: '실제 사용자 의견을 받으며 다듬는 중이에요. 일부 기능이 바뀌거나 추가될 수 있고, 매장 등록비와 중개 수수료 없이 운영해요.' },
      { q: '앱은 언제 나오나요?', a: '안드로이드 앱은 구글 플레이 심사 중이에요. 출시되면 홈에서 알려 드려요. 아이폰 앱은 준비 중이에요. 지금은 브라우저에서 "홈 화면에 추가"(아이폰 Safari → 공유, 안드로이드 Chrome → 앱 설치)로 앱처럼 쓸 수 있어요.' },
      { q: '알림을 받고 싶어요.', a: '마이 → 알림에서 채팅, 승인, 댓글 같은 알림을 종류별로 켜고 끌 수 있어요. 키워드 알림을 걸어 두면 원하는 매물이 올라올 때 바로 알려 드려요.' },
      { q: '고객센터는 어떻게 연락하나요?', a: '1:1 문의를 누르면 고객센터 채팅이 열려요. 위에 고정된 안내 메뉴에서 항목을 고르면 바로 답이 오고, 더 궁금한 건 그 자리에서 적어 주시면 담당자가 이어서 답해요. 전화 상담은 하지 않아요.' },
    ],
  },
];

export default function Help() {
  useMeta({
    title: '도움말 센터 — SNOW PAN',
    description: '계정, 중고거래, 등록, 안전 등 자주 묻는 질문 모음. 검색으로 빠르게 찾으세요.',
  });
  const [query, setQuery] = useState('');
  const [openCat, setOpenCat] = useState<string | null>('account');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  // 사업자 정보 접기 — 기본 접힘
  const [bizOpen, setBizOpen] = useState(false);

  // 검색 — 모든 카테고리/FAQ 평탄화 후 매치 항목만 노출
  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const matches: Array<{ catId: string; catLabel: string; faq: FAQ }> = [];
    for (const c of CATEGORIES) {
      for (const f of c.faqs) {
        if (f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) {
          matches.push({ catId: c.id, catLabel: c.label, faq: f });
        }
      }
    }
    return matches;
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-5 animate-fade-in">
      <header className="space-y-1">
        <p className="text-[11px] font-bold tracking-widest text-gray-400">HELP CENTER</p>
        <h1 className="text-2xl font-bold text-gray-900">도움말 센터</h1>
        <p className="text-sm text-gray-600">자주 묻는 질문을 모았어요. 답을 못 찾으면 <Link to="/mypage/support" className="text-sky-600 underline">1:1 문의</Link>로 알려 주세요.</p>
      </header>

      {/* 검색 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="질문 검색 (예: 카카오, 매장 등록, 광고)"
          className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-white border border-gray-300 focus:border-sky-400 outline-none"
        />
      </div>

      {/* 검색 결과 */}
      {filtered !== null ? (
        filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-600">"{query}" 와(과) 일치하는 답변이 없어요.</p>
            <Link to="/mypage/support" className="inline-block mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">1:1 문의로 질문하기</Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">검색 결과 {filtered.length}건</p>
            {filtered.map(({ catLabel, faq }, i) => (
              <details key={`${catLabel}-${i}`} className="card p-4">
                <summary className="cursor-pointer">
                  <span className="text-[10px] font-bold text-sky-600 mr-2">{catLabel}</span>
                  <span className="text-sm font-medium text-gray-900">{faq.q}</span>
                </summary>
                <p className="text-xs text-gray-600 leading-relaxed mt-2 bg-gray-50 rounded-lg p-3">{faq.a}</p>
              </details>
            ))}
          </div>
        )
      ) : (
        // 카테고리 모드
        <div className="space-y-2">
          {CATEGORIES.map(cat => {
            const isOpen = openCat === cat.id;
            return (
              <div key={cat.id} className="card overflow-hidden">
                <button
                  onClick={() => setOpenCat(isOpen ? null : cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
                    {cat.label}
                    <span className="text-[10px] text-gray-500 font-normal">({cat.faqs.length})</span>
                  </span>
                  <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>→</span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {cat.faqs.map((f, i) => {
                      const key = `${cat.id}-${i}`;
                      const expanded = openFaq === key;
                      return (
                        <div key={key} className="border-b border-gray-50 last:border-b-0">
                          <button
                            onClick={() => setOpenFaq(expanded ? null : key)}
                            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
                            aria-expanded={expanded}
                          >
                            <span className="text-sm text-gray-900">{f.q}</span>
                            <span className={`text-gray-400 text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>→</span>
                          </button>
                          {expanded && (
                            <p className="text-xs text-gray-600 leading-relaxed mx-5 mb-4 bg-gray-50 rounded-lg p-3">{f.a}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 못 찾은 경우 — 1:1 문의 유도 */}
      <div className="card p-5 bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200 text-center">
        <p className="text-sm font-bold text-gray-900 mb-1">답을 못 찾으셨나요?</p>
        <p className="text-xs text-gray-600 mb-3">관리자에게 1:1 채팅으로 직접 문의할 수 있어요.</p>
        <Link to="/mypage/support" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">1:1 문의하기</Link>
      </div>

      {/* 사업자 정보 — 전자상거래법 표시 의무 (기존 전역 푸터에서 이동). 기본 접힘, 눌러서 펼침 */}
      <section className="card p-5 text-[11px] leading-relaxed text-gray-500">
        <button
          type="button"
          onClick={() => setBizOpen(v => !v)}
          aria-expanded={bizOpen}
          className="flex items-center gap-1 text-xs font-bold text-gray-900"
        >
          스노우판 사업자 정보
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${bizOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {bizOpen && (
          <div className="mt-2">
            <p>상호 스노우판 · 대표 김동철</p>
            <p>사업자등록번호 333-12-03287</p>
            <p>강원특별자치도 평창군 대관령면 가시머리길 4, 2층</p>
            <p>이메일 <a href="mailto:info@snowpan.kr" className="hover:text-gray-700 underline underline-offset-2">info@snowpan.kr</a> · 전화 070-8027-4757</p>
          </div>
        )}
        <p className="mt-2.5">
          <Link to="/about" className="underline underline-offset-2 hover:text-gray-700">사업자정보</Link>
          <span className="mx-1.5">·</span>
          <Link to="/advertise" className="underline underline-offset-2 hover:text-gray-700">광고안내</Link>
          <span className="mx-1.5">·</span>
          <Link to="/safe-trade" className="underline underline-offset-2 hover:text-gray-700">안전거래</Link>
          <span className="mx-1.5">·</span>
          <a href="https://www.instagram.com/snowpan.kr/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-700">인스타그램</a>
        </p>
        <p className="mt-2 text-gray-400">스노우판은 통신판매중개자로서 거래 당사자가 아니며, 회원 간 거래 정보·상품의 책임은 판매자에게 있습니다.</p>
        <p className="text-gray-400">© 2026 스노우판</p>
      </section>
    </div>
  );
}
