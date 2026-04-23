export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
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
