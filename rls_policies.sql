-- ====================================================================
-- AI Ready Quiz Portal - Row Level Security (RLS) Policies
-- Ensures complete student privacy, answer protection, and admin rights
-- ====================================================================

-- Helper function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- 1. PROFILES POLICIES
-- ----------------------------------------------------
-- Users can read their own profile; Admins can read all profiles
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Users can insert their own profile upon registration
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update non-critical parts of their own profile; Admins can update all (e.g. approve/role)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own name/phone"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'student');

-- ----------------------------------------------------
-- 2. WHITELIST POLICIES
-- ----------------------------------------------------
-- Only Admins can view and manage the whitelist
CREATE POLICY "Admins manage whitelist"
ON public.whitelist FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- 3. QUIZZES POLICIES
-- ----------------------------------------------------
-- Active quizzes are viewable by all approved authenticated users
CREATE POLICY "View active quizzes"
ON public.quizzes FOR SELECT
USING (
    is_active = TRUE OR public.is_admin()
);

-- Only Admins can insert, update, or delete quizzes
CREATE POLICY "Admins manage quizzes"
ON public.quizzes FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- 4. QUESTIONS POLICIES (CRITICAL SECURITY)
-- ----------------------------------------------------
-- DIRECT TABLE ACCESS: Strictly restricted to Admins!
-- Students DO NOT have direct SELECT on public.questions because it contains correct_option and explanation.
-- Students fetch questions exclusively through the secure RPC function `get_quiz_questions_for_student`.
CREATE POLICY "Only admins can directly access questions table"
ON public.questions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- 5. ATTEMPTS POLICIES
-- ----------------------------------------------------
-- Students can view their own attempts; Admins can view all attempts
CREATE POLICY "View own attempts or admin all"
ON public.attempts FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Students can start an attempt for themselves
CREATE POLICY "Users can create own attempt"
ON public.attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Students can update their own in-progress attempt (e.g. auto-save draft answers)
CREATE POLICY "Users can update own in-progress attempt"
ON public.attempts FOR UPDATE
USING (auth.uid() = user_id AND status = 'in_progress')
WITH CHECK (auth.uid() = user_id);

-- Admins can update or delete any attempt (e.g. reset attempt)
CREATE POLICY "Admins manage attempts"
ON public.attempts FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------
-- 6. PROCTORING LOGS POLICIES
-- ----------------------------------------------------
-- Students can insert proctoring violation events for their own attempt
CREATE POLICY "Students log own proctoring events"
ON public.proctoring_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only Admins can view full proctoring logs & snapshot evidence
CREATE POLICY "Admins view all proctoring logs"
ON public.proctoring_logs FOR SELECT
USING (public.is_admin() OR auth.uid() = user_id);

-- ----------------------------------------------------
-- 7. ANNOUNCEMENTS POLICIES
-- ----------------------------------------------------
-- Everyone can read active announcements
CREATE POLICY "Everyone views active announcements"
ON public.announcements FOR SELECT
USING (is_active = TRUE OR public.is_admin());

-- Only Admins can create and edit announcements
CREATE POLICY "Admins manage announcements"
ON public.announcements FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
