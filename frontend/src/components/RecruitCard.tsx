import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ShareButton from './ShareButton';

// 매장 상세 페이지의 "모집 중" 카드 — 사장님이 올린 모집(앰버서더 등)을 보여주고 /recruit/:id 신청 페이지로 보낸다. 2026-09-23
export interface Recruit {
  id: string; shopType: string; shopId: string; shopName: string; title: string; description: string;
  deadline: string | null; closed: boolean; active: boolean; createdAt: string; shopPath: string;
}

export default function RecruitCard({ shopType, shopId }: { shopType: string; shopId: string }) {
  const [items, setItems] = useState<Recruit[]>([]);
  useEffect(() => {
    let alive = true;
    api<{ items: Recruit[] }>(`/recruits/shop/${shopType}/${shopId}`).then((d) => { if (alive) setItems(d.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, [shopType, shopId]);
  if (!items.length) return null;
  return (
    <>
      {items.map((r) => (
        <div key={r.id} className="card p-5 border-sky-200 bg-sky-50/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-white">모집 중</span>
              <h2 className="text-base font-bold text-gray-900 mt-1.5">{r.title}</h2>
              {r.deadline && <p className="text-[11px] text-gray-500 mt-0.5">{r.deadline.replace(/-/g, '.')}까지</p>}
            </div>
            <ShareButton title={`${r.shopName} ${r.title}`} text={r.description.slice(0, 80)} url={`${window.location.origin}/recruit/${r.id}`} />
          </div>
          <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-4">{r.description}</p>
          <Link to={`/recruit/${r.id}`} className="block w-full min-h-11 py-3 mt-3 text-center bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">자세히 보고 신청하기</Link>
        </div>
      ))}
    </>
  );
}
