import { toastSuccess, toastError } from '../utils/toast';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUser, imageUrl } from '../api';
import { t, onLangChange } from '../i18n';
import { PackageIcon } from '../components/Icons';
import LoadError from '../components/LoadError';
import BuyerPickerModal, { type BuyerCandidate } from '../components/BuyerPickerModal';
import { useBumpWithAd } from '../components/BumpWithAd';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  status: string;
  createdAt: string;
  buyerId?: string | null;
  buyer?: { id: string; name: string } | null; // 판매자 본인 조회 시에만 서버가 붙여줌
}

const PAGE = 30;

const MySales = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null); // 첫 페이지 로드 실패 메시지 (빈 상태와 구분)
  const navigate = useNavigate();
  const user = getUser();
  const [, setLangTick] = useState(0);

  useEffect(() => {
    return onLangChange(() => setTimeout(() => setLangTick(p => p + 1), 0));
  }, []);

  // reset=true 는 처음부터, false 는 다음 페이지 이어붙이기 (50개 넘는 판매내역도 다 관리 가능).
  const loadProducts = (reset = true) => {
    if (!user) { setLoading(false); return; } // 무한 스피너 방지
    const offset = reset ? 0 : products.length;
    if (reset) { setLoading(true); setLoadError(null); } else setLoadingMore(true);
    api<{ products: Product[]; totalCount: number }>(`/products?userId=${user.id}&category=used&limit=${PAGE}&offset=${offset}`)
      .then(data => {
        setProducts(prev => reset ? data.products : [...prev, ...data.products]);
        setTotal(data.totalCount);
      })
      .catch((err) => { if (reset) { setProducts([]); setLoadError(err instanceof Error ? err.message : '판매 내역을 불러오지 못했어요.'); } })
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      loadProducts();
    } catch (err) {
      toastError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  // 판매완료로 바꿀 때는 바로 저장하지 않고 구매자 선택 모달을 먼저 띄운다.
  // 모달을 그냥 닫으면 select 는 controlled 라 원래 상태로 돌아간다.
  const [picker, setPicker] = useState<{ id: string; name: string } | null>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'sold') {
      const target = products.find(p => p.id === id);
      setPicker({ id, name: target?.name || '' });
      return;
    }
    try {
      await api(`/products/${id}`, { method: 'PUT', body: { status: newStatus } });
      // 판매중/예약중으로 되돌리면 서버도 구매자 지정을 비운다
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, buyerId: null, buyer: null } : p));
    } catch (err) {
      toastError(err instanceof Error ? err.message : '상태 변경 실패');
    }
  };

  const handlePickBuyer = async (buyerId: string | null, candidate?: BuyerCandidate) => {
    if (!picker) return;
    const id = picker.id;
    try {
      await api(`/products/${id}`, { method: 'PUT', body: { status: 'sold', ...(buyerId && { buyerId }) } });
      setProducts(prev => prev.map(p => p.id === id
        ? { ...p, status: 'sold', buyerId, buyer: buyerId && candidate ? { id: candidate.id, name: candidate.name } : null }
        : p));
      toastSuccess(buyerId ? '판매 완료로 바꿨어요. 구매자에게 후기 요청을 보냈어요.' : '판매 완료로 바꿨어요.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : '상태 변경 실패');
    } finally {
      setPicker(null);
    }
  };

  // 끌어올리기 = 광고 보기 (앱: 애드몹 영상, 웹: 광고 카드 5초) — 2026-10-02
  const { start: startBump, earn: earnBump, busy: bumpBusy, modal: bumpModal, credits: bumpCredits, earnedToday: bumpEarned, dailyLimit: bumpLimit, webLimitReached: bumpWebLimit } = useBumpWithAd(() => loadProducts());
  const handleBump = (id: string) => { void startBump(id); };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/mypage" className="text-gray-500 text-lg">←</Link>
        <h1 className="text-xl font-bold text-gray-900">{t('mySales.title')}</h1>
      </div>

      {/* 끌어올리기 보유 수 + 광고 보고 챙기기 — 판매 물품이 없어도 보임 (2026-10-05) */}
      <div className="card p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-500">내 끌어올리기</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{bumpCredits === null ? '-' : bumpCredits}<span className="text-sm font-bold ml-0.5">개</span></p>
          <p className="text-[11px] text-gray-500 mt-0.5">매물을 목록 맨 위로 올려요</p>
          <p className="text-[11px] text-gray-500">오늘 {bumpEarned}/{bumpLimit}개 받음{bumpWebLimit ? ' · 웹은 하루 1개, 앱에서 더 받을 수 있어요' : ''}</p>
        </div>
        {bumpWebLimit ? (
          <Link to="/app" className="flex-shrink-0 px-3.5 py-2.5 rounded-xl border border-gray-900 text-gray-900 text-xs font-bold">앱에서 더 받기</Link>
        ) : (
          <button
            type="button"
            onClick={() => void earnBump()}
            disabled={bumpBusy || bumpEarned >= bumpLimit}
            className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-40"
          >
            {bumpEarned >= bumpLimit ? '내일 다시 받기' : '짧은 광고 보고 챙기기'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500 text-sm">{t('mySales.loading')}</div>
      ) : loadError && products.length === 0 ? (
        <LoadError message={loadError} onRetry={() => loadProducts()} />
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">{t('mySales.empty')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((item) => {
            return (
              <div key={item.id} className={`card overflow-hidden ${item.status === 'sold' ? 'opacity-70' : ''}`}>
                {/* 이미지 (위) */}
                <div className="relative h-28 bg-gray-100 cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>
                  {(item.image?.startsWith('http') || item.image?.startsWith('/')) ? (
                    <img src={imageUrl(item.image, 200)} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500"><PackageIcon size={28} /></div>
                  )}
                </div>
                {/* 정보 + 액션 (아래) */}
                <div className="p-2.5">
                  <h3 className="text-sm font-bold text-gray-900 truncate cursor-pointer" onClick={() => navigate(`/used/${item.id}`)}>{item.name}</h3>
                  <div className="text-sm font-bold text-mint mt-0.5 mb-2">{item.price?.toLocaleString()}원</div>
                  <select
                    value={item.status}
                    onChange={e => handleStatusChange(item.id, e.target.value)}
                    className={`w-full text-[11px] font-bold px-2 py-1.5 rounded-lg border appearance-none cursor-pointer ${
                      item.status === 'selling' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                      item.status === 'reserved' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                      'text-gray-600 bg-gray-100 border-gray-300'
                    }`}
                  >
                    <option value="selling">판매중</option>
                    <option value="reserved">예약중</option>
                    <option value="sold">판매완료</option>
                  </select>
                  {item.status === 'sold' && item.buyer && (
                    <div className="text-[10px] text-gray-500 mt-1 truncate">구매자 {item.buyer.name}</div>
                  )}
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => handleBump(item.id)}
                      className="flex-1 py-1.5 bg-mint/10 text-emerald-600 rounded-md text-[10px] font-medium border border-mint/30 hover:bg-mint/20 transition-colors"
                    >{bumpCredits ? '끌어올리기' : t('mySales.bump')}</button>
                    <button
                      onClick={() => navigate(`/used/${item.id}/edit`)}
                      className="flex-1 py-1.5 bg-sky-50 text-sky-500 rounded-md text-[10px] font-medium border border-sky-200 hover:bg-sky-100 transition-colors"
                    >{t('mySales.edit')}</button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 py-1.5 bg-gray-50 text-red-400 rounded-md text-[10px] font-medium border border-gray-200 hover:bg-red-50 transition-colors"
                    >{t('mySales.delete')}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && products.length < total && (
        <button
          onClick={() => loadProducts(false)}
          disabled={loadingMore}
          className="w-full py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {loadingMore ? '불러오는 중...' : `더 보기 (${products.length}/${total})`}
        </button>
      )}

      {picker && (
        <BuyerPickerModal
          productId={picker.id}
          productName={picker.name}
          onPick={handlePickBuyer}
          onClose={() => setPicker(null)}
        />
      )}
      {bumpModal}
    </div>
  );
};

export default MySales;
