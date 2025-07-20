import mongoose, { Model } from 'mongoose';
import { ChatMessageDocument } from '@/types';

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  // Store references to MediaAttachment documents
  attachments: [
    {
      attachmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MediaAttachment',
        required: true,
      },
    }
  ],
  originalContent: {
    type: String,
    required: false,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  model: {
    type: String,
    required: false,
  },
  generationMetadata: {
    model: String,
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number,
    temperature: Number,
    maxTokens: Number,
    finishReason: String,
    responseTime: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message: Model<ChatMessageDocument> = mongoose.models.Message || mongoose.model<ChatMessageDocument>('Message', messageSchema); 