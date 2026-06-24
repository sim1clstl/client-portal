# Project Portal — Multi-Merchant Payment Platform

A private client portal for the Payment Platform V1 build. One place for **you (Simone)** and **the client (Michael)** to track the timeline, see what's needed, answer open questions, share documents and links, and chat.

- **Framework:** Next.js 14 (App Router) — deploys free on Vercel
- **Database:** Supabase (free tier) — Postgres for chat + editable content
- **Auth:** two access codes (admin + client). No accounts to create.

---

## What's inside

| Section | What it does |
|---|---|
| **Overview** | Project snapshot, % progress ring, current week, payment milestones |
| **Timeline** | Interactive 12-week plan (Jun 29 → Sep 20). You toggle status + tasks; the client watches it move |
| **What We Need** | The kickoff checklist — client updates each item's status |
| **Open Questions** | Decisions that unblock the build; the client answers inline |
| **Documents** | Proposal, contract, invoice, etc. — paste shareable links |
| **Chat** | Direct messaging between you and the client |
| **Quick Links** | GitHub / Jira / Slack / Stripe — fully editable in the UI |

Admin (you) can edit everything. The client can update their action items, answer questions, and chat.

---

## Setup (about 10 minutes)

### 1. Create the database (Supabase)
1. Go to **https://supabase.com** → sign up (free) → **New project**.
2. Wait for it to provision, then open **SQL Editor → New query**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **`service_role` secret** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server only)

### 2. Run locally (optional, to preview)
```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```
Open http://localhost:3000 and log in with your `ADMIN_CODE`.

### 3. Deploy to Vercel
1. Push this folder to a **GitHub** repo.
2. Go to **https://vercel.com** → **Add New → Project** → import the repo.
3. Under **Environment Variables**, add all of these:

| Name | Value |
|---|---|
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role secret |
| `ADMIN_CODE` | a strong code only you know |
| `CLIENT_CODE` | a simpler code you'll give the client |
| `SESSION_SECRET` | any long random string |
| `ADMIN_NAME` | e.g. `Simone` |
| `CLIENT_NAME` | e.g. `Michael` |

4. Click **Deploy**. You'll get a URL like `https://your-portal.vercel.app`.
5. Send the client the URL + the **client code**. Keep the admin code to yourself.

> The first time the portal loads, it auto-fills the database with the 12-week
> timeline, checklist, questions, documents, links, and payment milestones.

---

## Editing content

Almost everything is editable live from the admin view — timeline status, tasks,
announcement, questions, document links, quick links, and payment milestones.
To change the **starting defaults**, edit [`lib/seed.js`](lib/seed.js) *before*
the first load (or clear the `app_state` row in Supabase to re-seed).

## Notes & next steps
- **Documents** show links you paste in — host the PDFs/DOCX on Google Drive,
  Dropbox, or Zoho and add the share URL. (File upload via Supabase Storage is an
  easy future upgrade.)
- Chat updates by polling every ~6s (no extra setup, stays well within free tiers).
- To re-seed from scratch: delete the row in the `app_state` table and reload.

---
Built for the Custom Multi-Merchant Payment Platform V1 engagement.
