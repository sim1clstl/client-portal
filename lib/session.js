import crypto from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'portal_session';

function sign(data) {
  const secret = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Reads + verifies the session from the request cookie. Returns { role, name } or null.
export function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifyToken(token);
}
