// Uploads a file from the editor straight to R2 and returns the block that
// shows it. Runs in the browser, so nothing passes through Vercel:
//
// - Photos (JPEG, WebP, AVIF, opaque PNG) become the same set
//   scripts/build-images.mjs makes: progressive-ish JPEGs 640, 1280 and 2560px
//   wide (never upscaled) plus a 64px blur preview, named
//   img/<name>.<hash>-<width>.jpg. The block records the widths and pixel size
//   so the site can build srcset and reserve space.
// - GIFs, SVGs and PNGs with transparency go up as they are.
// - Videos go up as they are, with a poster frame grabbed from the start.
import { requestUploads } from './api';

const WIDTHS = [640, 1280, 2560];
const QUALITY = 0.85;
const BLUR_WIDTH = 64;
const BLUR_QUALITY = 0.6;
const POSTER_WIDTH = 1280;

const VIDEO_TYPES = /^video\/(mp4|webm|quicktime)$/;
const KEEP_AS_IS = /^image\/(gif|svg\+xml)$/;

const urlSafe = (name) => name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
const extension = (name) => name.match(/\.([A-Za-z0-9]+)$/)?.[1].toLowerCase() || 'bin';

async function contentHash(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest).slice(0, 4)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const randomHash = () => Math.random().toString(16).slice(2, 10).padEnd(8, '0');

function encode(source, width, height, quality) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // JPEG has no transparency; flatten onto white rather than black
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

// True if any pixel of a small copy of the image is see-through
function hasTransparency(bitmap) {
  const width = Math.min(bitmap.width, 128);
  const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));
  const ctx = new OffscreenCanvas(width, height).getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

// PUTs each { key, blob } to its presigned URL. onProgress gets 0–1 over all files.
async function putAll(files, onProgress) {
  const { uploads } = await requestUploads(files.map(({ key, blob }) => ({ key, contentType: blob.type, size: blob.size })));
  const total = files.reduce((sum, file) => sum + file.blob.size, 0);
  const sent = new Array(files.length).fill(0);
  await Promise.all(uploads.map((upload, i) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.url);
    for (const [name, value] of Object.entries(upload.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      sent[i] = event.loaded;
      onProgress?.(sent.reduce((a, b) => a + b, 0) / total);
    };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`R2 refused ${upload.key} (${xhr.status})`)));
    // CORS failures land here too, with no detail
    xhr.onerror = () => reject(new Error('Upload failed. Is the R2 bucket’s CORS rule set up? (see README)'));
    xhr.send(files[i].blob);
  })));
  return uploads.map((upload) => upload.publicUrl);
}

async function uploadImage(file, onProgress) {
  // Null for formats this browser can't draw (e.g. SVG), which go up as they are
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  try {
    const size = bitmap && { w: bitmap.width, h: bitmap.height };
    if (!bitmap || KEEP_AS_IS.test(file.type) || (file.type === 'image/png' && hasTransparency(bitmap))) {
      const key = `img/${urlSafe(file.name)}.${await contentHash(file)}.${extension(file.name)}`;
      const [src] = await putAll([{ key, blob: file }], onProgress);
      return { type: 'image', src, ...size };
    }
    const { width, height } = bitmap;
    const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1))])];
    const heightAt = (w) => Math.max(1, Math.round((height * w) / width));
    const base = `img/${urlSafe(file.name)}.${await contentHash(file)}`;
    const files = await Promise.all([
      ...widths.map(async (w) => ({ key: `${base}-${w}.jpg`, blob: await encode(bitmap, w, heightAt(w), QUALITY) })),
      (async () => {
        const w = Math.min(width, BLUR_WIDTH);
        return { key: `${base}-blur.jpg`, blob: await encode(bitmap, w, heightAt(w), BLUR_QUALITY) };
      })(),
    ]);
    const urls = await putAll(files, onProgress);
    // Linked by the largest width; the site derives the others from its name
    return { type: 'image', src: urls[widths.length - 1], w: widths.at(-1), h: heightAt(widths.at(-1)), widths };
  } finally {
    bitmap?.close();
  }
}

// A JPEG of the video's first moments, and its pixel size
function grabPoster(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (fn) => (value) => {
      URL.revokeObjectURL(url);
      fn(value);
    };
    video.muted = true;
    video.preload = 'auto';
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    };
    video.onseeked = async () => {
      try {
        const width = Math.min(video.videoWidth, POSTER_WIDTH);
        const height = Math.round((video.videoHeight * width) / video.videoWidth);
        const blob = await encode(video, width, height, QUALITY);
        done(resolve)({ blob, width: video.videoWidth, height: video.videoHeight });
      } catch (error) {
        done(reject)(error);
      }
    };
    video.onerror = done(() => reject(new Error('This browser can’t read that video to make a poster')));
    video.src = url;
  });
}

async function uploadVideo(file, onProgress) {
  const name = `${urlSafe(file.name)}.${randomHash()}`;
  // Not every format decodes here (e.g. ProRes .mov); upload without a poster then
  const poster = await grabPoster(file).catch(() => null);
  const files = [{ key: `video/${name}.${extension(file.name)}`, blob: file }];
  if (poster) files.push({ key: `img/${name}-poster.jpg`, blob: poster.blob });
  const [src, posterUrl] = await putAll(files, onProgress);
  return {
    type: 'video',
    src,
    ...(posterUrl && { poster: posterUrl, aspectRatio: `${poster.width} / ${poster.height}` }),
  };
}

export const canUpload = (file) => file.type.startsWith('image/') || VIDEO_TYPES.test(file.type);

export function uploadFile(file, onProgress) {
  if (VIDEO_TYPES.test(file.type)) return uploadVideo(file, onProgress);
  if (file.type.startsWith('image/')) return uploadImage(file, onProgress);
  return Promise.reject(new Error(`${file.name}: only images and MP4, WebM or MOV videos`));
}
