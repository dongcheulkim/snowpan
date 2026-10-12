import { useEffect, useRef, useState } from 'react';
import { suggestBrands, type GearBrand } from '../data/gearBrands';

// 브랜드 입력 + 자동완성 (2026-10-12). 한 글자부터 한글·영문 어느 쪽으로 쳐도 후보가 뜨고, 고르면 한글 표기로 채운다.
// iOS 사파리의 datalist 는 후보가 거의 안 보여서 직접 그린다. 목록에 없는 브랜드는 그대로 자유 입력.
interface Props {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export default function BrandInput({ name = 'brand', value, onChange, placeholder, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const items: GearBrand[] = open ? suggestBrands(value) : [];
  // 입력값이 이미 후보와 정확히 같으면(골랐거나 다 친 경우) 목록을 닫아 둔다
  const exact = items.length === 1 && items[0].ko === value.trim();
  const visible = open && items.length > 0 && !exact;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); };
  }, [open]);

  const pick = (b: GearBrand) => { onChange(b.ko); setOpen(false); setActive(-1); };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        name={name}
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value.slice(0, 60)); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className={className}
        role="combobox"
        aria-expanded={visible}
        aria-autocomplete="list"
      />
      {visible && (
        <ul role="listbox" className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {items.map((b, i) => (
            <li key={b.ko} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(b)}
                className={`w-full flex items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm ${i === active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <span className="font-medium text-gray-900">{b.ko}</span>
                {b.en !== b.ko && <span className="text-xs text-gray-500 truncate">{b.en}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
