'use server';

import { createClient } from "./supabase/server";
import { redis, ROOM_TTL } from "./redis";
import { Room, Player, Question, Answer } from "./types/game";
import { validateAnswer } from "./validation";

export async function createRoom(topic: string, leaderName: string) {
  const supabase = await createClient();
  const normalizedTopic = topic.toLowerCase();
  
  // 1. Try to fetch from database first
  let { data: allQuestions } = await supabase
    .from("filler_questions")
    .select("*")
    .eq("topic", normalizedTopic);
    
  let questions = allQuestions;

  // 2. If questions found, shuffle them to ensure randomness
  if (questions && questions.length > 0) {
    questions = questions
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
  }
    
  // 3. If no questions found (e.g., custom topic), fallback to AI
  if (!questions || questions.length === 0) {
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    const aiData = await aiResponse.json();
    questions = aiData.questions;
  }

  if (!questions || questions.length === 0) throw new Error("Failed to generate or retrieve questions");

  // Safety: Ensure every question has a unique ID and map fields if needed
  const finalQuestions: Question[] = questions.map((q: Record<string, unknown>, idx: number) => ({
    id: (q.id as string) || `q-${idx}-${crypto.randomUUID()}`,
    summary: q.summary as string,
    text: q.text as string,
    type: q.type as "multiple_choice" | "boolean" | "text",
    options: q.options as string[],
    correct_answer: q.correct_answer as string,
    explanation: (q.explanation as string) || "No explanation provided."
  }));

  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  const player: Player = {
    id: crypto.randomUUID(),
    name: leaderName,
    score: 0,
    is_leader: true,
  };

  const roomData: Room = {
    code,
    topic,
    status: "waiting",
    current_question_index: 0,
    leader_id: player.id, 
    questions: finalQuestions,
  };
  
  await redis.set(`room:${code}`, roomData, { ex: ROOM_TTL });
  await redis.hset(`players:${code}`, { [player.id]: JSON.stringify(player) });
  await redis.expire(`players:${code}`, ROOM_TTL);
  
  return { room: roomData, player };
}

export async function joinRoom(code: string, playerName: string) {
  const normalizedCode = code.toUpperCase();
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  
  if (!room) throw new Error("Room not found");
  
  const player: Player = {
    id: crypto.randomUUID(),
    name: playerName,
    score: 0,
    is_leader: false,
  };
  
  await redis.hset(`players:${normalizedCode}`, { [player.id]: JSON.stringify(player) });
  
  return { room, player };
}

export async function getRoomState(code: string) {
  const normalizedCode = code.toUpperCase();
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  const playersMap = await redis.hgetall<Record<string, string | Player>>(`players:${normalizedCode}`);
  const answersMap = await redis.hgetall<Record<string, string | Answer>>(`answers:${normalizedCode}`);
  
  const players: Player[] = playersMap ? Object.values(playersMap).map(p => typeof p === "string" ? JSON.parse(p) : p) : [];
  const allAnswers: Answer[] = answersMap ? Object.values(answersMap).map(a => typeof a === "string" ? JSON.parse(a) : a) : [];
  
  return { room, players, allAnswers };
}

export async function updateRoomStatus(code: string, status: string, index?: number) {
  const normalizedCode = code.toUpperCase();
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found in Redis during status update");
  
  room.status = status;
  if (index !== undefined) room.current_question_index = index;
  
  await redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL });
  return room;
}

export async function submitWager(code: string, playerId: string, questionId: string, wager: number) {
  const normalizedCode = code.toUpperCase();
  const answer: Answer = {
    player_id: playerId,
    question_id: questionId,
    wager,
    submitted_answer: "",
    is_correct: false,
  };
  
  await redis.hset(`answers:${normalizedCode}`, { [`${playerId}:${questionId}`]: JSON.stringify(answer) });
  await redis.expire(`answers:${normalizedCode}`, ROOM_TTL);
}

export async function submitAnswer(code: string, playerId: string, questionId: string, answerText: string) {
  const normalizedCode = code.toUpperCase();
  const key = `${playerId}:${questionId}`;
  
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found");
  
  const question = room.questions.find(q => q.id === questionId);
  if (!question) throw new Error("Question not found");

  const existingRaw = await redis.hget<string | Answer>(`answers:${normalizedCode}`, key);
  if (!existingRaw) throw new Error("Wager not found for this question");
  
  const existing = typeof existingRaw === "string" ? JSON.parse(existingRaw) as Answer : existingRaw;
  
  const isCorrect = validateAnswer(answerText, question.correct_answer);
  const scoreDelta = isCorrect ? existing.wager : 0;
  
  existing.submitted_answer = answerText;
  existing.is_correct = isCorrect;
  await redis.hset(`answers:${normalizedCode}`, { [key]: JSON.stringify(existing) });
  
  if (scoreDelta > 0) {
    const playerRaw = await redis.hget<string | Player>(`players:${normalizedCode}`, playerId);
    if (playerRaw) {
      const player = typeof playerRaw === "string" ? JSON.parse(playerRaw) as Player : playerRaw;
      player.score += scoreDelta;
      await redis.hset(`players:${normalizedCode}`, { [playerId]: JSON.stringify(player) });
    }
  }
}

export async function kickPlayer(roomCode: string, playerId: string, leaderId: string) {
  const normalizedCode = roomCode.toUpperCase();
  
  const roomRaw = await redis.get(`room:${normalizedCode}`);
  const room = typeof roomRaw === "string" ? JSON.parse(roomRaw) as Room : roomRaw;
  
  if (!room || room.leader_id !== leaderId) {
    throw new Error("Only the room leader can kick players.");
  }

  await redis.hdel(`players:${normalizedCode}`, playerId);
  
  const answersRaw = await redis.hgetall(`answers:${normalizedCode}`);
  if (answersRaw) {
    for (const [key] of Object.entries(answersRaw)) {
      if (key.startsWith(`${playerId}:`)) {
        await redis.hdel(`answers:${normalizedCode}`, key);
      }
    }
  }
}

export async function getTopics() {
  const supabase = await createClient();
  const { data: topics, error } = await supabase
    .from("topics")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
  
  return topics;
}

export async function addTopic(topic: { id: string, name: string, icon: string, description: string, example_question: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .insert([topic]);
  
  if (error) throw error;
}

export async function addQuestions(questions: any[]) {
  const supabase = await createClient();
  
  // Duplicate check based on text
  const texts = questions.map(q => q.text);
  const { data: existing } = await supabase
    .from("filler_questions")
    .select("text")
    .in("text", texts);
  
  const existingTexts = new Set(existing?.map(e => e.text) || []);
  const newQuestions = questions.filter(q => !existingTexts.has(q.text));
  
  if (newQuestions.length === 0) return { count: 0, message: "All questions were duplicates." };

  const { error } = await supabase
    .from("filler_questions")
    .insert(newQuestions);
  
  if (error) throw error;
  
  return { count: newQuestions.length, message: `Successfully added ${newQuestions.length} questions.` };
}
