// 관리자 승인 화면 — 겸업 요청 내용과 증빙(사진/영상 링크) 표시
import { imageUrl } from '../api';
import { KIND_LABEL, type ShopKind } from '../utils/shopKinds';

export default function ExtraKindsNote({ item }: { item: { extraKinds?: string | null; extraKindsProof?: string | null } }) {
  if (!item.extraKinds) return null;
  const kinds = item.extraKinds.split(',').filter((k): k is ShopKind => k in KIND_LABEL).map((k) => KIND_LABEL[k]);
  const proof = item.extraKindsProof || '';
  const isImage = proof.startsWith('/');
  return (
    <div className="mt-2 text-[11px] px-2 py-1.5 rounded-lg border text-violet-700 bg-violet-50 border-violet-200">
      겸업 요청: <b>{kinds.join(' · ')}</b>
      {proof ? (
        isImage
          ? <a href={imageUrl(proof)} target="_blank" rel="noopener noreferrer" className="block mt-1"><img src={imageUrl(proof)} alt="겸업 증빙" className="w-full max-w-xs object-contain rounded-lg border border-violet-200" /></a>
          : <a href={proof} target="_blank" rel="noopener noreferrer" className="block mt-1 underline break-all">증빙 링크 보기: {proof}</a>
      ) : <span className="ml-1 text-amber-700">(증빙 없음 — 관리자 등록분)</span>}
    </div>
  );
}
