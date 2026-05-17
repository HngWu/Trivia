import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "./types/game";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// High-difficulty prompt with strict summary rules
const SYSTEM_PROMPT = `You generate professional-grade, high-difficulty trivia questions in a valid JSON array of objects. 
Target experts and enthusiasts; avoid common knowledge, famous dates, or overly-popular facts.
Difficulty level: 9/10. Focus on obscure details, historical nuances, secondary figures, and complex relationships.

Properties: 
- id (string)
- summary (Short, cryptic title that sets the mood but DOES NOT give clues or reveal the answer. Example: instead of "Capital of France", use "Seine City Secrets")
- text (The full, challenging question)
- type (multiple_choice/boolean/boolean_yes_no/text)
- options (4 strings or null)
- correct_answer
- explanation.`;

const USER_PROMPT = (topic: string, count: number, excluded: string[]) => 
  `Topic: "${topic}". Generate ${count} unique, expert-level questions.
  Requirements:
  - High difficulty: Questions should be challenging even for well-read individuals.
  - No Spoilers: The 'summary' field must be enigmatic and never hint at the answer.
  - Clean Text: Do NOT include the topic name "${topic}" in the question text or options if it gives away the answer.
  ${excluded.length > 0 ? `DO NOT duplicate these: ${excluded.slice(0, 40).join(' | ')}` : ''}
  Respond ONLY with the JSON array.`;

async function generateWithGemini(topic: string, count: number, excluded: string[]): Promise<Question[] | null> {
  if (!GEMINI_API_KEY) return null;
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    systemInstruction: SYSTEM_PROMPT 
  });

  try {
    console.log(`[AI] Gemini generating ${count} for ${topic}...`);
    const result = await model.generateContent(USER_PROMPT(topic, count, excluded));
    const text = result.response.text();
    
    // Robust extraction: find the first '[' and last ']'
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr) as Question[];
    }
    return null;
  } catch (err) {
    console.warn(`[AI] Gemini failed:`, err);
    return null;
  }
}

async function generateWithDeepSeek(topic: string, count: number, excluded: string[]): Promise<Question[] | null> {
  if (!DEEPSEEK_API_KEY) return null;

  try {
    console.log(`[AI] DeepSeek fallback for ${topic}...`);
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: USER_PROMPT(topic, count, excluded) }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.warn(`[AI] DeepSeek API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = content.substring(start, end + 1);
      return JSON.parse(jsonStr) as Question[];
    }
    return null;
  } catch (err) {
    console.error("[AI] DeepSeek failed:", err);
    return null;
  }
}

export async function generateRoasts(playerHistory: { name: string, wrongAnswers: { question: string, answer: string, correct: string }[] }[]): Promise<Record<string, string>> {
  if (playerHistory.length === 0) return {};
  
  const personalityPool = [
    "Sarcastic British Butler",
    "Aggressive Gym Bro",
    "Disappointed Middle School Teacher",
    "Edgy 1990s Hacker",
    "Overly-Polite Southern Belle (with hidden shade)",
    "Clueless but enthusiastic Boomer",
    "Gordon Ramsay-style Chef",
    "Cryptic Fortune Teller",
    "Corporate HR Manager using 'synergy' speak",
    "Snarky AI with a superiority complex"
  ];

  const selectedPersonalities = [...personalityPool].sort(() => Math.random() - 0.5);

  const prompt = `You are a group of diverse roast masters. Roast these trivia players based on their wrong answers.
  Each player MUST be roasted by a DIFFERENT personality from this list: [${selectedPersonalities.join(', ')}].
  
  Guidelines:
  - Keep each roast short (max 20 words).
  - Be creative, witty, and savage.
  - Reference their specific wrong answers and the correct ones when relevant.
  - Ensure the tone matches the assigned personality.
  - Return a JSON object where keys are player names and values are their roasts.
  
  Match History:
  ${playerHistory.map(p => `- ${p.name}: ${p.wrongAnswers.map(w => `[Q: ${w.question} | Ans: ${w.answer} | Correct: ${w.correct}]`).join(', ')}`).join('\n')}
  
  Respond ONLY with the JSON object.`;

  // Try Gemini first
  if (GEMINI_API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(text.substring(start, end + 1));
      }
    } catch (e) { console.warn("[Roast] Gemini failed", e); }
  }

  // Fallback to DeepSeek
  if (DEEPSEEK_API_KEY) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(content.substring(start, end + 1));
          }
        }
      }
    } catch (e) { console.error("[Roast] DeepSeek failed", e); }
  }

  return {};
}

export type AIProvider = "gemini" | "deepseek" | "auto";

export async function generateAIQuestions(
  topic: string, 
  provider: AIProvider = "auto", 
  count: number = 10,
  excluded: string[] = []
): Promise<Question[]> {
  // 1. Explicit Gemini
  if (provider === "gemini") {
    const res = await generateWithGemini(topic, count, excluded);
    if (res) return res;
    throw new Error("Gemini failed");
  }

  // 2. Explicit DeepSeek
  if (provider === "deepseek") {
    const res = await generateWithDeepSeek(topic, count, excluded);
    if (res) return res;
    throw new Error("DeepSeek failed");
  }

  // 3. Auto Fallback (Default)
  const geminiResult = await generateWithGemini(topic, count, excluded);
  if (geminiResult) return geminiResult;

  const deepSeekResult = await generateWithDeepSeek(topic, count, excluded);
  if (deepSeekResult) return deepSeekResult;

  throw new Error("AI generation failed");
}
