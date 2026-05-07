import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

const VALUES = [
  { icon: '🎿', title: '솔직한 시세', body: '플랫폼 자체 거래 데이터 기반 시세 — 외부 비교 사이트가 아니라 실제로 거래되는 가격을 보여드려요.' },
  { icon: '🤝', title: '안전한 만남', body: '통신판매중개자로서 직거래 안전을 돕는 가이드와 신고 채널을 운영해요. 거래 당사자는 회원이며, 분쟁은 양측 협의를 우선합니다.' },
  { icon: '⛷️', title: '스키어를 위한', body: '스키·보드 한 종목만 깊게. 장비·렌탈·레슨·숙소까지 한 곳에서 — 검색하느라 시간 보내지 마세요.' },
];

const FEATURES = [
  { label: '중고거래', desc: '카테고리별 분류 + 시세 비교 배지', to: '/used' },
  { label: '렌탈샵', desc: '리조트별·풀세트/단품 검색', to: '/rental' },
  { label: '레슨', desc: '강사 자격·레벨별 매칭', to: '/lesson' },
  { label: '숙소', desc: '리조트 인근 펜션·콘도·시즌방', to: '/accommodation' },
  { label: '커뮤니티', desc: '후기·팁·카풀·실시간 리프트 정보', to: '/community/ski' },
  { label: '실시간 웹캠', desc: '리조트 슬로프 컨디션 라이브', to: '/webcam' },
];

export default function About() {
  useMeta({
    title: 'SNOW PAN — 설원 위의 자유, 끝없는 플레이의 장',
    description: '스키·보드 중고거래, 렌탈, 레슨, 숙소를 한 곳에. 스노우판은 스키어를 위한 스키어의 플랫폼입니다.',
  });

  return (
    <article className="max-w-3xl mx-auto py-8 space-y-12 animate-fade-in">
      {/* Hero */}
      <header className="text-center space-y-3">
        <p className="text-[11px] font-bold tracking-widest text-gray-400">ABOUT SNOW PAN</p>
        <img src="/snowpan-wordmark.svg" alt="SNOW PAN" className="h-10 mx-auto" />
        <p className="text-base font-bold text-gray-900">설원 위의 자유, 끝없는 플레이의 장</p>
        <p className="text-xs tracking-[0.18em] text-gray-500">FREEDOM ON THE SNOW · ENDLESS PLAYGROUND</p>
      </header>

      {/* Story */}
      <section className="card p-6 space-y-3">
        <h2 className="text-base font-bold text-gray-900">왜 스노우판인가요?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          스키·보드를 즐기다 보면 매년 같은 고민이 반복돼요. <strong>중고 장비는 어디서 사야 안전할까?</strong>
          {' '}<strong>이 가격이 적정한가?</strong> 렌탈샵·강습·숙소를 따로따로 검색하느라 시간을 다 써버려요.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          스노우판은 그 흩어진 정보를 한 곳에 모았어요. 그리고 가장 중요한 건 — 시세 비교를 외부 사이트가 아닌
          <strong> 본 플랫폼에 등록된 실제 매물</strong>로 계산해요. 누군가 지어낸 가격이 아니라, 진짜 스키어들이 사고파는 가격이에요.
        </p>
      </section>

      {/* Values */}
      <section className="grid sm:grid-cols-3 gap-3">
        {VALUES.map(v => (
          <div key={v.title} className="card p-5">
            <div className="text-2xl mb-2" aria-hidden>{v.icon}</div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">{v.title}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{v.body}</p>
          </div>
        ))}
      </section>

      {/* What you can do */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 px-1">스노우판에서 할 수 있는 것</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {FEATURES.map(f => (
            <Link key={f.to} to={f.to} className="card p-4 hover:border-gray-400 transition-colors block">
              <div className="text-sm font-bold text-gray-900">{f.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{f.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust / Legal */}
      <section className="card p-6 space-y-3 bg-snow">
        <h2 className="text-base font-bold text-gray-900">법적 지위 · 신뢰</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          스노우판은 <strong>통신판매중개자</strong>로서 회원 간 거래의 장(場)을 제공할 뿐 거래 당사자가 아닙니다.
          따라서 회원 간 거래에서 발생하는 책임은 거래 당사자에게 있으며, 본 서비스는 분쟁 해결을 위한
          가이드와 신고 채널을 운영합니다.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          개인정보는 관련 법령(개인정보보호법, 정보통신망법 등)에 따라 안전하게 관리되며, 자세한 내용은{' '}
          <Link to="/privacy" className="text-sky-600 underline">개인정보처리방침</Link>{' '}
          및 <Link to="/terms" className="text-sky-600 underline">이용약관</Link>에서 확인하실 수 있어요.
        </p>
      </section>

      {/* Beta */}
      <section className="text-center space-y-3 py-6">
        <p className="text-[11px] font-bold tracking-widest text-sky-500">BETA</p>
        <h2 className="text-lg font-bold text-gray-900">베타 기간 등록 무료</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          렌탈샵·레슨·숙소·정비샵 운영자라면 첫 등록자가 되어 스키어들을 만나보세요.
          <br className="hidden sm:block" />
          베타 기간 동안 등록비·중개수수료 없이 운영합니다.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link to="/used" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">중고장비 둘러보기</Link>
          <Link to="/community/ski" className="inline-block px-5 py-2.5 bg-snow border border-gray-300 text-gray-700 rounded-lg font-bold text-xs">커뮤니티 살펴보기</Link>
        </div>
      </section>
    </article>
  );
}
