"use client";

import React, { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getRoomState, updateRoomStatus, submitWager, submitAnswer, joinRoom, kickPlayer, getServerTime } from "@/lib/actions";
import { Player, Question, Answer, GameState } from "@/lib/types/game";
import Toast from "@/components/Toast";
import { validateAnswer } from "@/lib/validation";
import FluidTimer from "./FluidTimer";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.code;
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // --- CORE SYSTEM STATE ---
  const [roomStatus, setRoomStatus] = useState<GameState>("waiting");
  const [displayStatus, setDisplayStatus] = useState<GameState>("waiting");
  const scheduledUpdateRef = useRef<number | null>(null);
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
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<number>(0);
  const [serverOffset, setServerOffset] = useState(0);

  // --- UI DISPLAY STATE (Delayed updates for smoothness) ---
  const [displayedPlayers, setDisplayedPlayers] = useState<Player[]>([]);

  // --- UI STATE ---
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync displayedPlayers based on phase transitions
  useEffect(() => {
    // Always update displayedPlayers when in lobby or results to show latest scores/participants
    if (displayStatus === "waiting" || displayStatus === "results" || displayStatus === "final" || displayedPlayers.length === 0) {
      setDisplayedPlayers(players);
    }
    // During wager and question phases, we keep the previous scores in the navbar
  }, [players, displayStatus, displayedPlayers.length]);

  // --- REFS ---
  const currentVersionRef = useRef(0);

  // Cleanup for scheduled updates
  useEffect(() => {
    return () => {
      if (scheduledUpdateRef.current !== null) {
        cancelAnimationFrame(scheduledUpdateRef.current);
      }
    };
  }, []);

  // Pre-fill nickname from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("player_name");
    if (savedName) setNickname(savedName);
  }, []);

  // Task 2: NTP-Lite Clock Synchronization
  useEffect(() => {
    const syncClock = async () => {
      try {
        const start = Date.now();
        const serverNow = await getServerTime();
        const end = Date.now();
        const latency = (end - start) / 2;
        const offset = serverNow - (start + latency);
        setServerOffset(offset);
      } catch (e) {
        console.error("Clock sync failed", e);
      }
    };
    syncClock();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- DERIVED DATA (The Single Source of Truth) ---
  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  
  const myPlayer = useMemo(() => players.find(p => p.id === myPlayerId), [players, myPlayerId]);
  
  const isLocked = useMemo(() => roomStatus !== displayStatus, [roomStatus, displayStatus]);
  
  const isLeader = useMemo(() => {
    const savedId = myPlayerId || (typeof window !== "undefined" ? localStorage.getItem("player_id") : "");
    return (myPlayer?.is_leader || (roomLeaderId && savedId === roomLeaderId));
  }, [myPlayer, roomLeaderId, myPlayerId]);

  // All data for the CURRENT active round
  const roundData = useMemo(() => {
    if (!currentQuestion) return { wager: null, answer: "", results: null as { correct: boolean; answer: string; explanation?: string; qId: string } | null, competitors: [] as Answer[], wagerCount: 0, answerCount: 0 };

    const qAnswers = allRoomAnswers.filter(a => a.question_id === currentQuestion.id);
    const myAns = qAnswers.find(a => a.player_id === myPlayerId);
    
    // Exact counts for the UI progress bars
    const wagerCount = qAnswers.filter(a => a.wager > 0).length;
    const answerCount = qAnswers.filter(a => a.submitted_answer !== "").length;

    return {
      wager: myAns?.wager || null,
      answer: myAns?.submitted_answer || "",
      results: (myAns && roomStatus === "results") ? {
        correct: myAns.is_correct,
        answer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
        qId: currentQuestion.id
      } : null,
      competitors: qAnswers,
      wagerCount,
      answerCount
    };
  }, [allRoomAnswers, currentQuestion, myPlayerId, roomStatus]);

  const usedWagers = useMemo(() => {
    return allRoomAnswers
      .filter(a => a.player_id === myPlayerId)
      .map(a => a.wager);
  }, [allRoomAnswers, myPlayerId]);

  const currentIndexRef = useRef(0);
  const pendingSubmissionsRef = useRef<Record<string, Answer>>({});
  const lastSyncTimeRef = useRef(0);

  const applyState = useCallback((state: any) => {
    const { room, players: p, allAnswers: a } = state;
    if (!room) return;

    // Task 2: Version Guard
    if (room.version && room.version <= currentVersionRef.current) {
      return;
    }
    currentVersionRef.current = room.version || 0;

    lastSyncTimeRef.current = Date.now();

    // Check if I'm still in the player list - only if I have joined this specific room session
    if (myPlayerId && p && !p.find((player: Player) => player.id === myPlayerId) && !isJoining) {
      window.location.href = "/?error=kicked";
      return;
    }

    setRoomLeaderId(room.leader_id);
    setTopic(room.topic || "");
    if (p) setPlayers(p);
    if (room.questions) setQuestions(room.questions);

    // Merge server answers with local pending optimistic updates
    if (a) {
      const mergedAnswers = [...a];
      Object.values(pendingSubmissionsRef.current).forEach(pending => {
        const index = mergedAnswers.findIndex(ans => 
          ans.player_id === pending.player_id && ans.question_id === pending.question_id
        );
        if (index !== -1) {
          if (!mergedAnswers[index].submitted_answer && pending.submitted_answer) {
             mergedAnswers[index] = { ...mergedAnswers[index], ...pending };
          }
        } else {
          mergedAnswers.push(pending);
        }
      });
      setAllRoomAnswers(mergedAnswers);
    }

    if (room.current_question_index !== currentIndexRef.current) {
      setTextAnswer("");
      currentIndexRef.current = room.current_question_index;
      pendingSubmissionsRef.current = {};
    }
    setRoomStatus(room.status as GameState);
    setCurrentIndex(room.current_question_index);
    setStatusUpdatedAt(room.status_updated_at || (Date.now() + serverOffset));

    // Task 1: High-Precision Sync Loop
    if (scheduledUpdateRef.current !== null) {
      cancelAnimationFrame(scheduledUpdateRef.current);
      scheduledUpdateRef.current = null;
    }

    const targetTime = room.status_updated_at || (Date.now() + serverOffset);
    const now = Date.now() + serverOffset;
    
    if (now >= targetTime) {
      setDisplayStatus(room.status as GameState);
    } else {
      const syncLoop = () => {
        const currentTime = Date.now() + serverOffset;
        if (currentTime >= targetTime) {
          setDisplayStatus(room.status as GameState);
          scheduledUpdateRef.current = null;
        } else {
          scheduledUpdateRef.current = requestAnimationFrame(syncLoop);
        }
      };
      scheduledUpdateRef.current = requestAnimationFrame(syncLoop);
    }
  }, [myPlayerId, isJoining, serverOffset]);

  const fetchData = useCallback(async () => {
    try {
      const state = await getRoomState(roomCode);
      applyState(state);
    } catch (err) {
      console.error("Sync error:", err);
    }
  }, [roomCode, applyState]);

  const triggerSync = useCallback((data?: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "STATE_UPDATED",
        payload: { t: Date.now(), state: data }
      });
    }
  }, []);

  const handleKick = useCallback(async (targetPlayerId: string) => {
    if (!isLeader || targetPlayerId === myPlayerId) return;
    try {
      const newState = await kickPlayer(roomCode, targetPlayerId, myPlayerId);
      triggerSync(newState);
    } catch (e) {
      console.error("Kick failed", e);
      showToast("Failed to kick player.");
    }
  }, [isLeader, myPlayerId, roomCode, triggerSync]);

  const handleSelectWager = useCallback(async (weight: number) => {
    if (roundData.wager || !currentQuestion) return;
    
    const key = `${myPlayerId}:${currentQuestion.id}`;
    const optimisticAnswer: Answer = {
       player_id: myPlayerId,
       question_id: currentQuestion.id,
       wager: weight,
       submitted_answer: "",
       is_correct: false
    };

    pendingSubmissionsRef.current[key] = optimisticAnswer;
    
    setAllRoomAnswers(prev => {
      const filtered = prev.filter(a => !(a.player_id === myPlayerId && a.question_id === currentQuestion.id));
      return [...filtered, optimisticAnswer];
    });

    try {
      const newState = await submitWager(roomCode, myPlayerId, currentQuestion.id, weight);
      delete pendingSubmissionsRef.current[key];
      triggerSync(newState);
    } catch (e) {
      delete pendingSubmissionsRef.current[key];
      console.error("Wager failed", e);
    }
  }, [roundData.wager, currentQuestion, myPlayerId, roomCode, triggerSync]);

  const handleSubmitAnswer = useCallback(async (val: string) => {
    if (roundData.answer || !currentQuestion) return;
    
    const key = `${myPlayerId}:${currentQuestion.id}`;
    const isCorrect = validateAnswer(val, currentQuestion.correct_answer);

    const optimisticAnswer: Answer = {
      player_id: myPlayerId,
      question_id: currentQuestion.id,
      wager: roundData.wager || 0,
      submitted_answer: val,
      is_correct: isCorrect
    };

    pendingSubmissionsRef.current[key] = optimisticAnswer;

    setAllRoomAnswers(prev => prev.map(a => 
      (a.player_id === myPlayerId && a.question_id === currentQuestion.id)
      ? optimisticAnswer
      : a
    ));
    
    try {
      const newState = await submitAnswer(roomCode, myPlayerId, currentQuestion.id, val);
      delete pendingSubmissionsRef.current[key];
      triggerSync(newState);
    } catch (e) {
      delete pendingSubmissionsRef.current[key];
      console.error("Answer failed", e);
    }
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

    const newState = await updateRoomStatus(roomCode, nextStatus, nextIndex);
    triggerSync(newState);
  }, [isLeader, currentIndex, questions.length, roomCode, triggerSync]);

  const handleStartGame = useCallback(async () => {
    if (questions.length === 0) return;
    const newState = await updateRoomStatus(roomCode, "wager");
    triggerSync(newState);
  }, [questions.length, roomCode, triggerSync]);

  const handleJoin = useCallback(async () => {
    if (isLoading || !nickname.trim()) return;
    setIsLoading(true);
    try {
      const { player } = await joinRoom(roomCode, nickname.trim());
      setMyPlayerId(player.id);
      localStorage.setItem("player_id", player.id);
      localStorage.setItem("player_name", nickname.trim());
      const state = await getRoomState(roomCode);
      applyState(state); // Keep this for join UX
      setIsJoining(false);
      triggerSync(state);
    } catch (err) {
      console.error("Join error:", err);
      showToast("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [nickname, roomCode, triggerSync, applyState, isLoading]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // 1. Initial Load & Subscriptions
  useEffect(() => {
    const savedId = localStorage.getItem("player_id");
    const savedName = localStorage.getItem("player_name");
    
    const initialFetch = async () => {
      setIsLoading(true);
      try {
        const state = await getRoomState(roomCode);
        const { room, players: p } = state;
        
        if (!room) {
            showToast("Battle room not found.");
            setTimeout(() => {
              window.location.href = "/";
            }, 2000);
            return;
        }

        applyState(state);

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
               applyState(state);
               triggerSync(state);
             } catch (e) {
               console.error("Auto-join failed", e);
               setIsJoining(true);
             }
          } else {
             setIsJoining(true);
          }
        }
      } catch (err) {
        console.error("Initial fetch failed", err);
        showToast("Failed to load battle data.");
      } finally {
        setIsLoading(false);
      }
    };

    initialFetch();

    const channel = supabase.channel(`game:${roomCode}`, {
        config: { broadcast: { self: true } }
      })
      .on("broadcast", { event: "STATE_UPDATED" }, ({ payload }) => {
         if (payload.state) {
           applyState(payload.state);
         } else {
           fetchData();
         }
      })
      .subscribe();

    channelRef.current = channel;

    return () => { 
      supabase.removeChannel(channel); 
      channelRef.current = null;
    };
  }, [roomCode, supabase, fetchData, triggerSync, applyState]);

  // 2. Polling Fallback (Eventual Consistency)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
      if (!isLoading && roomStatus !== "final" && timeSinceLastSync > 3000) {
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading, roomStatus, fetchData]);

  // 3. Server-Authoritative Timer Logic
  useEffect(() => {
    if (roomStatus === "waiting" || roomStatus === "final" || isLoading || !statusUpdatedAt) return;

    const updateTimer = () => {
      const now = Date.now() + serverOffset;
      const elapsed = Math.floor((now - statusUpdatedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTimer(remaining);
    };

    updateTimer(); // Run immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [roomStatus, isLoading, currentIndex, statusUpdatedAt, serverOffset]);

  // Handle Time Up separately from timer decrement to avoid side-effects in setState
  useEffect(() => {
    if (timer === 0 && (roomStatus === "wager" || roomStatus === "question")) {
      const timeout = setTimeout(() => {
        handleTimeUp();
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [timer, roomStatus, handleTimeUp]);

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
  const displayedSortedPlayers = [...displayedPlayers].sort((a, b) => b.score - a.score);
  const displayedMyPlayer = useMemo(() => displayedPlayers.find(p => p.id === myPlayerId), [displayedPlayers, myPlayerId]);

  if (isJoining) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-3xl flex items-center justify-center p-6">
        <div className="glass p-12 rounded-[3rem] w-full max-w-lg space-y-8 animate-slide-up border-white/10 shadow-2xl">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold tracking-tight text-foreground">Enter game</h2>
            <p className="text-gray-500 font-bold tracking-widest text-[10px]">Identify yourself to join</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your Nickname" 
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full h-14 glass-input rounded-xl px-6 text-xl font-semibold tracking-tight placeholder:text-gray-500 focus:border-white transition-all text-foreground" 
            />
            <button 
              onClick={handleJoin}
              disabled={!nickname.trim() || isLoading}
              className="w-full h-14 bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Joining..." : "Join room"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-bold tracking-widest animate-pulse text-center p-8 text-foreground">Loading room...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20 overflow-y-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-xl shadow-lg">
        <div className="flex items-center space-x-6 sm:space-x-8">
          <button onClick={() => window.location.href = "/"} className="text-foreground transition-all transform hover:scale-105">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-wider text-gray-600">Score</span>
            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums leading-none">{displayedMyPlayer?.score || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto no-scrollbar max-w-[45vw] sm:max-w-none px-2">
          {displayedSortedPlayers.map((p, i) => (
            <div key={p.id} className={`px-3 py-1.5 rounded-xl text-[9px] font-bold border transition-all whitespace-nowrap ${p.id === myPlayerId ? "bg-foreground text-background border-foreground shadow-md" : "border-white/5 text-gray-500 bg-white/[0.02]"}`}>
              #{i + 1} {p.name.split(' ')[0]} • {p.score}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-4 sm:space-x-6">
           <div className="text-right hidden sm:block">
              <p className="text-[9px] text-gray-600 font-bold tracking-widest">Room code</p>
              <p className="font-mono font-bold text-xs uppercase text-foreground">{roomCode}</p>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center p-4 sm:p-8 md:p-12 max-w-6xl mx-auto w-full relative">

        
        {/* Context Header */}
        {displayStatus !== "waiting" && displayStatus !== "final" && (
          <header className="w-full text-center space-y-3 mb-6 sm:mb-10 animate-fade-in">
            <div className="flex items-center justify-center space-x-4 text-[10px] font-bold tracking-widest text-gray-600">
               <span>Round {currentIndex + 1}</span>
               <span className="w-1 h-1 rounded-full bg-white/10"></span>
               <span>{topic || "General Knowledge"}</span>
               {(roomStatus !== displayStatus || isLocked) && (
                 <>
                   <span className="w-1 h-1 rounded-full bg-white/10"></span>
                   <span className="text-foreground animate-pulse italic">Syncing...</span>
                 </>
               )}
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground drop-shadow-sm">
               {currentQuestion?.summary || "Get Ready"}
            </h2>
          </header>
        )}

        <FluidTimer 
          statusUpdatedAt={statusUpdatedAt}
          displayStatus={displayStatus}
          timer={timer}
          serverOffset={serverOffset}
          isLocked={isLocked}
        />

        {/* Phase: Transition to Wager (Syncing) */}
        {roomStatus === "wager" && displayStatus !== "wager" && (
           <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8 py-16">
              <div className="relative group">
                 <div className="w-24 h-24 border-4 border-white/[0.03] border-t-white rounded-full animate-spin" />
              </div>
              <div className="text-center space-y-3">
                 <h2 className="text-3xl sm:text-5xl font-bold text-foreground">Preparing Next Round</h2>
                 <p className="text-gray-600 font-bold tracking-wider text-[10px] animate-pulse italic">Setting the stage...</p>
              </div>
           </div>
        )}

        {/* Phase: Lobby */}
        {displayStatus === "waiting" && roomStatus === "waiting" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-6">
            <div className="text-center space-y-4 mb-10">
              <div className="flex items-center justify-center space-x-4 text-[10px] font-bold tracking-widest text-gray-700">
                <span>Selected topic</span>
              </div>
              <h2 className="text-3xl sm:text-6xl font-bold tracking-tight text-gray-400">
                {topic || "General"}
              </h2>
            </div>
            
            <div className="glass p-6 sm:p-10 rounded-[2.5rem] w-full max-w-xl space-y-8 border-white/[0.03] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
               <div className="flex justify-between items-center border-b border-white/[0.03] pb-6">
                  <div className="flex flex-col">
                    <p className="text-gray-600 text-[10px] font-bold tracking-widest">Players joined ({players.length}/10)</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-[9px] font-bold text-gray-700">Room:</span>
                      <span className="text-xs font-bold text-foreground tracking-widest font-mono bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/5">{roomCode}</span>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
               </div>
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                 {players.map(p => (
                   <div key={p.id} className={`flex justify-between items-center p-4 sm:p-5 rounded-2xl transition-all border ${p.id === myPlayerId ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/[0.03] hover:border-white/10'} text-foreground`}>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base sm:text-lg">{p.id === roomLeaderId ? "• " : ""}{p.name}</span>
                        {isLeader && p.id !== myPlayerId && (
                          <button 
                            disabled={isLocked}
                            onClick={() => handleKick(p.id)}
                            className="text-[9px] text-red-500 font-bold tracking-wider hover:text-red-400 ml-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold opacity-40`}>{p.id === myPlayerId ? "You" : "Player"}</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="mt-12 flex flex-col items-center space-y-8 w-full max-w-xl">
              <div className="w-full flex flex-col items-center space-y-4">
                {isLeader ? (
                  <button 
                    disabled={questions.length === 0 || isLocked} 
                    onClick={handleStartGame} 
                    className="w-full max-w-md glass-button py-5 rounded-2xl font-bold text-xl sm:text-2xl bg-white/10 border-white/20"
                  >
                    {questions.length === 0 ? "Loading questions..." : "Start game"}
                  </button>
                ) : (
                  <div className="glass px-8 py-4 rounded-2xl animate-pulse border-white/5">
                    <p className="text-gray-500 font-bold text-[10px] text-center italic">Waiting for host to start...</p>
                  </div>
                )}
              </div>

              <div className="w-full flex flex-col items-center space-y-4">
                <p className="text-[9px] font-bold tracking-widest text-gray-700">Invite others</p>
                <div className="glass flex items-center justify-between pl-6 pr-2 py-2.5 rounded-2xl w-full border-white/[0.03] shadow-lg">
                  <span className="text-xs font-mono text-foreground/40 truncate mr-6">
                    {typeof window !== 'undefined' ? window.location.href : `.../room/${roomCode}`}
                  </span>
                  <button 
                    onClick={handleCopyLink}
                    className="h-10 px-6 bg-white text-black hover:bg-gray-200 rounded-xl transition-all shadow-md group flex items-center space-x-2 shrink-0"
                  >
                    <span className="text-[10px] font-bold tracking-wider">
                      {copied ? "Copied" : "Copy"}
                    </span>
                    {!copied && (
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {displayStatus === "wager" && !roundData.wager && (
          <div className="w-full max-w-5xl space-y-10 sm:space-y-12 animate-slide-up text-center py-4">
            <div className="space-y-2">
              <p className="text-gray-600 font-bold tracking-widest text-[10px]">Points at stake</p>
              <h2 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight">How many points?</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isUsed = usedWagers.includes(weight);
                return (
                  <button 
                    key={weight} 
                    disabled={isUsed || isLocked} 
                    onClick={() => handleSelectWager(weight)} 
                    className={`h-24 sm:h-36 rounded-2xl sm:rounded-3xl font-bold text-4xl sm:text-6xl transition-all border-2 relative overflow-hidden group shadow-lg ${
                      isUsed || isLocked
                      ? "bg-transparent border-white/5 text-gray-900 cursor-not-allowed" 
                      : "glass hover:bg-white hover:text-black hover:border-white active:scale-95"
                    }`}
                  >
                    <span className={isUsed ? "line-through opacity-20" : ""}>{weight}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Status: Wager Committed */}
        {displayStatus === "wager" && !!roundData.wager && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-12 py-10">
             <div className="text-center space-y-10">
                <div className="inline-block px-12 py-6 glass border-white/10 rounded-[2rem] shadow-xl relative overflow-hidden">
                   <p className="text-foreground text-3xl sm:text-5xl font-bold tracking-tight animate-pulse italic">Point stake locked</p>
                </div>
                <div className="space-y-6">
                  <p className="text-gray-600 font-bold text-[10px] tracking-widest">
                    Waiting for others ({roundData.wagerCount}/{players.length})
                  </p>
                  <div className="h-1.5 w-64 bg-white/[0.03] rounded-full mx-auto overflow-hidden border border-white/[0.05]">
                    <div 
                      className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_10px_white]" 
                      style={{ width: `${(roundData.wagerCount / players.length) * 100}%` }}
                    />
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Phase 2: Answering */}
        {displayStatus === "question" && (
          <div className="w-full max-w-5xl space-y-10 animate-fade-in text-center py-4">
             <div className="glass p-8 sm:p-16 rounded-[3.5rem] shadow-2xl space-y-12 relative overflow-hidden border-white/[0.05]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground">
                   &quot;{currentQuestion?.text}&quot;
                </h2>

                {!roundData.answer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                      <button 
                        key={i} 
                        disabled={isLocked}
                        onClick={() => handleSubmitAnswer(option)} 
                        className="p-6 sm:p-8 rounded-[1.5rem] text-left border border-white/10 bg-white/[0.02] transition-all font-bold text-lg sm:text-xl hover:bg-white hover:text-black hover:border-white active:scale-95 group disabled:opacity-50"
                      >
                        <span className="mr-4 opacity-20 font-bold group-hover:opacity-100 transition-all">{String.fromCharCode(65 + i)}</span> 
                        {option}
                      </button>
                    ))}
                    {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                      <button 
                        key={val} 
                        disabled={isLocked}
                        onClick={() => handleSubmitAnswer(val)} 
                        className="p-10 rounded-[2rem] font-bold text-3xl border border-white/10 bg-white/[0.02] transition-all hover:bg-white hover:text-black active:scale-95 disabled:opacity-50"
                      >
                        {val}
                      </button>
                    ))}
                    {currentQuestion?.type === "text" && (
                      <div className="col-span-full flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <input 
                          type="text" 
                          autoFocus 
                          disabled={isLocked}
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          placeholder="Type your answer..." 
                          onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer(textAnswer)} 
                          className="flex-1 w-full py-4 glass-input rounded-xl px-6 text-lg font-semibold focus:ring-0 transition-all placeholder:text-gray-800" 
                        />
                        <button 
                          onClick={() => handleSubmitAnswer(textAnswer)}
                          disabled={isLocked}
                          className="w-full sm:w-auto py-4 px-10 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition-all active:scale-95"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-10">
                    <p className="text-foreground text-3xl sm:text-5xl font-bold tracking-tight animate-pulse italic">Answer submitted</p>
                    <p className="text-gray-600 text-[10px] font-bold tracking-widest">Waiting for everyone ({roundData.answerCount}/{players.length})</p>
                  </div>
                )}
             </div>
             <div className="pt-6 sm:pt-10">
                <span className="glass px-8 py-3 rounded-full text-[10px] font-bold tracking-wider text-gray-500 border-white/[0.03]">
                  Your wager: <span className="text-foreground">{roundData.wager} Points</span>
                </span>
             </div>
          </div>
        )}

        {/* Phase 3: Results */}
        {displayStatus === "results" && roomStatus === "results" && roundData.results && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-6 sm:py-12">
            <div className="text-center space-y-12 sm:space-y-16 w-full">
              <h2 className={`text-5xl sm:text-7xl font-bold tracking-tight leading-none transition-all drop-shadow-xl ${roundData.results.correct ? "text-foreground scale-105" : "text-gray-800"}`}>
                {roundData.results.correct ? "Correct!" : "Incorrect"}
              </h2>
              
              <div className="glass p-8 sm:p-16 rounded-[3rem] sm:rounded-[4rem] max-w-4xl mx-auto shadow-2xl space-y-8 sm:space-y-10 relative border-white/[0.05] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="space-y-6">
                  <p className="text-gray-700 font-bold text-[10px] tracking-widest">The right answer</p>
                  <p className="text-3xl sm:text-5xl font-bold text-foreground leading-tight">
                    &quot;{roundData.results.answer}&quot;
                  </p>
                  {roundData.results.explanation && (
                    <div className="mt-8 pt-8 border-t border-white/[0.02] animate-fade-in">
                      <p className="text-gray-500 text-sm sm:text-lg font-medium leading-relaxed max-w-2xl mx-auto italic text-gray-400">
                        {roundData.results.explanation}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-white/[0.02] pt-10 flex justify-between items-center px-6 sm:px-16">
                  <div className="text-left space-y-1">
                    <p className="text-[9px] font-bold text-gray-700 tracking-wider">Your stake</p>
                    <p className="text-2xl sm:text-4xl font-bold text-foreground/60 tabular-nums">{roundData.wager}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold text-gray-700 tracking-wider">Points gained</p>
                    <p className={`text-2xl sm:text-4xl font-bold tabular-nums ${roundData.results.correct ? "text-foreground" : "text-gray-900 opacity-30"}`}>
                      {roundData.results.correct ? `+${roundData.wager}` : "0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Player Results Ledger */}
              <div className="w-full max-w-4xl mx-auto space-y-8 mt-16 sm:mt-24 animate-slide-up px-4 sm:px-0">
                <div className="flex justify-between items-center px-4 sm:px-10">
                  <p className="text-gray-700 font-bold text-[9px] tracking-widest">Round recap</p>
                  <p className="text-gray-700 font-bold text-[9px] tracking-widest">{players.length} Players</p>
                </div>
                
                <div className="sm:glass sm:rounded-[2.5rem] sm:border-white/[0.02] sm:overflow-hidden sm:shadow-xl sm:max-h-[450px] sm:overflow-y-auto no-scrollbar">
                  {/* Desktop Table View */}
                  <table className="hidden sm:table w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 glass backdrop-blur-3xl border-b border-white/5">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-500 tracking-widest">Player</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-500 tracking-widest">Answer</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-500 tracking-widest text-center">Wager</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-500 tracking-widest text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {players.map(p => {
                        const submission = roundData.competitors.find(c => c.player_id === p.id);
                        const isMe = p.id === myPlayerId;
                        
                        return (
                          <tr key={p.id} className={`transition-all duration-300 ${isMe ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
                            <td className="px-10 py-6">
                              <div className="flex flex-col">
                                <span className={`font-bold text-lg ${isMe ? "text-foreground" : "text-gray-500"}`}>
                                  {p.name}
                                </span>
                                {isMe && <span className="text-[8px] font-bold tracking-widest text-foreground/20">You</span>}
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <span className={`font-semibold text-sm truncate max-w-[150px] block ${submission?.submitted_answer ? "text-gray-400" : "text-gray-800 italic"}`}>
                                {submission?.submitted_answer || "No answer"}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <span className="font-bold text-xl text-foreground/50 tabular-nums">
                                {submission?.wager || "—"}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                              {submission ? (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${submission.is_correct ? "bg-white text-black" : "text-gray-800 border border-gray-900"}`}>
                                   {submission.is_correct ? "Correct" : "Wrong"}
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold opacity-20">Waiting</span>
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
                        <div key={p.id} className={`glass p-5 rounded-2xl border-white/[0.02] flex flex-col gap-4 ${isMe ? "bg-white/[0.03] border-white/10" : ""}`}>
                          <div className="flex justify-between items-center">
                            <span className={`font-bold text-lg ${isMe ? "text-foreground" : "text-gray-500"}`}>{p.name}</span>
                            {submission && (
                              <div className={`text-[10px] font-bold tracking-widest ${submission.is_correct ? "text-foreground" : "text-gray-800"}`}>
                                 {submission.is_correct ? "Correct" : "Incorrect"}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.02]">
                            <div>
                               <p className="text-[8px] font-bold text-gray-700 tracking-wider">Answer</p>
                               <p className={`font-bold text-base truncate ${submission?.submitted_answer ? "text-gray-300" : "text-gray-800 italic"}`}>
                                  {submission?.submitted_answer || "None"}
                               </p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-bold text-gray-700 tracking-wider">Wager</p>
                               <p className="font-bold text-xl text-foreground/70 tabular-nums">{submission?.wager || "—"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {isLeader && (
                <p className="text-gray-700 text-[10px] font-bold tracking-widest animate-pulse">
                  {currentIndex === questions.length - 1 ? "Finishing up..." : "Next round starting soon..."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase: Final */}
        {displayStatus === "final" && (
          <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-10">
            <h2 className="text-4xl sm:text-fluid-h1 font-bold text-foreground tracking-tight mb-12 sm:mb-16">Leaderboard</h2>
            
            <div className="glass w-full max-w-3xl rounded-[2.5rem] border-white/[0.03] overflow-hidden shadow-2xl">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-6 sm:p-10 transition-all ${i === 0 ? "bg-white/[0.05] border-b border-white/10" : "border-b border-white/[0.02] last:border-0"}`}>
                   <div className="flex items-center space-x-6 sm:space-x-10">
                      <span className={`text-4xl sm:text-6xl font-bold italic tabular-nums ${i === 0 ? "text-foreground" : "text-foreground/10"}`}>
                        #{i + 1}
                      </span>
                      <div className="text-left">
                        <p className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">{p.name}</p>
                        <p className="text-[9px] font-bold tracking-wider text-foreground/30">{p.id === myPlayerId ? "You" : "Player"}</p>
                      </div>
                   </div>
                   <span className="text-4xl sm:text-6xl font-bold tabular-nums text-foreground">{p.score}</span>
                </div>
              ))}
            </div>
            
            <button onClick={() => window.location.href = "/"} className="mt-16 sm:mt-24 glass-button px-16 sm:px-32 py-5 rounded-2xl font-bold text-xl sm:text-2xl transition-all active:scale-95 bg-white/5 border-white/10 hover:bg-white hover:text-black">
              Leave Game
            </button>
          </div>
        )}
      </main>
      
      <footer className="p-12 text-center text-gray-800 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
        TriviaDuel • v4.1-GLASS
      </footer>
    </div>
  );
}
