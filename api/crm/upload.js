// POST /api/crm/upload — presigned URLs for the editor to upload media straight
// to the R2 bucket behind cdn.isthishenry.com (files never pass through Vercel,
// whose request bodies are capped at 4.5 MB).
//   { files: [{ key, contentType, size }] }
//   → { uploads: [{ key, url, headers, publicUrl }] }: PUT each file to `url`
//     with exactly `headers`, then link it by `publicUrl`.
// Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (an R2 API
// token with Object Read & Write on the bucket), and a CORS rule on the bucket
// that lets the site PUT (see README).
import { AwsClient } from 'aws4fetch';
import { editorOnly, reply } from '../_lib/session.js';

const BUCKET = process.env.R2_BUCKET || 'isthishenry';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL || 'https://cdn.isthishenry.com').replace(/\/+$/, '');
// Uploaded names carry a content hash, so they never change
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const EXPIRES_S = 15 * 60;
const MAX_FILES = 40;

const KINDS = [
  { prefix: 'img/', types: /^image\/(jpeg|png|gif|webp|avif|svg\+xml)$/, maxBytes: 50 * 1024 ** 2 },
  { prefix: 'video/', types: /^video\/(mp4|webm|quicktime)$/, maxBytes: 4 * 1024 ** 3 },
];

let client = null;

export const POST = editorOnly(async (request) => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return reply({ error: 'Uploads aren’t set up: add the R2_* variables.' }, 503);
  }
  client ??= new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });

  let files;
  try {
    ({ files } = await request.json());
  } catch {
    return reply({ error: 'Send the files to upload.' }, 400);
  }
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) {
    return reply({ error: `Send 1–${MAX_FILES} files.` }, 400);
  }

  const uploads = [];
  for (const { key, contentType, size } of files) {
    const kind = KINDS.find((k) => typeof key === 'string' && key.startsWith(k.prefix));
    if (!kind || !/^[a-z]+\/[A-Za-z0-9_][A-Za-z0-9._-]{0,200}$/.test(key)) {
      return reply({ error: `Can’t upload to “${key}”.` }, 400);
    }
    if (!kind.types.test(contentType)) return reply({ error: `${contentType} isn’t allowed in ${kind.prefix}` }, 400);
    if (!Number.isInteger(size) || size < 1 || size > kind.maxBytes) return reply({ error: `${key} is too big.` }, 400);

    // Content type, cache policy and length are all signed: R2 refuses the PUT
    // unless it sends exactly these, so the size checked here is the size stored
    const headers = { 'content-type': contentType, 'cache-control': CACHE_CONTROL, 'content-length': String(size) };
    const url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`);
    url.searchParams.set('X-Amz-Expires', String(EXPIRES_S));
    const signed = await client.sign(url, { method: 'PUT', headers, aws: { signQuery: true, allHeaders: true } });
    // The browser sets Content-Length itself from the file
    delete headers['content-length'];
    uploads.push({ key, url: signed.url, headers, publicUrl: `${PUBLIC_URL}/${key}` });
  }
  return reply({ uploads });
});
