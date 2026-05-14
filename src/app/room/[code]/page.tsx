'use client';

import React, { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getRoomState, updateRoomStatus, submitWager, submitAnswer, joinRoom, kickPlayer, getServerTime } from "@/lib/actions";
import { Player, Question, Answer, GameState, Room } from "@/lib/types/game";
import { validateAnswer } from "@/lib/validation";

import { toast, Button, Input, Card, Spinner, TextField } from "@heroui/react";

import FluidTimer from "@/components/room/FluidTimer";
import RoomNav from "@/components/room/RoomNav";
import RoomHeader from "@/components/room/RoomHeader";
import LobbyView from "@/components/room/LobbyView";
import WagerView from "@/components/room/WagerView";
import QuestionView from "@/components/room/QuestionView";
import ResultsView from "@/components/room/ResultsView";
import FinalView from "@/components/room/FinalView";

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

  // --- REFS ---
  const currentVersionRef = useRef(0);
  const currentIndexRef = useRef(0);
  const pendingSubmissionsRef = useRef<Record<string, Answer>>({});
  const lastSyncTimeRef = useRef(0);

  // --- DERIVED DATA ---
  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex]);
  const myPlayer = useMemo(() => players.find(p => p.id === myPlayerId), [players, myPlayerId]);
  const displayedMyPlayer = useMemo(() => displayedPlayers.find(p => p.id === myPlayerId), [displayedPlayers, myPlayerId]);
  const isLocked = useMemo(() => roomStatus !== displayStatus, [roomStatus, displayStatus]);
  const isLeader = useMemo(() => {
    const savedId = myPlayerId || (typeof window !== "undefined" ? localStorage.getItem("player_id") : "");
    return Boolean(myPlayer?.is_leader || (roomLeaderId && savedId === roomLeaderId));
  }, [myPlayer, roomLeaderId, myPlayerId]);

  const roundData = useMemo(() => {
    if (!currentQuestion) return { wager: null, answer: "", results: null, competitors: [] as Answer[], wagerCount: 0, answerCount: 0 };
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
      competitors: qAnswers,
      wagerCount: qAnswers.filter(a => a.wager > 0).length,
      answerCount: qAnswers.filter(a => a.submitted_answer !== "").length
    };
  }, [allRoomAnswers, currentQuestion, myPlayerId, roomStatus]);

  const usedWagers = useMemo(() => {
    return allRoomAnswers.filter(a => a.player_id === myPlayerId).map(a => a.wager);
  }, [allRoomAnswers, myPlayerId]);

  // --- ACTIONS ---
  const applyState = useCallback((state: { room: Room | null; players: Player[]; allAnswers: Answer[] }) => {
    const { room, players: p, allAnswers: a } = state;
    if (!room || (room.version && room.version <= currentVersionRef.current)) return;
    
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
        const index = mergedAnswers.findIndex(ans => ans.player_id === pending.player_id && ans.question_id === pending.question_id);
        if (index !== -1) {
          if (!mergedAnswers[index].submitted_answer && pending.submitted_answer) mergedAnswers[index] = { ...mergedAnswers[index], ...pending };
        } else mergedAnswers.push(pending);
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

    if (scheduledUpdateRef.current !== null) cancelAnimationFrame(scheduledUpdateRef.current);
    const targetTime = room.status_updated_at || (Date.now() + serverOffset);
    const now = Date.now() + serverOffset;
    
    if (now >= targetTime) setDisplayStatus(room.status as GameState);
    else {
      const syncLoop = () => {
        if (Date.now() + serverOffset >= targetTime) {
          setDisplayStatus(room.status as GameState);
          scheduledUpdateRef.current = null;
        } else scheduledUpdateRef.current = requestAnimationFrame(syncLoop);
      };
      scheduledUpdateRef.current = requestAnimationFrame(syncLoop);
    }
  }, [myPlayerId, isJoining, serverOffset]);

  const fetchData = useCallback(async () => {
    try {
      const state = await getRoomState(roomCode);
      applyState(state as { room: Room | null; players: Player[]; allAnswers: Answer[] });
    } catch (error) { console.error("Sync error:", error); }
  }, [roomCode, applyState]);

  const triggerSync = useCallback((data?: { room: Room | null; players: Player[]; allAnswers: Answer[] }) => {
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "STATE_UPDATED", payload: { t: Date.now(), state: data } });
    }
  }, []);

  const handleKick = useCallback(async (targetPlayerId: string) => {
    if (!isLeader || targetPlayerId === myPlayerId) return;
    try {
      const newState = await kickPlayer(roomCode, targetPlayerId, myPlayerId);
      triggerSync(newState as { room: Room | null; players: Player[]; allAnswers: Answer[] });
    } catch (error) { 
      console.error("Kick failed:", error);
      toast.danger("Failed to kick player.");
    }
  }, [isLeader, myPlayerId, roomCode, triggerSync]);

  const handleSelectWager = useCallback(async (weight: number) => {
    if (roundData.wager || !currentQuestion) return;
    const key = `${myPlayerId}:${currentQuestion.id}`;
    const optimisticAnswer: Answer = { player_id: myPlayerId, question_id: currentQuestion.id, wager: weight, submitted_answer: "", is_correct: false };
    pendingSubmissionsRef.current[key] = optimisticAnswer;
    setAllRoomAnswers(prev => [...prev.filter(a => !(a.player_id === myPlayerId && a.question_id === currentQuestion.id)), optimisticAnswer]);
    try {
      const newState = await submitWager(roomCode, myPlayerId, currentQuestion.id, weight);
      delete pendingSubmissionsRef.current[key];
      triggerSync(newState as { room: Room | null; players: Player[]; allAnswers: Answer[] });
    } catch (error) { 
      console.error("Wager failed:", error);
      delete pendingSubmissionsRef.current[key]; 
    }
  }, [roundData.wager, currentQuestion, myPlayerId, roomCode, triggerSync]);

  const handleSubmitAnswer = useCallback(async (val: string) => {
    if (roundData.answer || !currentQuestion) return;
    const key = `${myPlayerId}:${currentQuestion.id}`;
    const isCorrect = validateAnswer(val, currentQuestion.correct_answer);
    const optimisticAnswer: Answer = { player_id: myPlayerId, question_id: currentQuestion.id, wager: roundData.wager || 0, submitted_answer: val, is_correct: isCorrect };
    pendingSubmissionsRef.current[key] = optimisticAnswer;
    setAllRoomAnswers(prev => prev.map(a => (a.player_id === myPlayerId && a.question_id === currentQuestion.id) ? optimisticAnswer : a));
    try {
      const newState = await submitAnswer(roomCode, myPlayerId, currentQuestion.id, val);
      delete pendingSubmissionsRef.current[key];
      triggerSync(newState as { room: Room | null; players: Player[]; allAnswers: Answer[] });
    } catch (error) { 
      console.error("Answer failed:", error);
      delete pendingSubmissionsRef.current[key]; 
    }
  }, [roundData.answer, currentQuestion, roundData.wager, myPlayerId, roomCode, triggerSync]);


  const handleTimeUp = useCallback(() => {
    const availableWeights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(w => !usedWagers.includes(w));
    if (roomStatus === "wager" && !roundData.wager) handleSelectWager(availableWeights[0] || 1);
    else if (roomStatus === "question" && !roundData.answer) handleSubmitAnswer("TIMEOUT_EXPIRED");
  }, [roomStatus, roundData.wager, roundData.answer, usedWagers, handleSelectWager, handleSubmitAnswer]);

  const handleNextRound = useCallback(async () => {
    if (!isLeader) return;
    const nextIndex = currentIndex + 1;
    const nextStatus = nextIndex < questions.length ? "wager" : "final";
    const newState = await updateRoomStatus(roomCode, nextStatus, nextIndex);
    triggerSync(newState as { room: Room | null; players: Player[]; allAnswers: Answer[] });
  }, [isLeader, currentIndex, questions.length, roomCode, triggerSync]);

  const handleStartGame = useCallback(async () => {
    if (questions.length === 0) return;
    const newState = await updateRoomStatus(roomCode, "wager");
    triggerSync(newState as { room: Room | null; players: Player[]; allAnswers: Answer[] });
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
      applyState(state as { room: Room | null; players: Player[]; allAnswers: Answer[] });
      setIsJoining(false);
      triggerSync(state as { room: Room | null; players: Player[]; allAnswers: Answer[] });
    } catch (error) { 
      console.error("Join error:", error);
      toast.danger("Failed to join room.");
    } finally { setIsLoading(false); }
  }, [nickname, roomCode, triggerSync, applyState, isLoading]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // --- EFFECTS ---
  useEffect(() => {
    const shouldUpdate = displayStatus === "waiting" || displayStatus === "results" || displayStatus === "final" || displayedPlayers.length === 0;
    if (shouldUpdate) {
      requestAnimationFrame(() => setDisplayedPlayers(players));
    }
  }, [players, displayStatus, displayedPlayers.length]);

  useEffect(() => {
    const syncClock = async () => {
      try {
        const start = Date.now();
        const serverNow = await getServerTime();
        const latency = (Date.now() - start) / 2;
        setServerOffset(serverNow - (start + latency));
      } catch (error) { console.error("Clock sync failed", error); }
    };
    syncClock();
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem("player_id");
    const savedName = localStorage.getItem("player_name");
    const initialFetch = async () => {
      setIsLoading(true);
      try {
        const state = await getRoomState(roomCode);
        if (!state.room) {
            toast.danger("Room not found.");
            setTimeout(() => window.location.href = "/", 2000);
            return;
        }
        applyState(state as { room: Room | null; players: Player[]; allAnswers: Answer[] });
        const isAlreadyInRoom = state.players?.some((player: Player) => player.id === savedId);
        if (isAlreadyInRoom && savedId) setMyPlayerId(savedId);
        else if (savedName) {
           try {
             const { player } = await joinRoom(roomCode, savedName);
             setMyPlayerId(player.id);
             localStorage.setItem("player_id", player.id);
             const s = await getRoomState(roomCode);
             applyState(s as { room: Room | null; players: Player[]; allAnswers: Answer[] });
             triggerSync(s as { room: Room | null; players: Player[]; allAnswers: Answer[] });
           } catch (error) { 
             console.error("Auto-join failed:", error);
             setIsJoining(true); 
           }
        } else setIsJoining(true);
      } catch (error) { 
        console.error("Initial fetch error:", error);
        toast.danger("Failed to load room data.");
      } finally { setIsLoading(false); }
    };
    initialFetch();
    const channel = supabase.channel(`game:${roomCode}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "STATE_UPDATED" }, ({ payload }) => {
         if (payload.state) applyState(payload.state as { room: Room | null; players: Player[]; allAnswers: Answer[] });
         else fetchData();
      }).subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [roomCode, supabase, fetchData, applyState, triggerSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && roomStatus !== "final" && Date.now() - lastSyncTimeRef.current > 3000) fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading, roomStatus, fetchData]);

  useEffect(() => {
    if (roomStatus === "waiting" || roomStatus === "final" || isLoading || !statusUpdatedAt) return;
    const updateTimer = () => {
      const elapsed = Math.floor(((Date.now() + serverOffset) - statusUpdatedAt) / 1000);
      setTimer(Math.max(0, 60 - elapsed));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roomStatus, isLoading, currentIndex, statusUpdatedAt, serverOffset]);

  useEffect(() => {
    if (timer === 0 && (roomStatus === "wager" || roomStatus === "question")) setTimeout(handleTimeUp, 0);
  }, [timer, roomStatus, handleTimeUp]);

  useEffect(() => {
    if (roomStatus === "results" && isLeader) {
      const t = setTimeout(handleNextRound, 7000);
      return () => clearTimeout(t);
    }
  }, [roomStatus, isLeader, handleNextRound]);

  // --- RENDER ---
  if (isJoining) return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-3xl flex items-center justify-center p-6">
      <Card className="glass p-10 rounded-[3rem] w-full max-w-md space-y-6 animate-slide-up border-white/10 shadow-2xl bg-transparent">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold tracking-tight text-foreground">Enter Game</h2>
          <p className="text-gray-500 font-bold tracking-widest text-[10px] uppercase">Identify yourself to join</p>
        </div>
        <div className="space-y-5">
          <TextField name="nickname" value={nickname} onChange={setNickname} autoFocus>
            <Input 
              placeholder="Your Nickname" 
              onKeyDown={e => e.key === "Enter" && handleJoin()} 
              className="font-semibold text-lg glass !border-white/10 h-12 rounded-xl px-4"
            />
          </TextField>
          <Button 
            onPress={handleJoin} 
            isDisabled={!nickname.trim() || isLoading} 
            className="w-full h-12 bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all active:scale-95"
          >
            {isLoading ? <Spinner size="sm" color="current" className="mr-2" /> : null}
            Join room
          </Button>
        </div>
      </Card>
    </div>
  );

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-bold tracking-widest animate-pulse text-center p-8">Loading room...</div>;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const displayedSortedPlayers = [...displayedPlayers].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen text-foreground flex flex-col page-transition selection:bg-white/20 overflow-y-auto relative z-10">
      <RoomNav roomCode={roomCode} myPlayerId={myPlayerId} displayedMyPlayer={displayedMyPlayer} displayedSortedPlayers={displayedSortedPlayers} onHome={() => window.location.href = "/"} />

      <main key={`round-view-${currentIndex}`} className="flex-1 flex flex-col items-center p-3 sm:p-6 md:p-10 max-w-6xl mx-auto w-full relative">
        <RoomHeader currentIndex={currentIndex} topic={topic} roomStatus={roomStatus} displayStatus={displayStatus} isLocked={isLocked} currentQuestion={currentQuestion} />
        <FluidTimer statusUpdatedAt={statusUpdatedAt} displayStatus={displayStatus} timer={timer} serverOffset={serverOffset} isLocked={isLocked} />

        {roomStatus === "wager" && displayStatus !== "wager" && (
           <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8 py-12">
              <Spinner size="lg" color="accent" />
              <div className="text-center space-y-2">
                 <h2 className="text-2xl sm:text-4xl font-bold text-foreground">Preparing Next Round</h2>
                 <p className="text-gray-600 font-bold tracking-wider text-[10px] animate-pulse italic uppercase">Setting the stage...</p>
              </div>
           </div>
        )}

        {displayStatus === "waiting" && roomStatus === "waiting" && (
          <LobbyView topic={topic} players={players} roomCode={roomCode} myPlayerId={myPlayerId} roomLeaderId={roomLeaderId} isLeader={isLeader} isLocked={isLocked} questionsCount={questions.length} onKick={handleKick} onStart={handleStartGame} onCopy={handleCopyLink} copied={copied} />
        )}

        {displayStatus === "wager" && (
          <WagerView roundData={roundData} players={players} isLocked={isLocked} usedWagers={usedWagers} onSelectWager={handleSelectWager} />
        )}

        {displayStatus === "question" && (
          <QuestionView currentQuestion={currentQuestion} roundData={roundData} players={players} isLocked={isLocked} textAnswer={textAnswer} setTextAnswer={setTextAnswer} onSubmitAnswer={handleSubmitAnswer} />
        )}

        {displayStatus === "results" && roomStatus === "results" && (
          <ResultsView roundData={roundData} players={players} myPlayerId={myPlayerId} isLeader={isLeader} isLocked={isLocked} onKick={handleKick} />
        )}

        {displayStatus === "final" && (
          <FinalView sortedPlayers={sortedPlayers} myPlayerId={myPlayerId} onHome={() => window.location.href = "/"} allAnswers={allRoomAnswers} questions={questions} />
        )}
      </main>
      <footer className="p-8 text-center text-gray-800 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">TriviaDuel • v4.2-GLASS</footer>
    </div>
  );
}
