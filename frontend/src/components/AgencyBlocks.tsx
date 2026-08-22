import { imageUrl } from '../api';
import { blockStyle, type PageBlock } from '../agencyFonts';

// 여행사 페이지 블록 렌더 — 편집 미리보기와 공개 페이지가 공용으로 사용.
export default function AgencyBlocks({ blocks }: { blocks: PageBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-3">
      {blocks.map((b, i) =>
        b.type === 'image' ? (
          b.image ? (
            <img
              key={i}
              src={imageUrl(b.image, 1000)}
              alt=""
              loading="lazy"
              className="w-full rounded-xl"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null
        ) : (
          b.text ? <p key={i} style={blockStyle(b)} className="text-gray-800">{b.text}</p> : null
        )
      )}
    </div>
  );
}
