"use client";

import React, { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getRoomState, updateRoomStatus, submitWager, submitAnswer } from "@/lib/actions";

type Question = {
  id: string;
  summary: string;
  text: string;
  type: "multiple_choice" | "boolean" | "text";
  options: string[] | null;
  correct_answer: string;
};

type Player = {
  id: string;
  name: string;
  score: number;
  is_leader: boolean;
};

type GameState = "waiting" | "wager" | "question" | "results" | "final";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.code;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<any>(null);
  
  // --- CORE SYSTEM STATE ---
  const [roomStatus, setRoomStatus] = useState<GameState>("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allRoomAnswers, setAllRoomAnswers] = useState<any[]>([]);
  const [myPlayerId, setMyPlayerId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState(60);
  const [roomLeaderId, setRoomLeaderId] = useState<string | null>(null);

  // --- DERIVED DATA (The Single Source of Truth) ---
  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  
  const myPlayer = useMemo(() => players.find(p => p.id === myPlayerId), [players, myPlayerId]);
  
  const isLeader = useMemo(() => {
    const savedId = myPlayerId || (typeof window !== "undefined" ? localStorage.getItem("player_id") : "");
    return (myPlayer?.is_leader || (roomLeaderId && savedId === roomLeaderId));
  }, [myPlayer, roomLeaderId, myPlayerId]);

  // All data for the CURRENT active round
  const roundData = useMemo(() => {
    if (!currentQuestion) return { wager: null, answer: "", results: null, competitors: [] };

    const qAnswers = allRoomAnswers.filter(a => a.question_id === currentQuestion.id);
    const myAns = qAnswers.find(a => a.player_id === myPlayerId);

    return {
      wager: myAns?.wager || null,
      answer: myAns?.submitted_answer || "",
      results: (myAns && roomStatus === "results") ? {
        correct: myAns.is_correct,
        answer: currentQuestion.correct_answer,
        qId: currentQuestion.id
      } : null,
      competitors: qAnswers
    };
  }, [allRoomAnswers, currentQuestion, myPlayerId, roomStatus]);

  const availablePoints = useMemo(() => {
    const used = allRoomAnswers.filter(a => a.player_id === myPlayerId).map(a => a.wager);
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(w => !used.includes(w));
  }, [allRoomAnswers, myPlayerId]);

  const fetchData = useCallback(async () => {
    try {
      const { room, players: p, allAnswers: a } = await getRoomState(roomCode);
      if (!room) return;

      setRoomLeaderId(room.leader_id);
      if (p) setPlayers(p);
      if (room.questions) setQuestions(room.questions);
      if (a) setAllRoomAnswers(a);

      if (room.current_question_index !== currentIndex) {
        setTimer(60);
      }
      setRoomStatus(room.status as GameState);
      setCurrentIndex(room.current_question_index);
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, [roomCode, currentIndex]);

  const triggerSync = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "STATE_UPDATED",
        payload: { t: Date.now() }
      });
    }
  }, []);

  const handleSelectWager = useCallback(async (weight: number) => {
    if (roundData.wager || !currentQuestion) return;
    
    // Optimistic Update: Add to local state instantly
    const optimisticAnswer = {
       player_id: myPlayerId,
       question_id: currentQuestion.id,
       wager: weight,
       submitted_answer: "",
       is_correct: false
    };
    setAllRoomAnswers(prev => [...prev, optimisticAnswer]);

    await submitWager(roomCode, myPlayerId, currentQuestion.id, weight);
    triggerSync();
  }, [roundData.wager, currentQuestion, myPlayerId, roomCode, triggerSync]);

  const handleSubmitAnswer = useCallback(async (val: string) => {
    if (roundData.answer || !currentQuestion) return;
    
    const isCorrect = val.trim().toLowerCase() === currentQuestion.correct_answer.toLowerCase();
    const scoreDelta = isCorrect ? (roundData.wager || 0) : 0;

    // Optimistic Update
    setAllRoomAnswers(prev => prev.map(a => 
      (a.player_id === myPlayerId && a.question_id === currentQuestion.id)
      ? { ...a, submitted_answer: val, is_correct: isCorrect }
      : a
    ));
    
    await submitAnswer(roomCode, myPlayerId, currentQuestion.id, val, isCorrect, scoreDelta);
    triggerSync();
  }, [roundData.answer, currentQuestion, roundData.wager, myPlayerId, roomCode, triggerSync]);

  const handleTimeUp = useCallback(() => {
    if (roomStatus === "wager" && !roundData.wager) {
      handleSelectWager(availablePoints[0] || 1);
    } else if (roomStatus === "question" && !roundData.answer) {
      handleSubmitAnswer("TIMEOUT_EXPIRED");
    }
  }, [roomStatus, roundData.wager, roundData.answer, availablePoints, handleSelectWager, handleSubmitAnswer]);

  const handleNextRound = useCallback(async () => {
    if (!isLeader) return;
    const nextIndex = currentIndex + 1;
    const nextStatus = nextIndex < questions.length ? "wager" : "final";

    console.log("Leader: Authorizing next round sequence.");
    await updateRoomStatus(roomCode, nextStatus, nextIndex);
    triggerSync();
  }, [isLeader, currentIndex, questions.length, roomCode, triggerSync]);

  const handleStartGame = useCallback(async () => {
    if (questions.length === 0) return;
    await updateRoomStatus(roomCode, "wager");
    triggerSync();
  }, [questions.length, roomCode, triggerSync]);

  // 1. Initial Load & Subscriptions
  useEffect(() => {
    const savedId = localStorage.getItem("player_id");
    
    const initialFetch = async () => {
      if (savedId) setMyPlayerId(savedId);
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };

    initialFetch();

    const channel = supabase.channel(`game:${roomCode}`, {
        config: { broadcast: { self: true } }
      })
      .on("broadcast", { event: "STATE_UPDATED" }, () => {
         fetchData();
      })
      .subscribe();

    channelRef.current = channel;

    return () => { 
      supabase.removeChannel(channel); 
      channelRef.current = null;
    };
  }, [roomCode, supabase, fetchData]);

  // 2. Timer Logic
  useEffect(() => {
    if (roomStatus === "waiting" || roomStatus === "final" || isLoading) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomStatus, isLoading, currentIndex, handleTimeUp]);

  // 3. Leader-Only Transitions
  useEffect(() => {
    const checkCollectiveTransitions = async () => {
      if (players.length === 0 || !isLeader || questions.length === 0 || !currentQuestion || isLoading) return;

      if (roomStatus === "wager") {
        const wagersCount = roundData.competitors.length;
        if (wagersCount > 0 && wagersCount === players.length) {
          await updateRoomStatus(roomCode, "question");
          triggerSync();
        }
      } else if (roomStatus === "question") {
        const answersCount = roundData.competitors.filter(a => a.submitted_answer !== "").length;
        if (answersCount > 0 && answersCount === players.length) {
          await updateRoomStatus(roomCode, "results");
          triggerSync();
        }
      }
    };
    checkCollectiveTransitions();
  }, [roundData.competitors, players.length, roomStatus, isLeader, roomCode, currentQuestion, isLoading, triggerSync]);

  // 4. Automatic Timer for Next Round (Leader Only)
  useEffect(() => {
    if (roomStatus === "results" && isLeader) {
      const timer = setTimeout(() => {
        handleNextRound();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [roomStatus, isLeader, handleNextRound]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (isLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-black uppercase tracking-widest animate-pulse text-center p-8">Initializing Game Systems...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col transition-colors duration-300 overflow-hidden font-sans">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => window.location.href = "/"} className="text-gray-400 hover:text-blue-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <span className="font-black text-lg text-blue-600 dark:text-blue-500 uppercase tracking-tighter italic">TriviaDuel</span>
        </div>
        
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-[50%]">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${p.id === myPlayerId ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"}`}>
              #{i + 1} {p.name}: {p.score}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-4">
           <div className="text-right text-[10px] hidden sm:block">
              <p className="text-gray-400 font-bold uppercase tracking-widest">Protocol</p>
              <p className="font-mono font-black text-blue-600 uppercase">{roomCode}</p>
           </div>
           <ThemeToggle />
        </div>
      </nav>

      {/* Unique key forces fresh remount on every round increment */}
      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full relative">
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <div className={`absolute top-0 right-0 m-4 sm:m-8 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 flex flex-col items-center justify-center font-black transition-all z-10 bg-white dark:bg-gray-800 shadow-xl ${timer < 10 ? "border-red-500 text-red-500 animate-bounce scale-110" : "border-blue-500 text-blue-500"}`}>
            <span className="text-[10px] uppercase opacity-50 leading-none">Sec</span>
            <span className="text-2xl">{timer}</span>
          </div>
        )}

        {roomStatus === "waiting" && (
          <div className="text-center space-y-8 w-full animate-fade-in">
            <div className="space-y-2">
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-blue-600 dark:text-blue-500 text-glow">Lobby</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase text-xs">Waiting for participants to connect...</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-700 w-full max-w-md mx-auto space-y-4 shadow-2xl">
               <div className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-3">
                  <p className="text-gray-400 uppercase text-[10px] font-black tracking-widest">Active Players ({players.length}/10)</p>
                  <span className="animate-pulse h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
               </div>
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                 {players.map(p => (
                   <div key={p.id} className={`flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:border-blue-500/20 transition-all ${p.id === myPlayerId ? 'ring-2 ring-blue-500/50' : ''}`}>
                      <span className="font-black italic text-lg">{p.id === roomLeaderId ? "👑 " : ""}{p.name}</span>
                      <span className="text-[10px] uppercase font-black text-blue-500">{p.id === myPlayerId ? "Protocol Primary" : "Connected"}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="pt-4">
              {isLeader ? (
                <button disabled={questions.length === 0} onClick={handleStartGame} className="bg-blue-600 hover:bg-blue-500 text-white px-20 py-6 rounded-2xl font-black text-3xl shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest italic disabled:opacity-50">
                  {questions.length === 0 ? "Loading Data..." : "Engage Match"}
                </button>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 px-8 py-4 rounded-2xl border border-blue-100 dark:border-blue-800 inline-block shadow-inner">
                  <p className="text-blue-600 dark:text-blue-400 font-black animate-pulse uppercase tracking-widest">Standing by for leader authorization...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 1: Wager (Selection) - Shown if room is in wager phase and I haven't picked yet for this ID */}
        {roomStatus === "wager" && !roundData.wager && (
          <div className="w-full space-y-12 animate-slide-up text-center">
            <div className="space-y-4">
              <p className="text-blue-500 font-black uppercase tracking-[0.3em] text-sm">Priority Selection</p>
              <h2 className="text-6xl font-black tracking-tighter uppercase italic">{currentQuestion?.summary}</h2>
              <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Determine point risk factor for this encounter</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-2xl mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isUsed = !availablePoints.includes(weight);
                return (
                  <button key={weight} disabled={isUsed} onClick={() => handleSelectWager(weight)} className={`h-24 rounded-3xl font-black text-4xl transition-all border-4 ${isUsed ? "border-transparent bg-gray-100 dark:bg-gray-900 text-gray-300 dark:text-gray-800 cursor-not-allowed grayscale" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 hover:scale-105 active:scale-90 shadow-sm"}`}>
                    {weight}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase 1.5: Waiting for others after Wager */}
        {roomStatus === "wager" && !!roundData.wager && (
          <div className="w-full space-y-12 animate-fade-in text-center">
            <div className="space-y-4">
              <p className="text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.4em] text-xs">Priority Committed</p>
              <h2 className="text-6xl font-black tracking-tighter uppercase italic">{currentQuestion?.summary}</h2>
              <div className="space-y-3 pt-6 animate-pulse">
                <p className="text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.3em] text-2xl italic">Wager Committed</p>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Waiting for other players to pick ({roundData.competitors.length}/{players.length})</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Answering - Only shown when status is 'question' */}
        {roomStatus === "question" && (
          <div className="w-full space-y-10 animate-fade-in text-center">
             <div className="bg-white dark:bg-gray-800 p-8 sm:p-14 rounded-[4rem] border-2 border-gray-100 dark:border-gray-700 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                <div className="space-y-4">
                   <p className="text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.4em] text-xs">Direct Engagement</p>
                   <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight italic uppercase">&quot;{currentQuestion?.text}&quot;</h2>
                </div>

                {!roundData.answer ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                        <button key={i} onClick={() => handleSubmitAnswer(option)} className="p-8 rounded-[2rem] text-left border-4 transition-all font-black text-xl active:scale-95 shadow-sm border-gray-100 dark:border-gray-700 hover:border-blue-400 bg-gray-50 dark:bg-gray-750">
                          <span className="mr-4 opacity-30 italic font-black text-2xl">{String.fromCharCode(65 + i)}</span> {option}
                        </button>
                      ))}
                      {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                        <button key={val} onClick={() => handleSubmitAnswer(val)} className="p-12 rounded-[2rem] font-black text-4xl border-4 transition-all active:scale-95 shadow-sm border-gray-100 dark:border-gray-700 hover:border-blue-400 bg-gray-50 dark:bg-gray-750">
                          {val.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {currentQuestion?.type === "text" && (
                      <input type="text" autoFocus placeholder="Authorize Response..." onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(e.currentTarget.value)} className="w-full bg-gray-50 dark:bg-gray-900 border-4 border-gray-100 dark:border-gray-700 rounded-[2.5rem] px-12 py-10 text-4xl focus:outline-none focus:border-blue-500 transition-all font-black italic shadow-inner text-center uppercase tracking-tighter" />
                    )}
                  </>
                ) : (
                  <div className="space-y-3 pt-6 animate-pulse">
                    <p className="text-blue-600 dark:text-blue-500 font-black uppercase tracking-[0.3em] text-2xl italic">Response Authorized</p>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Waiting for concurrent node validation ({roundData.competitors.filter(a => a.submitted_answer !== "").length}/{players.length})</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Phase 3: Results */}
        {roomStatus === "results" && roundData.results && (
          <div className="text-center space-y-12 animate-fade-in w-full">
            <h2 className={`text-[12rem] font-black italic tracking-tighter leading-none transition-all drop-shadow-2xl ${roundData.results.correct ? "text-green-500 scale-110" : "text-red-500"}`}>{roundData.results.correct ? "CORRECT" : "WRONG"}</h2>
            <div className="bg-white dark:bg-gray-800 p-14 rounded-[4rem] border-2 border-gray-100 dark:border-gray-700 max-w-2xl mx-auto shadow-2xl space-y-10 relative overflow-hidden text-glow">
               <div className="space-y-4 pt-4">
                 <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.5em]">Resolved Answer</p>
                 <p className="text-5xl font-black text-blue-600 dark:text-blue-400 italic uppercase">"{roundData.results.answer}"</p>
               </div>
               <div className="border-t-4 border-gray-50 dark:border-gray-700 pt-10 flex justify-between items-center px-10">
                 <div className="text-left">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Risk Weight</p>
                    <p className="text-5xl font-black italic tracking-tighter">{roundData.wager}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Delta Adjusted</p>
                    <p className={`text-8xl font-black italic tracking-tighter ${roundData.results.correct ? "text-yellow-500" : "text-gray-700 dark:text-gray-600 opacity-30"}`}>+{roundData.results.correct ? roundData.wager : 0}</p>
                 </div>
               </div>
            </div>
            {isLeader && (
               <button onClick={handleNextRound} className="bg-blue-600 hover:bg-blue-500 text-white px-20 py-6 rounded-3xl font-black text-2xl shadow-xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest italic">
                 Next Encounter
               </button>
            )}
          </div>
        )}

        {roomStatus === "final" && (
          <div className="text-center space-y-12 w-full max-w-lg animate-slide-up">
            <div className="space-y-4">
              <h2 className="text-8xl font-black text-yellow-500 uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]">TERMINATED</h2>
              <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-xs opacity-50">Match Sequence Complete</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-[4rem] border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-2xl relative">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-12 ${i === 0 ? "bg-yellow-500/10" : ""} ${i < sortedPlayers.length - 1 ? "border-b-2 border-gray-50 dark:border-gray-700" : ""}`}>
                   <div className="flex items-center space-x-10">
                      <span className={`text-6xl font-black italic ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-500" : "text-gray-700 dark:text-gray-600"}`}>#{i + 1}</span>
                      <div className="text-left">
                        <p className="text-3xl font-black tracking-tighter uppercase">{p.name}</p>
                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em]">{p.id === myPlayerId ? "Local System" : "Remote Peer"}</p>
                      </div>
                   </div>
                   <span className="text-6xl font-black tabular-nums italic">{p.score}</span>
                </div>
              ))}
            </div>
            <button onClick={() => window.location.href = "/"} className="bg-blue-600 hover:bg-blue-700 text-white px-24 py-8 rounded-[2.5rem] font-black text-3xl shadow-xl shadow-blue-500/20 transition-all uppercase active:scale-95 italic tracking-widest">Eject</button>
          </div>
        )}
      </main>
      
      <footer className="p-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[1em] opacity-10">Redis Distributed State Secure</footer>
    </div>
  );
}
