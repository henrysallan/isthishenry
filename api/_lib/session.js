// Sign-in for the site editor at /crm. There's one password, CRM_PASSWORD; signing
// in sets an HttpOnly cookie holding an expiry and its HMAC, signed with
// CRM_SESSION_SECRET. The cookie is scoped to /api/crm and SameSite=Strict, so
// only the editor's own requests carry it. Changing either variable signs
// everyone out.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'crm_session';
const MAX_AGE_S = 14 * 24 * 60 * 60;

const sha256 = (text) => createHash('sha256').update(text).digest();

export function authConfigured() {
  return Boolean(process.env.CRM_PASSWORD && process.env.CRM_SESSION_SECRET?.length >= 32);
}

function sign(expires) {
  return createHmac('sha256', process.env.CRM_SESSION_SECRET)
    .update(`${expires}.`)
    .update(sha256(process.env.CRM_PASSWORD))
    .digest('base64url');
}

// Hashing both sides first gives equal-length buffers, so the comparison takes
// the same time whatever was typed
export function checkPassword(password) {
  if (!authConfigured() || typeof password !== 'string') return false;
  return timingSafeEqual(sha256(password), sha256(process.env.CRM_PASSWORD));
}

function cookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/api/crm; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function signInCookie(request) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  return cookie(request, `${expires}.${sign(expires)}`, MAX_AGE_S);
}

export function signOutCookie(request) {
  return cookie(request, '', 0);
}

export function isSignedIn(request) {
  if (!authConfigured()) return false;
  const value = (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const [expires, signature] = (value || '').split('.');
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(expires));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Browsers send Origin with every POST/PUT/DELETE; refuse ones from other sites
export function fromOtherSite(request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && new URL(origin).host !== request.headers.get('host'));
}

export const reply = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });

// Wraps an editor endpoint: refuses other sites and signed-out requests
export function editorOnly(handler) {
  return async (request) => {
    if (fromOtherSite(request)) return reply({ error: 'Not allowed.' }, 403);
    if (!isSignedIn(request)) return reply({ error: 'Sign in first.' }, 401);
    return handler(request);
  };
}
