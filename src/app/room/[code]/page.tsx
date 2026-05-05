"use client";

import React, { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getRoomState, updateRoomStatus, submitWager, submitAnswer, joinRoom } from "@/lib/actions";
import { Player, Question, Answer, GameState } from "@/lib/types/game";
import Toast from "@/components/Toast";
import { validateAnswer } from "@/lib/validation";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.code;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // --- CORE SYSTEM STATE ---
  const [roomStatus, setRoomStatus] = useState<GameState>("waiting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allRoomAnswers, setAllRoomAnswers] = useState<Answer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState(60);
  const [roomLeaderId, setRoomLeaderId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [textAnswer, setTextAnswer] = useState("");

  // --- UI STATE ---
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- DERIVED DATA (The Single Source of Truth) ---
  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  
  const myPlayer = useMemo(() => players.find(p => p.id === myPlayerId), [players, myPlayerId]);
  
  const isLeader = useMemo(() => {
    const savedId = myPlayerId || (typeof window !== "undefined" ? localStorage.getItem("player_id") : "");
    return (myPlayer?.is_leader || (roomLeaderId && savedId === roomLeaderId));
  }, [myPlayer, roomLeaderId, myPlayerId]);

  // All data for the CURRENT active round
  const roundData = useMemo(() => {
    if (!currentQuestion) return { wager: null, answer: "", results: null as { correct: boolean; answer: string; explanation?: string; qId: string } | null, competitors: [] as Answer[] };

    const qAnswers = allRoomAnswers.filter(a => a.question_id === currentQuestion.id);
    const myAns = qAnswers.find(a => a.player_id === myPlayerId);

    return {
      wager: myAns?.wager || null,
      answer: myAns?.submitted_answer || "",
      results: (myAns && roomStatus === "results") ? {
        correct: myAns.is_correct,
        answer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
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
        setTextAnswer("");
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
    const optimisticAnswer: Answer = {
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
    
    const isCorrect = validateAnswer(val, currentQuestion.correct_answer);
    const scoreDelta = isCorrect ? (roundData.wager || 0) : 0;

    // Optimistic Update
    setAllRoomAnswers(prev => prev.map(a => 
      (a.player_id === myPlayerId && a.question_id === currentQuestion.id)
      ? { ...a, submitted_answer: val, is_correct: isCorrect }
      : a
    ));
    
    await submitAnswer(roomCode, myPlayerId, currentQuestion.id, val);
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

  const handleJoin = useCallback(async () => {
    if (isLoading || !nickname.trim()) return;
    setIsLoading(true);
    try {
      const { player } = await joinRoom(roomCode, nickname.trim());
      setMyPlayerId(player.id);
      localStorage.setItem("player_id", player.id);
      localStorage.setItem("player_name", nickname.trim());
      await fetchData();
      setIsJoining(false);
      triggerSync();
    } catch (err) {
      console.error("Join error:", err);
      showToast("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [nickname, roomCode, fetchData, triggerSync]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // 1. Initial Load & Subscriptions
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedId = localStorage.getItem("player_id");
    const savedName = localStorage.getItem("player_name");
    
    const initialFetch = async () => {
      setIsLoading(true);
      const { room, players: p, allAnswers: a } = await getRoomState(roomCode);
      
      if (!room) {
          setIsLoading(false);
          return;
      }

      setRoomLeaderId(room.leader_id);
      setTopic(room.topic || "");
      if (p) setPlayers(p);
      if (room.questions) setQuestions(room.questions);
      if (a) setAllRoomAnswers(a);
      setRoomStatus(room.status as GameState);
      setCurrentIndex(room.current_question_index);

      const isAlreadyInRoom = p?.some((player: Player) => player.id === savedId);

      if (isAlreadyInRoom && savedId) {
        setMyPlayerId(savedId);
      } else {
        if (savedName) {
           try {
             const { player } = await joinRoom(roomCode, savedName);
             setMyPlayerId(player.id);
             localStorage.setItem("player_id", player.id);
             const state = await getRoomState(roomCode);
             if (state.players) setPlayers(state.players);
             triggerSync();
           } catch (e) {
             console.error("Auto-join failed", e);
             setIsJoining(true);
           }
        } else {
           setIsJoining(true);
        }
      }
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
  }, [roomCode, supabase, fetchData, triggerSync]);

  // 2. Timer Logic
  useEffect(() => {
    if (roomStatus === "waiting" || roomStatus === "final" || isLoading) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomStatus, isLoading, currentIndex]);

  // Handle Time Up separately from timer decrement to avoid side-effects in setState
  useEffect(() => {
    if (timer === 0 && (roomStatus === "wager" || roomStatus === "question")) {
      const timeout = setTimeout(() => {
        handleTimeUp();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [timer, roomStatus, handleTimeUp]);

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
  }, [roundData.competitors, players.length, roomStatus, isLeader, roomCode, currentQuestion, isLoading, triggerSync, myPlayerId]);

  // 4. Automatic Timer for Next Round (Leader Only)
  useEffect(() => {
    if (roomStatus === "results" && isLeader) {
      const timer = setTimeout(() => {
        handleNextRound();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [roomStatus, isLeader, handleNextRound, questions.length]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (isJoining) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-3xl flex items-center justify-center p-6">
        <div className="glass p-12 rounded-[3rem] w-full max-w-lg space-y-8 animate-slide-up border-white/10 shadow-2xl">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Enter Battle</h2>
            <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-[10px]">Identify yourself to join</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your Nickname" 
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full h-10 glass-input rounded-xl px-6 text-xl font-black italic uppercase tracking-tighter placeholder:text-gray-600 focus:border-white transition-all text-white" 
            />
            <button 
              onClick={handleJoin}
              disabled={!nickname.trim() || isLoading}
              className="w-full h-10 bg-white text-black rounded-xl font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-black uppercase tracking-widest animate-pulse text-center p-8 text-white">Loading Room...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-3xl">
        <div className="flex items-center space-x-8">
          <button onClick={() => window.location.href = "/"} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">Your Score</span>
            <span className="text-sm font-black uppercase italic tracking-tighter">{myPlayer?.score || 0}</span>
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
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Room Code</p>
              <p className="font-mono font-black text-xs uppercase tracking-widest">{roomCode}</p>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center p-4 sm:p-12 max-w-6xl mx-auto w-full relative">
        
        {/* Context Header */}
        {roomStatus !== "waiting" && roomStatus !== "final" && (
          <header className="w-full text-center space-y-4 mb-8 sm:mb-16 animate-fade-in">
            <div className="flex items-center justify-center space-x-4 text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">
               <span>Round {currentIndex + 1}</span>
               <span className="w-1 h-1 rounded-full bg-white/20"></span>
               <span>{topic || "General Trivia"}</span>
            </div>
            <h2 className="text-4xl sm:text-7xl font-black uppercase italic tracking-tighter">
               {currentQuestion?.summary || "Get Ready"}
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
            <div className="text-center space-y-4 mb-12">
              <div className="flex items-center justify-center space-x-4 text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">
                <span>Selected Topic</span>
              </div>
              <h2 className="text-4xl sm:text-8xl font-black uppercase italic tracking-tighter text-gray-400">
                {topic || "General"}
              </h2>
            </div>
            
            <div className="glass p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-xl space-y-8">
               <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <div className="flex flex-col">
                    <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.3em]">Players Online ({players.length}/10)</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Code:</span>
                      <span className="text-xs font-black text-white tracking-widest font-mono">{roomCode}</span>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_15px_white]" />
               </div>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                 {players.map(p => (
                   <div key={p.id} className={`flex justify-between items-center p-4 sm:p-6 rounded-2xl transition-all border ${p.id === myPlayerId ? 'bg-white/10 border-white/30' : 'bg-white/5 border-white/5 hover:border-white/10'} text-white`}>
                      <span className="font-black italic text-lg sm:text-xl uppercase tracking-tight">{p.id === roomLeaderId ? "● " : ""}{p.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest opacity-60`}>{p.id === myPlayerId ? "You" : "Player"}</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="mt-12 sm:mt-16 flex flex-col items-center space-y-8 sm:space-y-12 w-full max-w-xl">
              <div className="w-full flex flex-col items-center space-y-4">
                {isLeader ? (
                  <button 
                    disabled={questions.length === 0} 
                    onClick={handleStartGame} 
                    className="w-full max-w-md bg-gray-400 text-black hover:bg-white disabled:opacity-20 py-6 sm:py-8 rounded-2xl sm:rounded-[2rem] font-black text-2xl sm:text-3xl shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all active:scale-95 uppercase tracking-[0.3em] italic"
                  >
                    {questions.length === 0 ? "Loading..." : "Start Battle"}
                  </button>
                ) : (
                  <div className="glass px-8 sm:px-12 py-4 sm:py-6 rounded-2xl sm:rounded-3xl animate-pulse">
                    <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px] sm:text-xs italic">Waiting for leader...</p>
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col items-center space-y-4 sm:space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">Invite Participants</p>
                <div className="glass flex items-center justify-between pl-6 sm:pl-8 pr-2 sm:pr-3 py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] w-full border-white/10 shadow-2xl">
                  <span className="text-sm sm:text-base font-mono text-white/50 truncate mr-4 sm:mr-6 tracking-tight">
                    {typeof window !== 'undefined' ? window.location.href : `.../room/${roomCode}`}
                  </span>
                  <button 
                    onClick={handleCopyLink}
                    className="h-10 sm:h-12 px-6 sm:px-8 bg-white text-black hover:bg-gray-200 rounded-xl sm:rounded-2xl transition-all shadow-lg group flex items-center space-x-2 sm:space-x-3 shrink-0"
                  >
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                      {copied ? "Copied" : "Copy Link"}
                    </span>
                    {!copied && (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1: Wager Selection */}
        {roomStatus === "wager" && !roundData.wager && (
          <div className="w-full max-w-5xl space-y-12 sm:space-y-16 animate-slide-up text-center py-6 sm:py-8">
            <div className="space-y-2 sm:space-y-4">
              <p className="text-gray-500 font-black uppercase tracking-[0.6em] text-[9px] sm:text-[10px]">Pick Your Wager</p>
              <h2 className="text-2xl sm:text-5xl font-black uppercase italic tracking-tight">How many points at stake?</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isUsed = usedWagers.includes(weight);
                return (
                  <button 
                    key={weight} 
                    disabled={isUsed} 
                    onClick={() => handleSelectWager(weight)} 
                    className={`h-24 sm:h-44 rounded-2xl sm:rounded-3xl font-black text-5xl sm:text-7xl transition-all border-2 relative overflow-hidden group ${
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
                   <p className="text-white text-4xl font-black uppercase tracking-[0.4em] italic animate-pulse">Wager Locked</p>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.5em]">
                    Waiting for players ({roundData.competitors.length}/{players.length})
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
                
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight italic text-white">
                   &quot;{currentQuestion?.text}&quot;
                </h2>

                {!roundData.answer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSubmitAnswer(option)} 
                        className="p-8 rounded-[2rem] text-left border-2 border-white/5 bg-white/5 transition-all font-black text-xl hover:bg-white hover:text-black hover:border-white active:scale-95 group"
                      >
                        <span className="mr-4 opacity-20 font-black text-2xl group-hover:opacity-100 transition-opacity">{String.fromCharCode(65 + i)}</span> 
                        {option}
                      </button>
                    ))}
                    {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                      <button 
                        key={val} 
                        // eslint-disable-next-line react-hooks/refs
                        onClick={() => handleSubmitAnswer(val)} 
                        className="p-12 rounded-[2.5rem] font-black text-3xl border-2 border-white/5 bg-white/5 transition-all hover:bg-white hover:text-black active:scale-95 tracking-tighter"
                      >
                        {val}
                      </button>
                    ))}
                    {currentQuestion?.type === "text" && (
                      <div className="col-span-full flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <input 
                          type="text" 
                          autoFocus 
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          placeholder="Type your answer..." 
                          onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(textAnswer)} 
                          className="flex-1 w-full py-5 sm:py-4 glass-input rounded-xl px-6 text-lg focus:ring-0 transition-all font-black italic tracking-tighter placeholder:text-gray-500 leading-none" 
                        />
                        <button 
                          onClick={() => handleSubmitAnswer(textAnswer)}
                          className="w-full sm:w-auto py-5 sm:py-4 px-8 bg-white text-black rounded-xl font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-all active:scale-95 whitespace-nowrap border border-transparent leading-none"
                        >
                          Submit Answer
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-12">
                    <p className="text-white text-3xl sm:text-4xl font-black uppercase tracking-[0.5em] italic animate-pulse">Answer Sent</p>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.6em]">Waiting for others to answer ({roundData.competitors.filter(a => a.submitted_answer !== "").length}/{players.length})</p>
                  </div>
                )}
             </div>
             <div className="pt-6 sm:pt-10">
                <span className="glass px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 border-white/5">
                  Wager: <span className="text-white">{roundData.wager} Points</span>
                </span>
             </div>
          </div>
        )}

        {/* Phase 3: Results */}
        {roomStatus === "results" && roundData.results && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-8 sm:py-12">
            <div className="text-center space-y-12 sm:space-y-16 w-full">
              <h2 className={`text-5xl sm:text-[10rem] font-black italic tracking-tighter leading-none transition-all drop-shadow-[0_0_80px_rgba(255,255,255,0.1)] ${roundData.results.correct ? "text-white scale-105" : "text-gray-800"}`}>
                {roundData.results.correct ? "PASSED" : "FAILED"}
              </h2>
              
              <div className="glass p-8 sm:p-20 rounded-[2.5rem] sm:rounded-[4rem] max-w-4xl mx-auto shadow-2xl space-y-8 sm:space-y-12 relative border-white/10 overflow-hidden">
                <div className="space-y-4">
                  <p className="text-gray-600 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.6em] sm:tracking-[0.8em]">Correct Answer</p>
                  <p className="text-3xl sm:text-5xl font-black text-white italic tracking-tighter leading-tight">
                    &quot;{roundData.results.answer}&quot;
                  </p>
                  {roundData.results.explanation && (
                    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 animate-fade-in">
                      <p className="text-gray-500 font-black uppercase text-[8px] sm:text-[9px] tracking-[0.4em] mb-2 sm:mb-3 text-center">Explanation</p>
                      <p className="text-gray-400 text-sm sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto italic">
                        {roundData.results.explanation}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-white/5 pt-8 sm:pt-12 flex justify-between items-center px-4 sm:px-20">
                  <div className="text-left">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-2 sm:mb-4">Your Wager</p>
                    <p className="text-3xl sm:text-5xl font-black italic tracking-tighter">{roundData.wager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-2 sm:mb-4">Points Gained</p>
                    <p className={`text-3xl sm:text-5xl font-black italic tracking-tighter ${roundData.results.correct ? "text-white" : "text-gray-900"}`}>
                      {roundData.results.correct ? `+${roundData.wager}` : "0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Player Results Ledger */}
              <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 mt-12 sm:mt-24 animate-slide-up px-4 sm:px-0">
                <div className="flex justify-between items-center px-2 sm:px-8">
                  <p className="text-gray-500 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">Round Summary</p>
                  <p className="text-gray-500 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">{players.length} Players</p>
                </div>
                
                <div className="sm:glass sm:rounded-[2.5rem] sm:border-white/5 sm:overflow-hidden sm:shadow-2xl sm:max-h-[500px] sm:overflow-y-auto no-scrollbar">
                  {/* Desktop Table View */}
                  <table className="hidden sm:table w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 glass backdrop-blur-3xl border-b border-white/5">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Player</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Answer</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Wager</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {players.map(p => {
                        const submission = roundData.competitors.find(c => c.player_id === p.id);
                        const isMe = p.id === myPlayerId;
                        
                        return (
                          <tr key={p.id} className={`transition-all duration-300 ${isMe ? "bg-white/5" : "hover:bg-white/[0.02]"}`}>
                            <td className="px-10 py-8">
                              <div className="flex flex-col">
                                <span className={`font-black italic uppercase tracking-tight text-xl ${isMe ? "text-white" : "text-gray-400"}`}>
                                  {p.name}
                                </span>
                                {isMe && <span className="text-[8px] font-black uppercase tracking-widest text-white/40 mt-1">You</span>}
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <span className={`font-bold text-sm uppercase tracking-tighter ${submission?.submitted_answer ? "text-gray-300" : "text-gray-700 italic"}`}>
                                {submission?.submitted_answer || "TIMEOUT"}
                              </span>
                            </td>
                            <td className="px-10 py-8 text-center">
                              <span className="font-black text-2xl italic text-white/80">
                                {submission?.wager || "—"}
                              </span>
                            </td>
                            <td className="px-10 py-8 text-right">
                              {submission ? (
                                <div className="flex items-center justify-end space-x-3">
                                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${submission.is_correct ? "text-white" : "text-gray-700"}`}>
                                    {submission.is_correct ? "Correct" : "Incorrect"}
                                  </span>
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${submission.is_correct ? "border-white bg-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-gray-800 text-gray-800"}`}>
                                    {submission.is_correct ? (
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-800 italic">Desynced</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile Card List View */}
                  <div className="sm:hidden space-y-3">
                    {players.map(p => {
                      const submission = roundData.competitors.find(c => c.player_id === p.id);
                      const isMe = p.id === myPlayerId;
                      
                      return (
                        <div key={p.id} className={`glass p-5 rounded-2xl border-white/5 flex flex-col gap-4 ${isMe ? "border-white/20 bg-white/5" : ""}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className={`font-black italic uppercase tracking-tight text-lg ${isMe ? "text-white" : "text-gray-400"}`}>
                                {p.name}
                              </span>
                              {isMe && <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Your Result</span>}
                            </div>
                            {submission && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${submission.is_correct ? "border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "border-gray-800 text-gray-800"}`}>
                                {submission.is_correct ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                            <div>
                               <p className="text-[8px] font-black uppercase text-gray-600 tracking-widest mb-1">Answer</p>
                               <p className={`font-bold text-xl  uppercase truncate ${submission?.submitted_answer ? "text-gray-300" : "text-gray-700 italic"}`}>
                                  {submission?.submitted_answer || "TIMEOUT"}
                               </p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black uppercase text-gray-600 tracking-widest mb-1">Wager</p>
                               <p className="font-black text-xl italic text-white/80">{submission?.wager || "—"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {isLeader && (
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.6em] sm:tracking-[1em] animate-pulse">
                  {currentIndex === questions.length - 1 ? "Displaying final leaderboard..." : "Preparing next round..."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase: Final */}
        {roomStatus === "final" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-12">
            <h2 className="text-5xl sm:text-9xl font-black text-white uppercase italic tracking-tighter mb-12 sm:mb-16 drop-shadow-[0_0_100px_rgba(255,255,255,0.2)]">Final Leaderboard</h2>
            
            <div className="glass w-full rounded-[2rem] sm:rounded-[3.5rem] border-white/10 overflow-hidden shadow-2xl">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-6 sm:p-14 transition-colors ${i === 0 ? "bg-white/10 border-b border-white/20" : "border-b border-white/5 last:border-0"}`}>
                   <div className="flex items-center space-x-4 sm:space-x-12">
                      <span className={`text-4xl sm:text-7xl font-black italic ${i === 0 ? "text-white" : "text-white/20"}`}>
                        #{i + 1}
                      </span>
                      <div className="text-left">
                        <p className="text-xl sm:text-4xl font-black tracking-tighter uppercase leading-none mb-1 sm:mb-2 text-white">{p.name}</p>
                        <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.5em] text-white/40">{p.id === myPlayerId ? "You" : "Player"}</p>
                      </div>
                   </div>
                   <span className="text-4xl sm:text-7xl font-black tabular-nums italic text-white">{p.score}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => window.location.href = "/"} className="mt-12 sm:mt-20 glass-button hover:bg-white hover:text-black px-16 sm:px-32 py-6 sm:py-10 rounded-2xl sm:rounded-[3rem] font-black text-2xl sm:text-3xl transition-all active:scale-95 uppercase italic tracking-[0.4em]">
              Leave Battle
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
