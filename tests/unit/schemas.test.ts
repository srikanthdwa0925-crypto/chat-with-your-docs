import { describe, it, expect } from 'vitest';
import { 
  validateFileUpload, 
  chatRequestSchema, 
  createConversationSchema,
  fileUploadConfig 
} from '@/lib/validation/schemas';

describe('Validation Schemas', () => {
  it('allows valid PDF, TXT, and MD files under 25MB', () => {
    expect(validateFileUpload({ name: 'test.pdf', size: 1024 * 100, type: 'application/pdf' }).valid).toBe(true);
    expect(validateFileUpload({ name: 'notes.txt', size: 2048, type: 'text/plain' }).valid).toBe(true);
    expect(validateFileUpload({ name: 'readme.md', size: 4096, type: 'text/markdown' }).valid).toBe(true);
  });

  it('rejects files exceeding 25MB', () => {
    const res = validateFileUpload({
      name: 'large.pdf',
      size: 26 * 1024 * 1024,
      type: 'application/pdf',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds maximum allowed limit');
  });

  it('rejects disallowed file extensions like .exe or .zip', () => {
    const res = validateFileUpload({
      name: 'malicious.exe',
      size: 5000,
      type: 'application/x-msdownload',
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported file type');
  });

  it('validates chat request message requirements', () => {
    expect(chatRequestSchema.safeParse({ message: 'Valid question' }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('validates conversation creation parameters', () => {
    expect(createConversationSchema.safeParse({ title: 'My Chat' }).success).toBe(true);
    expect(createConversationSchema.safeParse({}).success).toBe(true);
  });
});
