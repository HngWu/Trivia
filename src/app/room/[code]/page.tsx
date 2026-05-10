"use client";

import React, { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getRoomState, updateRoomStatus, submitWager, submitAnswer, joinRoom, kickPlayer, getServerTime } from "@/lib/actions";
import { Player, Question, Answer, GameState } from "@/lib/types/game";
import Toast from "@/components/shared/Toast";
import { validateAnswer } from "@/lib/validation";

import FluidTimer from "@/components/room/FluidTimer";
import RoomNav from "@/components/room/RoomNav";
import RoomHeader from "@/components/room/RoomHeader";
import LobbyView from "@/components/room/LobbyView";
import WagerView from "@/components/room/WagerView";
import QuestionView from "@/components/room/QuestionView";
import ResultsView from "@/components/room/ResultsView";
import FinalView from "@/components/room/FinalView";

import { AnimatePresence, motion } from "framer-motion";

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

  // --- UI DISPLAY STATE ---
  const [displayedPlayers, setDisplayedPlayers] = useState<Player[]>([]);

  // --- UI STATE ---
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (displayStatus === "waiting" || displayStatus === "results" || displayStatus === "final" || displayedPlayers.length === 0) {
      setDisplayedPlayers(players);
    }
  }, [players, displayStatus, displayedPlayers.length]);

  const currentVersionRef = useRef(0);

  useEffect(() => {
    return () => {
      if (scheduledUpdateRef.current !== null) {
        cancelAnimationFrame(scheduledUpdateRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("player_name");
    if (savedName) setNickname(savedName);
  }, []);

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
    setTimeout(() => setToast(null), 4000);
  };

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  const myPlayer = useMemo(() => players.find(p => p.id === myPlayerId), [players, myPlayerId]);
  const isLocked = useMemo(() => roomStatus !== displayStatus, [roomStatus, displayStatus]);
  
  const isLeader = useMemo(() => {
    const savedId = myPlayerId || (typeof window !== "undefined" ? localStorage.getItem("player_id") : "");
    return Boolean(myPlayer?.is_leader || (roomLeaderId && savedId === roomLeaderId));
  }, [myPlayer, roomLeaderId, myPlayerId]);

  const roundData = useMemo(() => {
    if (!currentQuestion) return { wager: null, answer: "", results: null, competitors: [] as Answer[], wagerCount: 0, answerCount: 0 };

    const qAnswers = allRoomAnswers.filter(a => a.question_id === currentQuestion.id);
    const myAns = qAnswers.find(a => a.player_id === myPlayerId);
    
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

    if (room.version && room.version <= currentVersionRef.current) return;
    currentVersionRef.current = room.version || 0;

    lastSyncTimeRef.current = Date.now();

    if (myPlayerId && p && !p.find((player: Player) => player.id === myPlayerId) && !isJoining) {
      window.location.href = "/?error=kicked";
      return;
    }

    setRoomLeaderId(room.leader_id);
    setTopic(room.topic || "");
    if (p) setPlayers(p);
    if (room.questions) setQuestions(room.questions);

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
    setAllRoomAnswers(prev => [...prev.filter(a => !(a.player_id === myPlayerId && a.question_id === currentQuestion.id)), optimisticAnswer]);

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
    setAllRoomAnswers(prev => prev.map(a => (a.player_id === myPlayerId && a.question_id === currentQuestion.id) ? optimisticAnswer : a));
    
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
      applyState(state);
      setIsJoining(false);
      triggerSync(state);
    } catch (err) {
      console.error("Join error:", err);
      showToast("Failed to join room.");
    } finally {
      setIsLoading(false);
    }
  }, [nickname, roomCode, triggerSync, applyState, isLoading]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem("player_id");
    const savedName = localStorage.getItem("player_name");
    
    const initialFetch = async () => {
      setIsLoading(true);
      try {
        const state = await getRoomState(roomCode);
        if (!state.room) {
            showToast("Battle room not found.");
            setTimeout(() => window.location.href = "/", 2000);
            return;
        }
        applyState(state);
        if (state.players?.some((p: Player) => p.id === savedId) && savedId) {
          setMyPlayerId(savedId);
        } else if (savedName) {
          try {
            const { player } = await joinRoom(roomCode, savedName);
            setMyPlayerId(player.id);
            localStorage.setItem("player_id", player.id);
            const newState = await getRoomState(roomCode);
            applyState(newState);
            triggerSync(newState);
          } catch (e) { setIsJoining(true); }
        } else { setIsJoining(true); }
      } catch (err) {
        console.error("Initial fetch failed", err);
        showToast("Failed to load battle data.");
      } finally { setIsLoading(false); }
    };

    initialFetch();

    const channel = supabase.channel(`game:${roomCode}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "STATE_UPDATED" }, ({ payload }) => {
         if (payload.state) applyState(payload.state);
         else fetchData();
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [roomCode, supabase, fetchData, triggerSync, applyState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
      if (!isLoading && roomStatus !== "final" && timeSinceLastSync > 3000) fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading, roomStatus, fetchData]);

  useEffect(() => {
    if (roomStatus === "waiting" || roomStatus === "final" || isLoading || !statusUpdatedAt) return;
    const updateTimer = () => {
      const now = Date.now() + serverOffset;
      const elapsed = Math.floor((now - statusUpdatedAt) / 1000);
      setTimer(Math.max(0, 60 - elapsed));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roomStatus, isLoading, currentIndex, statusUpdatedAt, serverOffset]);

  useEffect(() => {
    if (timer === 0 && (roomStatus === "wager" || roomStatus === "question")) {
      handleTimeUp();
    }
  }, [timer, roomStatus, handleTimeUp]);

  useEffect(() => {
    if (roomStatus === "results" && isLeader) {
      const t = setTimeout(() => handleNextRound(), 7000);
      return () => clearTimeout(t);
    }
  }, [roomStatus, isLeader, handleNextRound]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const displayedSortedPlayers = [...displayedPlayers].sort((a, b) => b.score - a.score);

  if (isJoining) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-3xl flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass p-12 rounded-[3rem] w-full max-w-lg space-y-8 border-white/10 shadow-2xl"
        >
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold tracking-tight text-white">Enter Game</h2>
            <p className="text-gray-500 font-bold tracking-widest text-[10px] uppercase">Identify yourself to join</p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your Nickname" 
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full h-14 glass-input rounded-xl px-6 text-xl font-semibold tracking-tight focus:border-white transition-all text-white" 
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={!nickname.trim() || isLoading}
              className="w-full h-14 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Joining..." : "Join room"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-bold tracking-widest animate-pulse text-center p-8 text-white">Establishing Connection...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col page-transition selection:bg-white/20 overflow-y-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <RoomNav 
        onHome={() => window.location.href = "/"}
        displayedMyPlayer={displayedPlayers.find(p => p.id === myPlayerId)}
        displayedSortedPlayers={displayedSortedPlayers}
        myPlayerId={myPlayerId}
        roomCode={roomCode}
      />

      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 md:p-12 max-w-6xl mx-auto w-full relative">
        <AnimatePresence mode="wait">
          {displayStatus !== "waiting" && displayStatus !== "final" && (
            <RoomHeader 
              currentIndex={currentIndex}
              topic={topic}
              roomStatus={roomStatus}
              displayStatus={displayStatus}
              isLocked={isLocked}
              currentQuestion={currentQuestion}
            />
          )}
        </AnimatePresence>

        <FluidTimer 
          statusUpdatedAt={statusUpdatedAt}
          displayStatus={displayStatus}
          timer={timer}
          serverOffset={serverOffset}
          isLocked={isLocked}
        />

        <AnimatePresence mode="wait">
          {displayStatus === "waiting" && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full"
            >
              <LobbyView 
                topic={topic}
                players={players}
                roomCode={roomCode}
                myPlayerId={myPlayerId}
                roomLeaderId={roomLeaderId}
                isLeader={isLeader}
                isLocked={isLocked}
                questionsCount={questions.length}
                onKick={handleKick}
                onStart={handleStartGame}
                onCopy={handleCopyLink}
                copied={copied}
              />
            </motion.div>
          )}

          {displayStatus === "wager" && (
            <motion.div 
              key="wager"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full"
            >
              <WagerView 
                roundData={roundData}
                players={players}
                isLocked={isLocked}
                usedWagers={usedWagers}
                onSelectWager={handleSelectWager}
              />
            </motion.div>
          )}

          {displayStatus === "question" && (
            <motion.div 
              key="question"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full"
            >
              <QuestionView 
                currentQuestion={currentQuestion}
                roundData={roundData}
                players={players}
                isLocked={isLocked}
                textAnswer={textAnswer}
                setTextAnswer={setTextAnswer}
                onSubmitAnswer={handleSubmitAnswer}
              />
            </motion.div>
          )}

          {displayStatus === "results" && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="w-full"
            >
              <ResultsView 
                roundData={roundData}
                players={players}
                myPlayerId={myPlayerId}
                isLeader={isLeader}
                isLocked={isLocked}
                onKick={handleKick}
              />
            </motion.div>
          )}

          {displayStatus === "final" && (
            <motion.div 
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full"
            >
              <FinalView 
                sortedPlayers={sortedPlayers}
                myPlayerId={myPlayerId}
                onHome={() => window.location.href = "/"}
                allAnswers={allRoomAnswers}
                questions={questions}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer className="p-8 text-center text-gray-800 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
        TriviaDuel • v4.2-GLASS
      </footer>
    </div>
  );
}
