import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

// 도움말 센터 — 카테고리별 FAQ + 검색. CS 부담 ↓, self-service 우선.
// Support.tsx (1:1 문의) 와 분리하여 깊이 있는 정적 콘텐츠로 운영.

interface FAQ { q: string; a: string }
interface Category { id: string; label: string; icon: string; faqs: FAQ[] }

const CATEGORIES: Category[] = [
  {
    id: 'account', label: '계정·로그인', icon: '👤',
    faqs: [
      { q: '비밀번호를 잊어버렸어요.', a: '로그인 페이지의 "비밀번호 찾기"를 누르세요. 가입한 이메일로 재설정 링크가 발송됩니다.' },
      { q: '소셜 로그인 (카카오·네이버) 가능한가요?', a: '카카오 로그인을 지원합니다. 로그인 페이지에서 "카카오로 시작하기" 버튼을 누르면 됩니다.' },
      { q: '같은 전화번호로 두 계정을 만들 수 있나요?', a: '아니요. 한 전화번호로는 하나의 계정만 만들 수 있어요. 분쟁 방지를 위한 정책입니다.' },
      { q: '회원 탈퇴는 어떻게 하나요?', a: '마이페이지 → 프로필 수정 → 회원 탈퇴 버튼으로 진행합니다. 탈퇴 시 개인식별정보는 즉시 익명화되며, 거래·분쟁 기록은 관련 법령에 따라 일정 기간 보관됩니다.' },
      { q: '이메일/닉네임을 바꾸고 싶어요.', a: '닉네임은 마이페이지 → 프로필 수정에서 언제든 변경할 수 있어요. 이메일 변경은 1:1 문의로 요청해주세요.' },
    ],
  },
  {
    id: 'trade', label: '중고 거래', icon: '🎿',
    faqs: [
      { q: '중고 장비는 어떻게 구매하나요?', a: '중고 메뉴에서 마음에 드는 매물을 누르고 "채팅하기"로 판매자와 직접 대화하세요. 가격·만남 장소·결제는 양 당사자가 합의합니다.' },
      { q: '시세 비교 배지는 어떻게 계산되나요?', a: '본 플랫폼에 등록된 같은 카테고리·브랜드 매물의 최근 6개월 거래 데이터(중앙값) 기준입니다. 외부 시세 사이트가 아닌 스노우판 자체 데이터를 사용해요.' },
      { q: '직거래가 안전한가요?', a: '안전거래 가이드를 참고하세요. 가능하면 사람이 많은 공공 장소(스키장 입구, 카페 등)에서 만나고, 거래 전 사진/영수증을 충분히 확인하는 것을 권장합니다.' },
      { q: '판매자가 연락이 끊겼어요.', a: '먼저 채팅에서 부재중 메시지를 남겨보고, 24시간 이상 응답이 없으면 1:1 문의로 신고해주세요. 반복적으로 응답하지 않는 계정은 운영자가 점검합니다.' },
      { q: '결제는 플랫폼에서 하나요?', a: '아니요. 스노우판은 통신판매중개자로 거래의 장만 제공합니다. 결제는 양 당사자가 계좌이체·현금 등으로 직접 진행합니다.' },
      { q: '구매한 매물에 하자가 있어요.', a: '먼저 판매자와 대화로 해결하시고, 협의가 어려우면 1:1 문의로 알려주세요. 거래 채팅 기록을 근거로 운영자가 분쟁 조정을 도와드립니다.' },
    ],
  },
  {
    id: 'register', label: '등록·판매', icon: '📤',
    faqs: [
      { q: '매물 등록은 어떻게 하나요?', a: '중고 메뉴의 "+ 등록" 버튼을 누르고 사진(최대 5장), 카테고리, 가격, 상태 등을 입력하세요. 사진은 자동으로 압축됩니다.' },
      { q: '렌탈샵/레슨/숙소를 등록하고 싶어요.', a: '각 메뉴 상단의 "+ 등록" 버튼으로 신청하세요. 관리자 승인(보통 1~2일) 후 노출됩니다. 베타 기간 등록비 없이 무료입니다.' },
      { q: '광고는 어떻게 신청하나요?', a: '마이페이지 → 광고 신청에서 메인 배너 / 카테고리 배너 / 프리미엄 노출 중 선택할 수 있어요. 결제 후 운영자가 검토합니다.' },
      { q: '자격증 뱃지를 받고 싶어요.', a: '마이페이지에서 "인증하기"를 눌러 자격증/지도자증 사진을 업로드하세요. 검토 후 강사·데몬 등 뱃지가 프로필에 부여됩니다.' },
      { q: '판매 상태(예약중/판매완료)는 어떻게 변경하나요?', a: '내가 등록한 매물 상세 페이지에서 가격 옆 상태 드롭다운으로 바로 변경할 수 있어요.' },
    ],
  },
  {
    id: 'safety', label: '안전·신고', icon: '🛡️',
    faqs: [
      { q: '사기/부적절한 사용자를 신고하고 싶어요.', a: '매물·게시글·프로필 페이지의 메뉴(⋯) 또는 "신고하기" 버튼으로 신고하세요. 운영자가 24시간 이내 검토합니다.' },
      { q: '도용된 제 사진/글이 올라왔어요.', a: '해당 페이지에서 신고하시거나 1:1 문의로 알려주세요. 권리 침해가 확인되면 즉시 비공개 처리됩니다.' },
      { q: '안전거래 팁이 있나요?', a: '안전거래 가이드 페이지에서 자세한 체크리스트를 제공합니다. 핵심: 공공 장소에서 만남, 사진/영수증 확인, 의심스러운 외부 결제 링크 클릭 금지.' },
    ],
  },
  {
    id: 'service', label: '서비스 운영', icon: '⚙️',
    faqs: [
      { q: '왜 베타라고 표시되어 있나요?', a: '실제 사용자 피드백을 받으며 개선 중인 단계입니다. 일부 기능이 추가/변경될 수 있고, 등록비·중개수수료 없이 운영합니다.' },
      { q: '앱은 언제 나오나요?', a: '현재는 PWA(웹 앱)로 제공됩니다. iOS Safari → 공유 → "홈 화면에 추가", Android Chrome → "앱 설치" 로 앱처럼 사용할 수 있어요.' },
      { q: '푸시 알림을 받고 싶어요.', a: '마이페이지 → 알림 설정에서 채팅·승인·관심글 댓글 등 알림 종류별로 켜고 끌 수 있습니다.' },
      { q: '데이터·이미지 사용량이 걱정돼요.', a: '이미지는 자동으로 카드 크기에 맞춰 축소 전송되며, 화면에 들어와야 로드됩니다(lazy loading). PWA 설치 시 캐시도 활용해 데이터 사용량이 줄어요.' },
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
        <p className="text-sm text-gray-600">자주 묻는 질문 모음. 답을 못 찾으면 <Link to="/mypage/support" className="text-sky-600 underline">1:1 문의</Link>로 알려주세요.</p>
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
          placeholder="질문 검색 (예: 비밀번호, 시세, 결제)"
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
                    <span className="text-xl" aria-hidden>{cat.icon}</span>
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
    </div>
  );
}
