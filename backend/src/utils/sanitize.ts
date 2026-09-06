import sanitizeHtml from 'sanitize-html';

// Plain-text fields (titles, names, descriptions, contents) — strip ALL HTML tags
// and decode entities so stored values are literal text only.
export function sanitizeText(input: unknown, maxLen?: number): string | undefined {
  if (input === undefined || input === null) return undefined;
  const s = String(input);
  const stripped = sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });
  // sanitize-html 은 태그를 지운 뒤 남은 & " ' < > 를 엔티티(&amp; 등)로 바꿔 돌려준다.
  // 그대로 저장하면 화면(React)이 한 번 더 이스케이프해 "비비드왁스 &amp; 풋풋" 처럼 보이므로 원문으로 되돌린다.
  // 되돌린 뒤 태그 모양이 다시 생기면(엔티티로 위장한 <script> 등) 한 번 더 제거.
  const decoded = stripped
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const safe = /<[^>]*>/.test(decoded) ? decoded.replace(/<[^>]*>/g, '') : decoded;
  const trimmed = safe.trim();
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}
