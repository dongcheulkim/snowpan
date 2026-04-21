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

// Same but returns null instead of undefined when caller wants explicit null for DB
export function sanitizeTextOrNull(input: unknown, maxLen?: number): string | null {
  const v = sanitizeText(input, maxLen);
  return v === undefined ? null : v;
}
