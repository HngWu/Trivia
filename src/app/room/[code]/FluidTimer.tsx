"use client";

import React, { useState, useEffect } from "react";
import { GameState } from "@/lib/types/game";

interface FluidTimerProps {
  statusUpdatedAt: number;
  displayStatus: GameState;
  timer: number;
  serverOffset: number;
  isLocked?: boolean;
}

export default function FluidTimer({ statusUpdatedAt, displayStatus, timer, serverOffset, isLocked }: FluidTimerProps) {
  const [visualOffset, setVisualOffset] = useState(0);

  useEffect(() => {
    let rafId: number;
    const animate = () => {
      if (displayStatus === "waiting" || displayStatus === "final" || !statusUpdatedAt) {
        setVisualOffset(0);
        return;
      }

      const elapsedMs = (Date.now() + serverOffset) - statusUpdatedAt;
      const totalDurationMs = 60000;
      const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
      const offset = 251.2 - (251.2 * remainingMs) / totalDurationMs;
      setVisualOffset(offset);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [displayStatus, statusUpdatedAt, serverOffset]);

  if (displayStatus === "waiting" || displayStatus === "final") return null;

  return (
    <div className={`fixed bottom-12 right-12 z-40 flex items-center justify-center animate-fade-in transition-transform duration-500 ${isLocked ? "scale-110" : ""}`}>
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={isLocked ? "#fcd34d" : (timer < 10 ? "#ef4444" : "white")}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={visualOffset}
            strokeLinecap="round"
            className="transition-[stroke] duration-300 linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full transition-all duration-500 ${
            isLocked 
            ? "w-4 h-4 bg-yellow-400 shadow-[0_0_20px_rgba(252,211,77,0.5)] animate-pulse" 
            : (timer < 10 ? "w-2 h-2 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-150" : "w-2 h-2 bg-white/40")
          }`} />
        </div>
        {isLocked && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-yellow-400 animate-pulse">Syncing</span>
          </div>
        )}
      </div>
    </div>
  );
}
