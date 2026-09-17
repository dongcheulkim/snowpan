import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { useMeta } from '../hooks/useMeta';
import LoadError from '../components/LoadError';
import { LocationIcon, TrophyIcon } from '../components/Icons';
import type { Competition } from './Competitions';

const levelColor: Record<string, string> = {
  '전체': 'bg-green-100 text-green-700',
  '선수': 'bg-red-100 text-red-700',
  '아마추어': 'bg-blue-100 text-blue-700',
  '데몬': 'bg-gold/20 text-yellow-700',
  '국제': 'bg-violet-100 text-violet-700',
};

const sportLabel: Record<string, string> = { ski: '스키', board: '보드', both: '스키·보드' };

// 'YYYY-MM-DD' → 로컬 자정 Date (UTC 로 읽혀 하루 밀리는 것 방지)
function toLocalDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function formatDate(dateStr: string) {
  const d = toLocalDate(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// 줄바꿈 구분 문자열 → 목록
function splitLines(v: string | null | undefined): string[] {
  return v ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [];
}

export default function CompetitionDetail() {
  const { id } = useParams();
  const [comp, setComp] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    api<Competition>(`/competitions/${id}`)
      .then((data) => { if (!cancelled) setComp(data); })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        // 공개 전이거나 없는 대회 → 404 안내. 그 외(네트워크 등)는 다시 시도.
        if (msg.includes('찾을 수 없')) setNotFound(true);
        else setLoadError(msg || '대회 정보를 불러오지 못했어요.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, retryKey]);

  useMeta({
    title: comp ? comp.title : '시합 일정',
    description: comp
      ? `${formatDate(comp.date)}${comp.endDate ? ` ~ ${formatDate(comp.endDate)}` : ''} · ${comp.location} · ${comp.organizer} 주최`
      : undefined,
    image: comp?.poster ? imageUrl(comp.poster, 800) : undefined,
    type: 'article',
  });

  if (loading) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-sm text-gray-500 animate-fade-in">불러오는 중...</div>;
  }

  if (notFound || (!comp && !loadError)) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="mx-auto mb-4 w-14 h-14 flex items-center justify-center text-gray-500"><TrophyIcon size={56} strokeWidth={1.4} /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">대회를 찾을 수 없어요</h2>
        <p className="text-sm text-gray-500 mb-5">아직 공개되지 않았거나 삭제된 일정이에요.</p>
        <Link to="/competitions" className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-xs">시합 일정으로</Link>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <LoadError message={loadError} onRetry={() => setRetryKey((k) => k + 1)} />
      </div>
    );
  }

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const isPast = toLocalDate(comp.endDate || comp.date) < now;
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = comp.date === localDate;
  const events = splitLines(comp.events);
  const schedule = splitLines(comp.schedule);
  const user = getUser();
  const isOwner = !!user && comp.submittedById === user.id;
  const hasInfo = !!(comp.fee || comp.eligibility || comp.prize || comp.contact || comp.website);

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link to="/competitions" className="text-gray-500 text-lg">←</Link>
        <Link to="/competitions" className="text-xs text-gray-500">목록</Link>
      </div>

      {/* 본인 신청 상태 안내 — 공개 전 대회는 신청자와 관리자만 볼 수 있다 */}
      {comp.status !== 'approved' && (
        <div className={`rounded-xl px-4 py-3 text-xs border ${comp.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {comp.status === 'rejected' ? (
            <>
              <span className="font-bold">반려된 신청이에요.</span>
              {comp.rejectReason && <span className="block mt-0.5">사유: {comp.rejectReason}</span>}
              {isOwner && <Link to={`/competitions/${comp.id}/edit`} className="inline-block mt-1.5 font-bold underline">내용 고쳐서 다시 신청하기</Link>}
            </>
          ) : (
            <>
              <span className="font-bold">검토 중인 신청이에요.</span>
              <span className="block mt-0.5">확인이 끝나면 시합 일정에 공개돼요.</span>
            </>
          )}
        </div>
      )}

      {/* 포스터 영역 */}
      <div className={`card overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
        {comp.poster && (
          <a href={imageUrl(comp.poster)} target="_blank" rel="noopener noreferrer" className="block bg-gray-100">
            <img src={imageUrl(comp.poster, 900)} alt={`${comp.title} 포스터`} className="w-full max-h-[32rem] object-contain" />
          </a>
        )}
        <div className="relative bg-gradient-to-br from-sky-500 to-blue-700 text-white p-8 text-center">
          {isToday && (
            <div className="absolute top-3 right-3 bg-snow text-sky-600 text-[10px] font-black px-2 py-1 rounded-full animate-pulse">TODAY</div>
          )}
          {isPast && (
            <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-full">종료</div>
          )}
          {!comp.poster && <div className="mx-auto mb-4 text-white flex justify-center"><TrophyIcon size={56} /></div>}
          <h1 className="text-2xl font-black mb-2">{comp.title}</h1>
          <p className="text-sky-100 text-sm">{comp.organizer} 주최</p>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1"><LocationIcon size={14} /> {comp.location}{comp.resort?.name && comp.resort.name !== comp.location ? ` (${comp.resort.name})` : ''}</span>
          </div>
          <div className="mt-2 text-lg font-bold">
            {formatDate(comp.date)}
            {comp.endDate && <> ~ {formatDate(comp.endDate)}</>}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/20 text-white">{sportLabel[comp.sport] || comp.sport}</span>
            {comp.level && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${levelColor[comp.level] || 'bg-white/20 text-white'}`}>{comp.level}</span>
            )}
          </div>
        </div>
      </div>

      {/* 대회 설명 */}
      {comp.description && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2">대회 소개</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{comp.description}</p>
        </div>
      )}

      {/* 종목 */}
      {events.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">종목</h2>
          <div className="flex flex-wrap gap-2">
            {events.map((ev, i) => (
              <span key={i} className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-200">{ev}</span>
            ))}
          </div>
        </div>
      )}

      {/* 대회 일정 */}
      {schedule.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">세부 일정</h2>
          <div className="space-y-2">
            {schedule.map((item, i) => (
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
      {hasInfo && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">참가 안내</h2>
          {comp.fee && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">참가비</span>
              <span className="font-medium text-gray-900 text-right">{comp.fee}</span>
            </div>
          )}
          {comp.eligibility && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">참가 자격</span>
              <span className="font-medium text-gray-900 text-right">{comp.eligibility}</span>
            </div>
          )}
          {comp.prize && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">시상</span>
              <span className="font-medium text-gray-900 text-right">{comp.prize}</span>
            </div>
          )}
          {comp.contact && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">문의</span>
              <span className="font-medium text-gray-900 text-right break-all">{comp.contact}</span>
            </div>
          )}
          {comp.website && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500 flex-shrink-0">안내 링크</span>
              <a href={comp.website} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline text-right break-all">{comp.website.replace('https://', '')}</a>
            </div>
          )}
        </div>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        <Link to="/competitions" className="flex-1 py-3 text-center bg-gray-100 text-gray-600 rounded-xl font-medium text-sm border border-gray-200">
          목록
        </Link>
        {comp.website && (
          <a href={comp.website} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 text-center bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors">
            공식 안내 보기
          </a>
        )}
      </div>
    </div>
  );
}
