import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../api';
import { toastSuccess, toastError } from '../components/Toast';

interface ResortOpt { slug: string; name: string; country: string; continent?: string | null }

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900';

export default function AgencyRegister() {
  const navigate = useNavigate();
  const [resorts, setResorts] = useState<ResortOpt[]>([]);
  const [form, setForm] = useState({ name: '', website: '', phone: '', kakao: '', description: '' });
  const [image, setImage] = useState('');       // 로고 URL
  const [license, setLicense] = useState('');    // 사업자등록증 URL
  const [slugs, setSlugs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = '여행사 등록 - 스노우판';
    api<ResortOpt[]>('/overseas/resorts').then(setResorts).catch(() => {});
  }, []);

  const upload = async (file: File, set: (v: string) => void) => {
    setUploading(true);
    try { const urls = await uploadImages([file]); set(urls[0]); }
    catch { toastError('이미지 업로드 실패'); }
    finally { setUploading(false); }
  };

  const toggle = (slug: string) => setSlugs((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);

  const submit = async () => {
    if (!form.name.trim()) { toastError('상호명을 입력해주세요.'); return; }
    if (!/^https?:\/\//i.test(form.website)) { toastError('예약/홈페이지 링크를 http(s)로 입력해주세요.'); return; }
    if (!license) { toastError('사업자등록증을 첨부해주세요.'); return; }
    setSaving(true);
    try {
      const countries = [...new Set(resorts.filter((r) => slugs.includes(r.slug)).map((r) => r.country))].join(',');
      await api('/agencies', {
        method: 'POST',
        body: { ...form, image: image || null, businessLicense: license, resortSlugs: slugs.join(','), countries },
      });
      toastSuccess('등록 완료! 관리자 승인 후 노출돼요.');
      navigate('/overseas/agency/manage');
    } catch (e) { toastError(e instanceof Error ? e.message : '등록 실패'); }
    finally { setSaving(false); }
  };

  // 대륙별 그룹
  const groups = ['아시아', '유럽', '북미', '기타'].map((c) => ({ c, list: resorts.filter((r) => (r.continent || '기타') === c) })).filter((g) => g.list.length);

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/overseas" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">여행사 등록</h1>
      </div>
      <p className="text-xs text-gray-500 -mt-2">승인 후 직접 여행 상품을 올리고, 취급 리조트 상세에 추천 여행사로 노출됩니다.</p>
      <div className="bg-mint/10 border border-mint/30 rounded-lg px-3 py-2 text-[11px] text-emerald-700 font-medium">베타 기간 등록·노출 무료 · 정식 오픈 후 가입비 100,000원 + 월 구독료 예정</div>

      <div className="card p-4 space-y-2.5">
        <input className={inputCls} placeholder="상호명 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="예약/홈페이지 링크 (https) *" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <div className="flex gap-2">
          <input className={inputCls} placeholder="전화" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={inputCls} placeholder="카카오채널 URL(선택)" value={form.kakao} onChange={(e) => setForm({ ...form, kakao: e.target.value })} />
        </div>
        <textarea className={inputCls} rows={3} placeholder="소개 (취급 상품·강점 등)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <div className="text-sm font-bold text-gray-900 mb-1.5">로고 (선택)</div>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], setImage)} className="text-xs" />
          {image && <p className="text-[11px] text-mint mt-1">로고 업로드 완료</p>}
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900 mb-1.5">사업자등록증 *</div>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], setLicense)} className="text-xs" />
          {license && <p className="text-[11px] text-mint mt-1">사업자등록증 첨부 완료</p>}
          <p className="text-[10px] text-gray-400 mt-1">본인 확인용 · 비공개로 관리됩니다.</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-bold text-gray-900 mb-2">취급 리조트 (상세 페이지 노출 대상)</div>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.c}>
              <div className="text-[11px] font-bold text-gray-400 mb-1">{g.c}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.list.map((r) => (
                  <button key={r.slug} onClick={() => toggle(r.slug)} className={`px-2.5 py-1 rounded-full text-xs font-bold ${slugs.includes(r.slug) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={submit} disabled={saving || uploading} className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-sm disabled:opacity-50">
        {uploading ? '업로드 중...' : saving ? '등록 중...' : '등록 신청'}
      </button>
    </div>
  );
}
