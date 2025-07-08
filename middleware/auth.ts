import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/lib/errors';
import { validateUserId } from '@/lib/validations';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
}

export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new UnauthorizedError();
  }

  return validateUserId(userId);
}

export async function getAuthenticatedUser(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ? validateUserId(userId) : null;
  } catch (error) {
    return null;
  }
} 