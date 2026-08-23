import { useState } from 'react';
import { uploadImages, imageUrl } from '../api';
import { toastError } from './Toast';

// 여러 사진(포스터) 업로드 — value/onChange 는 콤마 구분 URL 문자열. 첫 장이 대표.
export default function MultiImageUpload({ value, onChange, max = 8 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const [uploading, setUploading] = useState(false);
  const urls = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const add = async (files: FileList) => {
    const room = max - urls.length;
    if (room <= 0) { toastError(`최대 ${max}장까지 올릴 수 있어요.`); return; }
    setUploading(true);
    try {
      const newUrls = await uploadImages(Array.from(files).slice(0, room));
      onChange([...urls, ...newUrls].join(','));
    } catch { toastError('사진 업로드에 실패했어요.'); }
    finally { setUploading(false); }
  };
  const removeAt = (i: number) => onChange(urls.filter((_, idx) => idx !== i).join(','));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= urls.length) return;
    const n = [...urls]; [n[i], n[j]] = [n[j], n[i]]; onChange(n.join(','));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            <img src={imageUrl(u, 300)} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeAt(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs leading-none">×</button>
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-sky-500 text-white px-1 py-px rounded">대표</span>
            ) : (
              <button type="button" onClick={() => move(i, -1)} className="absolute bottom-1 left-1 w-5 h-5 bg-black/50 text-white rounded text-xs leading-none">‹</button>
            )}
          </div>
        ))}
        {urls.length < max && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400">
            <span className="text-2xl leading-none">+</span>
            <span className="text-[10px] mt-1">{uploading ? '업로드중' : '사진'}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => e.target.files && add(e.target.files)} />
          </label>
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-1">최대 {max}장 · 첫 번째 사진이 대표로 노출돼요</p>
    </div>
  );
}
