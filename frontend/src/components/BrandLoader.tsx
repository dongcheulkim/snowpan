// 로딩 표시 — 스노우판 워드마크를 가운데 작게, 숨 쉬듯 깜빡임 (사장님 제안 2026-09-13 "로딩 중에 로고 가운데 작게").
// 화면 전체가 뜨기 전(라우트 청크·페이지 데이터)에 쓴다. 목록 안의 부분 로딩은 스켈레톤 유지.
export default function BrandLoader({ fullScreen = true, label }: { fullScreen?: boolean; label?: string }) {
  return (
    <div className={`${fullScreen ? 'min-h-[60vh]' : 'py-14'} flex flex-col items-center justify-center gap-3`} role="status" aria-live="polite" aria-label={label || '불러오는 중'}>
      <img src="/snowpan-wordmark.svg" alt="" className="brand-loader-mark w-[112px] h-auto select-none" draggable={false} />
      {label && <span className="text-[11px] text-gray-400">{label}</span>}
    </div>
  );
}
