interface WrongAnswer {
  question: string;
  answer: string;
  correct: string;
  wager: number;
}

interface PlayerStats {
  name: string;
  wrongAnswers: WrongAnswer[];
}

const TEMPLATES = {
  highWager: [
    "Betting {wager} on '{answer}'? That's not confidence, that's a cry for help.",
    "{wager} points down the drain for '{answer}'. Your strategy is as solid as wet paper.",
    "Imagine wagered {wager} and thinking the answer was '{answer}'. Absolutely legendary failure.",
  ],
  general: [
    "'{answer}'? I've seen better guesses from a magic 8-ball with a leak.",
    "The answer was '{correct}', but you went with '{answer}'. Do you just enjoy being wrong?",
    "Honestly, '{answer}' is such a unique type of incorrect. Points for creativity, I guess?",
    "Next time, try using your brain instead of just hitting keys for '{answer}'.",
  ],
  consistent: [
    "With {count} wrong answers, you're not just playing; you're conducting a masterclass in failure.",
    "Congratulations on your {count} misses. Most people would have stumbled into a correct answer by now.",
    "{count} strikes and you're still swinging. Your persistence is almost as impressive as your wrongness.",
  ]
};

export function generateLocalRoasts(players: PlayerStats[]): Record<string, string> {
  const roasts: Record<string, string> = {};

  players.forEach(player => {
    const { name, wrongAnswers } = player;
    if (wrongAnswers.length === 0) return;

    // Pick a random wrong answer for context
    const worst = [...wrongAnswers].sort((a, b) => b.wager - a.wager)[0];
    let selectedRoast = "";

    // 1. High Wager logic
    if (worst.wager >= 8) {
      const list = TEMPLATES.highWager;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    } 
    // 2. High Count logic
    else if (wrongAnswers.length >= 3) {
      const list = TEMPLATES.consistent;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    }
    // 3. General logic
    else {
      const list = TEMPLATES.general;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    }

    // Fill placeholders
    roasts[name] = selectedRoast
      .replace("{answer}", worst.answer)
      .replace("{correct}", worst.correct)
      .replace("{wager}", worst.wager.toString())
      .replace("{count}", wrongAnswers.length.toString());
  });

  return roasts;
}
