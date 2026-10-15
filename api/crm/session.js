// /api/crm/session — sign in to the site editor.
//   GET    → { signedIn, configured, backend }
//   POST   { password } → signs in (sets the session cookie)
//   DELETE → signs out
import { authConfigured, checkPassword, fromOtherSite, isSignedIn, reply, signInCookie, signOutCookie } from '../_lib/session.js';
import { storeBackend } from '../_lib/store.js';

// Per-instance throttle on password guesses
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

function tooManyAttempts(ip) {
  const now = Date.now();
  const times = (attempts.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  times.push(now);
  attempts.set(ip, times);
  if (attempts.size > 5000) attempts.clear();
  return times.length > MAX_ATTEMPTS;
}

export async function GET(request) {
  return reply({ signedIn: isSignedIn(request), configured: authConfigured(), backend: storeBackend() });
}

export async function POST(request) {
  if (fromOtherSite(request)) return reply({ error: 'Not allowed.' }, 403);
  if (!authConfigured()) {
    return reply({ error: 'Set CRM_PASSWORD and CRM_SESSION_SECRET (32+ characters) first.' }, 503);
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (tooManyAttempts(ip)) return reply({ error: 'Too many tries. Wait a minute.' }, 429);

  let password;
  try {
    ({ password } = await request.json());
  } catch {
    return reply({ error: 'Send a password.' }, 400);
  }
  if (!checkPassword(password)) return reply({ error: 'Wrong password.' }, 401);
  return reply({ signedIn: true }, 200, { 'set-cookie': signInCookie(request) });
}

export async function DELETE(request) {
  if (fromOtherSite(request)) return reply({ error: 'Not allowed.' }, 403);
  return reply({ signedIn: false }, 200, { 'set-cookie': signOutCookie(request) });
}
