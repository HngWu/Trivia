"use client";

import React, { useState, useEffect } from "react";
import { GameState } from "@/lib/types/game";

interface FluidTimerProps {
  statusUpdatedAt: number;
  displayStatus: GameState;
  timer: number;
}

export default function FluidTimer({ statusUpdatedAt, displayStatus, timer }: FluidTimerProps) {
  const [visualOffset, setVisualOffset] = useState(0);

  useEffect(() => {
    let rafId: number;
    const animate = () => {
      if (displayStatus === "waiting" || displayStatus === "final" || !statusUpdatedAt) {
        setVisualOffset(0);
        return;
      }

      const elapsedMs = Date.now() - statusUpdatedAt;
      const remainingMs = Math.max(0, 60000 - elapsedMs);
      const offset = 251.2 - (251.2 * remainingMs) / 60000;
      setVisualOffset(offset);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [displayStatus, statusUpdatedAt]);

  if (displayStatus === "waiting" || displayStatus === "final") return null;

  return (
    <div className="fixed bottom-12 right-12 z-40 flex items-center justify-center animate-fade-in">
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
            stroke={timer < 10 ? "#ef4444" : "white"}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={visualOffset}
            strokeLinecap="round"
            className="transition-[stroke] duration-1000 linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${timer < 10 ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-150" : "bg-white/40"}`} />
        </div>
      </div>
    </div>
  );
}
