// 레슨 가격표·강사 프로필 폼 값 변환 (2026-10-07) — 컴포넌트와 분리 (react-refresh 규칙)
export interface PriceRow { label: string; price: string }
export interface LessonProfile { career: string; languages: string[]; schedule: string; videoUrl: string; priceRows: PriceRow[] }

export const LESSON_LANGUAGES = ['한국어', '영어', '중국어', '일본어'];
export const PRICE_PRESETS = ['1:1 2시간', '1:1 4시간', '2인 2시간', '그룹(3~4인) 2시간', '키즈 2시간', '종일(6시간)'];
export const emptyProfile = (): LessonProfile => ({ career: '', languages: ['한국어'], schedule: '', videoUrl: '', priceRows: [{ label: '1:1 2시간', price: '' }] });

// 서버 값 → 폼 값
export function profileFromServer(d: { career?: string | null; languages?: string | null; schedule?: string | null; videoUrl?: string | null; priceTable?: string | null }): LessonProfile {
  let rows: PriceRow[] = [];
  try { const arr = d.priceTable ? JSON.parse(d.priceTable) as { label: string; price: number }[] : []; rows = arr.map((r) => ({ label: r.label, price: String(r.price) })); } catch { rows = []; }
  return { career: d.career || '', languages: d.languages ? d.languages.split(',') : [], schedule: d.schedule || '', videoUrl: d.videoUrl || '', priceRows: rows.length ? rows : [{ label: '1:1 2시간', price: '' }] };
}
// 폼 값 → 서버 body (빈 가격 줄은 뺌)
export function profileToBody(p: LessonProfile) {
  const rows = p.priceRows.filter((r) => r.label.trim() && r.price.trim()).map((r) => ({ label: r.label.trim(), price: Number(r.price.replace(/[^0-9]/g, '')) }));
  return { career: p.career.trim(), languages: p.languages.join(','), schedule: p.schedule.trim(), videoUrl: p.videoUrl.trim(), priceTable: rows.length ? rows : null };
}

