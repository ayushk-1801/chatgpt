import { uploadController } from '@/controllers/upload';

// Disable Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export const POST = uploadController.uploadFile; 