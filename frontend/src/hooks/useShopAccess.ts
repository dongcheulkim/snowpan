import { useEffect, useState } from 'react';
import { api, getUser } from '../api';

// 로그인한 사람이 이 매장을 관리(사장님·직원·관리자)할 수 있는지 — 리뷰 답글 버튼·수정 페이지 진입 판단용. 2026-09-23 직원(공동 관리) 도입
export interface ShopAccess { canManage: boolean; isOwner: boolean; isStaff: boolean; isAdmin: boolean }
const NONE: ShopAccess = { canManage: false, isOwner: false, isStaff: false, isAdmin: false };

export function useShopAccess(shopType: string, shopId?: string | null): ShopAccess & { loading: boolean } {
  const [state, setState] = useState<ShopAccess & { loading: boolean }>({ ...NONE, loading: !!shopId && !!getUser() });
  useEffect(() => {
    const user = getUser();
    if (!shopId || !user) { setState({ ...NONE, loading: false }); return; }
    let alive = true;
    api<ShopAccess>(`/shop-staff/access/${shopType}/${shopId}`)
      .then((a) => { if (alive) setState({ ...a, loading: false }); })
      .catch(() => { if (alive) setState({ ...NONE, loading: false }); });
    return () => { alive = false; };
  }, [shopType, shopId]);
  return state;
}
