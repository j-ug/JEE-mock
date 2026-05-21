
/**
 * Compresses an image base64 string using a canvas.
 * @param base64 The original base64 string.
 * @param maxWidth The maximum width for the compressed image.
 * @param quality The quality of the JPEG compression (0 to 1).
 * @returns A promise that resolves to the compressed base64 string.
 */
export async function compressImage(base64: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}
