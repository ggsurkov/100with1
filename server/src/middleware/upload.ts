import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const storage = new CloudinaryStorage({
  cloudinary,
  // cast: multer-storage-cloudinary's Params type collapses to `{}` because
  // cloudinary's UploadApiOptions has a string index signature, which erases
  // its named keys under `keyof`. The options below are valid at runtime.
  params: {
    folder: '100with1/questions',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  } as any,
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
