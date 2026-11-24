-- ====================================================================
-- AI Ready Quiz Portal - Database Schema (PostgreSQL for Supabase)
-- Institution: T.S.D.H. (Technical Skill Development Hub), SVIT Nashik
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    roll_number TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    academic_year TEXT NOT NULL, -- 'FE', 'SE', 'TE', 'BE'
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'coordinator')),
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast roll number and email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_roll ON public.profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. CSV WHITELIST TABLE (Pre-approved students by Admin)
CREATE TABLE IF NOT EXISTS public.whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number TEXT NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    department TEXT,
    academic_year TEXT,
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whitelist_roll ON public.whitelist(roll_number);

-- 3. QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General AI',
    access_code TEXT NOT NULL DEFAULT 'TSDH2026', -- Live workshop access code
    duration_minutes INT NOT NULL DEFAULT 15,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    passing_percentage INT NOT NULL DEFAULT 60,
    negative_marking NUMERIC(3,2) NOT NULL DEFAULT 0.00, -- e.g. 0.25 for 1/4th negative mark
    shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
    max_attempts INT NOT NULL DEFAULT 1,
    show_results_immediately BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_leaderboard_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_leaderboard_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    code_snippet TEXT,
    options JSONB NOT NULL, -- Array of string options: ["Option A", "Option B", "Option C", "Option D"]
    correct_option INT NOT NULL CHECK (correct_option >= 0 AND correct_option <= 3), -- 0-indexed
    explanation TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- 5. ATTEMPTS TABLE (Student Quiz Submissions)
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INT DEFAULT 0,
    score NUMERIC(5,2) DEFAULT 0.00,
    max_score NUMERIC(5,2) DEFAULT 0.00,
    percentage NUMERIC(5,2) DEFAULT 0.00,
    passed BOOLEAN DEFAULT FALSE,
    answers JSONB DEFAULT '{}'::jsonb, -- Map of { question_id: selected_option_index }
    violations_count INT NOT NULL DEFAULT 0,
    is_auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'disqualified', 'timed_out')),
    session_id TEXT, -- Detect multiple logins / devices
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_quiz_user ON public.attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_score_time ON public.attempts(quiz_id, score DESC, time_taken_seconds ASC);

-- 6. PROCTORING LOGS TABLE
CREATE TABLE IF NOT EXISTS public.proctoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL, -- 'fullscreen_exit', 'tab_switch', 'copy_paste_attempt', 'camera_snapshot', 'multiple_face'
    details TEXT,
    snapshot_url TEXT, -- Base64 thumbnail or Supabase storage path
    suspicious_score INT DEFAULT 0, -- 0 - 100
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_attempt ON public.proctoring_logs(attempt_id);

-- 7. ANNOUNCEMENTS TABLE (Live workshop notifications)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'urgent')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime publication enablement for live dashboard & leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proctoring_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
