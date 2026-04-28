import { memo } from 'react';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = memo(({ page, totalPages, onPageChange }: Props) => {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
      >
        ← 이전
      </button>
      {start > 1 && <span className="px-2 text-xs text-gray-500">...</span>}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
            p === page ? 'bg-accent text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <span className="px-2 text-xs text-gray-500">...</span>}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
      >
        다음 →
      </button>
    </div>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;
