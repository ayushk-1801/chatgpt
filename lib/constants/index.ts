// API Constants
export const API_ROUTES = {
  CHAT: '/api/chat',
  CHATS: '/api/chats',
  UPLOAD: '/api/upload',
  TITLE: '/api/chats/title',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  MEMORY_SERVICE_ERROR: 'MEMORY_SERVICE_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  CHAT_NOT_FOUND: 'Chat not found',
  CHAT_ID_REQUIRED: 'Chat ID is required',
  MESSAGE_REQUIRED: 'Message is required',
  FILE_REQUIRED: 'File is required',
  INVALID_FILE_TYPE: 'Invalid file type',
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  AI_SERVICE_UNAVAILABLE: 'AI service unavailable',
  MEMORY_SERVICE_UNAVAILABLE: 'Memory service unavailable',
  INTERNAL_SERVER_ERROR: 'Internal server error',
} as const;

// Default Values
export const DEFAULTS = {
  CHAT_TITLE: 'New Chat',
  SYSTEM_PROMPT: 'You are a helpful assistant. Provide clear, concise, and accurate responses.',
  MODEL: 'gpt-4o',
  MAX_TITLE_WORDS: 5,
  MEMORY_SEARCH_LIMIT: 10,
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
} as const;

// Validation Rules
export const VALIDATION = {
  CHAT_TITLE_MAX_LENGTH: 100,
  MESSAGE_MAX_LENGTH: 10000,
  FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
} as const;

// Database
export const DB_COLLECTIONS = {
  CHATS: 'chats',
  MESSAGES: 'messages',
} as const;

// AI Models
export const AI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_41: 'gpt-4.1',
  GPT_41_MINI: 'gpt-4.1-mini',
  GPT_41_NANO: 'gpt-4.1-nano',
  GPT_o3: 'o3',
  GPT_o4_MINI: 'o4-mini',
  DALL_E_3: 'dall-e-3',
} as const;

// Image Generation
export const IMAGE_GENERATION = {
  PREFIX: '[image:',
  SUFFIX: ']',
  MODEL_NAME: 'image-generation',
  DEFAULT_MIME_TYPE: 'image/png',
} as const; 