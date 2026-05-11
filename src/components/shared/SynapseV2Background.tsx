'use client';

import React, { useEffect, useRef } from 'react';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  phase: number;
  type?: string;
}

export default function SynapseV2Background({ isEnabled }: { isEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let can_w = window.innerWidth;
    let can_h = window.innerHeight;
    const BALL_NUM = 75; // Balanced density
    const R = 1.5; // Slightly smaller balls for elegance
    const alpha_f = 0.02; // Slower transparency oscillation
    const link_line_width = 0.6; // Thinner lines
    const dis_limit = 240; // Slightly shorter connection range
    const ball_color = { r: 59, g: 130, b: 246 }; // Consistent blue
    
    let balls: Ball[] = [];
    const mouse_ball: Ball = { x: -1000, y: -1000, vx: 0, vy: 0, r: 0, alpha: 0, phase: 0, type: 'mouse' };

    const randomNumFrom = (min: number, max: number) => Math.random() * (max - min) + min;
    const randomSidePos = (length: number) => Math.ceil(Math.random() * length);
    const randomArrayItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    function getRandomSpeed(pos: string) {
      const min = -0.6, max = 0.6; // Slightly slower drift
      switch (pos) {
        case 'top': return [randomNumFrom(min, max), randomNumFrom(0.1, max)];
        case 'right': return [randomNumFrom(min, -0.1), randomNumFrom(min, max)];
        case 'bottom': return [randomNumFrom(min, max), randomNumFrom(min, -0.1)];
        case 'left': return [randomNumFrom(0.1, max), randomNumFrom(min, max)];
        default: return [0, 0];
      }
    }

    function getRandomBall() {
      const pos = randomArrayItem(['top', 'right', 'bottom', 'left']);
      const speed = getRandomSpeed(pos);
      return {
        x: pos === 'right' ? can_w + R : (pos === 'left' ? -R : randomSidePos(can_w)),
        y: pos === 'top' ? -R : (pos === 'bottom' ? can_h + R : randomSidePos(can_h)),
        vx: speed[0],
        vy: speed[1],
        r: R,
        alpha: 1,
        phase: randomNumFrom(0, 10)
      };
    }

    function initCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      ctx!.scale(dpr, dpr);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      can_w = window.innerWidth;
      can_h = window.innerHeight;
    }

    function initBalls(num: number) {
      balls = [];
      for (let i = 0; i < num; i++) {
        balls.push({
          x: randomSidePos(can_w),
          y: randomSidePos(can_h),
          vx: getRandomSpeed('top')[0],
          vy: getRandomSpeed('top')[1],
          r: R,
          alpha: 1,
          phase: randomNumFrom(0, 10)
        });
      }
    }

    function updateBalls() {
      const new_balls: Ball[] = [];
      balls.forEach(b => {
        if (b.type === 'mouse') return;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x > -50 && b.x < can_w + 50 && b.y > -50 && b.y < can_h + 50) {
          new_balls.push(b);
        }
        b.phase += alpha_f;
        b.alpha = Math.abs(Math.cos(b.phase)) * 0.8; // Max 80% opacity
      });
      balls = new_balls;
      while (balls.length < BALL_NUM) {
        balls.push(getRandomBall());
      }
    }

    function getDisOf(b1: Ball, b2: Ball) {
      const dx = Math.abs(b1.x - b2.x);
      const dy = Math.abs(b1.y - b2.y);
      return Math.sqrt(dx * dx + dy * dy);
    }

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, can_w, can_h);
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, can_w, can_h);

      const allBalls = [...balls, mouse_ball];

      // Draw lines
      for (let i = 0; i < allBalls.length; i++) {
        for (let j = i + 1; j < allBalls.length; j++) {
          const dist = getDisOf(allBalls[i], allBalls[j]);
          const fraction = dist / dis_limit;
          if (fraction < 1) {
            const alpha = (1 - fraction);
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.15})`; // Subtler blue lines
            ctx.lineWidth = link_line_width;
            ctx.beginPath();
            ctx.moveTo(allBalls[i].x, allBalls[i].y);
            ctx.lineTo(allBalls[j].x, allBalls[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw balls
      balls.forEach(b => {
        ctx.fillStyle = `rgba(${ball_color.r}, ${ball_color.g}, ${ball_color.b}, ${b.alpha * 0.4})`; // Muted points
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      if (isEnabled) {
        updateBalls();
        requestAnimationFrame(render);
      }
    }

    const handleResize = () => {
      initCanvas();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse_ball.x = e.clientX;
      mouse_ball.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    initCanvas();
    initBalls(BALL_NUM);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
