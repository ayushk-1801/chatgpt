import mongoose, { Model } from 'mongoose';
import { ChatDocument } from '@/types';

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
chatSchema.index({ userId: 1, createdAt: -1 });

export const Chat: Model<ChatDocument> = mongoose.models.Chat || mongoose.model<ChatDocument>('Chat', chatSchema); 