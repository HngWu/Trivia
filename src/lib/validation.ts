/**
 * Validates a user's answer against the correct answer with fuzzy matching.
 */
export function validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer || !correctAnswer) return false;

  const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
  
  const user = userAnswer.trim().toLowerCase();
  const correct = correctAnswer.trim().toLowerCase();

  // 1. Exact match (case insensitive)
  if (user === correct || normalize(user) === normalize(correct)) return true;

  // 2. Numerical check
  const userNum = parseFloat(user.replace(/[^0-9.-]/g, ''));
  
  // Handle range format "100-200" in correct answer
  if (correct.includes('-')) {
    const parts = correct.split('-').map(s => parseFloat(s.replace(/[^0-9.-]/g, '')));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(userNum)) {
      const min = Math.min(parts[0], parts[1]);
      const max = Math.max(parts[0], parts[1]);
      if (userNum >= min && userNum <= max) return true;
      
      // If it's a range, we don't apply the single-number tolerance below
      return false;
    }
  }

  const correctNum = parseFloat(correct.replace(/[^0-9.-]/g, ''));

  if (!isNaN(userNum) && !isNaN(correctNum)) {
    if (userNum === correctNum) return true;
    
    const diff = Math.abs(userNum - correctNum);
    // Allow +/- 1 for things like years
    if (diff <= 1) return true;
    
    // Allow 2% margin of error for larger numbers
    if (correctNum !== 0 && (diff / Math.abs(correctNum)) <= 0.02) return true;
  }

  // 3. Partial word match (for names/titles)
  const stopWords = new Set(['the', 'and', 'for', 'was', 'with', 'from']);
  const getSignificantWords = (text: string) => 
    text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

  const correctWords = getSignificantWords(correct);
  const userWords = getSignificantWords(user);

  if (correctWords.length >= 2) {
    for (const uWord of userWords) {
      if (correctWords.includes(uWord)) return true;
    }
  }

  return false;
}
