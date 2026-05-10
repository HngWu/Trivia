import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "./types/game";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Extremely concise prompt to minimize token usage
const SYSTEM_PROMPT = `You generate trivia questions in a valid JSON array of objects. 
Properties: id (string), summary (short), text (full), type (multiple_choice/boolean/text), options (4 strings or null), correct_answer, explanation.`;

const USER_PROMPT = (topic: string, count: number, excluded: string[]) => 
  `Topic: "${topic}". Generate ${count} NEW unique questions.
  ${excluded.length > 0 ? `DO NOT duplicate these existing questions: ${excluded.slice(0, 40).join(' | ')}` : ''}
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
  
  const prompt = `You are a savage but witty trivia roast master. Roast these players based on their wrong answers.
  Keep each roast extremely short (max 15 words) and funny.
  Return a JSON object where keys are player names and values are their roasts.
  
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
