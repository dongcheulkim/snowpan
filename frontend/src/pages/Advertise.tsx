import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

// 공개 광고 안내 페이지 — 비로그인도 광고 상품·가격을 볼 수 있어야 함
// (전자결제 심사: 판매 상품 1개 이상 공개 노출 요건). 실제 신청은 /ad-booking(로그인).
interface SlotPricing {
  slotType: string;
  category: string | null;
  pricePerDay: number;
  maxConcurrent: number;
  description: string | null;
}

const SLOT_LABELS: Record<string, string> = {
  main_banner: '메인 배너',
  category: '카테고리 배너',
  premium: '프리미엄 노출',
};

const SLOT_DESCRIPTIONS: Record<string, string> = {
  main_banner: '홈 화면 최상단 회전 배너 — 가장 많이 노출됩니다.',
  category: '카테고리 페이지 상단 배너 — 관심 카테고리 이용자에게 노출됩니다.',
  premium: '내 상품·매장을 목록 최상단에 고정 노출합니다.',
};



const won = (n: number) => n.toLocaleString('ko-KR');

const Advertise = () => {
  const [pricings, setPricings] = useState<SlotPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<SlotPricing[]>('/ad-booking/slots')
      .then(setPricings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 슬롯별 최저 월 단가 (pricePerDay 필드에 월 단가 저장).
  const groups = ['main_banner', 'category', 'premium']
    .map((slot) => {
      const rows = pricings.filter((p) => p.slotType === slot);
      const minMonthly = rows.length ? Math.min(...rows.map((r) => r.pricePerDay)) : null;
      return { slot, rows, minMonthly };
    })
    .filter((g) => g.rows.length > 0);

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <header className="text-center pt-2">
        <p className="text-[10px] font-bold tracking-widest text-gray-400">SNOWPAN ADVERTISING</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">광고 안내</h1>
        <p className="text-sm text-gray-500 mt-2">
          스키·스노보드를 즐기는 이용자에게<br />매장·브랜드를 노출하세요.
        </p>
      </header>

      {/* 광고 상품 */}
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-10">불러오는 중...</div>
      ) : groups.length === 0 ? (
        <div className="card p-6 text-center text-sm text-gray-500">
          현재 안내 가능한 광고 상품을 준비 중입니다.<br />
          문의: <a href="mailto:info@snowpan.kr" className="text-sky-600 hover:underline">info@snowpan.kr</a>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(({ slot, minMonthly }) => (
            <div key={slot} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{SLOT_LABELS[slot] || slot}</h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{SLOT_DESCRIPTIONS[slot]}</p>
                </div>
                {minMonthly != null && (
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-sky-600">{won(minMonthly)}원</div>
                    <div className="text-[11px] text-gray-400">월 / 부터</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 계약 단위 */}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-2">계약 단위</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          광고는 <span className="font-bold text-gray-900">12개월(1년)</span> 단위로 게재됩니다.
          표기된 월 단가 × 12개월로 결제되며, 게재 기간 동안 소재(문구·이미지) 교체가 가능합니다.
        </p>
      </section>

      {/* 결제 · 환불 */}
      <section className="card p-5 text-xs text-gray-500 leading-relaxed space-y-1.5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">결제 · 환불 안내</h2>
        <p>· 광고 신청 후 안내되는 방법으로 결제하면 검수를 거쳐 게시됩니다.</p>
        <p>· 광고는 12개월(1년) 계약입니다. 게시 시작 후에는 중도 해지·환불이 되지 않으니 신중히 신청해 주세요. (결제 전 신청 건은 취소 가능)</p>
        <p>· 문의: <a href="mailto:info@snowpan.kr" className="text-sky-600 hover:underline">info@snowpan.kr</a></p>
      </section>

      {/* CTA */}
      <Link
        to="/ad-booking"
        className="block w-full py-3.5 bg-accent text-white rounded-lg font-bold text-sm text-center hover:bg-accent-light transition-colors active:scale-[0.98]"
      >
        광고 신청하기
      </Link>
      <p className="text-center text-[11px] text-gray-400 pb-2">신청은 로그인 후 진행됩니다.</p>
    </div>
  );
};

export default Advertise;
