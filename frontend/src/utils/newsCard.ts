// 스키장 소식 → 인스타그램 카드(1080×1350 PNG) + 캡션. 관리자가 글 상세에서 "인스타 카드 받기"로 내려받는다.
// 공유 카드(og-image)와 같은 흑백 스노우판 스타일 — 워드마크, 제목, 핵심 줄, 리조트 칩, snowpan.kr.
// 폰트는 사이트가 쓰는 Noto Sans KR(없으면 시스템 고딕). 외부 요청 없이 브라우저 캔버스로만 그린다.

export interface NewsCardInput {
  title: string;
  content: string;
  resorts: string[];   // 리조트 이름들 (칩)
  date: string;        // ISO
}

const W = 1080;
const H = 1350;
const PAD = 72;
const INK = '#0f172a';
const MUTED = '#334155';
const FOOT = '#475569';
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) { cur = next; continue; }
    // 한 단어가 한 줄보다 길면 글자 단위로 자른다 (긴 URL·붙여 쓴 한글)
    if (!cur) {
      let piece = '';
      for (const ch of w) {
        if (ctx.measureText(piece + ch).width > maxWidth) { lines.push(piece); piece = ch; if (lines.length >= maxLines) break; }
        else piece += ch;
      }
      cur = piece;
    } else { lines.push(cur); cur = w; }
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  // 잘렸으면 마지막 줄에 말줄임
  const used = lines.join(' ').length;
  if (used < text.replace(/\s+/g, ' ').trim().length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = last + '…';
  }
  return lines;
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): number {
  let cx = x;
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  return cx;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// 본문에서 카드에 넣을 핵심 줄 — 빈 줄 제외, 앞 5줄, 각 줄 최대 2줄로 접음
function keyLines(content: string): string[] {
  return content.split(/\r?\n/).map((l) => l.replace(/^[-·•*]\s*/, '').trim()).filter(Boolean).slice(0, 5);
}

export async function renderNewsCard(input: NewsCardInput): Promise<string> {
  try { await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* 폰트 준비 실패해도 시스템 폰트로 진행 */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.');

  // 바탕 + 산 실루엣
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const mtn = (pts: number[][], color: string) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  mtn([[0, H], [0, H - 200], [150, H - 330], [290, H - 240], [420, H - 380], [560, H - 250], [700, H - 420], [860, H - 260], [980, H - 350], [W, H - 210], [W, H]], '#f1f5f9');
  mtn([[0, H], [0, H - 120], [200, H - 200], [330, H - 140], [480, H - 240], [620, H - 130], [780, H - 250], [940, H - 150], [W, H - 190], [W, H]], '#e2e8f0');

  // 워드마크 SNOW P^N
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 54px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  let x = drawSpaced(ctx, 'SNOW', PAD, PAD + 50, 8);
  x += 26;
  x = drawSpaced(ctx, 'P', x, PAD + 50, 8);
  // A 자리 셰브론
  ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.moveTo(x + 2, PAD + 50); ctx.lineTo(x + 20, PAD + 8); ctx.lineTo(x + 38, PAD + 50); ctx.stroke();
  x += 52;
  drawSpaced(ctx, 'N', x, PAD + 50, 8);
  // 라벨 알약
  ctx.font = `700 24px ${FONT}`;
  const label = '스키장 소식';
  const lw = ctx.measureText(label).width + 36;
  const lx = W - PAD - lw;
  roundRect(ctx, lx, PAD + 6, lw, 46, 23); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillText(label, lx + 18, PAD + 38);

  // 제목
  let y = PAD + 170;
  ctx.fillStyle = INK; ctx.font = `800 74px ${FONT}`;
  for (const line of wrap(ctx, input.title, W - PAD * 2, 3)) { ctx.fillText(line, PAD, y); y += 92; }

  // 핵심 줄
  y += 28;
  ctx.font = `500 38px ${FONT}`; ctx.fillStyle = MUTED;
  for (const raw of keyLines(input.content)) {
    const lines = wrap(ctx, raw, W - PAD * 2 - 44, 2);
    lines.forEach((line, i) => { if (i === 0) ctx.fillText('·', PAD, y); ctx.fillText(line, PAD + 44, y); y += 54; });
    y += 8;
    if (y > H - 420) break;
  }

  // 리조트 칩 (첫 칩은 채움)
  const chips = input.resorts.filter(Boolean).slice(0, 8);
  if (chips.length) {
    y = Math.max(y + 20, H - 380);
    ctx.font = `700 30px ${FONT}`;
    let cx = PAD; let cy = y;
    chips.forEach((name, i) => {
      const cw = ctx.measureText(name).width + 40;
      if (cx + cw > W - PAD) { cx = PAD; cy += 74; }
      roundRect(ctx, cx, cy, cw, 58, 16);
      if (i === 0) { ctx.fillStyle = INK; ctx.fill(); ctx.fillStyle = '#ffffff'; }
      else { ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = INK; }
      ctx.fillText(name, cx + 20, cy + 40);
      cx += cw + 14;
    });
  }

  // 푸터
  ctx.fillStyle = INK; ctx.font = `800 34px ${FONT}`; ctx.fillText('snowpan.kr', PAD, H - PAD);
  const d = new Date(input.date);
  const dateStr = isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  ctx.fillStyle = FOOT; ctx.font = `500 30px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(dateStr, W - PAD, H - PAD); ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export function buildCaption(input: NewsCardInput): string {
  const body = input.content.replace(/\r?\n{3,}/g, '\n\n').trim();
  const short = body.length > 600 ? body.slice(0, 600).trimEnd() + '…' : body;
  const tags = ['#스노우판', '#스키', '#스노보드', '#스키장소식', ...input.resorts.map((r) => '#' + r.replace(/[\s·]/g, ''))];
  return `${input.title}\n\n${short}\n\n자세한 내용과 다른 스키장 소식은 프로필 링크에서 → snowpan.kr\n\n${tags.join(' ')}`;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
