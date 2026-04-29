'use server';

import { createClient } from "./supabase/server";

export async function createRoom(topic: string, leaderName: string) {
  const supabase = await createClient();
  
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code,
      topic,
      status: "waiting",
      current_question_index: 0
    })
    .select()
    .single();
    
  if (roomError) throw roomError;
  
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: leaderName,
      is_leader: true,
      score: 0
    })
    .select()
    .single();
    
  if (playerError) throw playerError;
  
  return { room, player };
}

export async function joinRoom(code: string, playerName: string) {
  const supabase = await createClient();
  
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();
    
  if (roomError || !room) throw new Error("Room not found");
  
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name: playerName,
      is_leader: false,
      score: 0
    })
    .select()
    .single();
    
  if (playerError) throw playerError;
  
  return { room, player };
}
