import { Link } from 'react-router-dom';
import { SadIcon } from '../components/Icons';

const QUICK_LINKS = [
  { to: '/used', label: '중고거래', desc: '스키·보드 중고 매물' },
  { to: '/rental', label: '렌탈', desc: '시즌·당일 렌탈샵' },
  { to: '/lesson', label: '레슨', desc: '강사·자격 매칭' },
  { to: '/accommodation', label: '숙소', desc: '리조트·펜션·시즌방' },
  { to: '/community/ski', label: '커뮤니티', desc: '후기·팁·카풀' },
  { to: '/webcam', label: '실시간 웹캠', desc: '리조트 슬로프 현황' },
];

const NotFound = () => (
  <div className="max-w-2xl mx-auto py-16 animate-fade-in">
    <div className="text-center mb-10">
      <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center text-gray-500">
        <SadIcon size={64} strokeWidth={1.4} />
      </div>
      <p className="text-xs font-bold text-gray-400 tracking-widest mb-2">404 NOT FOUND</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-gray-500">
        링크가 만료되었거나 주소가 잘못되었을 수 있어요.
        <br className="hidden sm:block" />
        아래에서 원하는 카테고리로 이동해보세요.
      </p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
      {QUICK_LINKS.map(link => (
        <Link
          key={link.to}
          to={link.to}
          className="card p-4 hover:border-gray-400 transition-colors block"
        >
          <div className="text-sm font-bold text-gray-900">{link.label}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{link.desc}</div>
        </Link>
      ))}
    </div>

    <div className="text-center">
      <Link
        to="/"
        className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  </div>
);

export default NotFound;
