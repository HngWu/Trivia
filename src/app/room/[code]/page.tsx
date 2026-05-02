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

  if (isLoading) return <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center font-black uppercase tracking-widest animate-pulse text-center p-8">Initializing Game Systems...</div>;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col overflow-hidden font-sans selection:bg-mint/30">
      {/* Top Bar Section */}
      <nav className="bg-card/30 backdrop-blur-md border-b border-white/5 px-6 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center space-x-6">
          <button onClick={() => window.location.href = "/"} className="text-gray-400 hover:text-mint transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Current Standing</span>
            <span className="text-sm font-black text-mint uppercase italic tracking-tighter">Hw {myPlayer?.score || 0}</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-3 overflow-x-auto no-scrollbar max-w-[40%]">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition-all border ${p.id === myPlayerId ? "bg-mint border-mint text-[#0B0E14] shadow-lg shadow-mint/20" : "bg-card border-white/5 text-gray-400"}`}>
              #{i + 1} {p.name}: {p.score}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-6">
           <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Protocol</p>
              <p className="font-mono font-black text-xs text-mint uppercase">{roomCode}</p>
           </div>
           <ThemeToggle />
        </div>
      </nav>

      {/* Main Content */}
      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center p-8 max-w-6xl mx-auto w-full relative">
        {/* Header/Breadcrumbs Section */}
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <header className="w-full text-center space-y-2 mb-12 animate-fade-in">
            <div className="flex items-center justify-center space-x-3 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
               <span>Q{currentIndex + 1}</span>
               <span className="w-1 h-1 rounded-full bg-gray-700"></span>
               <span>{topic || "World Geography"}</span>
            </div>
            <h2 className="text-mint text-4xl sm:text-5xl font-black uppercase italic tracking-widest drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
               {currentQuestion?.summary || "Capitals"}
            </h2>
            <div className="pt-6">
               <p className="text-white text-xl sm:text-2xl font-medium tracking-tight max-w-2xl mx-auto opacity-90 leading-relaxed">
                  {topic && `Round Topic: ${topic}`}
               </p>
            </div>
          </header>
        )}

        {/* Timer UI */}
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <div className={`fixed top-20 right-8 w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-black transition-all z-10 bg-card/80 backdrop-blur shadow-2xl ${timer < 10 ? "border-red-500 text-red-500 animate-pulse" : "border-mint/30 text-mint"}`}>
            <span className="text-[8px] uppercase opacity-50 leading-none mb-0.5">Sec</span>
            <span className="text-xl">{timer}</span>
          </div>
        )}

        {/* Phase: Lobby */}
        {roomStatus === "waiting" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-12">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-8xl font-black uppercase italic tracking-tighter text-mint drop-shadow-[0_0_30px_rgba(52,211,153,0.2)]">Lobby</h2>
              <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-xs">Waiting for participants to connect...</p>
            </div>
            
            <div className="bg-card p-8 rounded-[2rem] border border-white/5 w-full max-w-md space-y-6 shadow-2xl">
               <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">Active Players ({players.length}/10)</p>
                  <span className="animate-pulse h-2 w-2 rounded-full bg-mint shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
               </div>
               <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                 {players.map(p => (
                   <div key={p.id} className={`flex justify-between items-center p-5 rounded-2xl bg-[#0B0E14]/50 border border-white/5 hover:border-mint/20 transition-all ${p.id === myPlayerId ? 'ring-1 ring-mint/50' : ''}`}>
                      <span className="font-black italic text-lg tracking-tight">{p.id === roomLeaderId ? "👑 " : ""}{p.name}</span>
                      <span className="text-[10px] uppercase font-black text-mint tracking-widest">{p.id === myPlayerId ? "Protocol Primary" : "Connected"}</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="mt-12">
              {isLeader ? (
                <button 
                  disabled={questions.length === 0} 
                  onClick={handleStartGame} 
                  className="bg-mint hover:bg-mint/90 text-[#0B0E14] px-16 py-6 rounded-2xl font-black text-2xl shadow-2xl shadow-mint/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em] italic disabled:opacity-30"
                >
                  {questions.length === 0 ? "Loading Match Data..." : "Engage Match"}
                </button>
              ) : (
                <div className="bg-card/50 px-10 py-5 rounded-2xl border border-white/5 shadow-inner">
                  <p className="text-mint font-black animate-pulse uppercase tracking-widest text-sm italic">Standing by for leader authorization...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 1: Wager Grid (Jeopardy-Style) */}
        {roomStatus === "wager" && !roundData.wager && (
          <div className="w-full max-w-4xl space-y-12 animate-slide-up text-center py-8">
            <div className="space-y-4">
              <p className="text-mint font-black uppercase tracking-[0.5em] text-xs opacity-70">Strategic Weight Selection</p>
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic">Determine Point Value</h2>
            </div>
            
            {/* The 2x5 Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isUsed = usedWagers.includes(weight);
                return (
                  <button 
                    key={weight} 
                    disabled={isUsed} 
                    onClick={() => handleSelectWager(weight)} 
                    className={`h-28 sm:h-36 rounded-2xl font-black text-5xl sm:text-6xl transition-all border-2 relative overflow-hidden group ${
                      isUsed 
                      ? "border-transparent bg-[#0B0E14] text-gray-800 cursor-not-allowed" 
                      : "border-white/5 bg-card hover:border-mint hover:text-mint shadow-xl hover:shadow-mint/10 active:scale-95"
                    }`}
                    aria-label={`Wager ${weight} points`}
                  >
                    <span className={isUsed ? "line-through decoration-mint/50 decoration-4" : ""}>
                      {weight}
                    </span>
                    {!isUsed && (
                      <div className="absolute inset-0 bg-mint/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em] pt-8">Select an available point value to proceed</p>
          </div>
        )}

        {/* Waiting after Wager */}
        {roomStatus === "wager" && !!roundData.wager && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8">
             <div className="text-center space-y-6">
                <div className="inline-block px-8 py-4 bg-card rounded-2xl border border-mint/20 shadow-2xl">
                   <p className="text-mint text-3xl font-black uppercase tracking-widest italic animate-pulse">Wager Committed</p>
                </div>
                <p className="text-gray-500 font-black uppercase text-xs tracking-[0.3em]">
                   Waiting for concurrent node validation ({roundData.competitors.length}/{players.length})
                </p>
             </div>
             <div className="h-1 w-64 bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-mint transition-all duration-500" 
                  style={{ width: `${(roundData.competitors.length / players.length) * 100}%` }}
                />
             </div>
          </div>
        )}

        {/* Phase 2: Question Interaction */}
        {roomStatus === "question" && (
          <div className="w-full max-w-4xl space-y-10 animate-fade-in text-center py-8">
             <div className="bg-card p-10 sm:p-16 rounded-[3rem] border border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mint to-transparent opacity-50 shadow-[0_0_20px_rgba(52,211,153,0.3)]"></div>
                
                <div className="space-y-6">
                   <p className="text-mint font-black uppercase tracking-[0.6em] text-[10px]">Direct Encounter Engagement</p>
                   <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight italic uppercase text-white/95">
                      &quot;{currentQuestion?.text}&quot;
                   </h2>
                </div>

                {!roundData.answer ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleSubmitAnswer(option)} 
                          className="p-8 rounded-3xl text-left border-2 border-white/5 bg-[#0B0E14] transition-all font-black text-xl hover:border-mint hover:text-mint active:scale-95 group relative overflow-hidden"
                        >
                          <span className="mr-4 opacity-20 italic font-black text-2xl group-hover:text-mint/50 transition-colors">{String.fromCharCode(65 + i)}</span> 
                          {option}
                        </button>
                      ))}
                      {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                        <button 
                          key={val} 
                          onClick={() => handleSubmitAnswer(val)} 
                          className="p-12 rounded-3xl font-black text-4xl border-2 border-white/5 bg-[#0B0E14] transition-all hover:border-mint hover:text-mint active:scale-95 uppercase tracking-tighter"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    {currentQuestion?.type === "text" && (
                      <input 
                        type="text" 
                        autoFocus 
                        placeholder="Authorize Response..." 
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(e.currentTarget.value)} 
                        className="w-full bg-[#0B0E14] border-2 border-white/5 rounded-3xl px-12 py-10 text-4xl focus:outline-none focus:border-mint transition-all font-black italic shadow-inner text-center uppercase tracking-tighter placeholder:text-gray-800" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 pt-8">
                    <p className="text-mint text-3xl font-black uppercase tracking-[0.3em] italic animate-pulse">Response Authorized</p>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Synchronizing remaining nodes ({roundData.competitors.filter(a => a.submitted_answer !== "").length}/{players.length})</p>
                  </div>
                )}
             </div>
             <div className="flex justify-center pt-8">
                <span className="bg-card px-6 py-2 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Wager: <span className="text-mint">{roundData.wager} PTS</span>
                </span>
             </div>
          </div>
        )}

        {/* Phase 3: Resolved Results */}
        {roomStatus === "results" && roundData.results && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-12">
            <div className="text-center space-y-12 w-full max-w-4xl">
              <h2 className={`text-8xl sm:text-[14rem] font-black italic tracking-tighter leading-none transition-all drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] ${roundData.results.correct ? "text-mint scale-110" : "text-red-500"}`}>
                {roundData.results.correct ? "CORRECT" : "WRONG"}
              </h2>
              
              <div className="bg-card p-12 rounded-[4rem] border border-white/5 max-w-2xl mx-auto shadow-2xl space-y-10 relative overflow-hidden">
                <div className="space-y-4">
                  <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.5em]">Resolved Primary Answer</p>
                  <p className="text-5xl font-black text-mint italic uppercase tracking-tighter leading-tight">
                    &quot;{roundData.results.answer}&quot;
                  </p>
                </div>
                
                <div className="border-t border-white/5 pt-10 flex justify-between items-center px-12">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2">Risk Factor</p>
                    <p className="text-6xl font-black italic tracking-tighter">{roundData.wager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] mb-2">Delta Adjusted</p>
                    <p className={`text-9xl font-black italic tracking-tighter ${roundData.results.correct ? "text-mint drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]" : "text-gray-800 opacity-50"}`}>
                      +{roundData.results.correct ? roundData.wager : 0}
                    </p>
                  </div>
                </div>
              </div>

              {isLeader && (
                <div className="pt-12">
                  <button onClick={handleNextRound} className="bg-mint hover:bg-mint/90 text-[#0B0E14] px-24 py-6 rounded-3xl font-black text-2xl shadow-2xl shadow-mint/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em] italic">
                    Next Encounter
                  </button>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-6 animate-pulse">Auto-transition in progress...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase: Termination (Final Results) */}
        {roomStatus === "final" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-12">
            <div className="text-center space-y-6 mb-16">
              <h2 className="text-8xl sm:text-9xl font-black text-mint uppercase italic tracking-tighter drop-shadow-[0_0_50px_rgba(52,211,153,0.2)]">TERMINATED</h2>
              <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs opacity-50 text-glow-pulse">Match Sequence Complete</p>
            </div>
            
            <div className="bg-card w-full max-w-xl rounded-[4rem] border border-white/5 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-12 transition-colors ${i === 0 ? "bg-mint/5" : ""} ${i < sortedPlayers.length - 1 ? "border-b border-white/5" : ""}`}>
                   <div className="flex items-center space-x-12">
                      <span className={`text-7xl font-black italic ${i === 0 ? "text-mint" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-500" : "text-gray-800"}`}>
                        #{i + 1}
                      </span>
                      <div className="text-left">
                        <p className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">{p.name}</p>
                        <p className="text-[10px] font-black uppercase text-mint/60 tracking-[0.3em]">{p.id === myPlayerId ? "Local System" : "Remote Peer"}</p>
                      </div>
                   </div>
                   <span className="text-7xl font-black tabular-nums italic text-white/90">{p.score}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => window.location.href = "/"} className="mt-16 bg-mint hover:bg-mint/90 text-[#0B0E14] px-24 py-8 rounded-[3rem] font-black text-4xl shadow-2xl shadow-mint/20 transition-all uppercase active:scale-95 italic tracking-[0.2em]">
              Eject
            </button>
          </div>
        )}
      </main>
      
      <footer className="p-10 text-center text-gray-500 text-[10px] font-black uppercase tracking-[1.5em] opacity-20">
        Redis Distributed State Secure • Protocol v2.6
      </footer>
    </div>
  );
}
