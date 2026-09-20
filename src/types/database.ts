// src/types/database.ts
// Type definitions for Chat With Your Docs data model

export type DocumentStatus = 
  | 'UPLOADING'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EMBEDDING'
  | 'READY'
  | 'FAILED';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  metadata: Record<string, any>;
  embedding?: number[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  document?: {
    id: string;
    filename: string;
    original_filename: string;
  } | null;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  page_number: number | null;
  chunk_index: number;
  similarity: number;
  snippet: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface RetrievedChunk {
  id: string;
  document_id: string;
  document_name?: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  metadata: Record<string, any>;
  similarity: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
