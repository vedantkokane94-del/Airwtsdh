// ============================================================================
// AI Ready Quiz Portal - Quiz Engine & Evaluation Service
// ============================================================================

import { mockDb } from '../data/mockDb.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';

class QuizService {
  // Fisher-Yates Shuffle
  _shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Get all active quizzes
  async getQuizzes() {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn("Using local quizzes fallback:", err);
      }
    }
    return mockDb.getQuizzes();
  }

  // Get single quiz metadata
  async getQuiz(quizId) {
    const quizzes = await this.getQuizzes();
    return quizzes.find(q => q.id === quizId) || null;
  }

  // Start an attempt: prepares masked questions for student
  async prepareQuizForStudent(quizId, user) {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) throw new Error("Quiz not found.");

    // Check existing completed attempts
    const userAttempts = mockDb.getUserAttempts(user.id).filter(a => a.quiz_id === quizId && a.status === 'completed');
    if (userAttempts.length >= (quiz.max_attempts || 1)) {
      throw new Error(`You have reached the maximum allowed attempts (${quiz.max_attempts || 1}) for this quiz.`);
    }

    const attemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const startTime = new Date().toISOString();

    // Prepare questions with answers completely STRIPPED for client safety
    let questions = quiz.questions || [];
    if (quiz.shuffle_questions) {
      questions = this._shuffleArray(questions);
    }

    // Process questions: mask correct_option and explanation
    // We store the mapping securely in session/eval cache so evaluation can occur accurately
    const maskedQuestions = questions.map((q, idx) => {
      let optionsList = [...q.options];
      let optionIndices = optionsList.map((_, i) => i);

      if (quiz.shuffle_options) {
        // Shuffle option indices
        for (let i = optionIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optionIndices[i], optionIndices[j]] = [optionIndices[j], optionIndices[i]];
        }
        optionsList = optionIndices.map(i => q.options[i]);
      }

      return {
        id: q.id,
        index: idx + 1,
        question_text: q.question_text,
        code_snippet: q.code_snippet || null,
        options: optionsList,
        optionMapping: optionIndices, // maps shuffled index -> original index
        difficulty: q.difficulty || 'medium',
        points: q.points || 1
      };
    });

    const attemptRecord = {
      id: attemptId,
      quiz_id: quizId,
      user_id: user.id,
      user_name: user.full_name,
      roll_number: user.roll_number,
      department: user.department,
      academic_year: user.academic_year,
      start_time: startTime,
      status: 'in_progress',
      answers: {},
      violations_count: 0
    };

    mockDb.saveAttempt(attemptRecord);

    return {
      attemptId,
      quiz,
      questions: maskedQuestions,
      durationMinutes: quiz.duration_minutes,
      startTime
    };
  }

  // Autosave draft answers locally & remotely
  saveDraftAnswer(attemptId, questionId, selectedOptionIndex) {
    try {
      const key = `tsdh_draft_${attemptId}`;
      let drafts = {};
      try {
        drafts = JSON.parse(localStorage.getItem(key)) || {};
      } catch {}
      drafts[questionId] = selectedOptionIndex;
      localStorage.setItem(key, JSON.stringify(drafts));

      // Also update in-progress attempt in mockDb
      const attempts = mockDb.getAttempts();
      const attempt = attempts.find(a => a.id === attemptId);
      if (attempt && attempt.status === 'in_progress') {
        attempt.answers = drafts;
        mockDb.saveAttempt(attempt);
      }
    } catch (e) {
      console.warn("Failed to autosave draft answer:", e);
    }
  }

  getDraftAnswers(attemptId) {
    try {
      const key = `tsdh_draft_${attemptId}`;
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  }

  clearDraftAnswers(attemptId) {
    localStorage.removeItem(`tsdh_draft_${attemptId}`);
  }

  // Submit and securely evaluate attempt
  async submitQuizAttempt(attemptId, quizId, user, studentAnswers, violationsCount = 0, questionsMetadata = []) {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) throw new Error("Quiz not found.");

    const rawQuestions = quiz.questions || [];
    const rawQuestionsMap = new Map(rawQuestions.map(q => [q.id, q]));

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const reviewData = [];

    // Calculate elapsed time
    const attempts = mockDb.getAttempts();
    const existingAttempt = attempts.find(a => a.id === attemptId);
    const startTimestamp = existingAttempt ? new Date(existingAttempt.start_time).getTime() : Date.now();
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startTimestamp) / 1000));

    // Evaluate answers
    rawQuestions.forEach(rawQ => {
      maxScore += (rawQ.points || 1);
      const studentSelectedShuffled = studentAnswers[rawQ.id];

      // Re-map student answer from shuffled index back to real index if metadata is available
      let actualSelectedOriginal = null;
      if (studentSelectedShuffled !== undefined && studentSelectedShuffled !== null) {
        const meta = questionsMetadata.find(m => m.id === rawQ.id);
        if (meta && meta.optionMapping) {
          actualSelectedOriginal = meta.optionMapping[studentSelectedShuffled];
        } else {
          actualSelectedOriginal = studentSelectedShuffled;
        }
      }

      const isAnswered = actualSelectedOriginal !== null && actualSelectedOriginal !== undefined;
      const isCorrect = isAnswered && actualSelectedOriginal === rawQ.correct_option;

      if (isAnswered) {
        if (isCorrect) {
          totalScore += (rawQ.points || 1);
          correctCount++;
        } else {
          if (quiz.negative_marking > 0) {
            totalScore -= Number(quiz.negative_marking);
          }
          wrongCount++;
        }
      } else {
        unansweredCount++;
      }

      if (quiz.show_results_immediately) {
        reviewData.push({
          question_id: rawQ.id,
          question_text: rawQ.question_text,
          code_snippet: rawQ.code_snippet,
          options: rawQ.options,
          correct_option: rawQ.correct_option,
          user_selected: actualSelectedOriginal,
          is_correct: isCorrect,
          explanation: rawQ.explanation,
          difficulty: rawQ.difficulty
        });
      }
    });

    if (totalScore < 0) totalScore = 0;
    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
    const passed = percentage >= (quiz.passing_percentage || 60);

    const completedAttempt = {
      id: attemptId,
      quiz_id: quizId,
      quiz_title: quiz.title,
      user_id: user.id,
      user_name: user.full_name,
      roll_number: user.roll_number,
      department: user.department,
      academic_year: user.academic_year,
      start_time: existingAttempt ? existingAttempt.start_time : new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      time_taken_seconds: timeTakenSeconds,
      score: totalScore,
      max_score: maxScore,
      percentage,
      passed,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      violations_count: violationsCount,
      status: 'completed',
      answers: studentAnswers
    };

    mockDb.saveAttempt(completedAttempt);
    this.clearDraftAnswers(attemptId);

    // Also sync to Supabase if available
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('attempts').insert({
          id: attemptId.replace('att_', ''), // valid uuid if generated
          quiz_id: quizId,
          user_id: user.id,
          time_taken_seconds: timeTakenSeconds,
          score: totalScore,
          max_score: maxScore,
          percentage,
          passed,
          violations_count: violationsCount,
          status: 'completed',
          answers: studentAnswers
        });
      } catch (err) {
        console.warn("Attempt Supabase sync notice:", err.message);
      }
    }

    return {
      attempt: completedAttempt,
      reviewData,
      showReview: quiz.show_results_immediately
    };
  }
}

export const quizService = new QuizService();
