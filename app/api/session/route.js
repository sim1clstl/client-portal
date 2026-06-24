import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getSession();
  return NextResponse.json(s ? { role: s.role, name: s.name } : { role: null });
}
