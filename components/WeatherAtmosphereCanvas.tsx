'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CloudLightning, Sun, CloudRain, Wind, Sparkles } from 'lucide-react';

export type WeatherMode = 'convective' | 'heatwave' | 'monsoon' | 'nominal';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  length?: number;
}

interface Wave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: string;
}

export function WeatherAtmosphereCanvas({
  initialMode = 'convective',
  showControls = true,
  className = '',
}: {
  initialMode?: WeatherMode;
  showControls?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<WeatherMode>(initialMode);
  const [lightningFlash, setLightningFlash] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pools
    const particles: Particle[] = [];
    const waves: Wave[] = [];
    const count = mode === 'convective' ? 120 : mode === 'monsoon' ? 160 : mode === 'heatwave' ? 70 : 60;

    // Initialize particles based on mode
    for (let i = 0; i < count; i++) {
      if (mode === 'convective') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.2) * 3 - 2,
          vy: Math.random() * 8 + 8,
          size: Math.random() * 2 + 1,
          length: Math.random() * 15 + 10,
          alpha: Math.random() * 0.6 + 0.2,
          color: '#38bdf8',
        });
      } else if (mode === 'heatwave') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 0.8,
          size: Math.random() * 4 + 2,
          alpha: Math.random() * 0.4 + 0.1,
          color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
        });
      } else if (mode === 'monsoon') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 2.5 + 0.8,
          length: Math.random() * 8 + 4,
          alpha: Math.random() * 0.5 + 0.15,
          color: '#06b6d4',
        });
      } else {
        // Nominal wind vectors
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.random() * 1.8 + 0.8,
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.4 + 0.1,
          color: '#0284c7',
        });
      }
    }

    // Isobar wave generator
    let waveTimer = 0;

    // Lightning generator for convective mode
    let lightningTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Atmospheric gradient background
      if (mode === 'convective') {
        const bgGrad = ctx.createRadialGradient(width / 2, height * 0.2, 50, width / 2, height / 2, width * 0.8);
        bgGrad.addColorStop(0, 'rgba(14, 23, 48, 0.4)');
        bgGrad.addColorStop(1, 'rgba(7, 13, 30, 0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (mode === 'heatwave') {
        const bgGrad = ctx.createRadialGradient(width / 2, height * 0.3, 30, width / 2, height / 2, width * 0.7);
        bgGrad.addColorStop(0, 'rgba(180, 83, 9, 0.12)');
        bgGrad.addColorStop(1, 'rgba(7, 13, 30, 0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw and update Isobar pressure wave ripples
      waveTimer++;
      if (waveTimer % 90 === 0) {
        waves.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.7),
          radius: 0,
          maxRadius: Math.random() * 180 + 100,
          speed: mode === 'convective' ? 2.5 : 1.2,
          alpha: 0.25,
          color: mode === 'convective' ? '#06b6d4' : mode === 'heatwave' ? '#f59e0b' : '#38bdf8',
        });
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.radius += w.speed;
        w.alpha *= 0.98;
        ctx.save();
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = w.color;
        ctx.globalAlpha = Math.max(w.alpha, 0);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();

        if (w.radius >= w.maxRadius || w.alpha <= 0.01) {
          waves.splice(i, 1);
        }
      }

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if ((mode === 'convective' || mode === 'monsoon') && p.length) {
          // Draw streak/rain droplet
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.length);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.stroke();
        } else if (mode === 'heatwave') {
          // Heat shimmer glow particle
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Smooth wind streamline bead
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Random lightning trigger for severe storm mode
      if (mode === 'convective') {
        lightningTimer++;
        if (lightningTimer > 240 && Math.random() < 0.015) {
          lightningTimer = 0;
          setLightningFlash(true);
          setTimeout(() => setLightningFlash(false), 80);
          setTimeout(() => {
            setLightningFlash(true);
            setTimeout(() => setLightningFlash(false), 50);
          }, 120);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Lightning Flash Overlay */}
      {lightningFlash && (
        <div className="absolute inset-0 bg-cyan-200/20 backdrop-brightness-150 transition-opacity duration-75 z-20 pointer-events-none" />
      )}

      {/* Atmospheric Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Interactive Atmosphere Controller Bar */}
      {showControls && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 pointer-events-auto z-30 flex items-center gap-1.5 p-1.5 bg-[#0e1730]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-xl shadow-cyan-950/40">
          <div className="hidden sm:flex items-center gap-1 px-2 text-[10px] font-mono text-slate-400 border-r border-slate-700/80 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Atmosphere:</span>
          </div>

          <button
            onClick={() => setMode('convective')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mode === 'convective'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Severe Convective Storm Front"
          >
            <CloudLightning className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Squall</span>
          </button>

          <button
            onClick={() => setMode('heatwave')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mode === 'heatwave'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Extreme Heatwave Gradient"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Heatwave</span>
          </button>

          <button
            onClick={() => setMode('monsoon')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mode === 'monsoon'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Dense Monsoon Precipitation"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Monsoon</span>
          </button>

          <button
            onClick={() => setMode('nominal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              mode === 'nominal'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/30 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Nominal Isobar Flow"
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear</span>
          </button>
        </div>
      )}
    </div>
  );
}
