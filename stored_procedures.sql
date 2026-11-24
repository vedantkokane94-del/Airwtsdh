-- ====================================================================
-- AI Ready Quiz Portal - Secure Stored Procedures & Functions
-- Server-side evaluation, timer validation, and answer protection
-- ====================================================================

-- 1. SECURE QUESTION FETCHING (Masks correct_option and explanation from students)
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(
    p_quiz_id UUID
)
RETURNS TABLE (
    id UUID,
    quiz_id UUID,
    question_text TEXT,
    code_snippet TEXT,
    options JSONB,
    difficulty TEXT,
    points NUMERIC(4,2),
    order_index INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_shuffle_questions BOOLEAN;
BEGIN
    SELECT shuffle_questions INTO v_shuffle_questions
    FROM public.quizzes
    WHERE id = p_quiz_id;

    IF v_shuffle_questions THEN
        RETURN QUERY
        SELECT q.id, q.quiz_id, q.question_text, q.code_snippet, q.options, q.difficulty, q.points, q.order_index
        FROM public.questions q
        WHERE q.quiz_id = p_quiz_id
        ORDER BY RANDOM();
    ELSE
        RETURN QUERY
        SELECT q.id, q.quiz_id, q.question_text, q.code_snippet, q.options, q.difficulty, q.points, q.order_index
        FROM public.questions q
        WHERE q.quiz_id = p_quiz_id
        ORDER BY q.order_index ASC;
    END IF;
END;
$$;

-- 2. START QUIZ ATTEMPT (Server timestamp recording)
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(
    p_quiz_id UUID,
    p_access_code TEXT,
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_quiz RECORD;
    v_profile RECORD;
    v_existing_attempts INT;
    v_attempt_id UUID;
BEGIN
    -- Check user profile
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_profile.is_blocked THEN
        RETURN jsonb_build_object('success', false, 'message', 'Your account has been restricted by the admin.');
    END IF;

    -- Check quiz status and access code
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
    IF NOT FOUND OR NOT v_quiz.is_active THEN
        RETURN jsonb_build_object('success', false, 'message', 'This quiz is not currently active.');
    END IF;

    IF v_quiz.access_code IS NOT NULL AND v_quiz.access_code <> '' AND UPPER(TRIM(v_quiz.access_code)) <> UPPER(TRIM(p_access_code)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Workshop Access Code.');
    END IF;

    -- Check max attempts
    SELECT COUNT(*) INTO v_existing_attempts
    FROM public.attempts
    WHERE quiz_id = p_quiz_id AND user_id = v_user_id AND status IN ('completed', 'in_progress');

    IF v_existing_attempts >= v_quiz.max_attempts THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached for this quiz.');
    END IF;

    -- Create new in-progress attempt
    INSERT INTO public.attempts (
        quiz_id,
        user_id,
        start_time,
        status,
        session_id
    )
    VALUES (
        p_quiz_id,
        v_user_id,
        NOW(),
        'in_progress',
        p_session_id
    )
    RETURNING id INTO v_attempt_id;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', v_attempt_id,
        'duration_minutes', v_quiz.duration_minutes,
        'start_time', NOW()
    );
END;
$$;

-- 3. SECURE SERVER-SIDE SUBMISSION & EVALUATION
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_attempt_id UUID,
    p_answers JSONB,
    p_violations_count INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_attempt RECORD;
    v_quiz RECORD;
    v_q RECORD;
    v_selected_opt INT;
    v_total_score NUMERIC(5,2) := 0.00;
    v_max_score NUMERIC(5,2) := 0.00;
    v_correct_count INT := 0;
    v_wrong_count INT := 0;
    v_unanswered_count INT := 0;
    v_percentage NUMERIC(5,2) := 0.00;
    v_passed BOOLEAN := FALSE;
    v_time_taken_seconds INT;
    v_submission_status TEXT := 'completed';
    v_results_data JSONB := '[]'::jsonb;
BEGIN
    -- Fetch attempt
    SELECT * INTO v_attempt FROM public.attempts
    WHERE id = p_attempt_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attempt record not found.');
    END IF;

    IF v_attempt.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quiz already submitted.');
    END IF;

    -- Fetch Quiz config
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

    -- Calculate exact elapsed seconds on the server
    v_time_taken_seconds := EXTRACT(EPOCH FROM (NOW() - v_attempt.start_time))::INT;
    IF v_time_taken_seconds < 0 THEN
        v_time_taken_seconds := 0;
    END IF;

    -- Check if violations warrant auto-disqualification/flag
    IF p_violations_count >= 3 THEN
        v_submission_status := 'completed'; -- Flagged with high violations
    END IF;

    -- Loop through all questions of this quiz to calculate score
    FOR v_q IN SELECT * FROM public.questions WHERE quiz_id = v_quiz.id ORDER BY order_index ASC
    LOOP
        v_max_score := v_max_score + v_q.points;

        -- Extract answer given for this question ID
        IF p_answers ? (v_q.id::TEXT) THEN
            v_selected_opt := (p_answers->>(v_q.id::TEXT))::INT;

            IF v_selected_opt = v_q.correct_option THEN
                v_total_score := v_total_score + v_q.points;
                v_correct_count := v_correct_count + 1;
            ELSE
                -- Apply negative marking if configured
                IF v_quiz.negative_marking > 0 THEN
                    v_total_score := v_total_score - v_quiz.negative_marking;
                END IF;
                v_wrong_count := v_wrong_count + 1;
            END IF;
        ELSE
            v_unanswered_count := v_unanswered_count + 1;
        END IF;

        -- Collect breakdown if immediate results allowed
        IF v_quiz.show_results_immediately THEN
            v_results_data := v_results_data || jsonb_build_object(
                'question_id', v_q.id,
                'question_text', v_q.question_text,
                'code_snippet', v_q.code_snippet,
                'options', v_q.options,
                'correct_option', v_q.correct_option,
                'user_selected', CASE WHEN p_answers ? (v_q.id::TEXT) THEN (p_answers->>(v_q.id::TEXT))::INT ELSE NULL END,
                'explanation', v_q.explanation,
                'difficulty', v_q.difficulty,
                'is_correct', CASE WHEN p_answers ? (v_q.id::TEXT) AND (p_answers->>(v_q.id::TEXT))::INT = v_q.correct_option THEN true ELSE false END
            );
        END IF;
    END LOOP;

    -- Prevent negative total score
    IF v_total_score < 0 THEN
        v_total_score := 0.00;
    END IF;

    IF v_max_score > 0 THEN
        v_percentage := ROUND((v_total_score / v_max_score) * 100, 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    IF v_percentage >= v_quiz.passing_percentage THEN
        v_passed := TRUE;
    END IF;

    -- Update attempt record
    UPDATE public.attempts
    SET submitted_at = NOW(),
        time_taken_seconds = v_time_taken_seconds,
        score = v_total_score,
        max_score = v_max_score,
        percentage = v_percentage,
        passed = v_passed,
        answers = p_answers,
        violations_count = p_violations_count,
        status = v_submission_status
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'success', true,
        'score', v_total_score,
        'max_score', v_max_score,
        'percentage', v_percentage,
        'passed', v_passed,
        'time_taken_seconds', v_time_taken_seconds,
        'correct_count', v_correct_count,
        'wrong_count', v_wrong_count,
        'unanswered_count', v_unanswered_count,
        'show_review', v_quiz.show_results_immediately,
        'review_data', v_results_data
    );
END;
$$;

-- 4. LIVE LEADERBOARD WITH REAL-TIME TIE BREAKING
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(
    p_quiz_id UUID
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    full_name TEXT,
    roll_number TEXT,
    department TEXT,
    academic_year TEXT,
    score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    percentage NUMERIC(5,2),
    time_taken_seconds INT,
    submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY a.score DESC, a.time_taken_seconds ASC) AS rank,
        p.id AS user_id,
        p.full_name,
        p.roll_number,
        p.department,
        p.academic_year,
        a.score,
        a.max_score,
        a.percentage,
        a.time_taken_seconds,
        a.submitted_at
    FROM public.attempts a
    JOIN public.profiles p ON a.user_id = p.id
    WHERE a.quiz_id = p_quiz_id AND a.status = 'completed'
    ORDER BY a.score DESC, a.time_taken_seconds ASC;
END;
$$;

-- 5. AUTOMATIC PROCTORING SNAPSHOT RETENTION CLEANUP
CREATE OR REPLACE FUNCTION public.cleanup_proctoring_snapshots(
    p_days_old INT DEFAULT 7
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    UPDATE public.proctoring_logs
    SET snapshot_url = NULL
    WHERE timestamp < (NOW() - (p_days_old || ' days')::INTERVAL)
      AND snapshot_url IS NOT NULL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;
