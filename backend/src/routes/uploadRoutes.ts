import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { createUserLimiter } from '../middleware/rateLimit';

// Bunny.net Storage — 이미지·영상 저장. 싱가포르 스토리지, snowpankr CDN 배포.
// 환경변수:
//   BUNNY_STORAGE_ZONE   = 'snowman'
//   BUNNY_STORAGE_KEY    = 스토리지 Password (Render 대시보드에서 설정, 커밋 금지)
//   BUNNY_STORAGE_HOST   = 'sg.storage.bunnycdn.com' (싱가포르)
//   BUNNY_CDN_HOST       = 'snowpankr.b-cdn.net'
const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE || 'snowman';
const BUNNY_KEY = process.env.BUNNY_STORAGE_KEY || '';
const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || 'sg.storage.bunnycdn.com';
const BUNNY_CDN_HOST = process.env.BUNNY_CDN_HOST || 'snowpankr.b-cdn.net';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};

// Bunny Storage 에 buffer 업로드 → CDN URL 반환.
async function uploadToBunny(buffer: Buffer, mime: string): Promise<string> {
  const ext = EXT_BY_MIME[mime] || 'bin';
  // 날짜 폴더 + 랜덤 파일명 (충돌 방지, 예측 불가).
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const objectPath = `snowpan/${datePath}/${name}`;

  const res = await fetch(`https://${BUNNY_STORAGE_HOST}/${BUNNY_ZONE}/${objectPath}`, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_KEY,
      'Content-Type': mime,
    },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Bunny upload failed: ${res.status}`);
  }
  return `https://${BUNNY_CDN_HOST}/${objectPath}`;
}

// 사용자별 업로드 한도 — 스토리지 abuse 방지.
// 분당 30장, 시간당 300장. 정상 사용자에겐 충분, 봇/자동화는 차단.
const uploadLimitPerMin = createUserLimiter(30, 60_000);
const uploadLimitPerHour = createUserLimiter(300, 60 * 60_000);

// 매직 바이트 검증 — 클라이언트가 보낸 mime 헤더는 위조 가능하므로
// 실제 파일 첫 바이트로 형식 확인. 악성 스크립트를 image/jpeg 로 가장하는 공격 차단.
function detectFileType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WebP: 'RIFF' .... 'WEBP'
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  // MP4: ftyp box at offset 4 — 흔한 브랜드 전부 허용 (iso5/iso6/mp4v/dash 등 정상 mp4 가 거부되던 것 수정)
  if (buf.slice(4, 8).toString() === 'ftyp') {
    const brand = buf.slice(8, 12).toString();
    if (['mp42', 'mp41', 'mp4v', 'isom', 'iso2', 'iso4', 'iso5', 'iso6', 'avc1', 'avc3', 'dash', 'M4V ', 'M4VP', 'f4v '].includes(brand)) return 'video/mp4';
    if (brand === 'qt  ') return 'video/quicktime';
  }
  // HEIC/HEIF: ftyp 브랜드 (아이폰·갤럭시 고효율 사진)
  if (buf.slice(4, 8).toString() === 'ftyp') {
    const brand = buf.slice(8, 12).toString();
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  // WebM: 1A 45 DF A3 (EBML header)
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
    // 일부 안드로이드가 mimetype 을 비우거나 octet-stream 으로 보냄 — 매직 바이트 검증이 최종 판정
    if (allowed.includes(file.mimetype) || !file.mimetype || file.mimetype === 'application/octet-stream') cb(null, true);
    else cb(new Error('JPG, PNG, WebP, HEIC, MP4, MOV, WebM 파일만 업로드 가능합니다.'));
  },
});

const router = Router();

// 한 요청당 최대 10장 (프론트 MultiImageUpload 는 8장까지 → 여유). multer 에러는 깔끔한 JSON 으로.
const MAX_FILES = 10;
const uploadArray = upload.array('images', MAX_FILES);
function uploadImages(req: Request, res: Response, next: (err?: unknown) => void): void {
  uploadArray(req, res, (err: unknown) => {
    if (err) {
      const code = (err as { code?: string })?.code;
      const msg = code === 'LIMIT_FILE_SIZE' ? '파일이 너무 큽니다 (최대 20MB).'
        : code === 'LIMIT_UNEXPECTED_FILE' ? `한 번에 최대 ${MAX_FILES}장까지 올릴 수 있어요.`
        : ((err as { message?: string })?.message || '이미지 업로드에 실패했습니다.');
      res.status(400).json({ error: msg });
      return;
    }
    next();
  });
}

router.post('/', uploadLimitPerMin, uploadLimitPerHour, uploadImages, async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: '파일이 없습니다.' });
    return;
  }

  // 매직 바이트 검증 — 클라이언트 mime 헤더 신뢰 안 함.
  for (const file of files) {
    const detected = detectFileType(file.buffer);
    if (!detected) {
      res.status(400).json({ error: `${file.originalname}: 지원하지 않는 파일 형식입니다.` });
      return;
    }
    // 선언 mimetype 이 비어있거나(안드로이드 일부) heic 계열이면 실제 감지값을 채택
    const declared = file.mimetype;
    const laxDeclared = !declared || declared === 'application/octet-stream' || declared === 'image/heif';
    if (!laxDeclared && declared !== detected && !(declared === 'image/heic' && detected === 'image/heic')) {
      res.status(400).json({ error: `${file.originalname}: 파일 형식이 일치하지 않습니다 (선언: ${declared}, 실제: ${detected}).` });
      return;
    }
    file.mimetype = detected;
  }

  // HEIC → JPEG 서버 변환 — 브라우저(특히 안드로이드 크롬)가 HEIC 를 디코드 못 해
  // 원본이 그대로 올라오는 경우. 웹에서 표시 가능하도록 변환 후 저장.
  for (const file of files) {
    if (file.mimetype === 'image/heic') {
      try {
        const heicConvert = (await import('heic-convert')).default;
        const jpeg = await heicConvert({ buffer: file.buffer, format: 'JPEG', quality: 0.85 });
        file.buffer = Buffer.from(jpeg);
        file.mimetype = 'image/jpeg';
      } catch (e) {
        console.error('HEIC 변환 실패:', e);
        res.status(400).json({ error: `${file.originalname}: HEIC 사진 변환에 실패했습니다. 갤러리에서 JPG로 저장 후 다시 올려주세요.` });
        return;
      }
    }
  }

  if (!BUNNY_KEY) {
    console.error('BUNNY_STORAGE_KEY 미설정 — 업로드 불가.');
    res.status(500).json({ error: '이미지 업로드 설정 오류입니다. 관리자에게 문의하세요.' });
    return;
  }

  try {
    // 프론트에서 이미 리사이즈+WebP 압축을 마치고 보내므로 (api.ts compressImage)
    // 서버는 그대로 Bunny 에 저장. Bunny CDN 이 배포 담당.
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadToBunny(file.buffer, file.mimetype);
      urls.push(url);
    }
    res.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

export default router;
