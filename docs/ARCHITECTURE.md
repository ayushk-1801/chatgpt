# Architecture Documentation

## Overview

This application follows a **Clean Architecture** pattern with clear separation of concerns. The architecture is designed to be:

- **Maintainable**: Easy to understand and modify
- **Testable**: Each layer can be tested independently
- **Scalable**: Can handle increased load and complexity
- **Type-safe**: Full TypeScript coverage with proper interfaces

## Layer Responsibilities

### 1. Configuration Layer (`config/`)

**Purpose**: Centralized configuration management with validation

**Responsibilities**:
- Environment variable validation using Zod
- Type-safe configuration access
- Default value management
- Configuration schema definition

**Key Files**:
- `index.ts`: Main configuration with environment validation

### 2. API Layer (`app/api/`)

**Purpose**: HTTP request entry points (Next.js App Router)

**Responsibilities**:
- Route definition
- HTTP method handling
- Delegating to controllers
- Setting API-specific configurations (timeouts, etc.)

**Pattern**: Thin layer that immediately delegates to controllers

### 3. Controller Layer (`controllers/`)

**Purpose**: HTTP request/response handling

**Responsibilities**:
- Request parsing and validation
- Authentication verification
- Calling appropriate services
- Response formatting
- Error handling coordination

**Key Files**:
- `chat.ts`: Chat-related HTTP operations
- `upload.ts`: File upload operations

### 4. Middleware Layer (`middleware/`)

**Purpose**: Cross-cutting concerns

**Responsibilities**:
- Authentication/authorization
- Error handling wrapper
- Request/response transformation
- Logging and monitoring

**Key Files**:
- `auth.ts`: Authentication middleware
- `error.ts`: Error handling and response formatting

### 5. Service Layer (`services/`)

**Purpose**: Business logic implementation

**Responsibilities**:
- Core business operations
- Data transformation
- External service integration
- Transaction management
- Domain logic implementation

**Key Files**:
- `chat.ts`: Chat and message business logic
- `ai.ts`: AI service integration (OpenAI)
- `memory.ts`: Memory management (mem0ai)
- `upload.ts`: File upload business logic
- `database.ts`: Database connection management

### 6. Data Layer (`lib/models/`)

**Purpose**: Data access and persistence

**Responsibilities**:
- Database schema definition
- Data validation at storage level
- Relationship management
- Indexing for performance

**Key Files**:
- `Chat.ts`: Chat model and schema
- `Message.ts`: Message model and schema

### 7. Utilities Layer (`lib/`)

**Purpose**: Shared utilities and helpers

**Responsibilities**:
- Common utility functions
- Type definitions
- Constants management
- Validation schemas
- Error definitions

**Key Subdirectories**:
- `constants/`: Application constants
- `errors/`: Error classes and handling
- `validations/`: Input validation schemas
- `utils/`: General utility functions

### 8. Type Layer (`types/`)

**Purpose**: TypeScript type definitions

**Responsibilities**:
- Interface definitions
- Type safety across layers
- API contract definitions
- Domain object types

## Data Flow

### Request Flow
```
HTTP Request
    ↓
API Route (app/api/)
    ↓
Controller
    ↓
Middleware (auth, validation)
    ↓
Service Layer
    ↓
Data Layer (models)
    ↓
Database
```

### Response Flow
```
Database
    ↓
Data Layer (models)
    ↓
Service Layer
    ↓
Controller (formatting)
    ↓
API Route
    ↓
HTTP Response
```

## Error Handling Strategy

### Error Flow
```
Error Occurs
    ↓
Custom Error Class
    ↓
Error Middleware
    ↓
Formatted Response
    ↓
Client
```

### Error Types
- **ValidationError**: Input validation failures
- **UnauthorizedError**: Authentication failures
- **NotFoundError**: Resource not found
- **DatabaseError**: Database operation failures
- **AIServiceError**: AI service failures
- **MemoryServiceError**: Memory service failures
- **UploadError**: File upload failures

## Configuration Management

### Environment Variables
All environment variables are:
1. Validated at startup using Zod schemas
2. Accessed through the centralized `config` object
3. Type-safe with proper defaults
4. Documented with clear descriptions

### Configuration Structure
```typescript
config: {
  app: { name, version, env },
  database: { uri, options },
  ai: { openai, memory },
  auth: { clerkSecretKey },
  storage: { cloudinary },
  api: { maxDuration, titleGeneration }
}
```

## Service Dependencies

### Dependency Graph
```
Controllers
    ↓
Services (chat, ai, memory, upload)
    ↓
Database Service
    ↓
Models (Chat, Message)
```

### Service Communication
- Services can call other services
- Database service is shared across all services
- External services (OpenAI, mem0ai, Cloudinary) are wrapped in service classes

## Database Design

### Connection Management
- Singleton pattern for connection management
- Health check capabilities
- Proper error handling
- Connection pooling through Mongoose

### Models
- **Chat**: User conversations with metadata
- **Message**: Individual messages within chats
- Proper indexing for performance
- Relationship management between models

## Security Considerations

### Authentication
- Clerk integration for user management
- Authentication middleware for all protected routes
- User ID validation and sanitization

### Input Validation
- Zod schemas for all inputs
- File upload restrictions
- SQL injection prevention through Mongoose

### Error Information
- Development vs production error details
- No sensitive information in error responses
- Proper error logging with context

## Performance Considerations

### Database
- Efficient queries with proper indexing
- Connection reuse and pooling
- Lean queries to minimize data transfer

### API
- Streaming responses for AI completions
- Proper error handling without blocking
- Memory management for large operations

### Caching
- Database connection caching
- Configuration caching
- Opportunity for Redis integration

## Testing Strategy

### Unit Testing
- Service layer methods
- Utility functions
- Validation schemas
- Error handling

### Integration Testing
- API endpoints
- Database operations
- External service integration

### Testing Structure
```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── validations/
├── integration/
│   ├── api/
│   └── database/
└── e2e/
    └── workflows/
```

## Monitoring and Observability

### Health Checks
- Database connectivity
- External service availability
- System resource monitoring

### Logging
- Structured logging with context
- Different log levels
- Performance timing
- Error tracking with stack traces

### Metrics
- API response times
- Error rates
- Database query performance
- External service latency

## Scalability Considerations

### Horizontal Scaling
- Stateless service design
- Database connection management
- Session management through Clerk

### Vertical Scaling
- Efficient memory usage
- Database query optimization
- Proper resource cleanup

### Future Enhancements
- Redis for caching and sessions
- Message queues for background processing
- Microservice decomposition opportunities
- CDN integration for static assets

## Development Workflow

### Adding New Features
1. Define types in `types/`
2. Add constants to `lib/constants/`
3. Create validation schemas in `lib/validations/`
4. Implement business logic in services
5. Create controller methods
6. Add API routes
7. Update documentation

### Code Organization Principles
- Single Responsibility Principle
- Dependency Inversion
- Interface Segregation
- DRY (Don't Repeat Yourself)
- Clear naming conventions
- Comprehensive error handling 