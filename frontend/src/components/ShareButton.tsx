import { useState } from 'react';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
}

export default function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || window.location.href;
    const shareData = {
      title: title || document.title,
      text: text || '',
      url: shareUrl,
    };

    // 1. 모바일 네이티브 공유 (카톡/인스타/문자 등 선택 가능)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // 사용자 취소
        // 다른 오류면 fallback
      }
    }

    // 2. Fallback: 클립보드 복사
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 3. 최후: prompt로 노출
      window.prompt('링크를 복사하세요:', shareUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="공유"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors active:scale-[0.98] ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? '복사됨!' : '공유'}
    </button>
  );
}
