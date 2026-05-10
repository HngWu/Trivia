import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "./types/game";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const PROMPT_TEMPLATE = (topic: string) => `Generate 10 trivia questions about the topic: "${topic}". 
The output must be a valid JSON array of objects. 
Each object must have the following properties:
- id: a unique string for the question (e.g. "q1", "q2", etc.)
- summary: a very short description of the question (e.g. "Space Exploration")
- text: the full question text
- type: one of "multiple_choice", "boolean", or "text"
- options: an array of 4 strings for "multiple_choice", or null for others
- correct_answer: the correct answer as a string
- explanation: a brief, clear explanation of why the answer is correct

Ensure a mix of question types. Respond ONLY with the JSON array.`;

async function generateWithGemini(topic: string): Promise<Question[] | null> {
  if (!GEMINI_API_KEY) return null;
  
  const models = ["gemini-3.1-flash-preview", "gemini-3.1-pro-preview"];
  const prompt = PROMPT_TEMPLATE(topic);

  for (const modelName of models) {
    try {
      console.log(`[AI] Attempting Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]) as Question[];
      }
    } catch (err) {
      console.warn(`[AI] Gemini ${modelName} failed:`, err);
    }
  }
  return null;
}

async function generateWithDeepSeek(topic: string): Promise<Question[] | null> {
  if (!DEEPSEEK_API_KEY) {
    console.warn("[AI] DeepSeek API key missing");
    return null;
  }

  const prompt = PROMPT_TEMPLATE(topic);

  try {
    console.log("[AI] Attempting DeepSeek fallback...");
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a trivia question generator. Always output valid JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("[AI] DeepSeek API Error:", data.error || data);
      return null;
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("[AI] DeepSeek returned invalid response structure:", data);
      return null;
    }

    const content = data.choices[0].message.content;
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as Question[];
    }
  } catch (err) {
    console.error("[AI] DeepSeek failed:", err);
  }
  return null;
}

export type AIProvider = "gemini" | "deepseek" | "auto";

export async function generateAIQuestions(topic: string, provider: AIProvider = "auto"): Promise<Question[]> {
  // 1. Explicit Gemini
  if (provider === "gemini") {
    const res = await generateWithGemini(topic);
    if (res) return res;
    throw new Error("Gemini failed to generate questions");
  }

  // 2. Explicit DeepSeek
  if (provider === "deepseek") {
    const res = await generateWithDeepSeek(topic);
    if (res) return res;
    throw new Error("DeepSeek failed to generate questions");
  }

  // 3. Auto Fallback (Default)
  const geminiResult = await generateWithGemini(topic);
  if (geminiResult) return geminiResult;

  const deepSeekResult = await generateWithDeepSeek(topic);
  if (deepSeekResult) return deepSeekResult;

  throw new Error("All AI providers failed to generate questions");
}
