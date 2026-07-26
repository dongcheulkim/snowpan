// 디스코드 웹훅 알림 — 관리자 이벤트(매장·광고·자격증·신고 등)를 디스코드 채널로 띠링.
// 키: DISCORD_WEBHOOK_URL (디스코드 채널 설정 → 연동 → 웹훅에서 발급). 미설정 시 no-op.

export function discordConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}

export async function sendDiscord(title: string, message: string, link?: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    const site = process.env.FRONTEND_URL || 'https://snowpan.kr';
    const content = `**[${title}]**\n${message}${link ? `\n${site}${link}` : ''}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
  } catch (err) {
    console.warn('디스코드 알림 실패:', (err as Error).message);
  }
}
