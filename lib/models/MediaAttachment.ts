import mongoose, { Model } from 'mongoose';
import { MediaAttachmentDocument } from '@/types';

export enum MediaType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio'
}

const mediaAttachmentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: Object.values(MediaType),
    required: true,
  },
  secureUrl: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  userId: {
    type: String,
    required: false, // Optional for now
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
mediaAttachmentSchema.index({ cloudinaryId: 1 });
mediaAttachmentSchema.index({ userId: 1, createdAt: -1 });

export const MediaAttachment: Model<MediaAttachmentDocument> = mongoose.models.MediaAttachment || mongoose.model<MediaAttachmentDocument>('MediaAttachment', mediaAttachmentSchema); 