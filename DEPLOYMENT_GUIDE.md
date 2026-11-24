# AI Ready Quiz Portal — Deployment Guide
**Institution:** T.S.D.H. (Technical Skill Development Hub), SVIT Nashik  
**Target Environment:** 100–300 concurrent students on mobile/desktop browsers  
**Hosting Tiers:** 100% Free Tier on Vercel, Netlify, or Firebase Hosting + Supabase

---

## 1. Architecture Overview & Backend Choice

### Why Supabase?
1. **Relational Data Integrity:** Student profiles, attempts, proctoring logs, and questions have strong relational links that benefit from PostgreSQL constraints and cascade updates.
2. **True Answer Security via PostgreSQL RLS & Stored Procedures:** With Row Level Security, the `questions` table can be restricted so that correct answers and explanations are **never returned to the browser** during an active exam. Evaluation runs server-side via `submit_quiz_attempt()`.
3. **Real-time Subscriptions:** Native PostgreSQL Realtime handles live leaderboards, active student monitoring, and announcement broadcasts with zero socket maintenance.
4. **Zero-Cost Free Tier:** Supabase offers up to 500MB database storage, 50,000 monthly active users, and 500K Edge Function invocations for free—more than ample for university workshops.

---

## 2. Supabase Backend Setup (5 Minutes)

### Step 1: Create a Free Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, select an organization, name it `tsdh-svit-ai-quiz`, and choose a strong Database Password.
3. Select the region closest to your students (e.g., `South Asia (Mumbai)` for Nashik/Maharashtra).

### Step 2: Execute Database Migrations
1. Open your project dashboard and click on **SQL Editor** in the left sidebar.
2. Click **New query**, open `supabase/schema.sql`, paste the contents, and click **Run**.
3. Open a second query tab, paste the contents of `supabase/rls_policies.sql`, and click **Run**.
4. Open a third query tab, paste `supabase/stored_procedures.sql`, and click **Run**.
5. Open a fourth query tab, paste `supabase/seed.sql` to preload the 5 workshop quizzes and questions, and click **Run**.

### Step 3: Copy API Credentials
1. Go to **Project Settings** (gear icon) -> **API**.
2. Note your **Project URL** (e.g., `https://xyzcompany.supabase.co`).
3. Note your **Project API Anon Key** (`anon` `public`).

---

## 3. Frontend Deployment Options

### Option A: Deploy on Vercel (Recommended)
1. Push this project folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: initial TSDH SVIT AI Ready Quiz Portal"
   git branch -M main
   git remote add origin https://github.com/your-username/ai-quiz-portal.git
   git push -u origin main
   ```
2. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
3. Click **Add New...** -> **Project** -> Select your `ai-quiz-portal` repository.
4. Framework Preset: **Vite** (or Other).
5. Build Command: `npm run build` (or leave default).
6. Output Directory: `dist` (or leave root for pure SPA).
7. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
   - `VITE_WORKSHOP_CODE` = `TSDH2026`
8. Click **Deploy**. Your portal will be live on an HTTPS domain (e.g., `https://ai-quiz-portal.vercel.app`) in under 60 seconds!

---

### Option B: Deploy on Netlify
1. Go to [https://www.netlify.com](https://www.netlify.com) and log in.
2. Click **Add new site** -> **Import an existing project**.
3. Select GitHub and pick the repository.
4. Set Build command: `npm run build` and Publish directory: `dist`.
5. Under **Site configuration** -> **Environment variables**, set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site**.

---

### Option C: Instant Zero-Build Static Hosting
Because the portal includes self-contained standalone execution (CDN Tailwind, Supabase JS, jsPDF, Lucide), you can also:
1. Host directly from **GitHub Pages** by enabling Pages on `main` branch.
2. Drag and drop the folder directly into **Netlify Drop** ([app.netlify.com/drop](https://app.netlify.com/drop)).
3. Configure the Supabase URL and Anon Key directly inside the **Admin Portal -> Cloud & Announcements** tab on the running site! It is automatically stored securely in the browser's persistent configuration.

---

## 4. Creating the First Administrator Account

### Via Supabase Dashboard (Recommended)
1. In Supabase Dashboard, go to **Authentication** -> **Users** -> **Add user** -> **Create user**.
2. Enter email: `admin@svit.ac.in` and password: `your-secure-admin-password`.
3. Check "Auto Confirm User".
4. Go to **Table Editor** -> `profiles`, find the newly created user record, and set:
   - `role` = `admin`
   - `is_approved` = `true`
   - `full_name` = `TSDH Admin Coordinator`
   - `roll_number` = `ADMIN001`

### Via Built-In Seed / Local Fallback
In default local/testing mode, the admin account is already pre-configured:
- **Email:** `admin@svit.ac.in`
- **Password:** `admin123`
- Click the **"🛡️ TSDH (Admin)"** demo login button on the portal login screen.

---

## 5. Verification Checklist Before the Workshop

- [ ] HTTPS is active (required for camera and fullscreen APIs).
- [ ] Admin can log in and view the Live Monitor.
- [ ] Whitelist roll numbers are uploaded or `TSDH2026` access code is distributed.
- [ ] Test quiz attempt completes and generates verifiable PDF certificate.
- [ ] Leaderboard live sorting verified with tie-breaking.
