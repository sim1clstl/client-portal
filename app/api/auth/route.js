import { NextResponse } from 'next/server';
import { createToken, SESSION_COOKIE } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { code } = await request.json().catch(() => ({}));
  const adminCode = process.env.ADMIN_CODE;
  const clientCode = process.env.CLIENT_CODE;

  let session = null;
  if (code && adminCode && code === adminCode) {
    session = { role: 'admin', name: process.env.ADMIN_NAME || 'Admin' };
  } else if (code && clientCode && code === clientCode) {
    session = { role: 'client', name: process.env.CLIENT_NAME || 'Client' };
  }

  if (!session) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
  }

  const res = NextResponse.json({ role: session.role, name: session.name });
  res.cookies.set(SESSION_COOKIE, createToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
