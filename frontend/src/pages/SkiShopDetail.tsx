import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, imageUrl, getUser, uploadImages } from '../api';
import { useMeta } from '../hooks/useMeta';
import ShareButton from '../components/ShareButton';
import ShopPostsFeed from '../components/ShopPostsFeed';

interface Shop {
  id: string;
  name: string;
  area: string;
  resort: string | null;
  address: string;
  description: string;
  brands: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  naverMap: string | null;
  hours: string | null;
  image: string | null;
  isPremium?: boolean;
  user: { id: string; name: string; nickname?: string | null };
}

export default function SkiShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = getUser();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showClaim, setShowClaim] = useState(false);
  const [claimFile, setClaimFile] = useState<File | null>(null);
  const [claimMsg, setClaimMsg] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!shop) return;
    if (!confirm('이 스키샵을 삭제하시겠습니까?')) return;
    try {
      await api(`/ski-shops/${shop.id}`, { method: 'DELETE' });
      alert('삭제되었습니다.');
      navigate('/skishop');
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const handleClaim = async () => {
    if (!shop || !claimFile) { alert('사업자등록증을 업로드해주세요.'); return; }
    setClaimSubmitting(true);
    try {
      const urls = await uploadImages([claimFile]);
      await api('/shop-claims', {
        method: 'POST',
        body: { shopType: 'skishop', shopId: shop.id, businessLicense: urls[0], message: claimMsg || undefined },
      });
      alert('매장 관리 요청이 접수되었습니다.\n관리자 확인 후 소유권이 이전됩니다.');
      setShowClaim(false); setClaimFile(null); setClaimMsg('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '요청 처리에 실패했습니다.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  useMeta({
    title: shop ? `${shop.name}${shop.area ? ` · ${shop.area}` : ''}` : undefined,
    description: shop ? (shop.description?.slice(0, 150) || `${shop.name} 스키샵 정보 - 스노우판`) : undefined,
    image: shop?.image ? (shop.image.startsWith('http') ? shop.image : imageUrl(shop.image)) : undefined,
    jsonLd: shop ? {
      '@context': 'https://schema.org',
      '@type': 'SportingGoodsStore',
      name: shop.name,
      ...(shop.description ? { description: shop.description.slice(0, 300) } : {}),
      ...(shop.image ? { image: shop.image.startsWith('http') ? shop.image : imageUrl(shop.image) } : {}),
      ...(shop.address ? { address: { '@type': 'PostalAddress', streetAddress: shop.address, addressCountry: 'KR' } } : {}),
      ...(shop.phone ? { telephone: shop.phone } : {}),
      ...(shop.website ? { url: shop.website } : {}),
    } : null,
  });

  useEffect(() => {
    if (!id) return;
    api<Shop>(`/ski-shops/${id}`)
      .then(setShop)
      .catch(e => setError(e instanceof Error ? e.message : '조회 실패'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-sm text-gray-500">로딩 중...</div>;
  if (!shop) return (
    <div className="text-center py-20">
      <p className="text-sm text-gray-500 mb-3">{error || '스키샵을 찾을 수 없습니다.'}</p>
      <Link to="/skishop" className="text-sm text-sky-600 underline">← 스키샵 목록</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link to="/skishop" className="inline-flex items-center text-gray-500 text-sm hover:text-gray-900">&larr; 스키샵 목록</Link>
        <ShareButton title={shop.name} text={shop.area ? `${shop.name} · ${shop.area}` : shop.name} />
      </div>

      {shop.image && (
        <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video">
          <img src={imageUrl(shop.image)} alt={shop.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-600 rounded">{shop.area}</span>
          {shop.resort && <span className="text-[10px] text-gray-500">인근 {shop.resort}</span>}
          {shop.isPremium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-yellow-700">AD</span>}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{shop.description}</p>

        {me && (shop.user.id === me.id || me.role === 'admin') && (
          <div className="flex gap-2 pt-1">
            <button onClick={() => navigate(`/skishop/${shop.id}/edit`)} className="flex-1 py-2 text-xs font-bold text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors">수정</button>
            <button onClick={handleDelete} className="flex-1 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">삭제</button>
          </div>
        )}
        {me && shop.user.id !== me.id && me.role !== 'admin' && (
          <button onClick={() => setShowClaim(true)} className="w-full py-2 text-xs font-bold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
            이 매장 사장님이신가요? 직접 관리하기 →
          </button>
        )}
      </div>

      <div className="card p-5 space-y-2.5 text-sm">
        <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">주소</span><span className="text-gray-900">{shop.address}</span></div>
        {shop.hours && <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">영업시간</span><span className="text-gray-900 whitespace-pre-line">{shop.hours}</span></div>}
        {shop.brands && <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">취급 브랜드</span><span className="text-gray-900">{shop.brands}</span></div>}
        {shop.phone && <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">전화</span><a href={`tel:${shop.phone}`} className="text-sky-600">{shop.phone}</a></div>}
      </div>

      {(shop.instagram || shop.website || shop.naverMap) && (
        <div className="card p-5">
          <h2 className="text-xs font-bold text-gray-500 mb-3">링크</h2>
          <div className="flex flex-wrap gap-2">
            {shop.instagram && <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-pink-50 text-pink-500 rounded-lg text-xs font-bold">@{shop.instagram}</a>}
            {shop.website && <a href={shop.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-xs font-bold">홈페이지 →</a>}
            {shop.naverMap && <a href={shop.naverMap} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold">네이버 지도 →</a>}
          </div>
        </div>
      )}

      <ShopPostsFeed shopType="skishop" shopId={shop.id} ownerId={shop.user.id} />

      {showClaim && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45" onClick={() => setShowClaim(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-3 animate-[slideUp_.25s_ease-out]" onClick={e => e.stopPropagation()}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
            <h3 className="text-sm font-bold text-gray-900">매장 직접 관리 요청</h3>
            <p className="text-xs text-gray-500">사업자등록증으로 본인 확인 후, 관리자가 승인하면 이 매장을 직접 수정·관리할 수 있어요.</p>
            <div>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-sky-300 rounded-lg cursor-pointer hover:border-sky-500 bg-sky-50/50">
                {claimFile ? <span className="text-xs text-sky-600 font-medium">{claimFile.name}</span> : <span className="text-xs text-sky-600 font-medium">사업자등록증 업로드</span>}
                <input type="file" accept="image/*" className="hidden" onChange={e => setClaimFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <textarea value={claimMsg} onChange={e => setClaimMsg(e.target.value)} rows={2} placeholder="관리자에게 전할 말 (선택)" className="w-full px-3 py-2 rounded-lg text-sm bg-snow border border-gray-200 text-gray-900 placeholder-gray-400 resize-none" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowClaim(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200">취소</button>
              <button onClick={handleClaim} disabled={!claimFile || claimSubmitting} className="flex-1 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-bold disabled:opacity-30">
                {claimSubmitting ? '접수 중...' : '요청하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
