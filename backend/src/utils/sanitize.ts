import sanitizeHtml from 'sanitize-html';

// Plain-text fields (titles, names, descriptions, contents) — strip ALL HTML tags
// and decode entities so stored values are literal text only.
export function sanitizeText(input: unknown, maxLen?: number): string | undefined {
  if (input === undefined || input === null) return undefined;
  const s = String(input);
  const stripped = sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });
  const trimmed = stripped.trim();
  if (maxLen && trimmed.length > maxLen) return trimmed.slice(0, maxLen);
  return trimmed;
}
