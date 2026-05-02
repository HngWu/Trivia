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
  const [topic, setTopic] = useState("");

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

  const usedWagers = useMemo(() => {
    return allRoomAnswers
      .filter(a => a.player_id === myPlayerId)
      .map(a => a.wager);
  }, [allRoomAnswers, myPlayerId]);

  const fetchData = useCallback(async () => {
    try {
      const { room, players: p, allAnswers: a } = await getRoomState(roomCode);
      if (!room) return;

      setRoomLeaderId(room.leader_id);
      setTopic(room.topic || "");
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
    
    // Optimistic Update
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
    const availableWeights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(w => !usedWagers.includes(w));
    if (roomStatus === "wager" && !roundData.wager) {
      handleSelectWager(availableWeights[0] || 1);
    } else if (roomStatus === "question" && !roundData.answer) {
      handleSubmitAnswer("TIMEOUT_EXPIRED");
    }
  }, [roomStatus, roundData.wager, roundData.answer, usedWagers, handleSelectWager, handleSubmitAnswer]);

  const handleNextRound = useCallback(async () => {
    if (!isLeader) return;
    const nextIndex = currentIndex + 1;
    const nextStatus = nextIndex < questions.length ? "wager" : "final";

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

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-black uppercase tracking-widest animate-pulse text-center p-8">Establishing Secure Connection...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-3xl">
        <div className="flex items-center space-x-8">
          <button onClick={() => window.location.href = "/"} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Node Status</span>
            <span className="text-sm font-black uppercase italic tracking-tighter">HW {myPlayer?.score || 0}</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          {sortedPlayers.slice(0, 3).map((p, i) => (
            <div key={p.id} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${p.id === myPlayerId ? "bg-white text-black border-white" : "border-white/10 text-gray-400"}`}>
              #{i + 1} {p.name} • {p.score}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-6">
           <div className="text-right hidden sm:block">
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Access Protocol</p>
              <p className="font-mono font-black text-xs uppercase tracking-widest">{roomCode}</p>
           </div>
           <ThemeToggle />
        </div>
      </nav>

      {/* Main Content Area */}
      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center p-4 sm:p-12 max-w-6xl mx-auto w-full relative">
        
        {/* Context Header */}
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <header className="w-full text-center space-y-4 mb-16 animate-fade-in">
            <div className="flex items-center justify-center space-x-4 text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">
               <span>Round {currentIndex + 1}</span>
               <span className="w-1 h-1 rounded-full bg-white/20"></span>
               <span>{topic || "Standard Protocol"}</span>
            </div>
            <h2 className="text-4xl sm:text-7xl font-black uppercase italic tracking-tighter">
               {currentQuestion?.summary || "Direct Engagement"}
            </h2>
          </header>
        )}

        {/* Global Timer Overlay */}
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <div className={`fixed bottom-12 right-12 w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center font-black transition-all z-40 glass backdrop-blur-xl ${timer < 10 ? "border-red-500 text-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "border-white/20 text-white"}`}>
            <span className="text-[10px] uppercase opacity-50 mb-[-4px]">Sec</span>
            <span className="text-3xl tracking-tighter">{timer}</span>
          </div>
        )}

        {/* Phase: Lobby */}
        {roomStatus === "waiting" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-12">
            <h2 className="text-7xl sm:text-9xl font-black uppercase italic tracking-tighter mb-4">Lobby</h2>
            <p className="text-gray-500 font-bold tracking-[0.4em] uppercase text-[10px] mb-16">Establishing participant synchronization...</p>
            
            <div className="glass p-8 sm:p-12 rounded-[3rem] w-full max-w-xl space-y-8">
               <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.3em]">Active Peers ({players.length}/10)</p>
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_15px_white]" />
               </div>
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                 {players.map(p => (
                   <div key={p.id} className={`flex justify-between items-center p-6 rounded-2xl transition-all border ${p.id === myPlayerId ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                      <span className="font-black italic text-xl uppercase tracking-tight">{p.id === roomLeaderId ? "● " : ""}{p.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest opacity-60`}>{p.id === myPlayerId ? "Local System" : "Linked"}</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="mt-16">
              {isLeader ? (
                <button 
                  disabled={questions.length === 0} 
                  onClick={handleStartGame} 
                  className="bg-white text-black hover:bg-gray-200 px-24 py-8 rounded-[2.5rem] font-black text-3xl shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all active:scale-95 uppercase tracking-[0.3em] italic disabled:opacity-20"
                >
                  {questions.length === 0 ? "Loading Data..." : "Engage"}
                </button>
              ) : (
                <div className="glass px-12 py-6 rounded-3xl animate-pulse">
                  <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-xs italic">Waiting for authority authorization...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 1: Wager Selection */}
        {roomStatus === "wager" && !roundData.wager && (
          <div className="w-full max-w-5xl space-y-16 animate-slide-up text-center py-8">
            <div className="space-y-4">
              <p className="text-gray-500 font-black uppercase tracking-[0.6em] text-[10px]">Strategic Risk Allocation</p>
              <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tight">Allocate Point Weight</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isUsed = usedWagers.includes(weight);
                return (
                  <button 
                    key={weight} 
                    disabled={isUsed} 
                    onClick={() => handleSelectWager(weight)} 
                    className={`h-32 sm:h-44 rounded-3xl font-black text-6xl sm:text-7xl transition-all border-2 relative overflow-hidden group ${
                      isUsed 
                      ? "bg-transparent border-white/5 text-gray-900 cursor-not-allowed" 
                      : "glass hover:bg-white hover:text-black hover:border-white shadow-2xl active:scale-95"
                    }`}
                  >
                    <span className={isUsed ? "line-through decoration-white/20" : ""}>{weight}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status: Wager Committed */}
        {roomStatus === "wager" && !!roundData.wager && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-12">
             <div className="text-center space-y-10">
                <div className="inline-block px-12 py-6 glass border-white/20 rounded-[2rem] shadow-2xl">
                   <p className="text-white text-4xl font-black uppercase tracking-[0.4em] italic animate-pulse">Committed</p>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.5em]">
                    Synchronizing nodes ({roundData.competitors.length}/{players.length})
                  </p>
                  <div className="h-1 w-64 bg-white/5 rounded-full mx-auto overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-700 ease-out" 
                      style={{ width: `${(roundData.competitors.length / players.length) * 100}%` }}
                    />
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Phase 2: Answering */}
        {roomStatus === "question" && (
          <div className="w-full max-w-5xl space-y-12 animate-fade-in text-center py-8">
             <div className="glass p-10 sm:p-20 rounded-[4rem] shadow-2xl space-y-16 relative overflow-hidden border-white/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                
                <h2 className="text-3xl sm:text-6xl font-black tracking-tight leading-tight italic uppercase text-white">
                   &quot;{currentQuestion?.text}&quot;
                </h2>

                {!roundData.answer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSubmitAnswer(option)} 
                        className="p-10 rounded-[2rem] text-left border-2 border-white/5 bg-white/5 transition-all font-black text-2xl hover:bg-white hover:text-black hover:border-white active:scale-95 group"
                      >
                        <span className="mr-6 opacity-20 font-black text-3xl group-hover:opacity-100 transition-opacity">{String.fromCharCode(65 + i)}</span> 
                        {option}
                      </button>
                    ))}
                    {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                      <button 
                        key={val} 
                        onClick={() => handleSubmitAnswer(val)} 
                        className="p-16 rounded-[2.5rem] font-black text-5xl border-2 border-white/5 bg-white/5 transition-all hover:bg-white hover:text-black active:scale-95 uppercase tracking-tighter"
                      >
                        {val}
                      </button>
                    ))}
                    {currentQuestion?.type === "text" && (
                      <input 
                        type="text" 
                        autoFocus 
                        placeholder="Authorize Response..." 
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(e.currentTarget.value)} 
                        className="col-span-full w-full glass-input rounded-[2.5rem] px-12 py-12 text-4xl sm:text-6xl focus:ring-0 transition-all font-black italic text-center uppercase tracking-tighter placeholder:text-gray-800" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-12">
                    <p className="text-white text-5xl font-black uppercase tracking-[0.5em] italic animate-pulse">Authorized</p>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.6em]">Awaiting Concurrent node validation ({roundData.competitors.filter(a => a.submitted_answer !== "").length}/{players.length})</p>
                  </div>
                )}
             </div>
             <div className="pt-8">
                <span className="glass px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 border-white/5">
                  Allocated Weight: <span className="text-white">{roundData.wager} Units</span>
                </span>
             </div>
          </div>
        )}

        {/* Phase 3: Results */}
        {roomStatus === "results" && roundData.results && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-12">
            <div className="text-center space-y-16 w-full">
              <h2 className={`text-8xl sm:text-[16rem] font-black italic tracking-tighter leading-none transition-all drop-shadow-[0_0_80px_rgba(255,255,255,0.1)] ${roundData.results.correct ? "text-white scale-105" : "text-gray-800"}`}>
                {roundData.results.correct ? "PASSED" : "FAILED"}
              </h2>
              
              <div className="glass p-12 sm:p-20 rounded-[4rem] max-w-4xl mx-auto shadow-2xl space-y-12 relative border-white/10 overflow-hidden">
                <div className="space-y-4">
                  <p className="text-gray-600 font-black uppercase text-[10px] tracking-[0.8em]">Resolved System Answer</p>
                  <p className="text-4xl sm:text-7xl font-black text-white italic uppercase tracking-tighter leading-tight">
                    &quot;{roundData.results.answer}&quot;
                  </p>
                </div>
                
                <div className="border-t border-white/5 pt-12 flex justify-between items-center px-12 sm:px-20">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4">Risk Factor</p>
                    <p className="text-7xl font-black italic tracking-tighter">{roundData.wager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4">State Delta</p>
                    <p className={`text-9xl sm:text-[12rem] font-black italic tracking-tighter ${roundData.results.correct ? "text-white" : "text-gray-900"}`}>
                      {roundData.results.correct ? `+${roundData.wager}` : "0"}
                    </p>
                  </div>
                </div>
              </div>

              {isLeader && (
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[1em] animate-pulse">Initializing Next Encounter...</p>
              )}
            </div>
          </div>
        )}

        {/* Phase: Final */}
        {roomStatus === "final" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-12">
            <h2 className="text-7xl sm:text-9xl font-black text-white uppercase italic tracking-tighter mb-16 drop-shadow-[0_0_100px_rgba(255,255,255,0.2)]">TERMINATED</h2>
            
            <div className="glass w-full max-w-2xl rounded-[3.5rem] border-white/10 overflow-hidden shadow-2xl">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-10 sm:p-14 transition-colors ${i === 0 ? "bg-white text-black" : "border-b border-white/5"}`}>
                   <div className="flex items-center space-x-12">
                      <span className={`text-7xl font-black italic ${i === 0 ? "text-black" : "text-white/20"}`}>
                        #{i + 1}
                      </span>
                      <div className="text-left">
                        <p className={`text-4xl font-black tracking-tighter uppercase leading-none mb-2`}>{p.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-[0.5em] opacity-40`}>{p.id === myPlayerId ? "Primary node" : "Linked Peer"}</p>
                      </div>
                   </div>
                   <span className="text-7xl font-black tabular-nums italic">{p.score}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => window.location.href = "/"} className="mt-20 glass-button hover:bg-white hover:text-black px-32 py-10 rounded-[3rem] font-black text-3xl transition-all active:scale-95 uppercase italic tracking-[0.4em]">
              Eject
            </button>
          </div>
        )}
      </main>
      
      <footer className="p-12 text-center text-gray-700 text-[9px] font-black uppercase tracking-[2em] opacity-30 pointer-events-none">
        Distributed Real-Time System • v4.0.0-GLASS
      </footer>
    </div>
  );
}
