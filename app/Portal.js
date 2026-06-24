'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'timeline', label: 'Timeline', icon: 'calendar' },
  { id: 'actions', label: 'What We Need', icon: 'check' },
  { id: 'questions', label: 'Open Questions', icon: 'help' },
  { id: 'documents', label: 'Documents', icon: 'file' },
  { id: 'accounts', label: 'Accounts', icon: 'key' },
  { id: 'chat', label: 'Chat', icon: 'message' },
  { id: 'links', label: 'Quick Links', icon: 'link' },
];

const WEEK_STATUS = {
  not_started: { label: 'Not started', cls: 'gray' },
  in_progress: { label: 'In progress', cls: 'blue' },
  done: { label: 'Done', cls: 'green' },
  blocked: { label: 'Blocked', cls: 'red' },
};

const ACTION_STATUS = {
  'Not Started': 'gray',
  'In Progress': 'blue',
  Provided: 'green',
  Blocked: 'red',
  'Not Applicable': 'muted',
};
const ACTION_OPTIONS = ['Not Started', 'In Progress', 'Provided', 'Blocked', 'Not Applicable'];

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M11.4 11.6 21 2"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: PATHS[name] || PATHS.link }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function progressOf(timeline) {
  if (!timeline || !timeline.length) return 0;
  const score = timeline.reduce(
    (s, w) => s + (w.status === 'done' ? 1 : w.status === 'in_progress' ? 0.5 : 0),
    0
  );
  return Math.round((score / timeline.length) * 100);
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function Portal() {
  const [session, setSession] = useState(undefined); // undefined=loading, null=out, {role,name}=in
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState('overview');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [todayISO, setTodayISO] = useState(null);

  const lastTsRef = useRef(null);

  const isAdmin = session && session.role === 'admin';
  const isClient = session && session.role === 'client';

  /* ----- data ----- */
  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch {}
  }, []);

  const sendOp = useCallback(async (payload) => {
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
        return true;
      }
      alert(json.error || 'Action failed');
      return false;
    } catch (e) {
      alert('Network error');
      return false;
    }
  }, []);

  const loadChat = useCallback(async (initial) => {
    try {
      const url =
        initial || !lastTsRef.current
          ? '/api/chat'
          : `/api/chat?after=${encodeURIComponent(lastTsRef.current)}`;
      const res = await fetch(url);
      const json = await res.json();
      const incoming = json.messages || [];
      if (initial) {
        setMessages(incoming);
        if (incoming.length) lastTsRef.current = incoming[incoming.length - 1].created_at;
      } else if (incoming.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
          return merged;
        });
        lastTsRef.current = incoming[incoming.length - 1].created_at;
      }
    } catch {}
  }, []);

  /* ----- session bootstrap ----- */
  useEffect(() => {
    setTodayISO(new Date().toISOString().slice(0, 10));
    fetch('/api/session')
      .then((r) => r.json())
      .then((j) => setSession(j.role ? { role: j.role, name: j.name } : null))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (session) {
      refreshState();
      loadChat(true);
    }
  }, [session, refreshState, loadChat]);

  /* ----- polling ----- */
  useEffect(() => {
    if (!session) return;
    const chatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') loadChat(false);
    }, 6000);
    const stateTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') refreshState();
    }, 20000);
    return () => {
      clearInterval(chatTimer);
      clearInterval(stateTimer);
    };
  }, [session, loadChat, refreshState]);

  /* ----- auth actions ----- */
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (res.ok) {
        setSession({ role: json.role, name: json.name });
        setCode('');
      } else {
        setLoginError(json.error || 'Login failed');
      }
    } catch {
      setLoginError('Network error');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setSession(null);
    setData(null);
    setMessages([]);
    lastTsRef.current = null;
  }

  /* ----- render: loading ----- */
  if (session === undefined) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  /* ----- render: login ----- */
  if (session === null) {
    return (
      <div className="center-screen">
        <form className="login-card" onSubmit={login}>
          <div className="login-badge"><Icon name="card" size={26} /></div>
          <h1>Project Portal</h1>
          <p className="login-sub">Multi-Merchant Payment Platform — V1</p>
          <input
            type="password"
            placeholder="Enter your access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          {loginError && <div className="login-error">{loginError}</div>}
          <button type="submit" disabled={busy || !code}>
            {busy ? 'Checking…' : 'Enter portal'}
          </button>
          <p className="login-foot">Private workspace · access by invitation</p>
        </form>
      </div>
    );
  }

  /* ----- render: portal ----- */
  if (!data) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const pct = progressOf(data.timeline);
  const paidTotal = data.payments.reduce((s, p) => s + (p.paid ? p.amount : 0), 0);
  const grandTotal = data.payments.reduce((s, p) => s + p.amount, 0);

  // current week (client-computed to avoid hydration mismatch)
  let currentWeekId = null;
  if (todayISO && data.project.startDate) {
    const diffDays = Math.floor(
      (new Date(todayISO) - new Date(data.project.startDate)) / 86400000
    );
    const idx = Math.max(0, Math.min(data.timeline.length - 1, Math.floor(diffDays / 7)));
    if (diffDays >= -7) currentWeekId = data.timeline[idx]?.id;
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="card" size={20} /></div>
          <div>
            <div className="brand-title">{data.project.name}</div>
            <div className="brand-sub">{data.project.tagline}</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? 'active' : ''}`}
              onClick={() => setActive(n.id)}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.id === 'chat' && messages.length > 0 && (
                <span className="nav-count">{messages.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="side-progress">
          <div className="side-progress-top">
            <span>Build progress</span>
            <strong>{pct}%</strong>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="side-user">
          <div className="avatar">{(session.name || '?').slice(0, 1).toUpperCase()}</div>
          <div className="side-user-meta">
            <div className="side-user-name">{session.name}</div>
            <div className="side-user-role">{isAdmin ? 'Admin' : 'Client'}</div>
          </div>
          <button className="logout" onClick={logout} title="Sign out">
            <Icon name="external" size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {data.announcement && (
          <div className="announce">
            <span className="announce-dot" />
            <span className="announce-text">{data.announcement}</span>
          </div>
        )}

        {active === 'overview' && (
          <Overview
            data={data}
            pct={pct}
            paidTotal={paidTotal}
            grandTotal={grandTotal}
            currentWeekId={currentWeekId}
            isAdmin={isAdmin}
            onOp={sendOp}
            goto={setActive}
          />
        )}

        {active === 'timeline' && (
          <section className="section">
            <SectionHead
              title="Project Timeline"
              sub={`12 weeks · ${data.project.startDate} → ${data.project.endDate}`}
            />
            <div className="timeline">
              {data.timeline.map((w) => (
                <WeekCard
                  key={w.id}
                  week={w}
                  isAdmin={isAdmin}
                  current={w.id === currentWeekId}
                  onOp={sendOp}
                />
              ))}
            </div>
          </section>
        )}

        {active === 'actions' && (
          <ActionItems data={data} canEdit={true} onOp={sendOp} />
        )}

        {active === 'questions' && (
          <Questions data={data} isAdmin={isAdmin} isClient={isClient} onOp={sendOp} />
        )}

        {active === 'documents' && (
          <Documents data={data} isAdmin={isAdmin} onOp={sendOp} />
        )}

        {active === 'accounts' && (
          <Accounts data={data} isAdmin={isAdmin} onOp={sendOp} />
        )}

        {active === 'chat' && (
          <Chat
            messages={messages}
            me={session}
            onSend={async (body) => {
              const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body }),
              });
              const json = await res.json();
              if (res.ok && json.message) {
                setMessages((prev) => [...prev, json.message]);
                lastTsRef.current = json.message.created_at;
              }
            }}
          />
        )}

        {active === 'links' && <Links data={data} isAdmin={isAdmin} onOp={sendOp} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

function SectionHead({ title, sub, action }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Overview({ data, pct, paidTotal, grandTotal, currentWeekId, isAdmin, onOp, goto }) {
  const current = data.timeline.find((w) => w.id === currentWeekId) || data.timeline[0];
  const openQ = data.questions.filter((q) => q.status !== 'answered' && !q.hidden).length;
  const pending = data.actionItems.filter(
    (a) => a.status !== 'Provided' && a.status !== 'Not Applicable'
  ).length;

  return (
    <section className="section">
      <div className="hero">
        <div className="hero-main">
          <div className="hero-status">{data.project.status}</div>
          <h1>{data.project.name}</h1>
          <p className="hero-tagline">{data.project.tagline}</p>
          <div className="hero-meta">
            <div><span>Client</span><strong>{data.project.client}</strong></div>
            <div><span>Builder</span><strong>{data.project.builder}</strong></div>
            <div><span>Stack</span><strong>{data.project.stack}</strong></div>
            <div><span>Window</span><strong>{data.project.startDate} → {data.project.endDate}</strong></div>
          </div>
        </div>
        <div className="hero-ring">
          <Ring pct={pct} />
          <div className="hero-ring-label">complete</div>
        </div>
      </div>

      <div className="stat-grid">
        <button className="stat" onClick={() => goto('timeline')}>
          <div className="stat-k">This week</div>
          <div className="stat-v">{current ? `Week ${current.week}` : '—'}</div>
          <div className="stat-d">{current ? current.title : ''}</div>
        </button>
        <button className="stat" onClick={() => goto('actions')}>
          <div className="stat-k">Items needed from you</div>
          <div className="stat-v">{pending}</div>
          <div className="stat-d">pending</div>
        </button>
        <button className="stat" onClick={() => goto('questions')}>
          <div className="stat-k">Open questions</div>
          <div className="stat-v">{openQ}</div>
          <div className="stat-d">awaiting your input</div>
        </button>
        <div className="stat">
          <div className="stat-k">Payments</div>
          <div className="stat-v">${paidTotal.toLocaleString()}</div>
          <div className="stat-d">of ${grandTotal.toLocaleString()} received</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Current focus</h3>
          {current && (
            <>
              <div className="focus-week">
                <span className={`badge ${WEEK_STATUS[current.status]?.cls}`}>
                  {WEEK_STATUS[current.status]?.label}
                </span>
                <span className="focus-dates">{current.dates}</span>
              </div>
              <p className="focus-desc">{current.focus}</p>
              <ul className="focus-tasks">
                {current.tasks.map((t) => (
                  <li key={t.id} className={t.done ? 'done' : ''}>
                    <span className="tick">{t.done ? '✓' : ''}</span>
                    {t.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head-row">
            <h3>Payment milestones</h3>
            <span className="muted-sm">${paidTotal.toLocaleString()} / ${grandTotal.toLocaleString()}</span>
          </div>
          <div className="pay-list">
            {data.payments.map((p) => (
              <div key={p.id} className={`pay-row ${p.paid ? 'paid' : ''}`}>
                <label className="pay-left">
                  {isAdmin ? (
                    <input
                      type="checkbox"
                      checked={p.paid}
                      onChange={() => onOp({ op: 'payment.setPaid', paymentId: p.id, paid: !p.paid })}
                    />
                  ) : (
                    <span className={`dot ${p.paid ? 'green' : 'gray'}`} />
                  )}
                  <span>{p.label}</span>
                </label>
                <span className="pay-amt">${p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <AnnouncementEditor announcement={data.announcement} onOp={onOp} />
      )}
    </section>
  );
}

function Ring({ pct }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" className="ring">
      <circle cx="66" cy="66" r={r} className="ring-bg" />
      <circle
        cx="66"
        cy="66"
        r={r}
        className="ring-fg"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 66 66)"
      />
      <text x="66" y="72" textAnchor="middle" className="ring-text">{pct}%</text>
    </svg>
  );
}

function AnnouncementEditor({ announcement, onOp }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(announcement || '');
  useEffect(() => setText(announcement || ''), [announcement]);
  return (
    <div className="card admin-card">
      <div className="card-head-row">
        <h3>Announcement banner</h3>
        <button className="btn-ghost" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>
      {open ? (
        <div className="stack">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <div className="row-end">
            <button
              className="btn"
              onClick={async () => {
                if (await onOp({ op: 'announcement.set', text })) setOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">This message shows at the top of the portal for the client.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline week card                                                  */
/* ------------------------------------------------------------------ */

function WeekCard({ week, isAdmin, current, onOp }) {
  const [open, setOpen] = useState(current || week.status === 'in_progress');
  const st = WEEK_STATUS[week.status] || WEEK_STATUS.not_started;
  const doneCount = week.tasks.filter((t) => t.done).length;

  return (
    <div className={`week ${current ? 'current' : ''} ${week.status}`}>
      <div className="week-rail">
        <div className={`week-node ${st.cls}`}>{week.week}</div>
      </div>
      <div className="week-body">
        <div className="week-head" onClick={() => setOpen((o) => !o)}>
          <div>
            <div className="week-title-row">
              <h3>{week.title}</h3>
              {week.light && <span className="chip">Light week</span>}
              {current && <span className="chip current-chip">This week</span>}
            </div>
            <div className="week-dates">{week.dates}</div>
          </div>
          <div className="week-head-right">
            <span className={`badge ${st.cls}`}>{st.label}</span>
            <span className="week-progress">{doneCount}/{week.tasks.length}</span>
            <span className={`caret ${open ? 'up' : ''}`}>▾</span>
          </div>
        </div>

        {open && (
          <div className="week-detail">
            <p className="week-focus">{week.focus}</p>
            <ul className="task-list">
              {week.tasks.map((t) => (
                <li key={t.id}>
                  <label className={`task ${t.done ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      disabled={!isAdmin}
                      onChange={() => onOp({ op: 'timeline.toggleTask', weekId: week.id, taskId: t.id })}
                    />
                    <span>{t.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            {week.clientNeeds && week.clientNeeds.length > 0 && (
              <div className="week-needs">
                <span className="needs-label">From you:</span>
                {week.clientNeeds.map((n, i) => (
                  <span key={i} className="need-pill">{n}</span>
                ))}
              </div>
            )}
            {isAdmin && (
              <div className="week-admin">
                <label>Status</label>
                <select
                  value={week.status}
                  onChange={(e) => onOp({ op: 'timeline.setStatus', weekId: week.id, status: e.target.value })}
                >
                  {Object.keys(WEEK_STATUS).map((k) => (
                    <option key={k} value={k}>{WEEK_STATUS[k].label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action items                                                        */
/* ------------------------------------------------------------------ */

function ActionItems({ data, canEdit, onOp }) {
  const groups = {};
  data.actionItems.forEach((a) => {
    (groups[a.category] = groups[a.category] || []).push(a);
  });
  const provided = data.actionItems.filter((a) => a.status === 'Provided').length;

  return (
    <section className="section">
      <SectionHead
        title="What We Need From You"
        sub={`${provided}/${data.actionItems.length} provided · update the status as you go`}
      />
      {Object.keys(groups).map((cat) => (
        <div key={cat} className="card">
          <h3 className="group-title">{cat}</h3>
          <div className="action-list">
            {groups[cat].map((a) => (
              <div key={a.id} className="action-row">
                <div className="action-main">
                  <span className={`dot ${ACTION_STATUS[a.status] || 'gray'}`} />
                  <div>
                    <div className="action-label">{a.label}</div>
                    <div className="action-detail">{a.detail}</div>
                  </div>
                </div>
                <div className="action-right">
                  <span className="needed-by">{a.neededBy}</span>
                  {canEdit ? (
                    <select
                      className={`status-select ${ACTION_STATUS[a.status] || 'gray'}`}
                      value={a.status}
                      onChange={(e) => onOp({ op: 'actionItem.setStatus', itemId: a.id, status: e.target.value })}
                    >
                      {ACTION_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`badge ${ACTION_STATUS[a.status] || 'gray'}`}>{a.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

function Questions({ data, isAdmin, isClient, onOp }) {
  const [newQ, setNewQ] = useState('');
  const visible = isAdmin ? data.questions : data.questions.filter((q) => !q.hidden);
  const hiddenCount = data.questions.filter((q) => q.hidden).length;
  const sub = isAdmin
    ? `Answer inline or discuss in Chat.${hiddenCount ? ` ${hiddenCount} hidden from the client.` : ''}`
    : 'Answer inline or discuss in Chat. These unblock the build.';
  return (
    <section className="section">
      <SectionHead title="Open Questions & Decisions" sub={sub} />
      <div className="q-list">
        {visible.map((q) => (
          <QuestionCard key={q.id} q={q} isAdmin={isAdmin} isClient={isClient} onOp={onOp} />
        ))}
      </div>
      {isAdmin && (
        <div className="card admin-card">
          <h3>Add a question</h3>
          <div className="stack">
            <textarea
              rows={2}
              placeholder="Ask the client something…"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
            />
            <div className="row-end">
              <button
                className="btn"
                disabled={!newQ.trim()}
                onClick={async () => {
                  if (await onOp({ op: 'question.add', text: newQ.trim() })) setNewQ('');
                }}
              >
                Add question
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function QuestionCard({ q, isAdmin, isClient, onOp }) {
  const [draft, setDraft] = useState(q.answer || '');
  useEffect(() => setDraft(q.answer || ''), [q.answer]);
  const answered = q.status === 'answered';

  return (
    <div className={`q-card ${answered ? 'answered' : ''} ${q.hidden ? 'q-hidden' : ''}`}>
      <div className="q-top">
        <div className="q-badges">
          <span className={`badge ${answered ? 'green' : 'amber'}`}>{answered ? 'Answered' : 'Open'}</span>
          {q.hidden && <span className="chip">Hidden from client</span>}
        </div>
      </div>
      <p className="q-text">{q.text}</p>
      {q.context && <p className="q-context">{q.context}</p>}

      {isClient || isAdmin ? (
        <div className="stack">
          <textarea
            rows={2}
            placeholder={isClient ? 'Type your answer…' : 'Record the answer…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="q-actions">
            {isAdmin && (
              <div className="q-admin-actions">
                <button
                  className="btn-ghost sm"
                  onClick={() => onOp({ op: 'question.setHidden', questionId: q.id, hidden: !q.hidden })}
                >
                  {q.hidden ? 'Show to client' : 'Hide from client'}
                </button>
                <button
                  className="btn-ghost sm danger"
                  onClick={() => {
                    if (window.confirm('Delete this question permanently? This cannot be undone.')) {
                      onOp({ op: 'question.remove', questionId: q.id });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            )}
            <div className="q-submit">
              {answered && <span className="muted-sm">Saved</span>}
              <button
                className="btn"
                disabled={!draft.trim()}
                onClick={() => onOp({ op: 'question.answer', questionId: q.id, answer: draft.trim(), status: 'answered' })}
              >
                {answered ? 'Update answer' : 'Submit answer'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        q.answer && <div className="q-answer"><strong>Answer:</strong> {q.answer}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function Documents({ data, isAdmin, onOp }) {
  return (
    <section className="section">
      <SectionHead
        title="Documents & Accounts"
        sub="Project paperwork and shared references."
      />
      <div className="doc-grid">
        {data.documents.map((d) => (
          <DocCard key={d.id} doc={d} isAdmin={isAdmin} onOp={onOp} />
        ))}
      </div>
    </section>
  );
}

function DocCard({ doc, isAdmin, onOp }) {
  const [edit, setEdit] = useState(false);
  const [url, setUrl] = useState(doc.url || '');
  const [note, setNote] = useState(doc.note || '');
  useEffect(() => {
    setUrl(doc.url || '');
    setNote(doc.note || '');
  }, [doc.url, doc.note]);

  return (
    <div className="doc-card">
      <div className="doc-icon"><Icon name="file" size={20} /></div>
      <div className="doc-body">
        <div className="doc-type">{doc.type}</div>
        <div className="doc-name">{doc.name}</div>
        {!edit && doc.note && <div className="doc-note">{doc.note}</div>}
        {edit ? (
          <div className="stack">
            <input placeholder="Shareable link (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row-end">
              <button className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
              <button
                className="btn"
                onClick={async () => {
                  if (await onOp({ op: 'document.update', docId: doc.id, url, note })) setEdit(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="doc-actions">
            {doc.url ? (
              <a className="doc-link" href={doc.url} target="_blank" rel="noreferrer">
                Open <Icon name="external" size={13} />
              </a>
            ) : (
              <span className="doc-pending">Link not added yet</span>
            )}
            {isAdmin && (
              <button className="btn-ghost sm" onClick={() => setEdit(true)}>
                {doc.url ? 'Edit' : 'Add link'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

function Accounts({ data, isAdmin, onOp }) {
  const accounts = data.accounts || [];
  const visible = isAdmin ? accounts : accounts.filter((a) => !a.adminOnly);

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [url, setUrl] = useState('');
  const [details, setDetails] = useState('');
  const [adminOnly, setAdminOnly] = useState(false);

  function resetForm() {
    setLabel(''); setCategory(''); setUrl(''); setDetails(''); setAdminOnly(false); setAdding(false);
  }

  return (
    <section className="section">
      <SectionHead
        title="Accounts"
        sub="Shared account references for the project."
        action={
          isAdmin && (
            <button className="btn" onClick={() => setAdding((a) => !a)}>
              {adding ? 'Close' : '+ Add account'}
            </button>
          )
        }
      />

      <div className="note">
        <span className="note-icon"><Icon name="key" size={15} /></span>
        <span>Keep this to identifiers, URLs, account IDs, and status. <strong>Don’t store passwords or secret keys here</strong> — share credentials through a password manager.</span>
      </div>

      {isAdmin && adding && (
        <div className="card admin-card">
          <div className="stack">
            <input placeholder="Label (e.g. Stripe Platform)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input placeholder="Category (e.g. Payments, Website, Hosting)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input placeholder="URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <textarea rows={4} placeholder="Details — emails, account IDs, usernames, status (no passwords)" value={details} onChange={(e) => setDetails(e.target.value)} />
            <label className="check-row">
              <input type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
              Visible to admin only (hide from the client)
            </label>
            <div className="row-end">
              <button className="btn-ghost" onClick={resetForm}>Cancel</button>
              <button
                className="btn"
                disabled={!label.trim()}
                onClick={async () => {
                  if (await onOp({ op: 'account.add', label: label.trim(), category: category.trim(), url: url.trim(), details, adminOnly })) resetForm();
                }}
              >
                Add account
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="acct-grid">
        {visible.map((a) => (
          <AccountCard key={a.id} account={a} isAdmin={isAdmin} onOp={onOp} />
        ))}
      </div>
      {visible.length === 0 && <p className="muted">No accounts yet.</p>}
    </section>
  );
}

function AccountCard({ account, isAdmin, onOp }) {
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(account.label);
  const [category, setCategory] = useState(account.category || '');
  const [url, setUrl] = useState(account.url || '');
  const [details, setDetails] = useState(account.details || '');
  const [adminOnly, setAdminOnly] = useState(!!account.adminOnly);
  useEffect(() => {
    setLabel(account.label);
    setCategory(account.category || '');
    setUrl(account.url || '');
    setDetails(account.details || '');
    setAdminOnly(!!account.adminOnly);
  }, [account.label, account.category, account.url, account.details, account.adminOnly]);

  if (edit) {
    return (
      <div className="acct-card editing">
        <div className="stack">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" />
          <textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (no passwords)" />
          <label className="check-row">
            <input type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
            Visible to admin only
          </label>
          <div className="row-between">
            <button className="btn-ghost danger" onClick={() => onOp({ op: 'account.remove', accountId: account.id })}>Delete</button>
            <div className="row-end">
              <button className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
              <button
                className="btn"
                onClick={async () => {
                  if (await onOp({ op: 'account.update', accountId: account.id, label, category, url, details, adminOnly })) setEdit(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="acct-card">
      <div className="acct-head">
        <div className="acct-title">
          <span className="acct-name">{account.label}</span>
          {account.category && <span className="chip">{account.category}</span>}
          {account.adminOnly && <span className="chip lock-chip">Admin only</span>}
        </div>
        {isAdmin && <button className="btn-ghost sm" onClick={() => setEdit(true)}>Edit</button>}
      </div>
      {account.details && <pre className="acct-details">{account.details}</pre>}
      {account.url && (
        <a className="doc-link" href={account.url} target="_blank" rel="noreferrer">
          Open <Icon name="external" size={13} />
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function Chat({ messages, me, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText('');
    await onSend(body);
    setSending(false);
  }

  return (
    <section className="section chat-section">
      <SectionHead title="Chat" sub={`Direct line between ${me.name} and the team`} />
      <div className="chat-box">
        <div className="chat-scroll">
          {messages.length === 0 && (
            <div className="chat-empty">No messages yet. Say hello 👋</div>
          )}
          {messages.map((m) => {
            const mine = m.role === me.role;
            return (
              <div key={m.id} className={`bubble-row ${mine ? 'mine' : ''}`}>
                {!mine && <div className="bubble-avatar">{(m.author || '?').slice(0, 1).toUpperCase()}</div>}
                <div className="bubble">
                  {!mine && <div className="bubble-author">{m.author}</div>}
                  <div className="bubble-body">{m.body}</div>
                  <div className="bubble-time">{fmtTime(m.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form className="chat-input" onSubmit={submit}>
          <input
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={!text.trim() || sending}>Send</button>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Quick links                                                         */
/* ------------------------------------------------------------------ */

function Links({ data, isAdmin, onOp }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');

  return (
    <section className="section">
      <SectionHead
        title="Quick Links"
        sub="Jump to the tools we use together."
        action={
          isAdmin && (
            <button className="btn" onClick={() => setAdding((a) => !a)}>
              {adding ? 'Close' : '+ Add link'}
            </button>
          )
        }
      />

      {isAdmin && adding && (
        <div className="card admin-card">
          <div className="form-grid">
            <input placeholder="Label (e.g. GitHub Repo)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input placeholder="URL (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input placeholder="Short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="row-end">
            <button
              className="btn"
              disabled={!label.trim()}
              onClick={async () => {
                if (await onOp({ op: 'link.add', label: label.trim(), url: url.trim(), note: note.trim() })) {
                  setLabel(''); setUrl(''); setNote(''); setAdding(false);
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="link-grid">
        {data.links.map((l) => (
          <LinkCard key={l.id} link={l} isAdmin={isAdmin} onOp={onOp} />
        ))}
      </div>
    </section>
  );
}

function LinkCard({ link, isAdmin, onOp }) {
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url || '');
  const [note, setNote] = useState(link.note || '');
  useEffect(() => {
    setLabel(link.label);
    setUrl(link.url || '');
    setNote(link.note || '');
  }, [link.label, link.url, link.note]);

  if (edit) {
    return (
      <div className="link-card editing">
        <div className="stack">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
          <div className="row-between">
            <button className="btn-ghost danger" onClick={() => onOp({ op: 'link.remove', linkId: link.id })}>Delete</button>
            <div className="row-end">
              <button className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button>
              <button
                className="btn"
                onClick={async () => {
                  if (await onOp({ op: 'link.update', linkId: link.id, label, url, note })) setEdit(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Inner = (
    <>
      <div className="link-mark">{(link.label || '?').slice(0, 1).toUpperCase()}</div>
      <div className="link-meta">
        <div className="link-label">{link.label}</div>
        {link.note && <div className="link-note">{link.note}</div>}
        {!link.url && <div className="link-pending">No URL set</div>}
      </div>
      {link.url && <span className="link-arrow"><Icon name="external" size={15} /></span>}
    </>
  );

  return (
    <div className="link-card">
      {link.url ? (
        <a className="link-hit" href={link.url} target="_blank" rel="noreferrer">{Inner}</a>
      ) : (
        <div className="link-hit disabled">{Inner}</div>
      )}
      {isAdmin && (
        <button className="link-edit" onClick={() => setEdit(true)} title="Edit">Edit</button>
      )}
    </div>
  );
}
