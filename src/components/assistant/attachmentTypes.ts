export type AttachmentType = 'image' | 'video' | 'pdf' | 'document';

export interface ChatAttachment {
  id: string;
  type: AttachmentType;
  name: string;
  size: number;
  formattedSize: string;
  url: string;
  thumbnailUrl?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  file?: File;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  type?: AttachmentType;
}
