'use server';

import { createClient } from "./supabase/server";
import { redis, ROOM_TTL } from "./redis";
import { Room, Player, Question, Answer, GameState } from "./types/game";
import { validateAnswer } from "./validation";
import { AIProvider } from "./ai";

const SYNC_BUFFER_MS = 1500;

export async function getServerTime() {
  return Date.now();
}

// Helper for consistent state retrieval
async function getFullState(code: string) {
  const normalizedCode = code.toUpperCase();
  const [room, playersMap, answersMap] = await Promise.all([
    redis.get<Room>(`room:${normalizedCode}`),
    redis.hgetall<Record<string, string | Player>>(`players:${normalizedCode}`),
    redis.hgetall<Record<string, string | Answer>>(`answers:${normalizedCode}`)
  ]);
  
  const players: Player[] = playersMap ? Object.values(playersMap).map(p => typeof p === "string" ? JSON.parse(p) : p) : [];
  const allAnswers: Answer[] = answersMap ? Object.values(answersMap).map(a => typeof a === "string" ? JSON.parse(a) : a) : [];
  
  return { room, players, allAnswers };
}

// Internal helper for consistent room state transitions
function advanceRoomState(room: Room, updates: Partial<Room>) {
  Object.assign(room, updates);
  room.version = (room.version || 0) + 1;
  room.status_updated_at = Date.now() + SYNC_BUFFER_MS;
}

export async function createRoom(topic: string, leaderName: string, provider: AIProvider = "auto", count: number = 10) {
  const supabase = await createClient();
  const normalizedTopic = topic.toLowerCase();
  
  let { data: allQuestions } = await supabase
    .from("questions")
    .select("*")
    .eq("topic", normalizedTopic);
    
  let questions = allQuestions;

  if (questions && questions.length > 0) {
    questions = questions
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
    
  if (!questions || questions.length === 0) {
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, provider, count }),
    });
    const aiData = await aiResponse.json();
    questions = aiData.questions;
  }

  if (!questions || questions.length === 0) throw new Error("Failed to generate or retrieve questions");

  const finalQuestions: Question[] = questions.map((q: any, idx: number) => ({
    id: q.id || `q-${idx}-${crypto.randomUUID()}`,
    summary: q.summary,
    text: q.text,
    type: q.type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation || "No explanation provided."
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
    status_updated_at: Date.now(),
    version: 1
  };
  
  await redis.set(`room:${code}`, roomData, { ex: ROOM_TTL });
  await redis.hset(`players:${code}`, { [player.id]: JSON.stringify(player) });
  await redis.expire(`players:${code}`, ROOM_TTL);
  
  return { room: roomData, player };
}

export async function joinRoom(code: string, playerName: string) {
  const normalizedCode = code.toUpperCase();
  const { room, players } = await getFullState(normalizedCode);
  
  if (!room) throw new Error("Room not found");
  
  // Prevent duplicate joins with same name
  const existingPlayer = players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (existingPlayer) {
    return { room, player: existingPlayer };
  }
  
  const player: Player = {
    id: crypto.randomUUID(),
    name: playerName,
    score: 0,
    is_leader: false,
  };
  
  // Increment room version to trigger UI sync
  advanceRoomState(room, {});
  
  await Promise.all([
    redis.hset(`players:${normalizedCode}`, { [player.id]: JSON.stringify(player) }),
    redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL })
  ]);
  
  return { room, player };
}

export async function getRoomState(code: string) {
  return await getFullState(code);
}

export async function updateRoomStatus(code: string, status: GameState, index?: number) {
  const normalizedCode = code.toUpperCase();
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found");
  
  advanceRoomState(room, { 
    status, 
    ...(index !== undefined && { current_question_index: index })
  });
  
  await redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL });
  return await getFullState(normalizedCode);
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

  const state = await getFullState(normalizedCode);
  if (state.room && state.room.status === "wager") {
    const qAnswers = state.allAnswers.filter(a => a.question_id === questionId);
    if (qAnswers.length > 0 && qAnswers.length === state.players.length) {
       advanceRoomState(state.room, { status: "question" });
    } else {
       // Increment version even without state change to sync player counts
       advanceRoomState(state.room, {});
    }
    await redis.set(`room:${normalizedCode}`, state.room, { ex: ROOM_TTL });
    return await getFullState(normalizedCode);
  }
  return state;
}

export async function submitAnswer(code: string, playerId: string, questionId: string, answerText: string) {
  const normalizedCode = code.toUpperCase();
  const key = `${playerId}:${questionId}`;
  
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found");
  
  const question = room.questions.find(q => q.id === questionId);
  if (!question) throw new Error("Question not found");

  const existingRaw = await redis.hget<string | Answer>(`answers:${normalizedCode}`, key);
  if (!existingRaw) throw new Error("Wager not found");
  
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

  const state = await getFullState(normalizedCode);
  if (state.room && state.room.status === "question") {
    const qAnswers = state.allAnswers.filter(a => a.question_id === questionId && a.submitted_answer !== "");
    if (qAnswers.length > 0 && qAnswers.length === state.players.length) {
       advanceRoomState(state.room, { status: "results" });
    } else {
       // Increment version even without state change to sync player counts
       advanceRoomState(state.room, {});
    }
    await redis.set(`room:${normalizedCode}`, state.room, { ex: ROOM_TTL });
    return await getFullState(normalizedCode);
  }
  return state;
}

export async function kickPlayer(roomCode: string, playerId: string, leaderId: string) {
  const normalizedCode = roomCode.toUpperCase();
  const { room } = await getFullState(normalizedCode);
  if (!room || room.leader_id !== leaderId) throw new Error("Unauthorized");

  await redis.hdel(`players:${normalizedCode}`, playerId);
  
  const answersRaw = await redis.hgetall(`answers:${normalizedCode}`);
  if (answersRaw) {
    for (const [key] of Object.entries(answersRaw)) {
      if (key.startsWith(`${playerId}:`)) {
        await redis.hdel(`answers:${normalizedCode}`, key);
      }
    }
  }

  // Increment room version to trigger UI sync for everyone (especially the kicked player)
  advanceRoomState(room, {});
  await redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL });

  return await getFullState(normalizedCode);
}

export async function getTopics() {
  const supabase = await createClient();
  const { data: topics, error } = await supabase.from("topics").select("*").order("name");
  return topics || [];
}

export async function addTopic(topic: any) {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").insert([topic]);
  if (error) throw error;
}

export async function addQuestions(questions: any[]) {
  const supabase = await createClient();
  
  // 1. Identify which questions already exist in the DB by their text
  const texts = questions.map(q => q.text);
  const { data: existing } = await supabase.from("questions").select("text").in("text", texts);
  const existingTexts = new Set(existing?.map(e => e.text) || []);
  
  // 2. Filter out duplicates and sanitize for insertion
  const sanitizedQuestions = questions
    .filter(q => !existingTexts.has(q.text))
    .map(q => ({
      topic: q.topic,
      summary: q.summary,
      text: q.text,
      type: q.type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "No explanation provided."
    }));

  if (sanitizedQuestions.length === 0) {
    return { count: 0, message: "All questions in this batch are already in the database." };
  }

  // 3. Perform batch insert
  const { error } = await supabase.from("questions").insert(sanitizedQuestions);
  
  if (error) {
    console.error("Database Insert Error:", error);
    throw new Error(`Failed to upload questions: ${error.message}`);
  }

  return { 
    count: sanitizedQuestions.length, 
    message: `Successfully added ${sanitizedQuestions.length} new questions.` 
  };
}

export async function deleteTopic(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTopic(id: string, updates: any) {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateQuestion(id: string, updates: any) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function getQuestionsByTopic(topicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").select("*").eq("topic", topicId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
