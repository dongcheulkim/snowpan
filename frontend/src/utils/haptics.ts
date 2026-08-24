import { Capacitor } from '@capacitor/core';

// 가벼운 햅틱 — 좋아요·찜 등 짧은 상호작용용. 웹에선 no-op, 실패는 조용히 무시.
export async function hapticLight(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* 미지원 기기 — 무시 */ }
}
