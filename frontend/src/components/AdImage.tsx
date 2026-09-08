import { parseImagePos, adImageStyle } from '../utils/adImage';

// 광고 사진 한 장 — 홈 메인 배너·카테고리 배너·신청 미리보기가 같은 규칙으로 그린다.
// 기본(cover): 칸을 꽉 채우고 초점·확대(imagePos) 적용.
// 전체 보이기(fit): 사진을 자르지 않고 칸 안에 다 넣고, 남는 자리는 같은 사진을 크게 흐려 깔아 채운다(단색 띠보다 자연스러움).
// 부모는 relative + overflow-hidden 이어야 한다. 이미지는 absolute inset-0 로 깔린다.
interface Props {
  src: string;
  imagePos?: string | null;
  alt?: string;
  className?: string; // 추가 클래스 (pointer-events-none 등)
}

export default function AdImage({ src, imagePos, alt = '', className = '' }: Props) {
  const f = parseImagePos(imagePos);
  if (f.fit === 'contain') {
    return (
      <>
        <img
          src={src} alt="" aria-hidden draggable={false}
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          style={{ objectPosition: '50% 50%', filter: 'blur(16px) saturate(1.1)', transform: 'scale(1.2)', opacity: 0.55 }}
        />
        <img
          src={src} alt={alt} draggable={false}
          className={`absolute inset-0 w-full h-full object-contain ${className}`}
          style={{ objectPosition: `${f.x}% ${f.y}%` }}
        />
      </>
    );
  }
  return (
    <img src={src} alt={alt} draggable={false} className={`absolute inset-0 w-full h-full object-cover ${className}`} style={adImageStyle(imagePos)} />
  );
}
