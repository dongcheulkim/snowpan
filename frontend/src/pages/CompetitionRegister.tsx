import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getUser, imageUrl, uploadImages } from '../api';
import { toastError, toastSuccess } from '../utils/toast';
import { loginPath } from '../utils/loginPath';
import { useMeta } from '../hooks/useMeta';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import type { Competition } from './Competitions';

interface Resort { id: string; name: string }

const SPORTS = [
  { value: 'ski', label: '스키' },
  { value: 'board', label: '보드' },
  { value: 'both', label: '스키·보드 모두' },
] as const;

const LEVELS = ['전체', '아마추어', '선수', '데몬', '국제'];

const statusChip: Record<string, { label: string; cls: string }> = {
  pending: { label: '검토 중', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '등록됨', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: '반려됨', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const emptyForm = {
  title: '', sport: 'ski' as 'ski' | 'board' | 'both', date: '', endDate: '', location: '', resortId: '',
  organizer: '', level: '', description: '', events: '', schedule: '', fee: '', eligibility: '', prize: '',
  contact: '', website: '',
};

function formatRange(date: string, endDate: string | null) {
  const f = (s: string) => { const [y, m, d] = s.split('-'); return `${y}.${Number(m)}.${Number(d)}`; };
  return endDate ? `${f(date)} ~ ${f(endDate)}` : f(date);
}

// 시합 일정 신청(+ 수정). 주최자가 올리면 검토 중 → 관리자 확인 후 공개. 관리자가 올리면 바로 공개.
export default function CompetitionRegister() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  useMeta({ title: isEdit ? '시합 일정 수정' : '시합 일정 신청' });

  const [resorts, setResorts] = useState<Resort[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [poster, setPoster] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [editLocked, setEditLocked] = useState<string | null>(null); // 수정 불가 사유 (공개된 일정 등)
  const [mine, setMine] = useState<Competition[]>([]);
  const [mineLoaded, setMineLoaded] = useState(false);

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  const loadMine = useCallback(() => {
    api<{ items: Competition[] }>('/competitions/mine')
      .then((d) => setMine(d.items || []))
      .catch(() => setMine([]))
      .finally(() => setMineLoaded(true));
  }, []);
  useEffect(() => { if (!isEdit) loadMine(); }, [isEdit, loadMine]);

  // 수정 모드 — 기존 내용 채우기
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingEdit(true);
    api<Competition>(`/competitions/${id}`)
      .then((c) => {
        if (cancelled) return;
        const me = getUser();
        if (!me) return;
        if (me.role !== 'admin' && c.submittedById !== me.id) { setEditLocked('신청한 분만 수정할 수 있어요.'); return; }
        if (me.role !== 'admin' && c.status === 'approved') { setEditLocked('공개된 일정은 직접 수정할 수 없어요. 고객센터로 문의해 주세요.'); }
        setForm({
          title: c.title, sport: c.sport, date: c.date, endDate: c.endDate || '', location: c.location,
          resortId: c.resortId || '', organizer: c.organizer, level: c.level || '', description: c.description || '',
          events: c.events || '', schedule: c.schedule || '', fee: c.fee || '', eligibility: c.eligibility || '',
          prize: c.prize || '', contact: c.contact || '', website: c.website || '',
        });
        setPoster(c.poster || '');
      })
      .catch((err) => { if (!cancelled) setEditLocked(err instanceof Error ? err.message : '대회 정보를 불러오지 못했어요.'); })
      .finally(() => { if (!cancelled) setLoadingEdit(false); });
    return () => { cancelled = true; };
  }, [id]);

  const isDirty = !submitting && !isEdit && (form.title.trim() !== '' || form.location.trim() !== '' || form.description.trim() !== '' || poster !== '');
  useUnloadGuard(isDirty);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handlePoster = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const urls = await uploadImages([file]);
      setPoster(urls[0] || '');
    } catch {
      toastError('포스터 업로드에 실패했어요.');
    } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!getUser()) { toastError('로그인이 필요해요.'); navigate(loginPath('/competitions/register')); return; }
    if (editLocked) { toastError(editLocked); return; }
    const missing: string[] = [];
    if (form.title.trim().length < 2) missing.push('대회명(2자 이상)');
    if (!form.date) missing.push('대회 날짜');
    if (!form.location.trim()) missing.push('장소');
    if (!form.organizer.trim()) missing.push('주최');
    if (missing.length) { toastError(`필수 항목을 확인해 주세요: ${missing.join(', ')}`); return; }
    if (form.endDate && form.endDate < form.date) { toastError('종료 날짜는 시작 날짜보다 빠를 수 없어요.'); return; }
    if (form.website.trim() && !form.website.trim().startsWith('https://')) { toastError('안내 링크는 https:// 로 시작해야 해요.'); return; }

    const body = {
      title: form.title.trim(),
      sport: form.sport,
      date: form.date,
      endDate: form.endDate || undefined,
      location: form.location.trim(),
      resortId: form.resortId || undefined,
      organizer: form.organizer.trim(),
      level: form.level || undefined,
      description: form.description.trim() || undefined,
      events: form.events.trim() || undefined,
      schedule: form.schedule.trim() || undefined,
      fee: form.fee.trim() || undefined,
      eligibility: form.eligibility.trim() || undefined,
      prize: form.prize.trim() || undefined,
      contact: form.contact.trim() || undefined,
      website: form.website.trim() || undefined,
      poster: poster || undefined,
    };
    setSubmitting(true);
    try {
      if (isEdit) {
        await api(`/competitions/${id}`, { method: 'PUT', body });
        toastSuccess(isAdmin ? '수정했어요.' : '수정했어요. 다시 확인 후 공개돼요.');
      } else {
        await api('/competitions', { method: 'POST', body });
        toastSuccess(isAdmin ? '등록했어요. 바로 공개돼요.' : '신청했어요. 확인 후 공개돼요.');
      }
      navigate('/competitions');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '신청에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (c: Competition) => {
    if (!window.confirm(`'${c.title}' 신청을 삭제할까요?`)) return;
    try {
      await api(`/competitions/${c.id}`, { method: 'DELETE' });
      toastSuccess('삭제했어요.');
      loadMine();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제에 실패했어요.');
    }
  };

  const inputClass = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';
  const disabled = submitting || uploading || loadingEdit || !!editLocked;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? '시합 일정 수정' : '시합 일정 신청'}</h1>
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>
      <p className="text-xs text-coral">
        {isAdmin ? '관리자 계정은 바로 공개돼요.' : '신청한 일정은 확인 후 시합 일정에 공개돼요. 보통 1~2 영업일이 걸려요.'}
      </p>

      {editLocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{editLocked}</div>
      )}

      {loadingEdit ? (
        <div className="text-center py-12 text-sm text-gray-500">불러오는 중...</div>
      ) : (
        <>
          <div>
            <label className={labelClass}>대회명 *</label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="예: 제10회 스노우판 아마추어 챔피언십" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>종목 *</label>
            <div className="flex gap-2">
              {SPORTS.map((s) => (
                <label key={s.value} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-bold cursor-pointer transition-colors ${form.sport === s.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-600 border-gray-200'}`}>
                  <input type="radio" name="sport" value={s.value} checked={form.sport === s.value} onChange={() => set('sport', s.value)} className="sr-only" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>시작 날짜 *</label>
              <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>종료 날짜</label>
              <input type="date" value={form.endDate} min={form.date || undefined} onChange={(e) => set('endDate', e.target.value)} className={inputClass} />
              <p className="text-[10px] text-gray-500 mt-1">하루짜리 대회면 비워 두세요.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>장소 *</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={100} placeholder="예: 용평리조트 레인보우 슬로프" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>스키장</label>
              <select value={form.resortId} onChange={(e) => set('resortId', e.target.value)} className={inputClass}>
                <option value="">선택 안 함</option>
                {resorts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>주최 *</label>
              <input type="text" value={form.organizer} onChange={(e) => set('organizer', e.target.value)} maxLength={60} placeholder="예: 대한스키협회" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>참가 수준</label>
              <select value={form.level} onChange={(e) => set('level', e.target.value)} className={inputClass}>
                <option value="">선택 안 함</option>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>대회 소개</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} rows={4} placeholder="대회 취지, 진행 방식, 참가 방법 등을 적어 주세요." className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>종목 목록</label>
              <textarea value={form.events} onChange={(e) => set('events', e.target.value)} maxLength={1000} rows={4} placeholder={'한 줄에 하나씩\n예: 대회전 남자부\n대회전 여자부'} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>세부 일정</label>
              <textarea value={form.schedule} onChange={(e) => set('schedule', e.target.value)} maxLength={1000} rows={4} placeholder={'한 줄에 하나씩\n예: 08:00 접수\n09:30 1차 런'} className={`${inputClass} resize-none`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>참가비</label>
              <input type="text" value={form.fee} onChange={(e) => set('fee', e.target.value)} maxLength={100} placeholder="예: 50,000원 (리프트권 별도)" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>참가 자격</label>
              <input type="text" value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} maxLength={300} placeholder="예: 만 18세 이상 동호인" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>시상</label>
            <input type="text" value={form.prize} onChange={(e) => set('prize', e.target.value)} maxLength={300} placeholder="예: 종목별 1~3위 메달 및 상품" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>문의</label>
              <input type="text" value={form.contact} onChange={(e) => set('contact', e.target.value)} maxLength={120} placeholder="전화, 이메일, 카카오채널 등" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>안내 링크</label>
              <input type="url" value={form.website} onChange={(e) => set('website', e.target.value)} maxLength={300} placeholder="https://" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>포스터</label>
            {poster ? (
              <div className="flex items-start gap-3">
                <img src={imageUrl(poster, 300)} alt="포스터" className="w-28 h-36 object-cover rounded-lg border border-gray-200 bg-gray-50" />
                <div className="flex flex-col gap-2">
                  <label className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold cursor-pointer text-center">
                    {uploading ? '업로드 중...' : '다른 사진 올리기'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handlePoster(e.target.files?.[0] || null)} />
                  </label>
                  <button type="button" onClick={() => setPoster('')} className="px-3 py-2 bg-snow text-gray-500 rounded-lg text-xs font-bold border border-gray-200">삭제</button>
                </div>
              </div>
            ) : (
              <label className="block w-full py-6 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:border-primary/50 transition-all">
                {uploading ? '업로드 중...' : '포스터 이미지를 올려 주세요'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handlePoster(e.target.files?.[0] || null)} />
              </label>
            )}
            <p className="text-[10px] text-gray-500 mt-1">대회 상세 화면 상단에 크게 보여요.</p>
          </div>

          <button type="button" onClick={handleSubmit} disabled={disabled} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
            {submitting ? (isEdit ? '수정 중...' : '신청 중...') : isEdit ? '수정하기' : isAdmin ? '등록하기' : '신청하기'}
          </button>
        </>
      )}

      {/* 내 신청 내역 — 신청 화면에서만 */}
      {!isEdit && (
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">내 신청 내역</h2>
          {!mineLoaded ? (
            <div className="text-xs text-gray-500">불러오는 중...</div>
          ) : mine.length === 0 ? (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-5 text-center">아직 신청한 일정이 없어요.</div>
          ) : (
            <div className="space-y-2">
              {mine.map((c) => {
                const chip = statusChip[c.status] || statusChip.pending;
                const editable = c.status === 'pending' || c.status === 'rejected';
                return (
                  <div key={c.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${chip.cls}`}>{chip.label}</span>
                          <span className="text-sm font-bold text-gray-900 truncate">{c.title}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">{formatRange(c.date, c.endDate)} · {c.location} · {c.organizer}</div>
                        {c.status === 'rejected' && c.rejectReason && (
                          <div className="text-[11px] text-red-600 mt-1">반려 사유: {c.rejectReason}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
                      {c.status === 'approved' ? (
                        <Link to={`/competitions/${c.id}`} className="flex-1 py-2 text-center bg-gray-100 text-gray-700 rounded-lg font-bold text-xs">보기</Link>
                      ) : (
                        <Link to={`/competitions/${c.id}`} className="flex-1 py-2 text-center bg-gray-100 text-gray-700 rounded-lg font-bold text-xs">미리보기</Link>
                      )}
                      {editable && (
                        <>
                          <Link to={`/competitions/${c.id}/edit`} className="flex-1 py-2 text-center bg-sky-500 text-white rounded-lg font-bold text-xs">수정</Link>
                          <button type="button" onClick={() => handleDelete(c)} className="flex-1 py-2 bg-snow text-red-500 rounded-lg font-bold text-xs border border-red-200">삭제</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
