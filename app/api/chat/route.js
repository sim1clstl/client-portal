import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');
    let q = sb
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(500);
    if (after) q = q.gt('created_at', after);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ messages: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { body } = await request.json().catch(() => ({}));
  if (!body || !String(body).trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('messages')
      .insert({ role: session.role, author: session.name, body: String(body).trim() })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ message: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
