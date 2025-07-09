# ChatGPT Clone - Production Architecture

A production-ready ChatGPT clone built with Next.js 15, featuring a clean architecture with proper separation of concerns.

## 🏗️ Architecture Overview

This application follows a layered architecture pattern designed for maintainability, scalability, and testability:

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (thin controllers)
│   └── ...                # Pages and layouts
├── config/                # Configuration management
├── controllers/           # HTTP request handlers
├── services/              # Business logic layer
├── middleware/           # Request/response middleware
├── lib/                  # Utilities and models
│   ├── constants/        # Application constants
│   ├── errors/          # Error handling
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── validations/     # Input validation schemas
├── types/               # TypeScript type definitions
└── components/          # React components
```

## 🎯 Key Features

- **Clean Architecture**: Separation of concerns with controllers, services, and data layers
- **Type Safety**: Comprehensive TypeScript interfaces and validation
- **Error Handling**: Structured error handling with custom error classes
- **Configuration Management**: Environment validation and centralized config
- **Logging**: Structured logging with contextual information
- **Health Checks**: Built-in health monitoring endpoints
- **Input Validation**: Zod schemas for request validation
- **Memory System**: Persistent conversation memory with mem0ai
- **File Uploads**: Cloudinary integration with validation
- **Image Generation**: DALL-E 3 integration
- **Web Search**: OpenAI web search capabilities

## 📁 Project Structure Details

### Configuration Layer (`config/`)
- Environment variable validation
- Centralized application configuration
- Type-safe config access

### Controllers (`controllers/`)
- Thin HTTP request handlers
- Input validation
- Response formatting
- Delegates business logic to services

### Services (`services/`)
- Core business logic
- Database operations
- External API integrations
- Reusable across different controllers

### Middleware (`middleware/`)
- Authentication handling
- Error handling wrapper
- Request/response transformation

### Types (`types/`)
- Comprehensive TypeScript interfaces
- API request/response types
- Database model types
- Service option types

### Error Handling (`lib/errors/`)
- Custom error classes
- Structured error responses
- Development vs production error details

### Validation (`lib/validations/`)
- Zod schemas for input validation
- Type-safe validation functions
- Consistent validation patterns

### Constants (`lib/constants/`)
- Application-wide constants
- Error messages
- Default values
- HTTP status codes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB database
- Environment variables (see `.env.example`)

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/chatgpt

# AI Services
OPENAI_API_KEY=your_openai_key
MEM0_API_KEY=your_mem0_key

# Authentication
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_public_key

# File Storage (optional)
CLOUDINARY_URL=your_cloudinary_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📊 API Endpoints

### Chat Operations
- `GET /api/chats` - Get user's chat list
- `GET /api/chats/[slug]` - Get chat details with messages
- `POST /api/chat` - Send message and get AI response
- `POST /api/chats/title` - Generate chat title

### File Operations
- `POST /api/upload` - Upload files to Cloudinary

### System
- `GET /api/health` - Health check endpoint

## 🧪 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... } // Only in development
  }
}
```

## ✅ To-Do List
### 🧑‍💻 Frontend (UI/UX)
- [x] Design pixel-perfect ChatGPT clone layout
- [x] Match ChatGPT animations, spacing, modals, and scrolling
- [x] Ensure full mobile responsiveness (Responsive design)
- [x] Implement accessibility (ARIA-compliant)
- [x] Add message editing (allow users to edit and regenerate messages)

### 🔌 Core Chat Functionality (Vercel AI SDK)
- [x] Integrate Vercel AI SDK for chat responses
- [x] Implement streaming message responses
- [x] Add context window handling for model token limits

### 🧠 Memory / Conversation Context
- [x] Add memory capability (using `mem()` from Vercel AI SDK)

### 📂 File & Image Upload Support
- [ ] Build upload UI for:
  - [ ] Images (PNG, JPG, etc.)
  - [ ] Documents (PDF, DOCX, TXT, etc.)
- [ ] Integrate file upload to Cloudinary or Uploadcare
- [ ] Allow AI model to access uploaded files

## 🛡️ Backend Development

### API Architecture
- [x] Set up Next.js API routes as the backend
- [x] Manage token limits per model constraints (e.g., GPT-4 Turbo context window)

### File Storage
- [x] Integrate Cloudinary or Uploadcare for file storage

### Webhook Support
- [ ] Add webhook support for external service callbacks
    - e.g., file transformation triggers, background tasks

## 🚀 Deployment
- [ ] Deploy the app on Vercel
- [ ] Configure environment variables (Vercel AI SDK, MongoDB, Cloudinary, etc.)

## ✅ Deliverables Checklist
- [ ] Pixel-perfect ChatGPT clone UI
- [ ] Fully functional chat using Vercel AI SDK
- [ ] Chat memory, file/image upload, message editing support
- [ ] Backend with MongoDB, Cloudinary integration
- [ ] Successfully deployed on Vercel


## 🔧 Development Guidelines

### Adding New Features

1. **Define Types**: Add interfaces to `types/index.ts`
2. **Add Constants**: Define constants in `lib/constants/`
3. **Create Validation**: Add Zod schemas to `lib/validations/`
4. **Implement Service**: Add business logic to appropriate service
5. **Create Controller**: Add HTTP handler to controller
6. **Add Route**: Connect controller to API route

### Error Handling

- Use custom error classes from `lib/errors/`
- Wrap controllers with `withErrorHandling`
- Add proper error logging with context

### Database Operations

- Use the `chatService` for chat-related operations
- Ensure proper error handling and logging
- Use transactions for complex operations

### Configuration

- Add new env vars to `config/index.ts` schema
- Use `config` object instead of `process.env`
- Validate all environment variables at startup

## 🔍 Monitoring & Debugging

### Health Checks
- Visit `/api/health` for system status
- Monitor database connectivity
- Check service health

### Logging
- Structured logging with context
- Different log levels (debug, info, warn, error)
- Performance timing for critical operations

### Error Tracking
- Centralized error handling
- Detailed error context in development
- Safe error messages in production

## 🛡️ Security Features

- Input validation on all endpoints
- Authentication required for all operations
- File upload restrictions and validation
- Environment variable validation
- Type-safe operations throughout

## 📈 Performance Considerations

- Database connection pooling
- Efficient database queries with proper indexing
- Streaming responses for AI completions
- Error handling that doesn't leak sensitive data
- Proper memory management

## 🤝 Contributing

1. Follow the established architecture patterns
2. Add proper TypeScript types for new features
3. Include input validation for all endpoints
4. Add appropriate error handling
5. Update documentation for new features

## 📄 License

This project is licensed under the MIT License.
