import { Exam, Submission, ExamSection } from '../types';

export function calculateSubmissionScore(exam: Exam, submission: Submission) {
  if (!exam || !exam.sections) {
    return { score: 0, correct: 0, incorrect: 0, skipped: 0 };
  }

  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;

  const sections = Object.values(exam.sections) as ExamSection[];

  const allQuestionIds = sections.flatMap(s => [
    ...s.mcqs.map(q => q.id),
    ...s.numericals.map(q => q.id)
  ]);

  allQuestionIds.forEach(qId => {
    const response = submission.answers?.[qId];
    const correct = exam.answerKey[qId];
    
    // Determine if it is an MCQ for negative marking
    // We check in all sections
    const isMcq = sections.some(section => 
        section.mcqs.some(q => q.id === qId)
    );

    if (!response || (response.status !== 'attempted' && response.status !== 'marked') || response.value === null || response.value === '') {
      skippedCount++;
      return;
    }

    const isCorrect = typeof correct === 'number' 
      ? Math.abs(Number(response.value) - Number(correct)) < 0.01 
      : String(response.value).trim().toUpperCase() === String(correct).trim().toUpperCase();

    if (isCorrect) {
      score += 4;
      correctCount++;
    } else {
      incorrectCount++;
      score -= 1; // Strict 4x - y formula (4 for correct, -1 for any incorrect attempt)
    }
  });

  return { score, correct: correctCount, incorrect: incorrectCount, skipped: skippedCount };
}
