'use client';

import React, { useEffect, useRef } from 'react';

export default function SynapseBackground({ isEnabled }: { isEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let w = 0, h = 0;
    let mouse = { x: -1000, y: -1000 };
    let points: { x: number; y: number; vx: number; vy: number; orbitAngle: number; orbitRadius: number }[] = [];
    let rippleRadius = 0;
    let rippleCenter = { x: 0, y: 0 };

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      points = Array.from({ length: 65 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: Math.random() * 50 + 20
      }));
    };

    const handleResize = () => init();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleClick = (e: MouseEvent) => {
      if (!isEnabled) return;
      rippleRadius = 1;
      rippleCenter = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick);
    init();

    let animationFrame: number;
    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      if (rippleRadius > 0) {
        rippleRadius += 15;
        if (rippleRadius > Math.max(width, height) * 1.5) rippleRadius = 0;
      }

      points.forEach((p, i) => {
        const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const isOrbiting = distToMouse < 180;

        if (isEnabled) {
          if (isOrbiting) {
            p.orbitAngle += 0.02;
            const targetX = mouse.x + Math.cos(p.orbitAngle) * p.orbitRadius;
            const targetY = mouse.y + Math.sin(p.orbitAngle) * p.orbitRadius;
            p.x += (targetX - p.x) * 0.1;
            p.y += (targetY - p.y) * 0.1;
          } else {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;
          }
        }

        const distToRipple = Math.abs(Math.hypot(p.x - rippleCenter.x, p.y - rippleCenter.y) - rippleRadius);
        const isRippling = distToRipple < 50 && rippleRadius > 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, isRippling ? 3 : (isOrbiting ? 2 : 1), 0, Math.PI * 2);
        ctx.fillStyle = isRippling ? '#fff' : (isOrbiting ? '#3b82f6' : '#222');
        ctx.fill();

        if (isRippling) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#3b82f6';
        }

        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const d = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const opacity = (1 - d/150) * (isRippling ? 0.8 : (isOrbiting ? 0.4 : 0.1));
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.lineWidth = isRippling ? 1.5 : 0.5;
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
      });

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
