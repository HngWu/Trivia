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
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT 
  });

  try {
    console.log(`[AI] Gemini generating ${count} for ${topic}...`);
    const result = await model.generateContent(USER_PROMPT(topic, count, excluded));
    const text = result.response.text();
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) as Question[] : null;
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

    const data = await response.json();
    if (!response.ok) return null;
    
    const content = data.choices[0].message.content;
    const match = content.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) as Question[] : null;
  } catch (err) {
    console.error("[AI] DeepSeek failed:", err);
    return null;
  }
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
