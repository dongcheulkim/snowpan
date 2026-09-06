// 매장 목록 공통 위치 필터 — 1줄: 지역(시/도), 2줄: 그 지역 리조트 + '외'(리조트 인근이 아닌 매장).
// 스키·보드샵·정비샵·렌탈샵이 같은 구조를 쓴다. 리조트가 없는 지역(서울 등)은 2줄을 숨긴다(전부 '외'라 의미 없음).
import { useEffect, useState } from 'react';
import { api } from '../api';
import HScroll from './HScroll';
import { resortRegion } from '../utils/resortRegion';
import { SHOP_REGIONS, type ResortLite } from '../utils/location';

interface Props {
  region: string;           // 'all' | 시/도
  resortSel: string;        // 'all' | 'none'(외) | resortId
  onChange: (region: string, resortSel: string) => void;
}

export default function LocationFilter({ region, resortSel, onChange }: Props) {
  const [resorts, setResorts] = useState<ResortLite[]>([]);
  useEffect(() => { api<ResortLite[]>('/resorts').then(setResorts).catch(() => {}); }, []);

  const regionResorts = region === 'all' ? [] : resorts.filter((r) => resortRegion(r.location) === region);

  return (
    <>
      <HScroll className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...SHOP_REGIONS].map((rg) => (
          <button
            key={rg}
            onClick={() => onChange(rg, 'all')}
            className={`px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex-shrink-0 ${
              region === rg ? 'bg-accent text-white' : 'bg-snow text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {rg === 'all' ? '전체 지역' : rg}
          </button>
        ))}
      </HScroll>
      {regionResorts.length > 0 && (
        <HScroll className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'all', name: '전체' }, ...regionResorts, { id: 'none', name: '외' }].map((r) => (
            <button
              key={r.id}
              onClick={() => onChange(region, r.id)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                resortSel === r.id ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-snow text-gray-500 border border-gray-200'
              }`}
            >
              {r.name}
            </button>
          ))}
        </HScroll>
      )}
    </>
  );
}
