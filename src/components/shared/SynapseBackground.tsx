'use client';

import React, { useEffect, useRef } from 'react';

export default function SynapseBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let w = 0, h = 0;
    let mouse = { x: -1000, y: -1000 };
    let points: { x: number; y: number; vx: number; vy: number }[] = [];

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      points = Array.from({ length: 60 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      }));
    };

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    init();

    let animationFrame: number;
    const animate = () => {
      // Use logical width/height for drawing
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      points.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const isActive = distToMouse < 150;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 2 : 1, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#3b82f6' : '#222'; // Blue when active
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const opacity = (1 - d/150) * (isActive ? 0.4 : 0.1);
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`; // Blue connections
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
