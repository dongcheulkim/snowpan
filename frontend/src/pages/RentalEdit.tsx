import { toastSuccess, toastError } from '../components/Toast';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getUser } from '../api';
import MultiImageUpload from '../components/MultiImageUpload';
import { resortRegion } from '../utils/resortRegion';
import ExtraKindsPicker from '../components/ExtraKindsPicker';
import ShopHoursFields from '../components/ShopHoursFields';
import { EMPTY_SHOP_HOURS, shopHoursFromApi, type ShopHoursValue } from '../utils/shopHoursForm';
import RentalPriceFields from '../components/RentalPriceFields';
import { EMPTY_RENTAL_PRICES, rentalPricesFromApi, rentalPricesToBody, type RentalPriceValue } from '../utils/rentalPriceForm';

interface Resort { id: string; name: string; location?: string | null }
interface RentalData {
  id: string; userId?: string; name: string; area?: string | null; address?: string | null;
  phone?: string | null; hours?: string | null; brands?: string | null; description?: string | null; extraKinds?: string | null;
  website?: string | null; instagram?: string | null; naverMap?: string | null; images?: string | null;
  image?: string | null; resort?: { id: string } | null;
  openTime?: string | null; closeTime?: string | null; closedDays?: string | null;
  priceSkiSet?: number | null; priceBoardSet?: number | null; priceClothes?: number | null; priceHelmet?: number | null; priceGoggles?: number | null; priceNote?: string | null;
}

const AREAS = ['강원', '경기', '서울', '충청', '경상', '전라'];

const RentalEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState('');
  const [hoursV, setHoursV] = useState<ShopHoursValue>(EMPTY_SHOP_HOURS); // 구조화 영업시간 ("영업 중" 배지)
  const [prices, setPrices] = useState<RentalPriceValue>(EMPTY_RENTAL_PRICES); // 가격표 (1일 기준)
  const [form, setForm] = useState({
    name: '', area: '강원', resortId: '', address: '', phone: '', hours: '',
    brands: '', description: '', website: '', instagram: '', naverMap: '',
    extraKinds: [] as string[],
    extraKindsProof: '',
  });
  const [loadedKinds, setLoadedKinds] = useState<string[]>([]); // 이미 승인된 겸업 — 증빙 불필요

  useEffect(() => { api<Resort[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  useEffect(() => {
    if (!id) return;
    api<RentalData>(`/rentals/${id}`).then(async d => {
      const me = getUser();
      if (!me) { navigate(`/rental/${id}`, { replace: true }); return; }
      if (d.userId && d.userId !== me.id && me.role !== 'admin') { // 직원(공동 관리)인지 서버에 확인 (2026-09-23)
        const acc = await api<{ canManage: boolean }>(`/shop-staff/access/rental/${id}`).catch(() => null);
        if (!acc?.canManage) { navigate(`/rental/${id}`, { replace: true }); return; }
      }
        setLoadedKinds((d.extraKinds || '').split(',').filter(Boolean));
      setForm({
        name: d.name || '', area: d.area || '강원', resortId: d.resort?.id || '', extraKinds: (d.extraKinds || '').split(',').filter(Boolean), extraKindsProof: '',
        address: d.address || '', phone: d.phone || '', hours: d.hours || '',
        brands: d.brands || '', description: d.description || '', website: d.website || '',
        instagram: d.instagram || '', naverMap: d.naverMap || '',
      });
      setImages(d.images || d.image || '');
      setHoursV(shopHoursFromApi(d));
      setPrices(rentalPricesFromApi(d));
    }).catch(() => { toastError('불러오지 못했습니다.'); navigate('/rental', { replace: true }); });
  }, [id, navigate]);

  const submit = async () => {
    if (!form.name.trim()) { toastError('상호명을 입력해주세요.'); return; }
    setLoading(true);
    try {
      await api(`/rentals/${id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(), area: form.area, resortId: form.resortId || null, extraKinds: form.extraKinds, extraKindsProof: form.extraKindsProof || undefined,
          address: form.address.trim(), phone: form.phone.trim(), hours: form.hours.trim(),
          brands: form.brands.trim(), description: form.description.trim(), website: form.website.trim(),
          instagram: form.instagram.trim(), naverMap: form.naverMap.trim(),
          images, image: images ? images.split(',')[0] : null,
          openTime: hoursV.openTime || null, closeTime: hoursV.closeTime || null, closedDays: hoursV.closedDays,
          ...rentalPricesToBody(prices),
        },
      });
      toastSuccess('수정되었습니다. 관리자 재검토 후 다시 노출됩니다.');
      navigate(`/rental/${id}`);
    } catch (err) { toastError(err instanceof Error ? err.message : '수정 실패'); }
    finally { setLoading(false); }
  };

  const inputClass = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">렌탈샵 수정</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500">취소</button>
      </div>

      <div>
        <label className={labelClass}>상호명</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>지역</label>
          <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value, resortId: '' })} className={inputClass}>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>
        </div>
        <div>
          <label className={labelClass}>근처 스키장</label>
          <select value={form.resortId} onChange={e => setForm({ ...form, resortId: e.target.value })} className={inputClass}>
            <option value="">선택 안 함</option>
            {resorts.filter(r => resortRegion(r.location) === form.area || r.id === form.resortId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>주소</label>
        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>전화</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>영업시간 메모 (선택)</label><input type="text" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="예: 시즌 중 매일, 야간 22시까지" className={inputClass} /></div>
      </div>
      <ShopHoursFields value={hoursV} onChange={(p) => setHoursV({ ...hoursV, ...p })} inputClass={inputClass} labelClass={labelClass} />
      <RentalPriceFields value={prices} onChange={(p) => setPrices({ ...prices, ...p })} inputClass={inputClass} labelClass={labelClass} />
      <div><label className={labelClass}>취급 장비 · 브랜드</label><input type="text" value={form.brands} onChange={e => setForm({ ...form, brands: e.target.value })} className={inputClass} /></div>
      <ExtraKindsPicker own="rental" value={form.extraKinds} onChange={(v) => setForm({ ...form, extraKinds: v })} initial={loadedKinds} proof={form.extraKindsProof} onProof={(v) => setForm({ ...form, extraKindsProof: v })} />
      <div><label className={labelClass}>매장 소개</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className={`${inputClass} resize-none`} /></div>
      <div><label className={labelClass}>사진 (포스터)</label><MultiImageUpload value={images} onChange={setImages} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>홈페이지</label><input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className={inputClass} /></div>
        <div>
          <label className={labelClass}>인스타 / 네이버지도</label>
          <input type="text" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="인스타 아이디" className={`${inputClass} mb-2`} />
          <input type="text" value={form.naverMap} onChange={e => setForm({ ...form, naverMap: e.target.value })} placeholder="네이버지도 링크" className={inputClass} />
        </div>
      </div>

      <button onClick={submit} disabled={loading} className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm active:bg-primary-dark transition-colors disabled:opacity-50">
        {loading ? '수정 중...' : '수정하기'}
      </button>
    </div>
  );
};

export default RentalEdit;
