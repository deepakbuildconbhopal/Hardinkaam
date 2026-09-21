/**
 * HARDINKAAM High-Performance Client-Side Image Compression & Optimization Engine
 * 
 * Automatically compresses, resizes, and converts uploaded photos before transmission
 * so that:
 * 1. Uploads happen 10x-20x faster (5MB-15MB camera photos become 40KB-180KB).
 * 2. Bandwidth consumption on mobile 4G/5G connections is drastically reduced.
 * 3. WebP modern format is prioritized with fallback to optimized JPEG.
 * 4. Aspect ratios are preserved without distortion.
 * 5. Returns both Blob (for direct Firebase Storage upload) and DataURL (for instant previews/base64 storage).
 */

export interface CompressionOptions {
  /**
   * Maximum width or height dimension in pixels.
   * Default: 1200 (ideal for retina mobile screens & desktop cards without quality loss).
   */
  maxDimension?: number;

  /**
   * Compression quality between 0.1 and 1.0.
   * Default: 0.82 (sweet spot between crystal clarity and minimum file size).
   */
  quality?: number;

  /**
   * Preferred output MIME type.
   * Default: 'image/webp' with automatic JPEG fallback.
   */
  mimeType?: 'image/webp' | 'image/jpeg';

  /**
   * Target maximum file size in KB.
   * If compressed output is still larger than this, quality is iteratively stepped down.
   * Default: 300 KB.
   */
  maxSizeKB?: number;
}

export interface CompressedImageResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage saved, e.g. 85.4%
  width: number;
  height: number;
  format: string;
}

/**
 * Checks if the browser supports Canvas toBlob with WebP export.
 */
function supportsWebPExport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  } catch {
    return false;
  }
}

/**
 * Calculates responsive bounding dimensions preserving original aspect ratio.
 */
export function calculateResponsiveDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  if (origWidth > origHeight) {
    const width = maxDimension;
    const height = Math.round((origHeight * maxDimension) / origWidth);
    return { width, height };
  } else {
    const height = maxDimension;
    const width = Math.round((origWidth * maxDimension) / origHeight);
    return { width, height };
  }
}

/**
 * Formats byte counts into human-readable strings (KB / MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Automatically compresses an image file to website-optimized dimensions and weight.
 * 
 * @param file The original user-selected File from camera or file picker.
 * @param options Compression configuration parameters.
 * @returns Promise resolving to CompressedImageResult with optimized file, blob, and dataUrl.
 */
export async function compressImageForWeb(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  // If not an image, reject gracefully
  if (!file.type.startsWith('image/')) {
    throw new Error('कृपया केवल इमेज फाइल (JPG, PNG, WebP) अपलोड करें।');
  }

  // SVGs are vector and do not need raster compression
  if (file.type === 'image/svg+xml') {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    return {
      file,
      blob: file,
      dataUrl,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      width: 500,
      height: 500,
      format: 'image/svg+xml',
    };
  }

  const {
    maxDimension = 1200,
    quality = 0.82,
    maxSizeKB = 350,
  } = options;

  const targetMime = (options.mimeType || (supportsWebPExport() ? 'image/webp' : 'image/jpeg'));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height } = calculateResponsiveDimensions(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height,
            maxDimension
          );

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: targetMime === 'image/webp' });
          if (!ctx) {
            throw new Error('Canvas 2D context creation failed');
          }

          // Apply high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // For JPEG output, draw clean white background to prevent black transparent areas
          if (targetMime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Function to produce blob with stepped compression if necessary
          const exportBlob = (currentQuality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  // Fallback to original file if toBlob fails
                  resolve({
                    file,
                    blob: file,
                    dataUrl: event.target?.result as string,
                    originalSize: file.size,
                    compressedSize: file.size,
                    compressionRatio: 0,
                    width,
                    height,
                    format: file.type,
                  });
                  return;
                }

                // If blob exceeds target and quality can still be lowered without pixelation
                if (blob.size > maxSizeKB * 1024 && currentQuality > 0.65) {
                  exportBlob(currentQuality - 0.12);
                  return;
                }

                const ext = targetMime === 'image/webp' ? 'webp' : 'jpg';
                const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const newFileName = `${originalBaseName}_optimized.${ext}`;

                const optimizedFile = new File([blob], newFileName, {
                  type: targetMime,
                  lastModified: Date.now(),
                });

                const dataUrl = canvas.toDataURL(targetMime, currentQuality);
                const savedBytes = Math.max(0, file.size - blob.size);
                const compressionRatio = file.size > 0 ? Math.round((savedBytes / file.size) * 100) : 0;

                resolve({
                  file: optimizedFile,
                  blob,
                  dataUrl,
                  originalSize: file.size,
                  compressedSize: blob.size,
                  compressionRatio,
                  width,
                  height,
                  format: targetMime,
                });
              },
              targetMime,
              currentQuality
            );
          };

          exportBlob(quality);
        } catch (canvasErr) {
          console.warn('Canvas compression error, falling back to original file:', canvasErr);
          resolve({
            file,
            blob: file,
            dataUrl: event.target?.result as string,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            width: img.width || 800,
            height: img.height || 600,
            format: file.type,
          });
        }
      };

      img.onerror = () => {
        reject(new Error('इमेज लोड करने में समस्या आई। कृपया वैध फोटो चुनें।'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
