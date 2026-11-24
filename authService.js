// ============================================================================
// AI ARENA – Authentication & Session Management Service
// Whitelist verification for AI Ready Workshop 2026
// ============================================================================

import { mockDb } from '../data/mockDb.js';

class AuthService {
  constructor() {
    this.currentSessionId = null;
  }

  getCurrentUser() {
    return mockDb.getCurrentUser();
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return Boolean(user && user.role === 'admin');
  }

  isStudent() {
    const user = this.getCurrentUser();
    return Boolean(user && user.role === 'student');
  }

  getCurrentSessionId() {
    try {
      return sessionStorage.getItem('ai_arena_session_id');
    } catch {
      return null;
    }
  }

  // Student Whitelist Login
  async loginStudent(rollNumber, accessCode) {
    const result = mockDb.loginStudent(rollNumber, accessCode);
    this.currentSessionId = result.sessionId;
    return result.user;
  }

  // Admin Login
  async loginAdmin(email, password) {
    const admin = await mockDb.loginAdmin(email, password);
    this.currentSessionId = admin.active_session_id;
    return admin;
  }

  // Unified login helper for role
  async login(identifier, secret, role = 'student') {
    if (role === 'admin') {
      return this.loginAdmin(identifier, secret);
    }
    return this.loginStudent(identifier, secret);
  }

  // Confirm Display Name on First Login
  async confirmDisplayName(userId, displayName) {
    return mockDb.confirmStudentDisplayName(userId, displayName);
  }

  // Validate active single session
  checkActiveSession(user) {
    if (!user) return true;
    if (user.role === 'admin') return true;
    const clientSessionId = this.getCurrentSessionId();
    if (!clientSessionId) return true;
    return mockDb.validateActiveSession(user.id, clientSessionId);
  }

  // Admin tools
  regenerateAccessCode(userId) {
    return mockDb.regenerateAccessCode(userId);
  }

  unlockStudent(userId) {
    return mockDb.unlockStudent(userId);
  }

  toggleBlock(userId) {
    return mockDb.toggleBlockStudent(userId);
  }

  resetAttempts(userId, quizId = null) {
    return mockDb.resetStudentAttempts(userId, quizId);
  }

  logout() {
    this.currentSessionId = null;
    mockDb.logout();
  }
}

export const authService = new AuthService();
