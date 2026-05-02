'use server';

import { createClient } from "./supabase/server";
import { generateQuestions } from "./gemini";
import { redis, ROOM_TTL } from "./redis";

export async function createRoom(topic: string, leaderName: string, isCustom: boolean = false) {
  const supabase = await createClient();
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  let finalQuestions: any[] = [];
  if (isCustom) {
    try {
      finalQuestions = await generateQuestions(topic);
    } catch (aiError) {
      console.warn("AI generation failed, falling back to database filler:", aiError);
    }
  }

  if (!finalQuestions || finalQuestions.length === 0) {
    const { data: filler } = await supabase
      .from("filler_questions")
      .select("*")
      .eq("topic", topic.toLowerCase())
      .limit(10);
      
    finalQuestions = filler || [];
  }

  const roomData = {
    code,
    topic,
    status: "waiting",
    current_question_index: 0,
    leader_id: "", 
    questions: finalQuestions,
  };
  
  await redis.set(`room:${code}`, roomData, { ex: ROOM_TTL });

  const player = {
    id: crypto.randomUUID(),
    name: leaderName,
    score: 0,
    is_leader: true,
  };
  
  await redis.hset(`players:${code}`, { [player.id]: JSON.stringify(player) });
  await redis.expire(`players:${code}`, ROOM_TTL);

  roomData.leader_id = player.id;
  await redis.set(`room:${code}`, roomData, { ex: ROOM_TTL });
  
  return { room: roomData, player };
}

export async function joinRoom(code: string, playerName: string) {
  const normalizedCode = code.toUpperCase();
  const room: any = await redis.get(`room:${normalizedCode}`);
  
  if (!room) throw new Error("Room not found");
  
  const player = {
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
  const room: any = await redis.get(`room:${normalizedCode}`);
  const playersMap: any = await redis.hgetall(`players:${normalizedCode}`);
  const answersMap: any = await redis.hgetall(`answers:${normalizedCode}`);
  
  // Players and answers might be stored as JSON strings depending on Redis behavior
  const players = playersMap ? Object.values(playersMap).map(p => typeof p === "string" ? JSON.parse(p) : p) : [];
  const allAnswers = answersMap ? Object.values(answersMap).map(a => typeof a === "string" ? JSON.parse(a) : a) : [];
  
  return { room, players, allAnswers };
}

export async function updateRoomStatus(code: string, status: string, index?: number) {
  const normalizedCode = code.toUpperCase();
  const room: any = await redis.get(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found in Redis during status update");
  
  room.status = status;
  if (index !== undefined) room.current_question_index = index;
  
  await redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL });
  return room;
}

export async function submitWager(code: string, playerId: string, questionId: string, wager: number) {
  const normalizedCode = code.toUpperCase();
  const answer = {
    player_id: playerId,
    question_id: questionId,
    wager,
    submitted_answer: "",
    is_correct: false,
  };
  
  await redis.hset(`answers:${normalizedCode}`, { [`${playerId}:${questionId}`]: JSON.stringify(answer) });
  await redis.expire(`answers:${normalizedCode}`, ROOM_TTL);
}

export async function submitAnswer(code: string, playerId: string, questionId: string, answerText: string, isCorrect: boolean, scoreDelta: number) {
  const normalizedCode = code.toUpperCase();
  const key = `${playerId}:${questionId}`;
  
  const existingRaw: any = await redis.hget(`answers:${normalizedCode}`, key);
  if (existingRaw) {
    const existing = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw;
    existing.submitted_answer = answerText;
    existing.is_correct = isCorrect;
    await redis.hset(`answers:${normalizedCode}`, { [key]: JSON.stringify(existing) });
  }
  
  if (scoreDelta > 0) {
    const playerRaw: any = await redis.hget(`players:${normalizedCode}`, playerId);
    if (playerRaw) {
      const player = typeof playerRaw === "string" ? JSON.parse(playerRaw) : playerRaw;
      player.score += scoreDelta;
      await redis.hset(`players:${normalizedCode}`, { [playerId]: JSON.stringify(player) });
    }
  }
}
