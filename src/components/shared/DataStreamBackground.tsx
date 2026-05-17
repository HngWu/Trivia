'use client';

import React, { useEffect, useRef } from 'react';

export default function DataStreamBackground({ isEnabled }: { isEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const mouse = { x: -1000, y: -1000 };
    let lastMouse = { x: -1000, y: -1000 };
    let particles: { x: number; y: number; size: number; speed: number; vx: number; vy: number }[] = [];
    let shockwaves: { x: number; y: number; r: number; alpha: number }[] = [];
    let count = 120;

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      const isMobile = window.innerWidth < 768;
      count = isMobile ? 60 : 120; // Reduced for mobile
      
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 1.5 + 0.5,
        vx: 0,
        vy: 0
      }));
    };

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      lastMouse = { ...mouse };
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleClick = (e: MouseEvent) => {
      if (!isEnabled) return;
      shockwaves.push({ x: e.clientX, y: e.clientY, r: 1, alpha: 1 });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    init();

    let animationFrame: number;
    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.fillStyle = 'oklch(0.145 0 0)'; // Background color from CSS variable
      ctx.fillRect(0, 0, width, height);

      // Handle shockwaves
      shockwaves = shockwaves.filter(s => {
        if (isEnabled) {
          s.r += 10;
          s.alpha -= 0.02;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.alpha * 0.2})`;
        ctx.stroke();
        return s.alpha > 0;
      });

      const mouseVx = mouse.x - lastMouse.x;
      const mouseVy = mouse.y - lastMouse.y;

      particles.forEach(p => {
        if (isEnabled) {
          // Base movement
          p.y -= p.speed;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
            p.vx = 0; p.vy = 0;
          }

          // Fluid Wake (Mouse movement)
          const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (distToMouse < 100) {
            const force = (100 - distToMouse) / 100;
            p.vx += mouseVx * force * 0.2;
            p.vy += mouseVy * force * 0.2;
          }

          // Shockwave repulsion
          shockwaves.forEach(s => {
            const d = Math.hypot(p.x - s.x, p.y - s.y);
            const rippleDist = Math.abs(d - s.r);
            if (rippleDist < 40) {
              const angle = Math.atan2(p.y - s.y, p.x - s.x);
              const push = (40 - rippleDist) * 0.5 * s.alpha;
              p.x += Math.cos(angle) * push;
              p.y += Math.sin(angle) * push;
            }
          });

          // Apply velocities with friction
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
        }

        const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const isActive = distToMouse < 80;
        ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (isActive) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
        } else {
          ctx.shadowBlur = 0;
        }
      });

      lastMouse = { ...mouse };
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleClick);
      cancelAnimationFrame(animationFrame);
    };
  }, [isEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
