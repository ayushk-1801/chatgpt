import { NextRequest, NextResponse } from 'next/server';
import { handleError, createErrorResponse, AppError } from '@/lib/errors';
import { ValidationError } from '@/lib/errors';
import { ZodError } from 'zod';

export type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<Response>;

export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          'Validation failed',
          {
            issues: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          }
        );
        return createErrorResponse(validationError);
      }

      // Handle our custom errors and unknown errors
      const appError = handleError(error);
      return createErrorResponse(appError);
    }
  };
}

export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
} 