'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function CosmicBackground() {
  // Use useMemo to prevent re-renders of the static noise filter
  const noiseFilter = useMemo(() => (
    <svg className="hidden">
      <filter id="noiseFilter">
        <feTurbulence 
          type="fractalNoise" 
          baseFrequency="0.65" 
          numOctaves="3" 
          stitchTiles="stitch" 
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </svg>
  ), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
      {noiseFilter}
      
      {/* Base Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ filter: 'url(#noiseFilter)' }} />

      {/* Animated Gradient Orbs */}
      <motion.div 
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-1/4 -left-1/4 w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)] blur-3xl pointer-events-none"
      />

      <motion.div 
        animate={{
          x: [0, -100, 50, 0],
          y: [0, 100, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.02)_0%,transparent_70%)] blur-3xl pointer-events-none"
      />

      {/* Subtle Grid */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} 
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
    </div>
  );
}
