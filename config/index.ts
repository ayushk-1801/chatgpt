import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string(),
  OPENAI_API_KEY: z.string(),
  MEM0_API_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Invalid environment configuration');
  }
}

export const env = validateEnv();

export const config = {
  app: {
    name: 'ChatGPT',
    version: '1.0.0',
    env: env.NODE_ENV,
  },
  database: {
    uri: env.MONGODB_URI,
    options: {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  ai: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o',
      maxTokens: 4000,
      temperature: 0.7,
    },
    memory: {
      apiKey: env.MEM0_API_KEY,
      searchLimit: 10,
    },
  },
  auth: {
    clerkSecretKey: env.CLERK_SECRET_KEY,
  },
  storage: {
    cloudinary: {
      url: env.CLOUDINARY_URL,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    },
  },
  api: {
    maxDuration: 300,
    titleGeneration: {
      maxDuration: 60,
      maxTokens: 20,
    },
  },
} as const; 