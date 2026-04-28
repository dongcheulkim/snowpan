import { useParams, Link } from 'react-router-dom';
import { LocationIcon, TrophyIcon } from '../components/Icons';
import competitions from '../data/competitions';

const levelColor: Record<string, string> = {
  '전체': 'bg-green-100 text-green-700',
  '선수': 'bg-red-100 text-red-700',
  '아마추어': 'bg-blue-100 text-blue-700',
  '데몬': 'bg-gold/20 text-yellow-700',
  '국제': 'bg-violet-100 text-violet-700',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function CompetitionDetail() {
  const { id } = useParams();
  const comp = competitions.find(c => c.id === id);

  if (!comp) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center text-gray-500"><TrophyIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">대회를 찾을 수 없습니다</h2>
        <Link to="/competitions" className="text-gray-500 hover:text-gray-900 text-sm">← 시합 일정으로</Link>
      </div>
    );
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const isPast = new Date(comp.endDate || comp.date) < now;
  const isToday = comp.date === now.toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link to="/competitions" className="text-gray-500 text-lg">←</Link>
        <span className="text-xs text-gray-500">시합 일정</span>
      </div>

      {/* 포스터 영역 */}
      <div className={`card overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        <div className="relative bg-gradient-to-br from-sky-500 to-blue-700 text-white p-8 text-center">
          {isToday && (
            <div className="absolute top-3 right-3 bg-white text-sky-600 text-[10px] font-black px-2 py-1 rounded-full animate-pulse">TODAY</div>
          )}
          {isPast && (
            <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">종료</div>
          )}
          <div className="mx-auto mb-4 text-white flex justify-center"><TrophyIcon size={56} /></div>
          <h1 className="text-2xl font-black mb-2">{comp.title}</h1>
          <p className="text-sky-100 text-sm">{comp.organizer} 주최</p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1"><LocationIcon size={14} /> {comp.location}</span>
          </div>
          <div className="mt-2 text-lg font-bold">
            {formatDate(comp.date)}
            {comp.endDate && <> ~ {formatDate(comp.endDate)}</>}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${levelColor[comp.level] || 'bg-white/20 text-white'}`}>{comp.level}</span>
          </div>
        </div>
      </div>

      {/* 대회 설명 */}
      {comp.description && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2">대회 소개</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{comp.description}</p>
        </div>
      )}

      {/* 종목 */}
      {comp.events && comp.events.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">종목</h2>
          <div className="flex flex-wrap gap-2">
            {comp.events.map((ev, i) => (
              <span key={i} className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-200">{ev}</span>
            ))}
          </div>
        </div>
      )}

      {/* 대회 일정 */}
      {comp.schedule && comp.schedule.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">세부 일정</h2>
          <div className="space-y-2">
            {comp.schedule.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-sky-600">{i + 1}</span>
                </div>
                <span className="text-sm text-gray-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 참가 안내 */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">참가 안내</h2>
        {comp.fee && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">참가비</span>
            <span className="font-medium text-gray-900">{comp.fee}</span>
          </div>
        )}
        {comp.eligibility && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">참가 자격</span>
            <span className="font-medium text-gray-900">{comp.eligibility}</span>
          </div>
        )}
        {comp.prize && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">시상</span>
            <span className="font-medium text-gray-900">{comp.prize}</span>
          </div>
        )}
        {comp.contact && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">문의</span>
            <span className="font-medium text-gray-900">{comp.contact}</span>
          </div>
        )}
        {comp.website && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">웹사이트</span>
            <a href={comp.website} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline">{comp.website.replace('https://', '')}</a>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        <Link to="/competitions" className="flex-1 py-3 text-center bg-gray-100 text-gray-500 rounded-xl font-medium text-sm border border-gray-200">
          ← 목록으로
        </Link>
        {comp.website && (
          <a href={comp.website} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 text-center bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors">
            공식 사이트
          </a>
        )}
      </div>
    </div>
  );
}
