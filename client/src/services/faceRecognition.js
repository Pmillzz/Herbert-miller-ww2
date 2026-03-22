/**
 * Browser-side face recognition service.
 *
 * Uses @vladmandic/face-api (TensorFlow.js, WebGL backend).
 * Models are served from /models/ (copied from node_modules by scripts/copy-models.js).
 *
 * Exported descriptors are plain number[] arrays so they can be JSON-serialised
 * and stored on the server without any faceapi dependency.
 */

const MODEL_URL = '/models';

// Thresholds for Euclidean distance (lower = more similar faces)
export const STRONG_MATCH = 0.50; // high confidence
export const POSSIBLE_MATCH = 0.62; // worth flagging

let faceapi = null;
let modelsLoaded = false;

/**
 * Lazy-load the face-api.js bundle + model weights.
 * Safe to call multiple times — only loads once.
 */
export async function loadModels(onProgress) {
  if (modelsLoaded) return;

  onProgress?.('Loading face detection library…');
  const mod = await import('@vladmandic/face-api');
  faceapi = mod;

  onProgress?.('Loading SSD face detector…');
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

  onProgress?.('Loading landmark model…');
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

  onProgress?.('Loading recognition model…');
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

  modelsLoaded = true;
  onProgress?.('Ready');
}

export function isModelsLoaded() {
  return modelsLoaded;
}

/**
 * Detect the most prominent face in an image and return its 128-dim descriptor
 * as a plain number[]. Returns null if no face is found.
 *
 * @param {string|HTMLImageElement} source  proxy URL (same-origin) or img element
 */
export async function extractDescriptor(source) {
  if (!modelsLoaded) throw new Error('Models not loaded — call loadModels() first');

  const img = typeof source === 'string' ? await loadImage(source) : source;

  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
}

/**
 * Euclidean distance between two descriptors.
 * < STRONG_MATCH    → likely the same person
 * < POSSIBLE_MATCH  → possible match
 * ≥ POSSIBLE_MATCH  → probably different people
 */
export function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

/**
 * Compare a query descriptor against an array of reference descriptors.
 * Returns the lowest distance found.
 *
 * @param {number[]} queryDescriptor
 * @param {Array<{id: string, descriptor: number[]}>} references
 * @returns {{ score: number, matchingRefId: string | null }}
 */
export function findBestMatch(queryDescriptor, references) {
  let best = Infinity;
  let matchingRefId = null;

  for (const ref of references) {
    const dist = euclideanDistance(queryDescriptor, ref.descriptor);
    if (dist < best) {
      best = dist;
      matchingRefId = ref.id;
    }
  }

  return { score: best, matchingRefId };
}

/**
 * Load a same-origin image URL into an HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    // 8-second timeout
    const tid = setTimeout(() => reject(new Error('Image load timeout')), 8000);
    img.onload = () => { clearTimeout(tid); resolve(img); };
    img.src = src;
  });
}

/**
 * Resize a File to a small canvas data-URL for UI display.
 * Face detection is run on the original; this is just for the thumbnail.
 */
export async function fileToThumbnail(file, maxSize = 120) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
