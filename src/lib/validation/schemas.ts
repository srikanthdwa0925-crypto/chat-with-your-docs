// src/lib/validation/schemas.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters long').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long (max 4000 characters)'),
  conversationId: z.string().uuid('Invalid conversation ID').optional(),
  documentId: z.string().uuid('Invalid document ID').optional().nullable(),
  stream: z.boolean().optional().default(true),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional().default('New Conversation'),
  documentId: z.string().uuid().optional().nullable(),
});

export const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(1000),
  documentId: z.string().uuid().optional().nullable(),
  topK: z.number().int().min(1).max(20).optional().default(5),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.2),
});

export const fileUploadConfig = {
  maxSizeBytes: 25 * 1024 * 1024, // 25 MB
  allowedMimeTypes: [
    'application/pdf',
    'text/plain',
    'text/markdown',
  ],
  allowedExtensions: ['.pdf', '.txt', '.md'],
};

export function validateFileUpload(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
  if (file.size > fileUploadConfig.maxSizeBytes) {
    return { valid: false, error: 'File size exceeds maximum allowed limit of 25MB' };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAllowedExt = fileUploadConfig.allowedExtensions.includes(extension);
  const isAllowedMime = fileUploadConfig.allowedMimeTypes.includes(file.type) || 
    (extension === '.md' && file.type === '') || 
    (extension === '.txt' && file.type === '');

  if (!isAllowedExt && !isAllowedMime) {
    return { valid: false, error: 'Unsupported file type. Please upload a PDF, TXT, or MD file.' };
  }

  return { valid: true };
}
