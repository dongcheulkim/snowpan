import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

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

  try {
    const urls: string[] = [];
    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      const uploadOptions: Record<string, unknown> = {
        folder: 'snowpan',
        resource_type: isVideo ? 'video' : 'image',
      };
      if (!isVideo) {
        uploadOptions.transformation = [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }];
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
