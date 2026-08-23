import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadImages } from '../api';
import { toastSuccess, toastError } from '../components/Toast';
import AgencyBlocks from '../components/AgencyBlocks';
import { FONTS, SIZES, loadAgencyFonts, type PageBlock } from '../agencyFonts';

interface Agency { id: string; name: string; pageBlocks?: PageBlock[] | null }

const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900';

export default function AgencyPageEditor() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.title = '여행사 페이지 꾸미기';
    loadAgencyFonts();
    api<Agency[]>('/agencies/my').then((list) => {
      const a = list[0] || null;
      setAgency(a);
      // /agencies/my 가 pageBlocks 를 그대로 반환 — 승인 게이트 걸린 /agencies/:id 재조회 금지
      // (미승인 여행사는 상세가 404 라 저장한 페이지가 사라진 것처럼 보였음)
      if (a) setBlocks(Array.isArray(a.pageBlocks) ? a.pageBlocks : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (i: number, patch: Partial<PageBlock>) => setBlocks((p) => p.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const move = (i: number, dir: -1 | 1) => setBlocks((p) => {
    const j = i + dir; if (j < 0 || j >= p.length) return p;
    const next = [...p]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const remove = (i: number) => setBlocks((p) => p.filter((_, idx) => idx !== i));
  const addText = () => setBlocks((p) => [...p, { type: 'text', text: '', font: 'sans', size: 'base', align: 'left', bold: false }]);
  const addImage = () => setBlocks((p) => [...p, { type: 'image', image: '', align: 'center' }]);

  const uploadAt = async (i: number, file: File) => {
    setUploading(true);
    try { const urls = await uploadImages([file]); update(i, { image: urls[0] }); }
    catch { toastError('사진 업로드 실패'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!agency) return;
    setSaving(true);
    try {
      await api(`/agencies/${agency.id}`, { method: 'PUT', body: { pageBlocks: blocks } });
      toastSuccess('페이지를 저장했어요.');
    } catch (e) { toastError(e instanceof Error ? e.message : '저장 실패'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500 text-sm">불러오는 중...</div>;
  if (!agency) return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3"><Link to="/overseas/agency/manage" className="text-gray-500 text-lg">←</Link><h1 className="text-xl font-bold text-gray-900">페이지 꾸미기</h1></div>
      <div className="card p-8 text-center"><p className="text-sm text-gray-600">먼저 여행사를 등록해주세요.</p></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/overseas/agency/manage" className="text-gray-500 text-lg">←</Link>
          <h1 className="text-lg font-bold text-gray-900">페이지 꾸미기</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview((v) => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${preview ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{preview ? '편집' : '미리보기'}</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold disabled:opacity-50">저장</button>
        </div>
      </div>

      {preview ? (
        <div className="card p-4">
          <p className="text-[11px] text-gray-400 mb-3">미리보기 — 스키어에게 이렇게 보여요</p>
          <div className="text-lg font-bold text-gray-900 mb-3">{agency.name}</div>
          {blocks.length ? <AgencyBlocks blocks={blocks} /> : <p className="text-sm text-gray-400 text-center py-8">아직 내용이 없어요. 편집에서 글·사진을 추가하세요.</p>}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">네이버 블로그처럼 글과 사진을 자유롭게 배치하고 글꼴을 고를 수 있어요.</p>
          <div className="space-y-2.5">
            {blocks.map((b, i) => (
              <div key={i} className="card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400">{b.type === 'image' ? '사진' : '글'} {i + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-6 rounded bg-gray-100 text-gray-500 text-xs disabled:opacity-30">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="w-6 h-6 rounded bg-gray-100 text-gray-500 text-xs disabled:opacity-30">↓</button>
                    <button onClick={() => remove(i)} className="w-6 h-6 rounded bg-red-50 text-red-500 text-xs">×</button>
                  </div>
                </div>

                {b.type === 'text' ? (
                  <>
                    <textarea value={b.text || ''} onChange={(e) => update(i, { text: e.target.value })} rows={3} placeholder="내용을 입력하세요" className={inputCls} style={{ fontFamily: FONTS.find((f) => f.id === b.font)?.css }} />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {FONTS.map((f) => (
                        <button key={f.id} onClick={() => update(i, { font: f.id })} style={{ fontFamily: f.css }} className={`px-2 py-1 rounded text-xs ${b.font === f.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{f.label}</button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {SIZES.map((s) => (
                        <button key={s.id} onClick={() => update(i, { size: s.id })} className={`px-2 py-1 rounded text-xs font-bold ${b.size === s.id ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{s.label}</button>
                      ))}
                      <span className="w-px bg-gray-200 mx-0.5" />
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} onClick={() => update(i, { align: a })} className={`px-2 py-1 rounded text-xs ${b.align === a ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{a === 'left' ? '왼쪽' : a === 'center' ? '가운데' : '오른쪽'}</button>
                      ))}
                      <button onClick={() => update(i, { bold: !b.bold })} className={`px-2 py-1 rounded text-xs font-black ${b.bold ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}>굵게</button>
                    </div>
                  </>
                ) : (
                  <div>
                    {b.image ? (
                      <img src={b.image.startsWith('http') || b.image.startsWith('/') ? b.image : ''} alt="" className="w-full rounded-lg mb-2 max-h-56 object-cover" />
                    ) : null}
                    <label className="inline-block text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg cursor-pointer">
                      {b.image ? '사진 변경' : '사진 올리기'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAt(i, e.target.files[0])} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={addText} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">+ 글 추가</button>
            <button onClick={addImage} disabled={uploading} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold disabled:opacity-50">+ 사진 추가</button>
          </div>
        </>
      )}
    </div>
  );
}
