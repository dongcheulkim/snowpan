import { useEffect, useState } from 'react';
import { api } from '../api';
import { toastSuccess, toastError } from './Toast';
import { SITE_URL as SITE } from '../config/site';

// 친구 초대 카드 — MyPage 에 표시. 본인의 추천 코드 + 누적 추천 수 + 공유 버튼.

export default function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ code: string; referredCount: number }>('/referral/me')
      .then(d => { setCode(d.code); setCount(d.referredCount); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !code) return null;

  const link = `${SITE}/register?ref=${code}`;
  const shareText = `스키·보드 한 곳에서 — 스노우판 추천 링크\n${link}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toastSuccess('초대 링크가 복사되었습니다');
    } catch {
      toastError('복사에 실패했습니다');
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: '스노우판', text: shareText, url: link });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div className="card p-5 bg-gradient-to-br from-sky-50 to-emerald-50 border-sky-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-900">친구 초대</h2>
        <span className="text-[10px] text-gray-600">초대한 친구 <strong className="text-sky-700">{count}명</strong></span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">
        친구가 가입하면 함께 시즌권 추첨·할인 혜택을 받아요. 베타 기간 한정.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono font-bold text-gray-900 tracking-wider text-center">
          {code}
        </code>
      </div>
      <div className="flex gap-2">
        <button onClick={copyLink} className="flex-1 min-h-11 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50">
          링크 복사
        </button>
        <button onClick={share} className="flex-1 min-h-11 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-gray-800">
          공유하기
        </button>
      </div>
    </div>
  );
}
