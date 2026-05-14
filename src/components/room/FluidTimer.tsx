"use client";

import React, { useState, useEffect } from "react";
import { GameState } from "@/lib/types/game";
import { Spinner } from "@heroui/react";

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
    <div className={`fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-40 flex items-center justify-center animate-fade-in transition-all duration-500 ${isLocked ? "scale-105" : ""}`}>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={isLocked ? "white" : (timer < 10 ? "#ef4444" : "white")}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={visualOffset}
            strokeLinecap="round"
            className="transition-all duration-100 linear opacity-20"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={isLocked ? "white" : (timer < 10 ? "#ef4444" : "white")}
            strokeWidth="1.5"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={visualOffset}
            strokeLinecap="round"
            className="transition-all duration-100 linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums transition-all duration-300 ${isLocked ? "text-white/20 blur-sm" : (timer < 10 ? "text-red-500 animate-pulse" : "text-white")}`}>
            {timer}
          </span>
          <span className="text-[6px] font-bold tracking-wider text-gray-600 -mt-0.5">Secs</span>
        </div>
        
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
             <Spinner size="sm" color="accent" />
          </div>
        )}
      </div>
    </div>
  );
}
