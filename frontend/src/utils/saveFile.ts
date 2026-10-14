import { Capacitor } from '@capacitor/core';

// 파일 저장 (2026-10-14). 앱 웹뷰엔 브라우저 다운로드(<a download>)가 없어 QR PNG·CSV 내려받기가 반응이 없었음.
// 앱: 캐시 폴더에 쓰고 네이티브 공유창(파일 저장·AirDrop·카톡 등) → 웹: 브라우저 다운로드.
export type SaveResult = 'saved' | 'shared' | 'cancelled' | 'failed';

interface SaveOptions {
  filename: string;
  mime: string;
  base64?: string; // 이진 파일 (PNG 등) — data URL 의 콤마 뒤 부분
  text?: string;   // 텍스트 파일 (CSV 등)
}

export async function saveOrShareFile({ filename, mime, base64, text }: SaveOptions): Promise<SaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
      const written = await Filesystem.writeFile({
        path: filename,
        data: text ?? base64 ?? '',
        directory: Directory.Cache,
        ...(text !== undefined ? { encoding: Encoding.UTF8 } : {}),
      });
      await Share.share({ title: filename, files: [written.uri], dialogTitle: '저장 또는 공유' });
      return 'shared';
    } catch (err) {
      if (/cancel/i.test(String((err as { message?: string } | null)?.message || err))) return 'cancelled';
      return 'failed';
    }
  }
  try {
    const href = text !== undefined
      ? URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
      : `data:${mime};base64,${base64 || ''}`;
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (text !== undefined) setTimeout(() => URL.revokeObjectURL(href), 1000);
    return 'saved';
  } catch {
    return 'failed';
  }
}
