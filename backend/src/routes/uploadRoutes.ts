import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

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
  // MP4: ftyp box at offset 4
  if (buf.slice(4, 8).toString() === 'ftyp') {
    const brand = buf.slice(8, 12).toString();
    if (['mp42', 'mp41', 'isom', 'avc1', 'M4V '].includes(brand)) return 'video/mp4';
    if (brand === 'qt  ') return 'video/quicktime';
  }
  // WebM: 1A 45 DF A3 (EBML header)
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('JPG, PNG, WebP, MP4, MOV, WebM 파일만 업로드 가능합니다.'));
  },
});

const router = Router();

router.post('/', upload.array('images', 5), async (req: Request, res: Response) => {
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
    if (detected !== file.mimetype) {
      res.status(400).json({ error: `${file.originalname}: 파일 형식이 일치하지 않습니다 (선언: ${file.mimetype}, 실제: ${detected}).` });
      return;
    }
  }

  try {
    const urls: string[] = [];
    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      const uploadOptions: Record<string, unknown> = {
        folder: 'snowpan',
        resource_type: isVideo ? 'video' : 'image',
      };
      if (!isVideo) {
        // 업로드 시 미리 리사이즈 + 자동 포맷 (WebP/AVIF) + 적응형 품질.
        // eager=true 로 즉시 변환 완료 후 URL 반환 (cold cache 페널티 제거).
        uploadOptions.transformation = [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }];
      }
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (err, result) => (err ? reject(err) : resolve(result))
        ).end(file.buffer);
      });
      urls.push(result.secure_url);
    }
    res.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

export default router;
