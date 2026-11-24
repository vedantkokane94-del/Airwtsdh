# AI Ready Quiz Portal 🚀🤖
### Technical Skill Development Hub (T.S.D.H.) • SVIT Nashik
*(Sir Visvesvaraya Institute of Technology, Chincholi, Nashik)*

A modern, mobile-first, proctored assessment portal engineered for live workshops of 100–300 engineering students. Features server-evaluated scoring, lightweight browser proctoring, dynamic PDF certificates with verification QR codes, live tie-breaking leaderboards, and instant CSV reporting.

---

## 🎨 Brand Design & UI Identity
- **Primary Indigo / Purple:** `#4f2fd8`
- **Secondary Blue:** `#2f6df0`
- **Gold Accent:** `#d9a63a` / `#f5d57f`
- **Dark Theme Surface:** `#0b0f19` / `#131b2e` / `#1a233b`
- **Typography:** Google Font **Poppins** (Weights: 300, 400, 500, 600, 700, 800)
- **Accessibility & Devices:** Mobile-first layout optimized for smartphone quiz-taking, touch-friendly option cards, full keyboard navigation (A/B/C/D), responsive drawers, and light/dark mode support.

---

## 🛠️ Tech Stack & Architectural Decisions

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React / Modern ES Modules + Tailwind CSS + Lucide Icons | Responsive mobile UI, sub-second render cycles, native PWA offline capability, zero-build execution fallback. |
| **Backend & Database** | **Supabase** (PostgreSQL 15 + Row Level Security + Realtime) | **Why Chosen over Firebase:** Relational data structure matches academic cohorts; PostgreSQL RLS ensures students can **never extract answers** via Chrome DevTools; Stored Procedures evaluate attempts server-side to prevent client clock tampering; 100% free tier. |
| **Proctoring Engine** | Browser APIs (Fullscreen, VisibilityChange, MediaDevices, Canvas) | Optimized hybrid approach that doesn't overheat budget mobile phones while strictly enforcing window locks, tab switches, and camera audits. |
| **Certificates** | jsPDF + Dynamic QR Code Generator | Instant high-resolution vector PDF generation on the client with verifiable cryptographic certificate hashes and one-click WhatsApp sharing. |
| **Hosting** | Vercel / Netlify / Firebase Hosting | Free global CDN with instant HTTPS (mandatory for Camera and Fullscreen APIs). |

---

## 📁 Project Folder Structure

```
ai-quiz-portal/
├── index.html                    # Main mobile-first PWA entry point
├── manifest.json                 # Web App Manifest for mobile installation
├── sw.js                         # Service Worker for offline fault-tolerance
├── package.json                  # Dependencies and build scripts
├── vite.config.js                # Vite build configuration
├── tailwind.config.js            # Tailwind brand theme & color definitions
├── .env.example                  # Environment variable blueprint
│
├── assets/                       # PWA application icons
│   ├── icon-192.png
│   └── icon-512.png
│
├── src/                          # Application source code
│   ├── app.js                    # Main application router and UI orchestrator
│   ├── config/
│   │   ├── constants.js          # Brand colors, departments, years, proctoring rules
│   │   └── supabase.js           # Supabase client bridge & credentials manager
│   ├── data/
│   │   ├── seedQuizzes.js        # The 5 curated workshop question banks (65 questions)
│   │   └── mockDb.js             # High-performance reactive local storage engine
│   └── services/
│       ├── authService.js        # Student/Admin registration, login, and session checks
│       ├── quizService.js        # Question masking, randomization, draft autosave, scoring
│       ├── proctorService.js     # Fullscreen lock, tab switch tracking, camera snapshots
│       ├── leaderboardService.js # Live sorting (Score DESC, Time ASC) & CSV exports
│       └── certificateService.js # jsPDF certificate generation & WhatsApp sharing
│
├── supabase/                     # PostgreSQL database & security scripts
│   ├── schema.sql                # Relational schema (profiles, quizzes, questions, attempts)
│   ├── rls_policies.sql          # Row-Level Security policies restricting answer leaks
│   ├── stored_procedures.sql     # Server-side evaluation & question masking RPCs
│   └── seed.sql                  # Database seed script for workshops
│
└── docs/                         # Guides and manuals
    ├── DEPLOYMENT_GUIDE.md       # Step-by-step setup on Vercel, Netlify & Supabase
    ├── ADMIN_GUIDE.md            # 1-page operational manual for TSDH organizers
    └── STUDENT_GUIDE.md          # 1-page student instruction sheet
```

---

## 🔐 Security & Anti-Cheat Features

1. **Answer Masking at DB Level:**
   - When a student requests quiz questions, `correct_option` and `explanation` are **stripped on the server** (or via `get_quiz_questions_for_student`). Inspecting the Network tab or React state reveals zero answers.
2. **Server-Side Evaluation & Scoring:**
   - Scores are computed either inside PostgreSQL Stored Procedure `submit_quiz_attempt` or server-side memory. Negative marking (`-0.25` marks) is calculated automatically; unanswered questions receive zero penalties.
3. **Server Clock Validation:**
   - Elapsed time is measured using server timestamps `(NOW() - start_time)`, blocking local device clock manipulation.
4. **Browser Proctoring Suite:**
   - **Mandatory Fullscreen:** Prompted before start; exits trigger warning popups.
   - **Tab Switch & Focus Detection:** Window blur and `visibilitychange` events log violations.
   - **Keyboard & Mouse Lockdown:** Right-click context menu, text selection, copy (`Ctrl+C`), paste (`Ctrl+V`), DevTools (`F12`), and screenshot (`PrintScreen`) are blocked.
   - **Periodic Camera Snapshots:** Low-bandwidth thumbnail snapshots are captured every 35s to confirm student presence.
   - **Automated Disqualification/Lock:** Configurable violation limit (default 3 warnings before auto-submission).
5. **Session Lock:** Single active session tracking detects concurrent logins across devices.
6. **Data Retention Policy:** Proctoring images and logs are configured for auto-purge after 7 days.

---

## 📚 Pre-Populated Workshop Question Banks

The portal comes pre-loaded with **65 academic-grade questions** across 5 distinct modules:

1. **AI Quick Challenge** (10 questions, 8 mins) — Fast-paced sprint on GPTs, Attention, RAG, and Turing Test.
2. **1. AI Basics & Machine Learning Foundations** (15 questions, 15 mins) — Supervised vs Unsupervised, Bias-Variance, Loss functions, Backpropagation, CNNs, and Adam optimizer.
3. **2. Prompt Engineering & Generative AI** (15 questions, 15 mins) — Zero-shot, Few-shot, Chain-of-Thought, System Prompts, Vector DBs, Top-P, and ReAct agents.
4. **3. AI for Study & Career Acceleration** (15 questions, 15 mins) — AI coding assistants, code review, unit tests, ATS parsing, and Socratic learning workflows.
5. **4. Responsible AI, Ethics & Safety** (10 questions, 12 mins) — Algorithmic bias, RLHF, Deepfakes, DPDP Act/GDPR, EU AI Act, and Model Collapse.

---

## ⚡ Quick Start / Local Testing

The portal can be run immediately in any browser with **zero dependencies** or via standard Vite/Node.js:

### Option 1: Direct Run (No build required)
1. Double-click `index.html` or open it in Google Chrome / Edge / Safari.
2. You can test both roles using the pre-seeded demo accounts:
   - **Student Login:** `SVIT2024CS001` / `student123` (Rahul Sharma)
   - **Admin Login:** `admin@svit.ac.in` / `admin123` (TSDH Coordinator)
   - **Workshop Access Code:** `TSDH2026`

### Option 2: Run with Vite Dev Server (If Node.js is installed)
```bash
npm install
npm run dev
```

---

## 🚀 Cloud Deployment Guide

See [docs/DEPLOYMENT_GUIDE.md](file:///c:/Users/MCL/Downloads/ai%20quiz/docs/DEPLOYMENT_GUIDE.md) for full instructions:
- **Deploying to Vercel:** Push to GitHub -> Connect repository in Vercel -> Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` -> Deploy!
- **Deploying to Netlify:** Drag & drop folder to Netlify Drop, or connect via Git.
- **Supabase Cloud Setup:** Run the 4 SQL scripts in `supabase/` (`schema.sql`, `rls_policies.sql`, `stored_procedures.sql`, `seed.sql`).

---

## 👥 User Guides
- [Admin Guide (1-Page Manual)](file:///c:/Users/MCL/Downloads/ai%20quiz/docs/ADMIN_GUIDE.md)
- [Student Guide (1-Page Reference)](file:///c:/Users/MCL/Downloads/ai%20quiz/docs/STUDENT_GUIDE.md)

---

## 🏛️ Credits & Institutional Information
- **Institution:** Sir Visvesvaraya Institute of Technology (SVIT), Chincholi, Nashik — 422102
- **Hub:** T.S.D.H. (Technical Skill Development Hub)
- **Developed for:** Live Hands-on AI Workshops & Technical Assessments
