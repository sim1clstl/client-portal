import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getSession } from '../../../lib/session';
import { seed } from '../../../lib/seed';

export const dynamic = 'force-dynamic';

// Add any top-level sections introduced after the DB was first seeded
// (e.g. `accounts`). Only fills in missing keys — never overwrites existing data.
function ensureDefaults(state) {
  let changed = false;
  for (const k of Object.keys(seed)) {
    if (state[k] === undefined) {
      state[k] = seed[k];
      changed = true;
    }
  }
  return changed;
}

async function loadState() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_state')
    .select('data')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // First run — seed the database.
    await sb.from('app_state').upsert({ id: 1, data: seed });
    return seed;
  }
  const state = data.data || {};
  if (ensureDefaults(state)) {
    await saveState(state);
  }
  return state;
}

async function saveState(state) {
  const sb = getSupabase();
  const { error } = await sb
    .from('app_state')
    .upsert({ id: 1, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({ data: state });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Operations the client (Michael) is allowed to perform. Everything else is admin-only.
const CLIENT_OPS = new Set(['actionItem.setStatus', 'question.answer']);

export async function POST(request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const op = body.op;
  if (!op) return NextResponse.json({ error: 'Missing op' }, { status: 400 });
  if (session.role !== 'admin' && !CLIENT_OPS.has(op)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const state = await loadState();
    applyOp(state, op, body);
    await saveState(state);
    return NextResponse.json({ data: state });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function applyOp(state, op, body) {
  switch (op) {
    case 'timeline.setStatus': {
      const w = state.timeline.find((t) => t.id === body.weekId);
      if (w) w.status = body.status;
      break;
    }
    case 'timeline.toggleTask': {
      const w = state.timeline.find((t) => t.id === body.weekId);
      const task = w && w.tasks.find((x) => x.id === body.taskId);
      if (task) task.done = !task.done;
      break;
    }
    case 'actionItem.setStatus': {
      const it = state.actionItems.find((a) => a.id === body.itemId);
      if (it) it.status = body.status;
      break;
    }
    case 'question.answer': {
      const q = state.questions.find((x) => x.id === body.questionId);
      if (q) {
        if (body.answer !== undefined) q.answer = body.answer;
        q.status = body.status || (q.answer ? 'answered' : 'open');
      }
      break;
    }
    case 'question.add': {
      state.questions.push({
        id: 'q' + Date.now(),
        text: body.text || '',
        context: body.context || '',
        answer: '',
        status: 'open',
        hidden: false,
      });
      break;
    }
    case 'question.setHidden': {
      const q = state.questions.find((x) => x.id === body.questionId);
      if (q) q.hidden = !!body.hidden;
      break;
    }
    case 'question.remove': {
      state.questions = state.questions.filter((x) => x.id !== body.questionId);
      break;
    }
    case 'announcement.set': {
      state.announcement = body.text || '';
      break;
    }
    case 'project.update': {
      Object.assign(state.project, body.patch || {});
      break;
    }
    case 'payment.setPaid': {
      const p = state.payments.find((x) => x.id === body.paymentId);
      if (p) p.paid = !!body.paid;
      break;
    }
    case 'link.add': {
      state.links.push({
        id: 'l' + Date.now(),
        label: body.label || 'New link',
        url: body.url || '',
        icon: body.icon || 'globe',
        note: body.note || '',
      });
      break;
    }
    case 'link.update': {
      const l = state.links.find((x) => x.id === body.linkId);
      if (l) {
        if (body.label !== undefined) l.label = body.label;
        if (body.url !== undefined) l.url = body.url;
        if (body.icon !== undefined) l.icon = body.icon;
        if (body.note !== undefined) l.note = body.note;
      }
      break;
    }
    case 'link.remove': {
      state.links = state.links.filter((x) => x.id !== body.linkId);
      break;
    }
    case 'document.update': {
      const d = state.documents.find((x) => x.id === body.docId);
      if (d) {
        if (body.url !== undefined) d.url = body.url;
        if (body.note !== undefined) d.note = body.note;
      }
      break;
    }
    case 'document.add': {
      state.documents.push({
        id: 'd' + Date.now(),
        name: body.name || 'Document',
        type: body.type || 'File',
        note: body.note || '',
        url: body.url || '',
      });
      break;
    }
    case 'document.remove': {
      state.documents = state.documents.filter((x) => x.id !== body.docId);
      break;
    }
    case 'account.add': {
      if (!state.accounts) state.accounts = [];
      state.accounts.push({
        id: 'ac' + Date.now(),
        label: body.label || 'Account',
        category: body.category || 'General',
        url: body.url || '',
        details: body.details || '',
        adminOnly: !!body.adminOnly,
      });
      break;
    }
    case 'account.update': {
      const a = (state.accounts || []).find((x) => x.id === body.accountId);
      if (a) {
        if (body.label !== undefined) a.label = body.label;
        if (body.category !== undefined) a.category = body.category;
        if (body.url !== undefined) a.url = body.url;
        if (body.details !== undefined) a.details = body.details;
        if (body.adminOnly !== undefined) a.adminOnly = !!body.adminOnly;
      }
      break;
    }
    case 'account.remove': {
      state.accounts = (state.accounts || []).filter((x) => x.id !== body.accountId);
      break;
    }
    default:
      throw new Error('Unknown op: ' + op);
  }
}
