// 매물 카드/상세에서 쓰는 찜(하트) 버튼.
// 목록 카드는 <Link> 안에 있으므로 클릭 시 preventDefault 로 상세 이동 막음.
// 비로그인 시 로그인 페이지로. 초기 찜 여부는 optional (모르면 흰 하트로 시작).

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser } from '../api';
import { HeartFilledIcon, HeartOutlineIcon } from './Icons';
import { toastError } from './Toast';
import { hapticLight } from '../utils/haptics';

interface Props {
  productId: string;
  initial?: boolean;
  size?: number;
  /** 카드 위 우상단 플로팅용 (기본). false 면 인라인. */
  floating?: boolean;
}

export default function WishlistButton({ productId, initial = false, size = 18, floating = true }: Props) {
  const navigate = useNavigate();
  const [wished, setWished] = useState(initial);
  const [busy, setBusy] = useState(false);

  // 찜 목록이 매물 목록보다 늦게 로드되면 initial 이 나중에 바뀜 — 동기화 안 하면
  // 이미 찜한 매물이 빈 하트로 보이고, 탭 시 찜이 해제되는 역효과 발생.
  useEffect(() => { setWished(initial); }, [initial]);

  const [pop, setPop] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!getUser()) { navigate('/login'); return; }
    setBusy(true);
    const next = !wished;
    setWished(next); // 낙관적
    if (next) {
      // 찜 켜질 때만 팝 + 햅틱 — 해제는 조용히
      setPop(true);
      setTimeout(() => setPop(false), 400);
      hapticLight();
    }
    try {
      const res = await api<{ wishlisted: boolean }>(`/products/${productId}/wishlist`, { method: 'POST' });
      setWished(res.wishlisted);
    } catch (err) {
      setWished(!next); // 롤백
      toastError(err instanceof Error ? err.message : '찜 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const base = floating
    ? 'absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm shadow-sm flex items-center justify-center'
    : 'w-9 h-9 rounded-full flex items-center justify-center';

  return (
    <button
      onClick={toggle}
      aria-label={wished ? '찜 해제' : '찜하기'}
      aria-pressed={wished}
      className={`${base} active:scale-90 transition-transform`}
    >
      <span className={pop ? 'animate-heart-pop inline-flex' : 'inline-flex'}>
        {wished
          ? <HeartFilledIcon size={size} className="text-coral" />
          : <HeartOutlineIcon size={size} className="text-gray-500" />}
      </span>
    </button>
  );
}
