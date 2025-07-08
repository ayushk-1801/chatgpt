import { HTTP_STATUS, ERROR_CODES } from '@/lib/constants';
import { ApiError } from '@/types';

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR, details);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.AI_SERVICE_ERROR, details);
  }
}

export class MemoryServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.MEMORY_SERVICE_ERROR, details);
  }
}

export class UploadError extends AppError {
  constructor(message: string, details?: any) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.UPLOAD_ERROR, details);
  }
}

// Error handler utility
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError('An unexpected error occurred');
}

// API error response utility
export function createErrorResponse(error: AppError) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { details: error.details }),
      },
    }),
    {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
} 