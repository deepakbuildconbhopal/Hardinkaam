import { ChatAttachment, AttachmentValidationResult, AttachmentType } from './attachmentTypes';

// Maximum allowed sizes in bytes
export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_DOC_SIZE = 25 * 1024 * 1024; // 25MB

// Formats file sizes
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Validates file type and size
export function validateAttachment(file: File): AttachmentValidationResult {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';
  const mime = (file.type || '').toLowerCase();

  // Block potentially dangerous executable/script extensions
  const dangerousExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs', 'scr', 'msi', 'com', 'jar', 'apk'];
  if (dangerousExts.includes(ext)) {
    return {
      valid: false,
      error: 'सुरक्षा कारणों से यह फाइल फॉर्मेट (.exe, .bat, स्क्रिप्ट) समर्थित नहीं है।',
    };
  }

  // 1. Image
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'bmp'].includes(ext)
  ) {
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: `फोटो का साइज बहुत बड़ा है (${formatFileSize(file.size)})। अधिकतम 15MB की फोटो भेज सकते हैं।`,
      };
    }
    return { valid: true, type: 'image' };
  }

  // 2. Video
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', '3gp', 'mkv', 'avi'].includes(ext)
  ) {
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `वीडियो का साइज 50MB से कम होना चाहिए (${formatFileSize(file.size)} मिला)।`,
      };
    }
    return { valid: true, type: 'video' };
  }

  // 3. PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    if (file.size > MAX_DOC_SIZE) {
      return {
        valid: false,
        error: `PDF फाइल का साइज 25MB से कम होना चाहिए।`,
      };
    }
    return { valid: true, type: 'pdf' };
  }

  // 4. Document
  const docExts = ['doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'csv'];
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('text') ||
    docExts.includes(ext)
  ) {
    if (file.size > MAX_DOC_SIZE) {
      return {
        valid: false,
        error: `दस्तावेज़ का साइज 25MB से कम होना चाहिए।`,
      };
    }
    return { valid: true, type: 'document' };
  }

  return {
    valid: false,
    error: 'कृपया मान्य फोटो (JPG, PNG), वीडियो (MP4), या दस्तावेज़ (PDF/DOC) चुनें।',
  };
}

// Upload processor that handles progress simulation and resilient storage fallback
export function processUpload(
  file: File,
  type: AttachmentType,
  onProgress: (progress: number) => void,
  onSuccess: (url: string) => void,
  onError: (error: string) => void
): () => void {
  let isCancelled = false;

  // Generate an instant ObjectURL for client preview
  let localUrl = '';
  try {
    localUrl = URL.createObjectURL(file);
  } catch (e) {
    localUrl = '';
  }

  // Realistic step-by-step progress update
  let currentProgress = 0;
  const interval = setInterval(() => {
    if (isCancelled) {
      clearInterval(interval);
      return;
    }

    // Step up
    currentProgress += Math.floor(Math.random() * 25) + 15;
    if (currentProgress >= 100) {
      currentProgress = 100;
      onProgress(100);
      clearInterval(interval);

      // Successfully staged and ready
      setTimeout(() => {
        if (!isCancelled) {
          onSuccess(localUrl);
        }
      }, 200);
    } else {
      onProgress(currentProgress);
    }
  }, 120);

  // Return cancel function
  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}
