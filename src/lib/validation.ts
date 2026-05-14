/**
 * Validates a user's answer against the correct answer.
 * Only applies fuzzy matching for open-ended text questions.
 */
export function validateAnswer(userAnswer: string, correctAnswer: string, questionType?: string): boolean {
  if (!userAnswer || !correctAnswer) return false;

  const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
  
  const user = userAnswer.trim().toLowerCase();
  const correct = correctAnswer.trim().toLowerCase();

  // 1. Exact match (case insensitive, ignoring basic punctuation)
  if (user === correct || normalize(user) === normalize(correct)) return true;

  if (questionType === "text") {
    // 2. Numerical check (Only applied to open-ended questions)
    const userNum = parseFloat(user.replace(/[^0-9.-]/g, ''));
    const correctNum = parseFloat(correct.replace(/[^0-9.-]/g, ''));

    if (!isNaN(userNum) && !isNaN(correctNum)) {
      const diff = Math.abs(userNum - correctNum);
      
      // Range format "100-200" in correct answer
      if (correct.includes('-')) {
        const parts = correct.split('-').map(s => parseFloat(s.replace(/[^0-9.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const min = Math.min(parts[0], parts[1]);
          const max = Math.max(parts[0], parts[1]);
          if (userNum >= min && userNum <= max) return true;
          return false;
        }
      }

      // Exact number match
      if (userNum === correctNum) return true;
      
      // Year-specific logic (4-digit numbers)
      const isYear = (n: number) => n >= 1000 && n <= 2100;
      if (isYear(correctNum)) {
        // Allow +/- 1 for years
        if (diff <= 1) return true;
        // Do NOT allow 2% margin for years as it's too broad
      } else {
        // Allow +/- 1 for small integers (0-100)
        if (correctNum <= 100 && diff <= 1 && Number.isInteger(correctNum)) return true;

        // Allow 2% margin of error for larger numbers
        if (correctNum !== 0 && (diff / Math.abs(correctNum)) <= 0.02) return true;
      }
    }

    // 3. Fuzzy matching for open-ended text questions only
    const stopWords = new Set(['the', 'and', 'for', 'was', 'with', 'from', 'a', 'an', 'in', 'on', 'of', 'to']);
    const getSignificantWords = (text: string) => 
      text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));

    const correctWords = getSignificantWords(correct);
    const userWords = getSignificantWords(user);

    // If correct answer has significant words, check if user provided at least one of them
    if (correctWords.length > 0) {
      for (const uWord of userWords) {
        // Direct inclusion
        if (correctWords.includes(uWord)) return true;
      }
    }
  }

  return false;
}
