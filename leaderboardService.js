// ============================================================================
// AI Ready Quiz Portal - Leaderboard & Ranking Service
// Real-time ranking with tie-breaking, my-rank query, and CSV export
// ============================================================================

import { mockDb } from '../data/mockDb.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';

class LeaderboardService {
  async getQuizLeaderboard(quizId, currentUserId = null) {
    const quiz = mockDb.getQuizById(quizId);
    if (!quiz) return { visible: false, frozen: false, rows: [], myRank: null };

    // Check admin visibility flags
    if (!quiz.is_leaderboard_visible) {
      return { visible: false, frozen: false, rows: [], myRank: null, message: "Leaderboard has been hidden by the organizers." };
    }

    let attempts = mockDb.getAttempts().filter(a => a.quiz_id === quizId && a.status === 'completed');

    // Sort by Score DESC, then Time Taken ASC
    attempts.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.time_taken_seconds || 0) - (b.time_taken_seconds || 0);
    });

    // Assign sequential ranks
    let myRankInfo = null;
    const rankedRows = attempts.map((att, index) => {
      const rank = index + 1;
      const row = {
        rank,
        userId: att.user_id,
        userName: att.user_name || "SVIT Student",
        rollNumber: att.roll_number || "SVIT...",
        department: att.department || "Engineering",
        academicYear: att.academic_year || "TE",
        score: att.score,
        maxScore: att.max_score,
        percentage: att.percentage,
        timeTakenSeconds: att.time_taken_seconds || 0,
        violationsCount: att.violations_count || 0,
        submittedAt: att.submitted_at
      };

      if (currentUserId && att.user_id === currentUserId && !myRankInfo) {
        myRankInfo = row;
      }

      return row;
    });

    return {
      visible: true,
      frozen: quiz.is_leaderboard_frozen || false,
      totalParticipants: rankedRows.length,
      top10: rankedRows.slice(0, 10),
      allRows: rankedRows,
      myRank: myRankInfo
    };
  }

  // Export Leaderboard to CSV string
  generateCSV(quizTitle, rows) {
    const headers = [
      "Rank",
      "Student Name",
      "Roll Number / PRN",
      "Department",
      "Year",
      "Score",
      "Max Score",
      "Percentage (%)",
      "Time Taken (s)",
      "Proctoring Violations",
      "Submitted At"
    ];

    const csvRows = [headers.join(",")];

    rows.forEach(r => {
      const cleanName = `"${(r.userName || '').replace(/"/g, '""')}"`;
      const cleanDept = `"${(r.department || '').replace(/"/g, '""')}"`;
      const row = [
        r.rank,
        cleanName,
        r.rollNumber,
        cleanDept,
        r.academicYear,
        r.score,
        r.maxScore,
        r.percentage,
        r.timeTakenSeconds,
        r.violationsCount,
        `"${r.submittedAt || ''}"`
      ];
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  // Download CSV file to user's device
  downloadCSV(quizTitle, rows) {
    const csvContent = this.generateCSV(quizTitle, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = quizTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `tsdh_leaderboard_${safeTitle}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const leaderboardService = new LeaderboardService();
