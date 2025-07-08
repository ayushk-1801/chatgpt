import cloudinary from '@/lib/cloudinary';
import { Readable } from 'stream';
import { UploadError } from '@/lib/errors';
import { UploadResponse } from '@/types';
import { VALIDATION } from '@/lib/constants';

class UploadService {
  async uploadFile(file: File): Promise<UploadResponse> {
    try {
      this.validateFile(file);

      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create a data URL as backup
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      const result: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            resource_type: 'auto',
            folder: 'chatgpt-uploads',
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        Readable.from(buffer).pipe(uploadStream);
      });

      return {
        url: result.secure_url,
        dataUrl: dataUrl,
        public_id: result.public_id,
        original_name: file.name,
      };
    } catch (error) {
      throw new UploadError('Failed to upload file', { error, fileName: file.name });
    }
  }

  private validateFile(file: File): void {
    if (!file) {
      throw new UploadError('File is required');
    }

    if (file.size > VALIDATION.FILE_MAX_SIZE) {
      throw new UploadError(`File size exceeds ${VALIDATION.FILE_MAX_SIZE / 1024 / 1024}MB limit`);
    }

    const supportedTypes = [
      ...VALIDATION.SUPPORTED_IMAGE_TYPES,
      ...VALIDATION.SUPPORTED_DOCUMENT_TYPES,
    ];

    if (!supportedTypes.includes(file.type)) {
      throw new UploadError(`Unsupported file type: ${file.type}`);
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new UploadError('Failed to delete file', { error, publicId });
    }
  }
}

export const uploadService = new UploadService(); 