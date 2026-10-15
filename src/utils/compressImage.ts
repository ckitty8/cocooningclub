// Redimensionne et recompresse une image côté navigateur avant l'upload,
// pour éviter de stocker (et faire télécharger aux visiteuses) des photos
// de téléphone de plusieurs Mo.
//
// - Les GIF (animations) et SVG (vectoriel) sont renvoyés tels quels.
// - Si le résultat n'est pas plus léger que l'original, on garde l'original.
// - En cas d'erreur (format non décodable par le navigateur, ex. HEIC sur
//   Chrome), on renvoie l'original : l'upload n'est jamais bloqué par ici.

const SKIP_TYPES = ["image/gif", "image/svg+xml"];

export interface CompressOptions {
  /** Plus grand côté en pixels après redimensionnement. */
  maxSize?: number;
  /** Qualité WebP/JPEG entre 0 et 1. */
  quality?: number;
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));

export const compressImage = async (
  file: File,
  { maxSize = 1600, quality = 0.82 }: CompressOptions = {},
): Promise<File> => {
  if (!file.type.startsWith("image/") || SKIP_TYPES.includes(file.type)) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    // WebP garde la transparence (logos PNG) et pèse moins que le JPEG.
    // Safari < 14 ne sait pas encoder en WebP : il renvoie du PNG, on
    // retombe alors sur du JPEG.
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
};
