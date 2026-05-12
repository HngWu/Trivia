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
    "Betting {wager} on '{answer}'? That's not confidence, that's a financial crime against your own score.",
    "{wager} points vaporized for '{answer}'. I've seen more logical bets at a toddler's poker night.",
    "Imagine wagered {wager} and thinking the answer was '{answer}'. You're basically the 'Diamond Hands' of being wrong.",
    "Your {wager} point wager just met its maker. RIP to your dignity, and your guess: '{answer}'.",
  ],
  general: [
    "'{answer}'? The answer was '{correct}'. My GPS has better direction than your brain right now.",
    "The answer was '{correct}', but you chose '{answer}'. Are you playing trivia or a 'how to lose' speedrun?",
    "Honestly, '{answer}' is such a unique type of incorrect. It's like you're trying to invent a new reality.",
    "Next time, try using a dartboard. It would have a better chance than whatever logic led to '{answer}'.",
    "'{answer}'? If being wrong was an Olympic sport, you'd be the GOAT.",
    "The gap between '{answer}' and '{correct}' is larger than my student loans. Impressive.",
  ],
  consistent: [
    "With {count} wrong answers, you're not just playing; you're conducting a masterclass in statistical impossibility.",
    "Congratulations on your {count} misses. Even a broken clock is right twice a day, but you? Not so much.",
    "{count} strikes and you're still swinging. Your persistence is bordering on a medical mystery.",
    "That's {count} in a row. At this point, I'm more interested in your thought process than the actual trivia.",
  ],
  absurd: [
    "'{answer}'? Did you consult a sentient potato before submitting that?",
    "The answer was '{correct}'. Your answer was '{answer}'. I'm not mad, I'm just confused.",
    "'{answer}' is what happens when you let a random word generator play trivia for you.",
  ],
  pity: [
    "Oh honey... '{answer}'? I'll just pretend you were kidding and let you keep your 0 points.",
    "I'd roast you for '{answer}', but I think the leaderboard is already doing that for me.",
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

    // Probability-based selection to increase variety
    const rand = Math.random();

    // 1. High Wager logic (Priority)
    if (worst.wager >= 8 && rand > 0.3) {
      const list = TEMPLATES.highWager;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    } 
    // 2. High Count logic
    else if (wrongAnswers.length >= 4 && rand > 0.4) {
      const list = TEMPLATES.consistent;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    }
    // 3. Absurd/Pity logic
    else if (rand < 0.2) {
      const list = TEMPLATES.absurd;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    }
    else if (rand < 0.4) {
      const list = TEMPLATES.pity;
      selectedRoast = list[Math.floor(Math.random() * list.length)];
    }
    // 4. General logic (Fallback)
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
