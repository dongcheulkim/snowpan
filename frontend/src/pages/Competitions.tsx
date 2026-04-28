import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import competitions from '../data/competitions';
import { api, getUser } from '../api';
import { ChatIcon, LocationIcon, SkiIcon, SnowboardIcon, TrophyIcon } from '../components/Icons';

const levelColor: Record<string, string> = {
  '전체': 'bg-green-100 text-green-700',
  '선수': 'bg-red-100 text-red-700',
  '아마추어': 'bg-blue-100 text-blue-700',
  '데몬': 'bg-gold/20 text-yellow-700',
  '국제': 'bg-violet-100 text-violet-700',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDay(dateStr: string) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
}

function getMonthLabel(dateStr: string) {
  return `${new Date(dateStr).getMonth() + 1}월`;
}

export default function Competitions() {
  const [filter, setFilter] = useState<'all' | 'ski' | 'board'>('all');
  const [chatLoading, setChatLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminInquiry = async () => {
    const user = getUser();
    if (!user) { navigate('/login'); return; }
    setChatLoading(true);
    try {
      const admin = await api<{ id: string; name: string }>('/contact/admin-id');
      if (admin.id === user.id) { alert('관리자 계정입니다.'); setChatLoading(false); return; }
      const room = await api<{ id: string }>('/chat/rooms', {
        method: 'POST',
        body: { targetUserId: admin.id },
      });
      navigate(`/chat/${room.id}`, { state: { seller: admin.name, sellerId: admin.id, isAdmin: true, initialMessage: '[시합 일정 등록 문의] ' } });
    } catch {
      alert('관리자 연결에 실패했습니다.');
    } finally { setChatLoading(false); }
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = competitions.filter(c => filter === 'all' || c.sport === filter || c.sport === 'both');

  const grouped: Record<string, typeof competitions> = {};
  for (const c of filtered) {
    const month = getMonthLabel(c.date);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(c);
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">시합 일정</h1>
        <span className="text-xs text-gray-500">2026-27 시즌</span>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm text-sky-700">시합 일정 등록은 관리자에게 1:1 문의해주세요.</span>
        <button
          onClick={handleAdminInquiry}
          disabled={chatLoading}
          className="flex-shrink-0 px-3 py-1.5 bg-sky-500 text-white rounded-lg font-bold text-xs hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {chatLoading ? '연결 중...' : <span className="inline-flex items-center gap-1"><ChatIcon size={12} /> 문의하기</span>}
        </button>
      </div>

      <div className="flex gap-2">
        {([
          { id: 'all', label: '전체', icon: null },
          { id: 'ski', label: '스키', icon: <SkiIcon size={13} /> },
          { id: 'board', label: '보드', icon: <SnowboardIcon size={13} /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
              filter === id ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 card">
          <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center text-gray-500"><TrophyIcon size={44} strokeWidth={1.4} /></div>
          <p className="text-sm text-gray-500">아직 등록된 시합 일정이 없습니다.</p>
          <p className="text-xs text-gray-500 mt-1">시즌이 시작되면 업데이트됩니다.</p>
        </div>
      )}

      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-gray-900">{month}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2">
            {items.map((comp) => {
              const isPast = new Date(comp.endDate || comp.date) < now;
              const isToday = comp.date === now.toISOString().split('T')[0];

              return (
                <Link
                  key={comp.id}
                  to={`/competitions/${comp.id}`}
                  className={`card p-4 block card-hover ${isPast ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 text-center w-14">
                      <div className={`text-lg font-black ${isPast ? 'text-gray-500' : 'text-sky-500'}`}>
                        {formatDate(comp.date)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ({formatDay(comp.date)})
                        {comp.endDate && <> ~ {formatDate(comp.endDate)}</>}
                      </div>
                      {isToday && <div className="text-[9px] font-bold text-sky-500 mt-0.5">TODAY</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[comp.level] || 'bg-gray-100 text-gray-600'}`}>{comp.level}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">{comp.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1"><LocationIcon size={11} /> {comp.location}</span>
                        <span>· {comp.organizer}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-500 flex-shrink-0">→</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
