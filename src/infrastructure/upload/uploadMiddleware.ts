import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf'
]);

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const documentsDir = path.join(uploadsRoot, 'documents');
const picturesDir = path.join(uploadsRoot, 'pictures');

[uploadsRoot, documentsDir, picturesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
};

const createStorage = (targetDir: string) => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const safeOriginalName = sanitizeFileName(file.originalname || 'file');
      cb(null, `${Date.now()}_${safeOriginalName}`);
    }
  });
};

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    cb(new Error('Sadece jpg, jpeg, png veya pdf dosyalari yuklenebilir.'));
    return;
  }

  cb(null, true);
};

const createUpload = (targetDir: string) => {
  return multer({
    storage: createStorage(targetDir),
    limits: {
      fileSize: MAX_FILE_SIZE
    },
    fileFilter
  });
};

export const documentUpload = createUpload(documentsDir);
export const pictureUpload = createUpload(picturesDir);
