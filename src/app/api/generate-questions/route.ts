import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON if Gemini wraps it in markdown code blocks
    const jsonString = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(jsonString);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
