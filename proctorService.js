// ============================================================================
// AI Ready Quiz Portal - Browser Proctoring Engine
// Lightweight, mobile-friendly proctoring for live workshop with 100-300 students
// ============================================================================

import { mockDb } from '../data/mockDb.js';
import { PROCTORING_CONFIG } from '../config/constants.js';

class ProctorService {
  constructor() {
    this.isActive = false;
    this.attemptId = null;
    this.userId = null;
    this.onViolationCallback = null;
    this.onAutoSubmitCallback = null;
    this.violationsCount = 0;
    this.maxViolations = PROCTORING_CONFIG.maxViolationsAllowed;

    this.mediaStream = null;
    this.snapshotIntervalId = null;
    this.lastBlurTime = 0;
    this.disconnectStartTime = null;

    // Bound listeners for clean removal
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._handleFullscreenChange = this._handleFullscreenChange.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleContextMenu = this._handleContextMenu.bind(this);
    this._handleCopyPaste = this._handleCopyPaste.bind(this);
    this._handleOnline = this._handleOnline.bind(this);
    this._handleOffline = this._handleOffline.bind(this);
  }

  // Request camera permission and initialize media stream
  async requestCameraPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { success: false, error: "Camera API not supported on this browser/device." };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        },
        audio: false
      });

      return { success: true, stream: this.mediaStream };
    } catch (err) {
      console.warn("Camera permission error:", err);
      let message = "Camera permission was denied. Please allow camera access in your browser settings to proceed.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No camera found on this device. Please connect a webcam or switch to a mobile phone with a front camera.";
      }
      return { success: false, error: message };
    }
  }

  // Request fullscreen mode (Mobile & Desktop)
  async requestFullscreen() {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      return true;
    } catch (err) {
      console.warn("Fullscreen request warning:", err);
      return false;
    }
  }

  // Check if currently in fullscreen
  isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  // Start Proctoring session
  startSession({ attemptId, userId, maxViolations = 3, onViolation, onAutoSubmit }) {
    this.isActive = true;
    this.attemptId = attemptId;
    this.userId = userId;
    this.maxViolations = maxViolations;
    this.violationsCount = 0;
    this.onViolationCallback = onViolation;
    this.onAutoSubmitCallback = onAutoSubmit;

    // 1. Attach listeners
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
    window.addEventListener('blur', this._handleVisibilityChange);
    document.addEventListener('fullscreenchange', this._handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._handleFullscreenChange);
    document.addEventListener('keydown', this._handleKeyDown, true);
    document.addEventListener('contextmenu', this._handleContextMenu, true);
    document.addEventListener('copy', this._handleCopyPaste, true);
    document.addEventListener('paste', this._handleCopyPaste, true);
    document.addEventListener('cut', this._handleCopyPaste, true);
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);

    // 2. Prevent text selection on body
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // 3. Periodic webcam snapshots (every 30-45s)
    this._startSnapshotLoop();
  }

  // Stop Proctoring session & clean up
  stopSession() {
    this.isActive = false;

    // Remove listeners
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    window.removeEventListener('blur', this._handleVisibilityChange);
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._handleFullscreenChange);
    document.removeEventListener('keydown', this._handleKeyDown, true);
    document.removeEventListener('contextmenu', this._handleContextMenu, true);
    document.removeEventListener('copy', this._handleCopyPaste, true);
    document.removeEventListener('paste', this._handleCopyPaste, true);
    document.removeEventListener('cut', this._handleCopyPaste, true);
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);

    // Restore text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    // Stop snapshot timer
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Exit fullscreen if still active
    try {
      if (this.isFullscreen() && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  }

  // Periodic snapshot loop
  _startSnapshotLoop() {
    if (!this.mediaStream) return;

    this.snapshotIntervalId = setInterval(async () => {
      if (!this.isActive) return;
      try {
        const snapshot = await this.captureSnapshot();
        if (snapshot) {
          // Log periodic snapshot for admin audit
          mockDb.logProctoringViolation({
            attempt_id: this.attemptId,
            user_id: this.userId,
            violation_type: 'camera_snapshot',
            details: 'Periodic verification snapshot',
            snapshot_url: snapshot,
            suspicious_score: 5
          });
        }
      } catch (err) {
        console.warn("Snapshot capture error:", err);
      }
    }, PROCTORING_CONFIG.snapshotIntervalSeconds * 1000);
  }

  // Grab snapshot frame from mediaStream
  async captureSnapshot() {
    if (!this.mediaStream) return null;
    try {
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') return null;

      const video = document.createElement('video');
      video.srcObject = this.mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.5);
      video.pause();
      video.srcObject = null;
      return base64;
    } catch (err) {
      return null;
    }
  }

  // Record a violation
  async triggerViolation(type, details) {
    if (!this.isActive) return;

    const now = Date.now();
    // Throttle duplicate events within 1.5 seconds
    if (now - this.lastBlurTime < 1500) return;
    this.lastBlurTime = now;

    this.violationsCount++;
    const isAutoSubmit = this.violationsCount >= this.maxViolations;
    const suspiciousScore = Math.min(100, this.violationsCount * 35);

    // Capture snapshot evidence immediately
    const snapshot = await this.captureSnapshot();

    const logEntry = mockDb.logProctoringViolation({
      attempt_id: this.attemptId,
      user_id: this.userId,
      violation_type: type,
      details,
      snapshot_url: snapshot,
      suspicious_score: suspiciousScore
    });

    if (this.onViolationCallback) {
      this.onViolationCallback({
        type,
        details,
        violationsCount: this.violationsCount,
        maxViolations: this.maxViolations,
        isAutoSubmit,
        logEntry
      });
    }

    if (isAutoSubmit && this.onAutoSubmitCallback) {
      this.stopSession();
      this.onAutoSubmitCallback({
        reason: `Exceeded maximum proctoring violation limit (${this.maxViolations} warnings).`
      });
    }
  }

  // Visibility and blur handling
  _handleVisibilityChange() {
    if (!this.isActive) return;
    if (document.hidden || !document.hasFocus()) {
      this.triggerViolation('tab_switch', 'Student switched tabs or navigated away from the quiz window.');
    }
  }

  // Fullscreen exit handling
  _handleFullscreenChange() {
    if (!this.isActive) return;
    if (!this.isFullscreen()) {
      this.triggerViolation('fullscreen_exit', 'Student exited mandatory full-screen mode.');
    }
  }

  // Keyboard shortcut blocker
  _handleKeyDown(e) {
    if (!this.isActive) return;

    // Block F12 (DevTools)
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      this.triggerViolation('devtools_attempt', 'Attempted to open Developer Tools (F12).');
      return false;
    }

    // Block PrintScreen
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      this.triggerViolation('screenshot_attempt', 'Attempted to capture screen (PrintScreen).');
      return false;
    }

    // Block Ctrl/Cmd key combos (Copy, Paste, View Source, Print, Save, Inspect)
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['c', 'v', 'u', 'p', 's', 'a', 'x', 'i', 'j'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerViolation('shortcut_attempt', `Attempted blocked shortcut (Ctrl+${key.toUpperCase()}).`);
        return false;
      }
    }
  }

  // Right-click context menu blocker
  _handleContextMenu(e) {
    if (!this.isActive) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // Clipboard blocker
  _handleCopyPaste(e) {
    if (!this.isActive) return;
    e.preventDefault();
    e.stopPropagation();
    this.triggerViolation('clipboard_attempt', `Attempted ${e.type} action.`);
    return false;
  }

  // Network offline/online handling
  _handleOffline() {
    this.disconnectStartTime = Date.now();
    window.dispatchEvent(new CustomEvent('portal-network-status', { detail: { online: false } }));
  }

  _handleOnline() {
    const offlineDurationSec = this.disconnectStartTime ? Math.round((Date.now() - this.disconnectStartTime) / 1000) : 0;
    this.disconnectStartTime = null;

    mockDb.logProctoringViolation({
      attempt_id: this.attemptId,
      user_id: this.userId,
      violation_type: 'network_reconnect',
      details: `Network restored after ${offlineDurationSec}s offline. Answers were preserved locally.`,
      suspicious_score: 0
    });

    window.dispatchEvent(new CustomEvent('portal-network-status', { detail: { online: true, duration: offlineDurationSec } }));
  }
}

export const proctorService = new ProctorService();
