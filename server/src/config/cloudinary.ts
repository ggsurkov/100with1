import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

// Loading .env here too (in addition to index.ts) makes this module safe to
// import standalone, regardless of where it sits in another file's import order.
dotenv.config();

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('[Cloudinary] Warning: Missing Cloudinary API credentials in .env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
