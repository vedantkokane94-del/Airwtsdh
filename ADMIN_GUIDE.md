# AI Ready Quiz Portal — Administrator Guide
**Target Audience:** TSDH Technical Team & Faculty Coordinators, SVIT Nashik  
**Purpose:** Managing live quiz sessions for 100–300 students during workshops

---

## 🔑 Master Admin Credentials
- **Official Admin Login:** `technicalteamsvit@gmail.com`
- **Official Admin Password:** `tech@20262908`
- **Workshop Access Code:** `TSDH2026`

---

## 1. Pre-Workshop Setup

### A. Pre-Loading Student Whitelist
1. Log in to the portal using your admin email `technicalteamsvit@gmail.com` and password `tech@20262908`.
2. Navigate to **Admin Panel** -> **Students & Whitelist** tab.
3. Paste student Roll Numbers / PRNs from your registration Excel sheet into the **CSV Whitelist Pre-Loader** box (one roll number per line).
4. Click **Add to Whitelist**.
> 💡 *Students whose roll numbers match the whitelist will be instantly auto-approved upon registration without waiting in an approval queue!*

### B. Workshop Access Code
- Default workshop code: **`TSDH2026`**
- Share this code on the projector or seminar hall screen. Students who enter this code during registration or from their dashboard unlock all modules instantly.

### C. Review & Customize Quizzes
1. Go to the **Quizzes** tab.
2. The 5 pre-loaded modules are ready:
   - *AI Quick Challenge* (8 min sprint)
   - *1. AI Basics & ML Foundations* (15 min)
   - *2. Prompt Engineering & Generative AI* (15 min)
   - *3. AI for Study & Career Acceleration* (15 min)
   - *4. Responsible AI, Ethics & Safety* (12 min)
3. Toggle modules **Active** or **Disabled** to control which quiz students can take at any stage of the schedule.

---

## 2. During the Workshop: Live Operations

### A. Live Student Monitor
- Navigate to the **Live Monitor** tab.
- View real-time cards of all students currently taking the quiz:
  - Student Name & Roll Number
  - Department & Year
  - Questions answered so far
  - Live proctoring warning counter (0 to 3)
- If a student's session crashes or they face a hardware failure, click **Force Submit** to gracefully terminate the stuck session, then go to **Students** tab and click **Reset Attempts** to allow a fresh retake.

### B. Live Proctoring Audit Log
- The audit table logs every infraction in real time:
  - `fullscreen_exit`: Student minimized or left fullscreen.
  - `tab_switch`: Student opened another browser tab or app.
  - `shortcut_attempt`: Student pressed Ctrl+C/V/U/P or F12 DevTools.
  - `camera_snapshot`: Periodic webcam verification frames.
- Students receive automated warnings at infractions 1 and 2. At infraction 3, the exam auto-submits.

### C. Broadcasting Live Announcements
1. Go to **Cloud & Announcements** tab.
2. Enter message (e.g., *"5 minutes remaining for AI Basics module! Ensure you submit before time expires."*).
3. Click **Broadcast**. The banner appears instantly at the top of every student's screen without page refresh.

---

## 3. Post-Workshop: Results & Certificates

### A. Leaderboard Management
1. Click **Leaderboard** in the top navigation.
2. Select the quiz module from the dropdown.
3. Review the Top 3 podium winners and complete ranked list.
4. Click the **CSV** export button to download an official spreadsheet with:
   - Rank, Student Name, Roll No, Department, Year, Final Score, Time Taken, Violations.

### B. Authentic Certificate Verification
- Students can download their official PDF or PNG certificate featuring the authentic TSDH SVIT Nashik design with signatures of:
  - **Chaitanya Pagar** (Head of Technical Growth, HTG, T.S.D.H., SVIT Nashik)
  - **Vedant Kokane** (Founder & CTO, T.S.D.H., SVIT Nashik)
  - **Abhay Donde** (Organizer, CRO, T.S.D.H., SVIT Nashik)
- Each certificate features a unique ID (`SVIT-AIRQ-2026-XXXX`).
- To verify a student's certificate, match the ID against your exported CSV record.
