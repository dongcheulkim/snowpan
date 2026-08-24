// shimmer gradient — index.css 의 .skeleton + keyframes shimmer 를 재활용.
// 단순 opacity pulse (animate-pulse) 보다 빛이 쓸고 지나가는 느낌이라 로딩 체감 시간 단축.
export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden block">
      <SkeletonBox className="h-28 rounded-none" />
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-3 w-12" />
          <SkeletonBox className="h-3 w-8" />
        </div>
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-5 w-20" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-3">
      <SkeletonBox className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-3.5 w-2/3" />
        <SkeletonBox className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// 포스터형 카드 (레슨·렌탈 등 세로 비율) — 2열 그리드
export function PosterGridSkeleton({ count = 6, aspect = 'aspect-[4/5]' }: { count?: number; aspect?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden block">
          <SkeletonBox className={`${aspect} w-full rounded-none`} />
          <div className="p-3 space-y-2">
            <SkeletonBox className="h-3 w-1/3" />
            <SkeletonBox className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 행 리스트 묶음 — 페이지들이 반복문 없이 한 줄로 쓰도록
export function RowListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => <ListRowSkeleton key={i} />)}
    </div>
  );
}
