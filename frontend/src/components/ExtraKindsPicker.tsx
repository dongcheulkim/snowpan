// 등록·수정 폼의 겸업 선택 칩 — 본인 업종을 뺀 나머지 두 업종. 선택하면 그 카테고리 목록에도 함께 노출된다.
// 새로 추가하는 겸업은 사업자등록증으로 확인이 안 되므로 증빙(판매·정비 사진 업로드 또는 영상 링크)을 받고 관리자 승인 후 반영.
import { useState } from 'react';
import { uploadImages } from '../api';
import { toastError } from './Toast';
import { KIND_LABEL, type ShopKind } from '../utils/shopKinds';

interface Props {
  own: ShopKind;
  value: string[];
  onChange: (v: string[]) => void;
  initial?: string[];              // 이미 승인돼 있던 겸업 (이건 증빙 불필요)
  proof?: string;
  onProof?: (v: string) => void;
}

export default function ExtraKindsPicker({ own, value, onChange, initial = [], proof = '', onProof }: Props) {
  const others = (Object.keys(KIND_LABEL) as ShopKind[]).filter((k) => k !== own);
  const adding = value.some((k) => !initial.includes(k));
  const [uploading, setUploading] = useState(false);

  const upload = async (file?: File) => {
    if (!file || !onProof) return;
    setUploading(true);
    try { const urls = await uploadImages([file]); onProof(urls[0]); }
    catch (err) { toastError(err instanceof Error ? err.message : '업로드에 실패했습니다.'); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-1.5">겸업 (선택)</label>
      <div className="flex gap-2">
        {others.map((k) => {
          const on = value.includes(k);
          return (
            <button type="button" key={k} onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${on ? 'bg-gray-900 text-white border-gray-900' : 'bg-snow text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
              {KIND_LABEL[k]}도 함께
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">선택한 업종의 목록에도 매장이 함께 보입니다. 새로 추가하면 관리자 확인 후 반영돼요.</p>
      {adding && onProof && (
        <div className="mt-2 p-3 rounded-lg bg-violet-50 border border-violet-200 space-y-2">
          <p className="text-xs font-bold text-violet-800">겸업 증빙 (필수)</p>
          <p className="text-[11px] text-violet-700">실제로 {value.filter((k) => !initial.includes(k)).map((k) => KIND_LABEL[k as ShopKind]).join('·')}를 하고 있다는 걸 보여주는 매장 사진을 올리거나, 영상·게시물 링크를 적어주세요.</p>
          <div className="flex gap-2 items-center">
            <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-violet-300 text-violet-700 cursor-pointer">
              {uploading ? '업로드 중...' : '사진 업로드'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <input type="url" value={proof.startsWith('/') ? '' : proof} onChange={(e) => onProof(e.target.value)} placeholder="또는 영상·인스타 링크 (https://…)"
              className="flex-1 px-3 py-1.5 bg-white border border-violet-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none" />
          </div>
          {proof.startsWith('/') && <p className="text-[11px] text-emerald-700">사진이 첨부됐어요.</p>}
        </div>
      )}
    </div>
  );
}
