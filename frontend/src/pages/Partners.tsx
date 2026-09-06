// 사장님 입점 안내 — 공개 페이지. 매장(스키·보드샵·정비샵·렌탈샵·레슨·숙소) 무료 등록 → 직접 관리 → 노출 흐름을 설명.
// 사장님들에게 카톡·전화로 보낼 링크 용도 (/partners). 실제 등록은 사장님 대시보드(/mypage/shops, 로그인 필요).
import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

const STEPS = [
  {
    n: 1,
    title: '등록하거나, 이미 올라온 내 매장 가져가기',
    body: '사장님 대시보드에서 매장을 등록하면 사업자등록증 확인 후 공개됩니다. 스노우판이 공개 정보로 먼저 올려둔 매장("사장님 확인 전" 표시)은 매장 페이지의 "직접 관리하기"에서 사업자등록증만 올리면 소유권이 넘어옵니다.',
  },
  {
    n: 2,
    title: '사진·정보·소식 직접 관리',
    body: '대시보드에서 사진, 영업시간, 인근 리조트, 취급 장비를 수정하고 소식·이벤트를 올릴 수 있습니다. 판매·렌탈·정비를 함께 하는 매장은 겸업을 설정하면 여러 카테고리에 같이 노출됩니다.',
  },
  {
    n: 3,
    title: '손님에게 노출',
    body: '리조트별 목록, "내 주변" 거리순, 검색, 리조트 페이지에 자동으로 노출됩니다. 더 많이 보이고 싶으면 프리미엄 노출·카테고리 배너 같은 광고를 선택할 수 있습니다.',
  },
];

const FAQ = [
  { q: '비용이 드나요?', a: '매장 등록, 소식·이벤트, 리뷰, 노출은 전부 무료입니다. 광고 상품만 유료이고 원할 때만 신청합니다.' },
  { q: '승인은 얼마나 걸리나요?', a: '사업자등록증을 확인한 뒤 보통 1~2일 안에 승인됩니다. 승인 전에는 손님에게 보이지 않고, 정보를 크게 수정하면 다시 한 번 확인합니다.' },
  { q: '카카오 계정만 있으면 되나요?', a: '네. 카카오 로그인 후 마이 탭의 사장님 대시보드에서 바로 시작할 수 있습니다.' },
  { q: '지점이 여러 개예요.', a: '지점마다 따로 등록하면 됩니다. 각 지점은 가까운 리조트에 자동으로 묶여 그 리조트 목록에 나옵니다.' },
  { q: '판매도 하고 정비도 해요.', a: '한 번만 등록하고 "겸업"에서 판매·렌탈·정비를 선택하세요. 새로 추가하는 겸업은 매장 사진이나 영상 링크로 확인한 뒤 반영됩니다.' },
  { q: '제 매장이 이미 올라와 있는데 정보가 달라요.', a: '"직접 관리하기"로 가져가서 직접 고치시면 됩니다. 내리길 원하시면 고객센터로 알려주세요. 바로 처리합니다.' },
];

export default function Partners() {
  useMeta({
    title: '사장님 입점 안내 | 스노우판',
    description: '스키·보드샵, 정비샵, 렌탈샵, 레슨, 숙소를 스노우판에 무료로 등록하세요. 리조트별 목록과 내 주변 검색에 노출됩니다.',
  });

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <header className="text-center pt-2">
        <p className="text-[10px] font-bold tracking-widest text-gray-400">SNOWPAN PARTNERS</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">사장님 입점 안내</h1>
        <p className="text-sm text-gray-500 mt-2">
          스키·보드샵 · 정비샵 · 렌탈샵 · 레슨 · 숙소<br />등록부터 노출까지 무료입니다.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/mypage/shops" className="py-3 rounded-xl bg-gray-900 text-white text-sm font-bold text-center hover:bg-gray-800 transition-colors">
          매장 등록하기
        </Link>
        <Link to="/advertise" className="py-3 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold text-center hover:bg-gray-50 transition-colors">
          광고 안내 보기
        </Link>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">이렇게 진행됩니다</h2>
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
            <div>
              <p className="text-sm font-bold text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-600 leading-relaxed mt-1">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-2">내 매장이 이미 올라와 있다면</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          스노우판은 공개된 영업 정보(상호·주소·전화·영업시간)로 리조트 주변 매장을 먼저 등록해 두고 있습니다.
          이런 매장에는 "사장님 확인 전" 표시가 붙고, 사장님이 가져가기 전까지는 사진·소식 없이 기본 정보만 보입니다.
          매장 페이지에서 <b>이 매장 사장님이신가요? 직접 관리하기</b>를 눌러 사업자등록증을 올리면 승인 후 대시보드에서 관리할 수 있습니다.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Link to="/skishop" className="py-2 rounded-lg bg-snow border border-gray-200 text-xs font-bold text-gray-700 text-center">스키·보드샵</Link>
          <Link to="/repair" className="py-2 rounded-lg bg-snow border border-gray-200 text-xs font-bold text-gray-700 text-center">정비샵</Link>
          <Link to="/rental" className="py-2 rounded-lg bg-snow border border-gray-200 text-xs font-bold text-gray-700 text-center">렌탈샵</Link>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-2">무료로 할 수 있는 것</h2>
        <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
          <li>· 매장 등록과 사진·정보 관리</li>
          <li>· 소식·이벤트·프로모션 올리기 (홈 "매장 소식" 피드에도 노출)</li>
          <li>· 리조트별 목록, 내 주변 거리순, 검색, 리조트 페이지 노출</li>
          <li>· 손님 리뷰 확인, 겸업 설정으로 여러 카테고리 노출</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          더 크게 보이고 싶다면 광고 상품(프리미엄 노출, 카테고리 배너, 메인 배너)이 있습니다. 가격과 계약 단위는 <Link to="/advertise" className="text-sky-600 underline">광고 안내</Link>에서 확인하세요.
        </p>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">자주 묻는 질문</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <p className="text-xs font-bold text-gray-900">{f.q}</p>
            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{f.a}</p>
          </div>
        ))}
      </section>

      {/* 문의는 전화 대신 관리자 1:1 채팅(고객센터)으로 — 사용자 결정 */}
      <section className="card p-5 text-center">
        <p className="text-sm font-bold text-gray-900">궁금한 점이 있으면 채팅으로 물어보세요</p>
        <p className="text-xs text-gray-500 mt-1">
          고객센터에서 관리자와 1:1 채팅으로 바로 답해 드립니다. 이메일 <a href="mailto:info@snowpan.kr" className="text-sky-600 underline">info@snowpan.kr</a>도 됩니다.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link to="/mypage/support" className="py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold text-center hover:bg-gray-50 transition-colors">
            관리자 채팅 문의
          </Link>
          <Link to="/mypage/shops" className="py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold text-center hover:bg-gray-800 transition-colors">
            사장님 대시보드
          </Link>
        </div>
      </section>
    </div>
  );
}
