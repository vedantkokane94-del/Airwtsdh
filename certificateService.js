// ============================================================================
// AI Ready Quiz Portal - Official TSDH Certificate Generator
// Generates official TSDH SVIT Nashik Certificate with dynamic student data
// ============================================================================

import { BRAND } from '../config/constants.js';

class CertificateService {
  // Generate authentic verification code in format SVIT-AIRQ-2026-XXXX
  generateCertificateId(attemptId, userId) {
    const raw = `${attemptId || 'att'}_${userId || 'usr'}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0');
    return `SVIT-AIRQ-2026-${hex}`;
  }

  // Draw the full certificate onto a high-resolution canvas
  async renderCertificateToCanvas(attemptData) {
    const {
      userName = "Student Name",
      rollNumber = "SVIT2024",
      department = "Engineering",
      collegeName = "SVIT Nashik",
      score = 10,
      maxScore = 10,
      percentage = 100,
      rank = 1,
      attemptId = "",
      userId = "",
      submittedAt = new Date().toISOString()
    } = attemptData;

    const certId = this.generateCertificateId(attemptId, userId);
    const dateFormatted = new Date(submittedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const canvas = document.createElement('canvas');
    canvas.width = 3369;
    canvas.height = 2382;
    const ctx = canvas.getContext('2d');

    // Load template image
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => {
        // Fallback to local image path
        img.src = 'assets/certificate-template.jpg';
      };
      img.src = 'assets/certificate-clean-template.png';
    });

    // Draw base template
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // If template has original placeholders, patch them cleanly
    ctx.fillStyle = '#f6f7fd';
    ctx.fillRect(950, 1115, 1470, 140); // Name area

    ctx.fillStyle = '#f0f2fc';
    ctx.fillRect(1440, 1334, 610, 42); // Middle pill
    ctx.fillRect(2100, 1334, 370, 42); // Right score pill

    ctx.fillStyle = '#f8f7ff';
    ctx.fillRect(1200, 1530, 970, 45); // Score/Rank line

    ctx.fillStyle = '#f5f6fe';
    ctx.fillRect(930, 2150, 630, 45); // Cert ID
    ctx.fillRect(1980, 2150, 420, 45); // Issued Date

    // 1. Student Full Name (Georgia / Serif Bold, dark navy)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1c1d5d';
    ctx.font = 'bold 74px Georgia, "Times New Roman", serif';
    ctx.fillText(userName, 1684.5, 1185);

    // 2. College & Department inside Middle Pill
    ctx.fillStyle = '#2a3260';
    ctx.font = 'bold 26px "Poppins", Arial, sans-serif';
    const deptShort = department.replace('Engineering', 'Engg').replace('Information Technology', 'IT');
    const collegePillText = `from ${collegeName || 'SVIT Nashik'} (${deptShort})`;
    ctx.fillText(collegePillText, 1745, 1355);

    // 3. Score inside Right Pill
    ctx.fillStyle = '#2a3260';
    ctx.font = 'bold 26px "Poppins", Arial, sans-serif';
    ctx.fillText(`SCORE · ${score}/${maxScore}`, 2285, 1355);

    // 4. Performance Line (Score [SCORE]/[TOTAL] · Rank [RANK])
    ctx.fillStyle = '#1c1d5d';
    ctx.font = 'bold 30px "Poppins", Arial, sans-serif';
    const rankText = rank ? ` · Rank #${rank}` : '';
    ctx.fillText(`Score ${score}/${maxScore}${rankText}`, 1684.5, 1552);

    // 5. Certificate ID
    ctx.fillStyle = '#4f557a';
    ctx.font = '500 24px "Poppins", Arial, sans-serif';
    ctx.fillText(`Certificate ID: ${certId}`, 1240, 2172);

    // 6. Issued Date
    ctx.fillText(`Issued: ${dateFormatted}`, 2190, 2172);

    return { canvas, certId, dateFormatted };
  }

  // Generate dynamic PDF Certificate using jsPDF
  async generatePDFCertificate(attemptData) {
    const { canvas, certId } = await this.renderCertificateToCanvas(attemptData);

    const jsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) || null;

    if (jsPDF) {
      // Create landscape A4 PDF (297mm x 210mm)
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);

      const rollSafe = (attemptData.rollNumber || 'student').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanFileName = `SVIT_TSDH_Certificate_${rollSafe}.pdf`;
      doc.save(cleanFileName);
      return { success: true, certId };
    }

    // Direct download as high-res PNG fallback
    const link = document.createElement('a');
    link.download = `SVIT_TSDH_Certificate_${(attemptData.rollNumber || 'student').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return { success: true, certId };
  }

  // Download high-resolution PNG image directly
  async downloadPNG(attemptData) {
    const { canvas, certId } = await this.renderCertificateToCanvas(attemptData);
    const link = document.createElement('a');
    const rollSafe = (attemptData.rollNumber || 'student').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `SVIT_TSDH_Certificate_${rollSafe}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return { success: true, certId };
  }

  // Generate WhatsApp Share link
  getWhatsAppShareUrl(attemptData) {
    const { userName, quizTitle, percentage, score, maxScore, rank } = attemptData;
    const certId = this.generateCertificateId(attemptData.attemptId, attemptData.userId);
    const rankStr = rank ? ` (Rank #${rank})` : '';
    const text = `🎓 Proud to complete the *AI Ready Workshop 2026* at T.S.D.H., SVIT Nashik! 🚀🤖\n\nI scored *${score}/${maxScore} (${percentage}%)* in *${quizTitle}*${rankStr}.\n\nCertificate ID: ${certId}\nVerify with TSDH SVIT Nashik. #AIReady #TSDH #SVITNashik`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
}

export const certificateService = new CertificateService();
