import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';

interface MiniItem { id: string; name: string; price?: number; image?: string | null; area?: string; address?: string | null; }
interface Landing {
  name: string;
  resort: { id: string; name: string; location?: string | null; image?: string | null } | null;
  skiShops: MiniItem[];
  repairShops: MiniItem[];
  rentals: MiniItem[];
  lessons: MiniItem[];
  accommodations: MiniItem[];
}

export default function ResortLanding() {
  const { name } = useParams();
  const decoded = name ? decodeURIComponent(name) : '';
  const [data, setData] = useState<Landing | null>(null);
  const [loading, setLoading] = useState(true);

  useMeta({
    title: decoded ? `${decoded} 스키샵·렌탈·레슨·숙소` : undefined,
    description: decoded ? `${decoded} 근처 스키샵, 장비 렌탈, 강습, 숙소를 스노우판에서 한눈에 비교하세요.` : undefined,
    jsonLd: decoded ? {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: decoded,
      description: `${decoded} 근처 스키샵·렌탈·레슨·숙소 정보`,
    } : null,
  });

  useEffect(() => {
    if (!decoded) return;
    setLoading(true);
    api<Landing>(`/resorts/landing/${encodeURIComponent(decoded)}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [decoded]);

  if (loading) return <div className="text-center py-20 text-sm text-gray-500">로딩 중...</div>;

  const sections: { title: string; items: MiniItem[]; to: (i: MiniItem) => string; listTo: string; emoji: string }[] = data ? [
    { title: '스키샵', items: data.skiShops, to: i => `/skishop/${i.id}`, listTo: '/skishop', emoji: '🏂' },
    { title: '렌탈샵', items: data.rentals, to: i => `/rental/${i.id}`, listTo: '/rental', emoji: '🎿' },
    { title: '레슨', items: data.lessons, to: i => `/lesson/${i.id}`, listTo: '/lesson', emoji: '🧑‍🏫' },
    { title: '숙소', items: data.accommodations, to: i => `/accommodation/${i.id}`, listTo: '/accommodation', emoji: '🏨' },
    { title: '정비샵', items: data.repairShops, to: i => `/repair/${i.id}`, listTo: '/repair', emoji: '🔧' },
  ] : [];

  const totalCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{decoded}</h1>
      </div>

      <div className="card p-5">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{decoded}</span> 근처 스키샵·렌탈·레슨·숙소를 한눈에.
        </p>
        <p className="text-xs text-gray-400 mt-1">등록된 업체 {totalCount}곳</p>
      </div>

      {totalCount === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">아직 {decoded}에 등록된 업체가 없어요.</p>
          <Link to="/skishop/register" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">+ 우리 매장 등록하기</Link>
        </div>
      ) : (
        sections.filter(s => s.items.length > 0).map(section => (
          <div key={section.title} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">{section.emoji} {section.title} ({section.items.length})</h2>
              <Link to={section.listTo} className="text-xs text-sky-600 font-bold">전체 →</Link>
            </div>
            <div className="space-y-2">
              {section.items.map(item => (
                <Link key={item.id} to={section.to(item)} className="flex items-center gap-3 p-2.5 bg-snow rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300">
                    {item.image ? <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" /> : section.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.price ? (
                      <p className="text-sm font-bold text-mint">{item.price.toLocaleString()}원</p>
                    ) : (
                      <p className="text-[11px] text-gray-500 truncate">{item.address || item.area || ''}</p>
                    )}
                  </div>
                  <span className="text-gray-300 text-xs">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
