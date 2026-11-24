// ============================================================================
// AI ARENA – High-Fidelity Reactive Local Database Engine
// Configured for AI Ready Workshop 2026 (T.S.D.H., SVIT Nashik)
// Strict Whitelist Authentication (134 Registered Students + Master Admin)
// ============================================================================

import { SEED_QUIZZES } from './seedQuizzes.js';
import { INITIAL_STUDENTS_WHITELIST } from './studentsWhitelist.js';
import { DEFAULT_WORKSHOP_CODE } from '../config/constants.js';

const DB_VERSION_KEY = 'ai_arena_db_v7_secure_admin';

async function computeSha256(str) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Basic fallback hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

const STORAGE_KEYS = {
  USERS: 'tsdh_quiz_users',
  CURRENT_USER: 'tsdh_quiz_current_user',
  QUIZZES: 'tsdh_quiz_quizzes',
  ATTEMPTS: 'tsdh_quiz_attempts',
  WHITELIST: 'tsdh_quiz_whitelist',
  PROCTORING_LOGS: 'tsdh_quiz_proctoring_logs',
  ANNOUNCEMENTS: 'tsdh_quiz_announcements',
  SETTINGS: 'tsdh_quiz_settings'
};

class MockDatabase {
  constructor() {
    this.init();
  }

  init() {
    const currentVer = localStorage.getItem(DB_VERSION_KEY);
    if (!currentVer) {
      // Purge old versions to ensure 134 registered students & clean state
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
      localStorage.removeItem(STORAGE_KEYS.PROCTORING_LOGS);
      localStorage.removeItem(STORAGE_KEYS.QUIZZES);
      localStorage.removeItem(STORAGE_KEYS.WHITELIST);
      localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
      localStorage.setItem(DB_VERSION_KEY, '6.0.0');
    }

    // 1. Quizzes
    if (!localStorage.getItem(STORAGE_KEYS.QUIZZES)) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(SEED_QUIZZES));
    }

    // 2. Whitelist
    if (!localStorage.getItem(STORAGE_KEYS.WHITELIST)) {
      localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(INITIAL_STUDENTS_WHITELIST));
    }

    // 3. Seed Users: Master Admin + 134 Registered Students
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      const defaultUsers = [];

      // Master Admin
      defaultUsers.push({
        id: "usr-admin-master",
        email: "technicalteamsvit@gmail.com",
        password: "tech@20262908",
        full_name: "Technical Team TSDH",
        display_name: "Technical Team TSDH",
        roll_number: "ADMIN-TSDH",
        department: "Technical Skill Development Hub",
        college_name: "SVIT Nashik",
        academic_year: "Faculty / Organizers",
        role: "admin",
        is_approved: true,
        is_blocked: false,
        created_at: new Date().toISOString()
      });

      // 134 Registered Students from Whitelist
      INITIAL_STUDENTS_WHITELIST.forEach((s) => {
        defaultUsers.push({
          id: `usr-${s.roll_number.toLowerCase()}`,
          sr: s.sr,
          roll_number: s.roll_number,
          access_code: s.access_code,
          candidate_name: s.candidate_name,
          display_name: s.display_name || s.candidate_name,
          full_name: s.candidate_name,
          college_name: s.college_name,
          department: s.department,
          academic_year: s.academic_year,
          role: "student",
          is_approved: true,
          is_blocked: false,
          failed_attempts: 0,
          locked_until: null,
          name_confirmed: false,
          active_session_id: null,
          created_at: new Date().toISOString()
        });
      });

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    // 4. Attempts (Zero dummy submissions)
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify([]));
    }

    // 5. Official Announcement
    if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) {
      const defaultAnnouncements = [
        {
          id: "anc-1",
          message: "Welcome to AI ARENA – AI Ready Workshop 2026! Login with your Portal Roll No & Access Code sent by T.S.D.H.",
          priority: "urgent",
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(defaultAnnouncements));
    }

    // 6. Proctoring logs
    if (!localStorage.getItem(STORAGE_KEYS.PROCTORING_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.PROCTORING_LOGS, JSON.stringify([]));
    }
  }

  // Storage Get/Set helpers
  _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  }

  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Users
  getUsers() {
    return this._get(STORAGE_KEYS.USERS);
  }

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // Single Active Session Verification
  validateActiveSession(userId, sessionId) {
    if (!userId || !sessionId) return false;
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    if (user.role === 'admin') return true; // Admins can manage from multiple tabs if needed
    return user.active_session_id === sessionId;
  }

  // Whitelist Student Login
  loginStudent(rollNumber, accessCode) {
    const normRoll = (rollNumber || '').trim().toUpperCase();
    const normCode = (accessCode || '').trim().toUpperCase();

    if (!normRoll || !normCode) {
      throw new Error("Please enter both your Roll Number and Access Code.");
    }

    const users = this.getUsers();
    const student = users.find(u => u.role === 'student' && u.roll_number.toUpperCase() === normRoll);

    // Exact required message for unlisted users
    if (!student) {
      throw new Error("You are not registered for AI Ready Workshop 2026.");
    }

    if (student.is_blocked) {
      throw new Error("Your account has been restricted by the admin. Please contact T.S.D.H. SVIT coordinators.");
    }

    // Check Lockout Status
    const now = Date.now();
    if (student.locked_until && now < student.locked_until) {
      const remainingMinutes = Math.max(1, Math.ceil((student.locked_until - now) / 60000));
      throw new Error(`Account locked due to 5 failed attempts. Please try again in ${remainingMinutes} minute(s) or contact T.S.D.H. admin.`);
    }

    // Auto-reset lock if lockout duration has passed
    if (student.locked_until && now >= student.locked_until) {
      student.locked_until = null;
      student.failed_attempts = 0;
    }

    // Verify Access Code
    const studentActualCode = (student.access_code || '').trim().toUpperCase();
    if (studentActualCode !== normCode) {
      student.failed_attempts = (student.failed_attempts || 0) + 1;

      if (student.failed_attempts >= 5) {
        student.locked_until = now + (10 * 60 * 1000); // 10 minutes lockout
        
        // Notify admin via security proctoring log
        this.logProctoringViolation({
          type: 'SECURITY_LOCKOUT',
          severity: 'critical',
          user_id: student.id,
          roll_number: student.roll_number,
          student_name: student.candidate_name,
          details: `Account ${student.roll_number} locked for 10 minutes following 5 consecutive incorrect access code attempts.`
        });

        this._set(STORAGE_KEYS.USERS, users);
        throw new Error("Account locked for 10 minutes due to 5 failed attempts. T.S.D.H. admin has been notified.");
      }

      this._set(STORAGE_KEYS.USERS, users);
      const remaining = 5 - student.failed_attempts;
      throw new Error(`Invalid Access Code. Please check the code sent to you by T.S.D.H. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`);
    }

    // SUCCESSFUL AUTHENTICATION
    student.failed_attempts = 0;
    student.locked_until = null;

    // Generate fresh session ID to enforce single active session (invalidates previous sessions)
    const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    student.active_session_id = newSessionId;

    this._set(STORAGE_KEYS.USERS, users);
    this.setCurrentUser(student);

    try {
      sessionStorage.setItem('ai_arena_session_id', newSessionId);
    } catch {}

    return { user: student, sessionId: newSessionId };
  }

  // Admin Login (Protected by SHA-256 Hash Matching & 15-min Brute Force Lockout)
  async loginAdmin(email, password) {
    const normEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!normEmail || !cleanPass) {
      throw new Error("Please enter both administrator email and password.");
    }

    // Brute-force lockout check for admin console
    const now = Date.now();
    const adminLock = parseInt(localStorage.getItem('admin_login_locked_until') || '0', 10);
    if (adminLock && now < adminLock) {
      const remainingMinutes = Math.max(1, Math.ceil((adminLock - now) / 60000));
      throw new Error(`Admin console temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`);
    }

    const emailHash = await computeSha256(normEmail);
    const passHash = await computeSha256(cleanPass);

    // Cryptographic hashes for authorized master credentials
    const VALID_EMAIL_HASH = '04a471f55f76bf65c9c8360fea89a07e96cd65e1873e69760104bad59d6ddd64';
    const VALID_PASS_HASH = '231539a980500b746923668c4dfe2a6483445f4e4622434d27a8ca6225da4d7a';

    if (emailHash === VALID_EMAIL_HASH && passHash === VALID_PASS_HASH) {
      localStorage.removeItem('admin_failed_attempts');
      localStorage.removeItem('admin_login_locked_until');

      const users = this.getUsers();
      let admin = users.find(u => u.role === 'admin');
      if (!admin) {
        admin = {
          id: "usr-admin-master",
          email: normEmail,
          full_name: "Technical Team TSDH",
          display_name: "Technical Team TSDH",
          roll_number: "ADMIN-TSDH",
          department: "Technical Skill Development Hub",
          college_name: "SVIT Nashik",
          academic_year: "Faculty / Organizers",
          role: "admin",
          is_approved: true,
          is_blocked: false,
          created_at: new Date().toISOString()
        };
        users.unshift(admin);
        this._set(STORAGE_KEYS.USERS, users);
      }

      const sessionId = 'admin_sess_' + Date.now();
      admin.active_session_id = sessionId;
      this._set(STORAGE_KEYS.USERS, users);
      this.setCurrentUser(admin);

      try {
        sessionStorage.setItem('ai_arena_session_id', sessionId);
      } catch {}

      return admin;
    }

    // Track failed admin login attempts
    let failed = parseInt(localStorage.getItem('admin_failed_attempts') || '0', 10) + 1;
    localStorage.setItem('admin_failed_attempts', String(failed));
    if (failed >= 5) {
      localStorage.setItem('admin_login_locked_until', String(now + (15 * 60 * 1000))); // 15 min lock
      this.logProctoringViolation({
        type: 'ADMIN_BRUTE_FORCE_LOCKOUT',
        severity: 'critical',
        details: 'Admin console temporarily locked for 15 minutes following 5 consecutive invalid login attempts.'
      });
      throw new Error('Admin console locked for 15 minutes due to 5 failed attempts.');
    }

    throw new Error('Invalid administrator credentials.');
  }

  // Student First-Login Display Name Confirmation
  confirmStudentDisplayName(userId, displayName) {
    if (!displayName || !displayName.trim()) {
      throw new Error("Display Name cannot be empty.");
    }
    const cleanName = displayName.trim();
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("Student record not found.");

    user.display_name = cleanName;
    user.full_name = cleanName;
    user.name_confirmed = true;

    this._set(STORAGE_KEYS.USERS, users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.display_name = cleanName;
      currentUser.full_name = cleanName;
      currentUser.name_confirmed = true;
      this.setCurrentUser(currentUser);
    }

    return user;
  }

  // Regenerate Access Code (Admin Tool)
  regenerateAccessCode(userId) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("Student not found.");

    // Generate random 6-character uppercase alphanumeric code
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let newCode = "";
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user.access_code = newCode;
    user.failed_attempts = 0;
    user.locked_until = null;

    this._set(STORAGE_KEYS.USERS, users);
    return newCode;
  }

  // Unlock Student (Admin Tool)
  unlockStudent(userId) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("Student not found.");

    user.failed_attempts = 0;
    user.locked_until = null;
    this._set(STORAGE_KEYS.USERS, users);
    return user;
  }

  // Toggle Block (Admin Tool)
  toggleBlockStudent(userId) {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("Student not found.");

    user.is_blocked = !user.is_blocked;
    if (user.is_blocked) {
      user.active_session_id = null;
    }
    this._set(STORAGE_KEYS.USERS, users);
    return user;
  }

  // Reset Student Attempts for Quiz Retake (Admin Tool)
  resetStudentAttempts(userId, quizId = null) {
    let attempts = this.getAttempts();
    if (quizId) {
      attempts = attempts.filter(a => !(a.user_id === userId && a.quiz_id === quizId));
    } else {
      attempts = attempts.filter(a => a.user_id !== userId);
    }
    this._set(STORAGE_KEYS.ATTEMPTS, attempts);
  }

  logout() {
    this.setCurrentUser(null);
    try {
      sessionStorage.removeItem('ai_arena_session_id');
    } catch {}
  }

  // Whitelist Management & CSV Import
  getWhitelist() {
    return this._get(STORAGE_KEYS.WHITELIST);
  }

  importStudentsCSV(csvText) {
    if (!csvText || !csvText.trim()) {
      throw new Error("CSV content is empty.");
    }

    // Split lines safely handling CRLF and LF
    const rawLines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 2) {
      throw new Error("CSV file does not contain any data rows.");
    }

    // Helper to parse CSV row handling quotes
    const parseCSVRow = (row) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseCSVRow(rawLines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Find column indexes
    let idxRoll = header.findIndex(h => h.includes('roll') || h.includes('prn'));
    let idxCode = header.findIndex(h => h.includes('access') || h.includes('code'));
    let idxName = header.findIndex(h => h.includes('name') || h.includes('candidate'));
    let idxCollege = header.findIndex(h => h.includes('college') || h.includes('institution'));
    let idxDept = header.findIndex(h => h.includes('dept') || h.includes('department'));
    let idxYear = header.findIndex(h => h.includes('year'));
    let idxSr = header.findIndex(h => h.includes('sr'));

    // Defaults if headers not named strictly
    if (idxRoll === -1) idxRoll = 1;
    if (idxCode === -1) idxCode = 2;
    if (idxName === -1) idxName = 3;
    if (idxCollege === -1) idxCollege = 4;
    if (idxDept === -1) idxDept = 5;
    if (idxYear === -1) idxYear = 6;

    const users = this.getUsers();
    const whitelist = this.getWhitelist();
    const existingRolls = new Set(users.filter(u => u.role === 'student').map(u => u.roll_number.toUpperCase()));

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors = [];
    const newStudents = [];

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) continue;
      const cols = parseCSVRow(line);

      const roll = (cols[idxRoll] || '').trim().toUpperCase();
      const code = (cols[idxCode] || '').trim().toUpperCase();
      const name = (cols[idxName] || '').trim();
      const college = (cols[idxCollege] || 'SVIT Nashik').trim();
      const dept = (cols[idxDept] || 'Computer Engineering').trim();
      const year = (cols[idxYear] || 'TE').trim();
      const sr = cols[idxSr] ? parseInt(cols[idxSr], 10) : (users.length + importedCount + 1);

      if (!roll) {
        errorCount++;
        errors.push(`Row ${i + 1}: Missing Roll Number`);
        continue;
      }

      if (existingRolls.has(roll)) {
        duplicateCount++;
        continue;
      }

      const generatedCode = code || (Math.random().toString(36).substring(2, 8).toUpperCase());

      const studentObj = {
        id: `usr-${roll.toLowerCase()}`,
        sr: sr || (users.length + importedCount + 1),
        roll_number: roll,
        access_code: generatedCode,
        candidate_name: name || roll,
        display_name: name || roll,
        full_name: name || roll,
        college_name: college,
        department: dept,
        academic_year: year,
        role: "student",
        is_approved: true,
        is_blocked: false,
        failed_attempts: 0,
        locked_until: null,
        name_confirmed: false,
        active_session_id: null,
        created_at: new Date().toISOString()
      };

      users.push(studentObj);
      whitelist.push({
        sr: studentObj.sr,
        roll_number: studentObj.roll_number,
        access_code: studentObj.access_code,
        candidate_name: studentObj.candidate_name,
        display_name: studentObj.display_name,
        college_name: studentObj.college_name,
        department: studentObj.department,
        academic_year: studentObj.academic_year
      });

      existingRolls.add(roll);
      importedCount++;
      newStudents.push(studentObj);
    }

    this._set(STORAGE_KEYS.USERS, users);
    this._set(STORAGE_KEYS.WHITELIST, whitelist);

    return {
      totalRows: rawLines.length - 1,
      importedCount,
      duplicateCount,
      errorCount,
      errors,
      importedStudents: newStudents
    };
  }

  // Quizzes
  getQuizzes() {
    return this._get(STORAGE_KEYS.QUIZZES);
  }

  getQuizById(quizId) {
    const quizzes = this.getQuizzes();
    return quizzes.find(q => q.id === quizId) || null;
  }

  saveQuiz(quiz) {
    const quizzes = this.getQuizzes();
    const index = quizzes.findIndex(q => q.id === quiz.id);
    if (index >= 0) {
      quizzes[index] = { ...quizzes[index], ...quiz, updated_at: new Date().toISOString() };
    } else {
      quizzes.push({
        ...quiz,
        id: quiz.id || ("quiz-" + Date.now()),
        created_at: new Date().toISOString()
      });
    }
    this._set(STORAGE_KEYS.QUIZZES, quizzes);
  }

  deleteQuiz(quizId) {
    let quizzes = this.getQuizzes();
    quizzes = quizzes.filter(q => q.id !== quizId);
    this._set(STORAGE_KEYS.QUIZZES, quizzes);
  }

  // Attempts
  getAttempts() {
    return this._get(STORAGE_KEYS.ATTEMPTS);
  }

  getUserAttempts(userId) {
    return this.getAttempts().filter(a => a.user_id === userId);
  }

  getQuizAttempts(quizId) {
    return this.getAttempts().filter(a => a.quiz_id === quizId);
  }

  saveAttempt(attempt) {
    const attempts = this.getAttempts();
    const index = attempts.findIndex(a => a.id === attempt.id);
    if (index >= 0) {
      attempts[index] = { ...attempts[index], ...attempt };
    } else {
      attempts.push(attempt);
    }
    this._set(STORAGE_KEYS.ATTEMPTS, attempts);
  }

  resetStudentAttempt(quizId, userId) {
    let attempts = this.getAttempts();
    attempts = attempts.filter(a => !(a.quiz_id === quizId && a.user_id === userId));
    this._set(STORAGE_KEYS.ATTEMPTS, attempts);
  }

  // Proctoring logs
  getProctoringLogs(attemptId = null) {
    const logs = this._get(STORAGE_KEYS.PROCTORING_LOGS);
    if (attemptId) {
      return logs.filter(l => l.attempt_id === attemptId);
    }
    return logs;
  }

  logProctoringViolation(violation) {
    const logs = this._get(STORAGE_KEYS.PROCTORING_LOGS);
    const newEntry = {
      id: "proc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ...violation
    };
    logs.unshift(newEntry);
    if (logs.length > 300) logs.pop();
    this._set(STORAGE_KEYS.PROCTORING_LOGS, logs);
    return newEntry;
  }

  // Announcements
  getAnnouncements() {
    return this._get(STORAGE_KEYS.ANNOUNCEMENTS);
  }

  saveAnnouncement(announcement) {
    const list = this.getAnnouncements();
    const index = list.findIndex(a => a.id === announcement.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...announcement };
    } else {
      list.unshift({
        id: "anc-" + Date.now(),
        created_at: new Date().toISOString(),
        ...announcement
      });
    }
    this._set(STORAGE_KEYS.ANNOUNCEMENTS, list);
  }

  deleteAnnouncement(id) {
    let list = this.getAnnouncements();
    list = list.filter(a => a.id !== id);
    this._set(STORAGE_KEYS.ANNOUNCEMENTS, list);
  }
}

export const mockDb = new MockDatabase();
