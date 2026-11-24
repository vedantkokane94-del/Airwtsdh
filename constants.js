// ============================================================================
// AI ARENA – The Ultimate AI Ready Quiz (System Constants & Branding)
// Tagline: "Think. Prompt. Prove."
// Organised by: T.S.D.H. (Technical Skill Development Hub), SVIT Nashik
// Part of AI Ready Workshop 2026
// ============================================================================

export const BRAND = {
  name: "AI ARENA",
  title: "AI ARENA – The Ultimate AI Ready Quiz",
  tagline: "Think. Prompt. Prove.",
  workshop: "AI Ready Workshop 2026",
  subTagline: "From Student to AI-Enabled Professional",
  institution: "T.S.D.H. - Technical Skill Development Hub",
  college: "SVIT Nashik (Sir Visvesvaraya Institute of Technology)",
  location: "Chincholi, Nashik, Maharashtra 422102",
  logos: {
    tsdh: "assets/tsdh-logo.jpg",
    arena: "assets/ai-arena-logo.jpg",
    workshop: "assets/ai-ready-logo.jpg",
    mascot: "assets/robot-mascot.png",
    brain: "assets/ai-brain.png",
    chip: "assets/ai-chip.png",
    innovate: "assets/innovate-badge.png",
    beReady: "assets/be-ai-ready.png"
  },
  colors: {
    bg: "#060913",
    navy: "#0b1022",
    royal: "#1e3a8a",
    blue: "#2f6df0",
    indigo: "#4f2fd8",
    violet: "#8b5cf6",
    gold: "#d9a63a",
    goldLight: "#f5d57f"
  }
};

export const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science (AIDS)",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "First Year Engineering (FE)"
];

export const ACADEMIC_YEARS = [
  { value: "FE", label: "First Year (FE)" },
  { value: "SE", label: "Second Year (SE)" },
  { value: "TE", label: "Third Year (TE)" },
  { value: "BE", label: "Final Year (BE)" }
];

export const PROCTORING_CONFIG = {
  maxViolationsAllowed: 3,
  snapshotIntervalSeconds: 35,
  gracePeriodSeconds: 60
};

export const DEFAULT_WORKSHOP_CODE = "TSDH2026";
