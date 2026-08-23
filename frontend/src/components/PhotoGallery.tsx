import { imageUrl } from '../api';

// 상세 페이지 포스터/사진 갤러리 — 콤마 구분 URL 문자열.
export default function PhotoGallery({ images }: { images?: string | null }) {
  const urls = (images || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!urls.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {urls.map((u, i) => (
        <a
          key={i}
          href={imageUrl(u, 1200)}
          target="_blank"
          rel="noopener noreferrer"
          className={`block rounded-xl overflow-hidden bg-gray-100 ${urls.length % 2 === 1 && i === 0 ? 'col-span-2' : ''}`}
        >
          <img
            src={imageUrl(u, 700)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </a>
      ))}
    </div>
  );
}
