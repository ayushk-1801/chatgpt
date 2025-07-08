import { NextRequest } from 'next/server';
import { uploadService } from '@/services/upload';
import { createSuccessResponse, withErrorHandling } from '@/middleware/error';
import { ValidationError } from '@/lib/errors';
import { ERROR_MESSAGES } from '@/lib/constants';

class UploadController {
  uploadFile = withErrorHandling(async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new ValidationError(ERROR_MESSAGES.FILE_REQUIRED);
    }

    const result = await uploadService.uploadFile(file);
    return createSuccessResponse(result);
  });
}

export const uploadController = new UploadController(); 