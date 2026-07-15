/**
 * Compresses and resizes an image blob/file before upload.
 * Reduces storage footprint without losing visible quality.
 * @param {Blob|File} blob - The original image
 * @param {object} opts
 * @param {number} opts.maxWidth - Max width in px (default 1024)
 * @param {number} opts.maxHeight - Max height in px (default 1024)
 * @param {number} opts.quality - JPEG quality 0-1 (default 0.65)
 * @returns {Promise<File>} Compressed JPEG file
 */
export async function compressImage(blob, opts = {}) {
  const { maxWidth = 1024, maxHeight = 1024, quality = 0.65 } = opts;

  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const el = new Image();
    el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')); };
    el.src = url;
  });

  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxWidth || h > maxHeight) {
    const ratio = Math.min(maxWidth / w, maxHeight / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const compressedBlob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  const fileName = blob instanceof File
    ? blob.name.replace(/\.[^.]+$/, '') + '_comp.jpg'
    : `photo_${Date.now()}_comp.jpg`;

  return new File([compressedBlob], fileName, { type: 'image/jpeg' });
}