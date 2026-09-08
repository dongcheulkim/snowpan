// 본문 텍스트의 URL 을 눌러서 열리는 링크로 — 스키장 소식·커뮤니티 글 본문용.
// 앱(Capacitor)에서는 인앱 브라우저, 웹에서는 새 탭 (api.openExternal). 줄바꿈은 부모의 whitespace-pre-wrap 이 처리.
import { openExternal } from '../api';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

export default function LinkifyText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            onClick={(e) => { e.preventDefault(); openExternal(part.replace(/[.,)]+$/, '')); }}
            className="text-sky-600 underline underline-offset-2 break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
