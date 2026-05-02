import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "./types/game";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateQuestions(topic: string): Promise<Question[]> {
  // List of models to try in order of preference
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let questions = null;
  let lastError = null;

  const prompt = `Generate 10 trivia questions about the topic: "${topic}". 
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

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]) as Question[];
        console.log(`Successfully generated questions with ${modelName}`);
        return questions;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`Model ${modelName} failed:`, errorMessage);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All models failed to generate valid JSON");
}
