import { format } from 'date-fns';
import { Exam, Question } from '../types';
import { authenticateGoogle } from './googleSheets';

// Helper to generate text format for Google Docs
export function generateQuestionPaperPlainText(exam: Exam, studentName?: string, studentEmail?: string): string {
  let text = '';
  text += `========================================================================\n`;
  text += `  ${exam.title.toUpperCase()}\n`;
  text += `  CONQUEROR PREPARATION PLATFORM - ASSESSMENT QUESTION PAPER\n`;
  text += `========================================================================\n\n`;

  text += `Assessment ID: ${exam.id}\n`;
  text += `DurationLimit: ${exam.duration} Minutes\n`;
  if (studentName) {
    text += `Candidate: ${studentName.toUpperCase()} (${studentEmail || 'No Email'})\n`;
  }
  text += `Report Created At: ${format(new Date(), 'EEEE, d MMMM yyyy @ hh:mm:ss a')}\n`;
  text += `------------------------------------------------------------------------\n\n`;

  let qSerialGlobal = 1;
  const sectionsList = exam.sections ? Object.entries(exam.sections) : [];

  sectionsList.forEach(([sectionName, section]: [string, any]) => {
    text += `========================================================================\n`;
    text += `  SECTION: ${sectionName.toUpperCase()}\n`;
    text += `========================================================================\n\n`;

    const mcqs = section.mcqs || [];
    const numericals = section.numericals || [];

    if (mcqs.length > 0) {
      text += `--- PART A: MULTIPLE CHOICE QUESTIONS (MCQs) ---\n\n`;
      mcqs.forEach((q: Question, idx: number) => {
        text += `Q${qSerialGlobal++}. [MCQ] [ID: ${q.id}]\n`;
        text += `${q.text}\n`;
        if (q.options && q.options.length > 0) {
          const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          q.options.forEach((opt: string, oIdx: number) => {
            text += `   ${labels[oIdx] || oIdx + 1}) ${opt}\n`;
          });
        }
        text += `\n`;
      });
    }

    if (numericals.length > 0) {
      text += `--- PART B: NUMERICAL ENTRY QUESTIONS ---\n\n`;
      numericals.forEach((q: Question) => {
        text += `Q${qSerialGlobal++}. [NUMERICAL] [ID: ${q.id}]\n`;
        text += `${q.text}\n`;
        text += `   (Write your numerical response in the space provided / online interface)\n\n`;
      });
    }
  });

  // Appendix: ANSWERS PAGE
  text += `\n\n`;
  text += `========================================================================\n`;
  text += `  LAST PAGE: OFFICIAL ANSWER KEY KEYS\n`;
  text += `========================================================================\n`;
  text += `Below are the official rectifying validation matches for this paper:\n\n`;

  let keySerial = 1;
  sectionsList.forEach(([sectionName, section]: [string, any]) => {
    text += `--- ${sectionName.toUpperCase()} KEYS ---\n`;
    const mcqs = section.mcqs || [];
    const numericals = section.numericals || [];
    
    mcqs.forEach((q: Question) => {
      const correctVal = exam.answerKey?.[q.id] ?? q.correctAnswer ?? 'Not Defined';
      text += `Q${keySerial++}. [MCQ] [ID: ${q.id}]: Correct Option -> ${correctVal}\n`;
    });
    
    numericals.forEach((q: Question) => {
      const correctVal = exam.answerKey?.[q.id] ?? q.correctAnswer ?? 'Not Defined';
      text += `Q${keySerial++}. [NUMERICAL] [ID: ${q.id}]: Correct Key -> ${correctVal}\n`;
    });
    text += `\n`;
  });

  text += `========================================================================\n`;
  text += `  End of Official Question Sheet.\n`;
  text += `========================================================================\n`;

  return text;
}

// Helper to generate full rich HTML format for downloadable Doc
export function generateQuestionPaperHTML(exam: Exam, studentName?: string, studentEmail?: string): string {
  let serial = 1;
  let qHtml = '';

  const sectionsList = exam.sections ? Object.entries(exam.sections) : [];

  sectionsList.forEach(([sectionName, section]: [string, any]) => {
    qHtml += `<h3>Section: ${sectionName.toUpperCase()}</h3>`;

    const mcqs = section.mcqs || [];
    const numericals = section.numericals || [];

    if (mcqs.length > 0) {
      qHtml += `<p class="part-header">Part A: Multiple Choice Questions (MCQs)</p>`;
      mcqs.forEach((q: Question) => {
        qHtml += `
          <div class="question-block">
            <span class="question-num">Question ${serial++} [MCQ] [ID: ${q.id}]</span>
            <div class="question-text">${q.text}</div>
        `;
        if (q.options && q.options.length > 0) {
          qHtml += `<ul class="options-list">`;
          const labels = ['A', 'B', 'C', 'D'];
          q.options.forEach((opt: string, oIdx: number) => {
            qHtml += `<li class="option-item"><strong>${labels[oIdx] || oIdx + 1})</strong> ${opt}</li>`;
          });
          qHtml += `</ul>`;
        }
        qHtml += `</div>`;
      });
    }

    if (numericals.length > 0) {
      qHtml += `<p class="part-header">Part B: Numerical Entry Questions</p>`;
      numericals.forEach((q: Question) => {
        qHtml += `
          <div class="question-block">
            <span class="question-num">Question ${serial++} [NUMERICAL] [ID: ${q.id}]</span>
            <div class="question-text">${q.text}</div>
            <div style="margin-left: 15px; margin-top: 10px; border-bottom: 1px dotted #a0aec0; width: 250px; height: 25px;">Response: </div>
          </div>
        `;
      });
    }
  });

  // Table rows for answers on last page
  let answerRows = '';
  let answerSerial = 1;
  sectionsList.forEach(([sectionName, section]: [string, any]) => {
    const mcqs = section.mcqs || [];
    const numericals = section.numericals || [];

    mcqs.forEach((q: Question) => {
      const correctVal = exam.answerKey?.[q.id] ?? q.correctAnswer ?? 'Not Defined';
      const textPreview = q.text.length > 60 ? q.text.substring(0, 57) + '...' : q.text;
      answerRows += `
        <tr>
          <td>${answerSerial++}</td>
          <td><span style="text-transform: uppercase; font-weight: bold; font-size: 8.5pt;">${sectionName}</span></td>
          <td><code style="font-family: monospace; font-size: 8.5pt;">${q.id}</code></td>
          <td>${textPreview}</td>
          <td><span style="color: #2f855a; font-weight: bold; background-color: #f0fff4; padding: 2px 6px; border-radius: 4px;">${correctVal}</span></td>
        </tr>
      `;
    });

    numericals.forEach((q: Question) => {
      const correctVal = exam.answerKey?.[q.id] ?? q.correctAnswer ?? 'Not Defined';
      const textPreview = q.text.length > 60 ? q.text.substring(0, 57) + '...' : q.text;
      answerRows += `
        <tr>
          <td>${answerSerial++}</td>
          <td><span style="text-transform: uppercase; font-weight: bold; font-size: 8.5pt;">${sectionName}</span></td>
          <td><code style="font-family: monospace; font-size: 8.5pt;">${q.id}</code></td>
          <td>${textPreview}</td>
          <td><span style="color: #2b6cb0; font-weight: bold; background-color: #ebf8ff; padding: 2px 6px; border-radius: 4px;">${correctVal}</span></td>
        </tr>
      `;
    });
  });

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${exam.title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #334155; padding: 20px; }
        h1 { text-align: center; color: #1e3a8a; font-size: 22pt; margin-top: 0; margin-bottom: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
        .platform-subtitle { text-align: center; color: #64748b; font-size: 10pt; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 25px; margin-top: 0; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
        .meta-table td { padding: 10px 14px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #334155; }
        h3 { color: #2563eb; font-size: 14pt; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin-top: 35px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
        .part-header { font-weight: bold; color: #475569; font-size: 11pt; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 2px; margin-top: 20px; text-transform: uppercase; }
        .question-block { margin-top: 20px; margin-bottom: 20px; page-break-inside: avoid; }
        .question-num { font-weight: 800; color: #1e293b; font-size: 10.5pt; display: block; border-left: 3px solid #64748b; padding-left: 8px; margin-bottom: 8px; }
        .question-text { margin-left: 12px; font-size: 10.5pt; color: #334155; line-height: 1.6; }
        .options-list { margin-left: 15px; margin-top: 10px; list-style-type: none; padding-left: 0; }
        .option-item { margin-bottom: 6px; font-size: 10pt; color: #475569; padding-left: 8px; }
        .page-break { page-break-before: always; }
        .answer-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
        .answer-table th, .answer-table td { border: 1px solid #cbd5e0; padding: 12px 10px; text-align: left; font-size: 9.5pt; }
        .answer-table th { background-color: #f8fafc; color: #475569; font-weight: bold; border-bottom: 2px solid #cbd5e0; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 1px; }
        .footer { font-size: 8.5pt; text-align: center; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <h1>${exam.title}</h1>
      <p class="platform-subtitle">Conqueror Preparation Platform — Question Paper</p>
      
      <table class="meta-table">
        <tr>
          <td><strong>Assessment Template ID:</strong> <code style="font-family: monospace;">${exam.id}</code></td>
          <td><strong>Total Available Time:</strong> ${exam.duration} Minutes</td>
        </tr>
        <tr>
          <td><strong>Assigned Candidate:</strong> ${studentName || "Class Template Base / No Assignment"}</td>
          <td><strong>Email Coordinates:</strong> ${studentEmail || "Anonymous / Unassigned User"}</td>
        </tr>
        <tr>
          <td><strong>Creation Timestamp:</strong> ${format(new Date(), 'dd MMMM yyyy - hh:mm a')}</td>
          <td><strong>Audit Code:</strong> CPC-QP-${hashString(exam.id)}</td>
        </tr>
      </table>
      
      ${qHtml}
      
      <div class="page-break"></div>
      
      <h1 style="color: #0f172a; margin-top: 40px;">Official Answer Keys</h1>
      <p class="platform-subtitle" style="margin-bottom: 40px;">Validation matrix for ${exam.title}</p>
      
      <table class="answer-table">
        <thead>
          <tr>
            <th style="width: 8%">S.No.</th>
            <th style="width: 15%">Section</th>
            <th style="width: 20%">Question ID</th>
            <th style="width: 42%">Question Text Snippet</th>
            <th style="width: 15%">Correct Answer</th>
          </tr>
        </thead>
        <tbody>
          ${answerRows}
        </tbody>
      </table>

      <p class="footer">Confidential verification key. Conqueror Preparation Platform © ${new Date().getFullYear()}. All rights reserved.</p>
    </body>
    </html>
  `;
}

// Low level hashing to look like a premium enterprise system
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

// Offline Download trigger
export function downloadLocalDoc(exam: Exam, studentName?: string, studentEmail?: string) {
  const htmlContent = generateQuestionPaperHTML(exam, studentName, studentEmail);
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const element = document.createElement('a');
  element.href = url;
  const cleanedTitle = exam.title.replace(/[^a-z0-9]/gi, '_');
  element.download = `${cleanedTitle}_Question_Paper.doc`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

// Google Docs API client calls
export async function createGoogleDocInDrive(exam: Exam, studentName?: string, studentEmail?: string): Promise<string> {
  // Uses authenticating from the sheets helper
  const token = await authenticateGoogle();
  
  // 1. Create document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${exam.title} — Official Question Paper`,
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Google Doc create request failed: ${createResponse.statusText} (${errText})`);
  }

  const docData = await createResponse.json();
  const documentId = docData.documentId;

  // 2. Build plain text payload
  const plainText = generateQuestionPaperPlainText(exam, studentName, studentEmail);

  // 3. Insert text content
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            text: plainText,
            location: {
              index: 1,
            },
          },
        },
      ],
    }),
  });

  if (!updateResponse.ok) {
    const errText = await updateResponse.text();
    throw new Error(`Google Doc payload population failed: ${updateResponse.statusText} (${errText})`);
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
}
