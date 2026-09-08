'use server';

import { getDatabase, getActiveProviderNameSync } from "./db";
import { redis } from "./redis";
import { gameStore, normalizeCode } from "./game-store";
import { Room, Player, Question, Answer, GameState, Topic } from "./types/game";
import { validateAnswer } from "./validation";
import { AIProvider, generateRoasts, generateAIQuestions } from "./ai";
import crypto from "crypto";
import { cache } from 'react';

const SYNC_BUFFER_MS = 1500;
const TOPICS_CACHE_KEY = "cached_topics";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getServerTime() {
  return Date.now();
}

// Helper for consistent state retrieval
async function getFullState(code: string) {
  return await gameStore.getFullState(normalizeCode(code));
}

// Internal helper for consistent room state transitions
function advanceRoomState(room: Room, updates: Partial<Room>) {
  Object.assign(room, updates);
  room.version = (room.version || 0) + 1;
  room.status_updated_at = Date.now() + SYNC_BUFFER_MS;
}

// Helper to persist room and its lightweight sync record
async function saveRoom(normalizedCode: string, room: Room) {
  await gameStore.saveRoom(normalizeCode(normalizedCode), room);
}

export async function createRoom(topic: string, leaderName: string, provider: AIProvider = "auto", count: number = 10) {
  const db = await getDatabase();
  const normalizedTopic = topic.toLowerCase();
  
  let questions = await db.getQuestionsForTopic(normalizedTopic, count);
    
  if (!questions || questions.length === 0) {
    try {
      questions = await generateAIQuestions(topic, provider, count, []);
    } catch (e: unknown) {
      const err = e as Error;
      console.error("AI generation failed in createRoom:", err);
      throw new Error(`Failed to generate questions for topic "${topic}": ${err.message}`);
    }
  }

  if (!questions || questions.length === 0) {
    throw new Error(`No questions available for topic "${topic}" and AI generation failed.`);
  }

  const finalQuestions: Question[] = questions.map((q: Question, idx: number) => ({
    id: q.id || `q-${idx}-${crypto.randomUUID()}`,
    summary: q.summary,
    text: q.text,
    type: q.type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation || "No explanation provided."
  }));

  const code = generateRoomCode();
  const player: Player = {
    id: crypto.randomUUID(),
    name: leaderName.trim(),
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
  
  await Promise.all([
    saveRoom(code, roomData),
    gameStore.setPlayer(code, player),
  ]);
  
  return { room: roomData, player };
}

export async function joinRoom(code: string, playerName: string) {
  const normalizedCode = normalizeCode(code);
  const trimmedName = (playerName || "").trim();
  if (!normalizedCode) throw new Error("Room code is required");
  if (!trimmedName) throw new Error("Player name is required");

  const { room, players } = await getFullState(normalizedCode);
  
  if (!room) throw new Error("Room not found");
  
  // Prevent duplicate joins with same name
  const existingPlayer = players.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (existingPlayer) {
    return { room, player: existingPlayer };
  }
  
  const player: Player = {
    id: crypto.randomUUID(),
    name: trimmedName,
    score: 0,
    is_leader: false,
  };
  
  // Increment room version to trigger UI sync
  advanceRoomState(room, {});
  
  await Promise.all([
    gameStore.setPlayer(normalizedCode, player),
    saveRoom(normalizedCode, room)
  ]);
  
  return { room, player };
}

export async function getRoomState(code: string) {
  return await getFullState(normalizeCode(code));
}

export async function updateRoomStatus(code: string, status: GameState, index?: number) {
  const normalizedCode = normalizeCode(code);
  const { room, players, allAnswers } = await getFullState(normalizedCode);
  if (!room) throw new Error("Room not found");
  
  const targetIndex = index !== undefined ? index : room.current_question_index;
  const currentQuestion = room.questions[targetIndex];

  // Auto-fill missing wagers/answers when advancing
  if (currentQuestion) {
    const updates: Record<string, string> = {};
    
    if (status === "question" && room.status === "wager") {
      // Advancing from wager to question: fill missing wagers
      for (const p of players) {
        const existing = allAnswers.find(a => a.player_id === p.id && a.question_id === currentQuestion.id);
        if (!existing) {
          const answer: Answer = {
            player_id: p.id,
            question_id: currentQuestion.id,
            wager: 1, // Default
            submitted_answer: "",
            is_correct: false,
          };
          updates[`${p.id}:${currentQuestion.id}`] = JSON.stringify(answer);
        }
      }
    } else if (status === "results" && room.status === "question") {
      // Advancing from question to results: fill missing answers
      for (const p of players) {
        const existing = allAnswers.find(a => a.player_id === p.id && a.question_id === currentQuestion.id);
        if (existing && existing.submitted_answer === "") {
          existing.submitted_answer = "TIMEOUT_EXPIRED";
          existing.is_correct = false;
          updates[`${p.id}:${currentQuestion.id}`] = JSON.stringify(existing);
        } else if (!existing) {
          const answer: Answer = {
            player_id: p.id,
            question_id: currentQuestion.id,
            wager: 1,
            submitted_answer: "TIMEOUT_EXPIRED",
            is_correct: false,
          };
          updates[`${p.id}:${currentQuestion.id}`] = JSON.stringify(answer);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const answersList: Answer[] = Object.values(updates).map(u => JSON.parse(u) as Answer);
      await gameStore.setAnswers(normalizedCode, answersList);
    }
  }

  // Explicit status update: ensure we respect the intended destination
  advanceRoomState(room, { 
    status, 
    ...(index !== undefined && { current_question_index: index })
  });
  
  await saveRoom(normalizedCode, room);
  return await getFullState(normalizedCode);
}

export async function submitWager(code: string, playerId: string, questionId: string, wager: number) {
  const normalizedCode = normalizeCode(code);
  const answer: Answer = {
    player_id: playerId,
    question_id: questionId,
    wager,
    submitted_answer: "",
    is_correct: false,
  };
  
  await gameStore.setAnswer(normalizedCode, answer);

  const state = await getFullState(normalizedCode);
  if (state.room && state.room.status === "wager") {
    const qAnswers = state.allAnswers.filter(a => a.question_id === questionId);
    // Automatic transition only if NOT a single player room (leader must push for 1 player)
    // or if we want automatic for everyone including 1 player
    if (qAnswers.length > 0 && qAnswers.length === state.players.length) {
       advanceRoomState(state.room, { status: "question" });
    } else {
       advanceRoomState(state.room, {});
    }
    await saveRoom(normalizedCode, state.room);
    return await getFullState(normalizedCode);
  }
  return state;
}

export async function submitAnswer(code: string, playerId: string, questionId: string, answerText: string) {
  const normalizedCode = normalizeCode(code);
  
  const room = await gameStore.getRoom(normalizedCode);
  if (!room) throw new Error("Room not found");
  
  const question = room.questions.find(q => q.id === questionId);
  if (!question) throw new Error("Question not found");

  const existing = await gameStore.getAnswer(normalizedCode, playerId, questionId);
  if (!existing) throw new Error("Wager not found");
  
  const isCorrect = validateAnswer(answerText, question.correct_answer, question.type);
  const scoreDelta = isCorrect ? existing.wager : 0;
  
  existing.submitted_answer = answerText;
  existing.is_correct = isCorrect;
  await gameStore.setAnswer(normalizedCode, existing);
  
  if (scoreDelta > 0) {
    const player = await gameStore.getPlayer(normalizedCode, playerId);
    if (player) {
      player.score = (player.score || 0) + scoreDelta;
      await gameStore.setPlayer(normalizedCode, player);
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
    await saveRoom(normalizedCode, state.room);
    return await getFullState(normalizedCode);
  }
  return state;
}

export async function kickPlayer(roomCode: string, playerId: string, leaderId: string) {
  const normalizedCode = normalizeCode(roomCode);
  const { room } = await getFullState(normalizedCode);
  if (!room || room.leader_id !== leaderId) throw new Error("Unauthorized");

  await gameStore.removePlayer(normalizedCode, playerId);

  // Increment room version to trigger UI sync for everyone (especially the kicked player)
  advanceRoomState(room, {});
  await saveRoom(normalizedCode, room);

  return await getFullState(normalizedCode);
}

// Lightweight sync check for room synchronization (Redis + Local Fallback)
export async function getRoomSync(code: string): Promise<{
  version: number;
  statusUpdatedAt: number;
  status: GameState;
  currentQuestionIndex: number;
} | null> {
  return await gameStore.getRoomSync(normalizeCode(code));
}

// Explicit room sync trigger for fallback signaling (Redis + Local Fallback)
export async function touchRoomSync(code: string): Promise<number> {
  return await gameStore.touchRoomSync(normalizeCode(code));
}

// Ultra-fast in-memory cache for topics (0.001ms response time)
let inMemoryTopics: Topic[] | null = null;
let inMemoryTopicsTime = 0;
const IN_MEMORY_TOPICS_TTL = 300_000; // 5 minutes

// Circuit breaker for Redis operations
let redisFailureTimestamp = 0;
const REDIS_COOLDOWN_MS = 60_000; // 60 seconds cooldown after a failure

export async function safeRedisOp<T>(op: () => Promise<T>, timeoutMs = 300): Promise<T | null> {
  // If active provider is SQLite, skip Redis entirely to avoid network latency and offline errors
  if (getActiveProviderNameSync() === 'sqlite') {
    return null;
  }
  // If recently failed, skip without waiting
  if (Date.now() - redisFailureTimestamp < REDIS_COOLDOWN_MS) {
    return null;
  }
  try {
    const result = await Promise.race([
      op(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), timeoutMs)
      )
    ]);
    return result;
  } catch (err) {
    redisFailureTimestamp = Date.now();
    console.warn('[Redis] Operation failed or timed out, tripping circuit breaker:', (err as Error).message);
    return null;
  }
}

export async function invalidateTopicCache() {
  inMemoryTopics = null;
  inMemoryTopicsTime = 0;
}

export const getTopics = cache(async (): Promise<Topic[]> => {
  try {
    // 1. Return in-memory cached topics immediately if fresh
    if (inMemoryTopics && inMemoryTopics.length > 0 && (Date.now() - inMemoryTopicsTime < IN_MEMORY_TOPICS_TTL)) {
      return inMemoryTopics;
    }

    // 2. For non-sqlite providers, check Redis with circuit breaker & 300ms timeout
    if (getActiveProviderNameSync() !== 'sqlite') {
      const cached = await safeRedisOp(() => redis.get<Topic[]>(TOPICS_CACHE_KEY), 300);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const result = cached.map(t => ({
          id: String(t.id),
          name: String(t.name),
          icon: String(t.icon),
          description: t.description ? String(t.description) : undefined,
          example_question: t.example_question ? String(t.example_question) : undefined
        }));
        inMemoryTopics = result;
        inMemoryTopicsTime = Date.now();
        return result;
      }
    }

    // 3. Query active database (local SQLite completes in <0.1ms)
    const db = await getDatabase();
    const topics = await db.getTopics();
    const result = (topics || []).map(t => ({
      id: String(t.id),
      name: String(t.name),
      icon: String(t.icon),
      description: t.description ? String(t.description) : undefined,
      example_question: t.example_question ? String(t.example_question) : undefined
    }));

    // Cache in process memory
    inMemoryTopics = result;
    inMemoryTopicsTime = Date.now();

    // Asynchronously write to Redis for cloud sync without awaiting/blocking
    if (getActiveProviderNameSync() !== 'sqlite') {
      safeRedisOp(() => redis.set(TOPICS_CACHE_KEY, result, { ex: 86400 }), 300).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error("Fetch Topics Error:", error);
    return [];
  }
});

export async function addTopic(topic: Topic) {
  const db = await getDatabase();
  await db.addTopic(topic);
  invalidateTopicCache();
  if (getActiveProviderNameSync() !== 'sqlite') {
    safeRedisOp(() => redis.del(TOPICS_CACHE_KEY), 300).catch(() => {});
  }
}

export async function addQuestions(questions: Question[]) {
  const db = await getDatabase();
  return await db.addQuestions(questions);
}

export async function deleteTopic(id: string) {
  const db = await getDatabase();
  await db.deleteTopic(id);
  invalidateTopicCache();
  if (getActiveProviderNameSync() !== 'sqlite') {
    safeRedisOp(() => redis.del(TOPICS_CACHE_KEY), 300).catch(() => {});
  }
}

export async function updateTopic(id: string, updates: Partial<Topic>) {
  const db = await getDatabase();
  await db.updateTopic(id, updates);
  invalidateTopicCache();
  if (getActiveProviderNameSync() !== 'sqlite') {
    safeRedisOp(() => redis.del(TOPICS_CACHE_KEY), 300).catch(() => {});
  }
}

export async function deleteQuestion(id: string) {
  const db = await getDatabase();
  await db.deleteQuestion(id);
}

export async function updateQuestion(id: string, updates: Partial<Question>) {
  const db = await getDatabase();
  await db.updateQuestion(id, updates);
}

export async function getQuestionsByTopic(topicId: string): Promise<Question[]> {
  const db = await getDatabase();
  const questions = await db.getQuestionsByTopic(topicId);
  return (questions || []).map(q => ({
    id: String(q.id),
    topic: String(q.topic),
    summary: String(q.summary),
    text: String(q.text),
    type: q.type,
    options: q.options ? [...q.options] : null,
    correct_answer: String(q.correct_answer),
    explanation: q.explanation ? String(q.explanation) : undefined
  }));
}

export async function getQuestionCountsByTopic(): Promise<Record<string, number>> {
  const db = await getDatabase();
  return await db.getQuestionCountsByTopic();
}

export async function getPlayableTopics(minQuestions: number = 10): Promise<Topic[]> {
  const [topics, counts] = await Promise.all([
    getTopics(),
    getQuestionCountsByTopic().catch(() => ({} as Record<string, number>))
  ]);

  return (topics || []).filter(topic => {
    if (topic.id.toLowerCase() === 'custom') return true;
    const count = counts[topic.id.toLowerCase()] || 0;
    return count >= minQuestions;
  });
}

export async function getAllQuestions(limit: number = 100): Promise<Question[]> {
  const db = await getDatabase();
  const questions = await db.getAllQuestions(limit);
  return (questions || []).map(q => ({
    id: String(q.id),
    topic: String(q.topic),
    summary: String(q.summary),
    text: String(q.text),
    type: q.type,
    options: q.options ? [...q.options] : null,
    correct_answer: String(q.correct_answer),
    explanation: q.explanation ? String(q.explanation) : undefined
  }));
}

export async function getMatchRoasts(playerHistory: { name: string, wrongAnswers: { question: string, answer: string, correct: string }[] }[]) {
  try {
    return await generateRoasts(playerHistory);
  } catch (e) {
    console.error("Roast action failed", e);
    return {};
  }
}
