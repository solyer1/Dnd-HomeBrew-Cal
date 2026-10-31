'use client';

/**
 * SkillPercentTab
 * Dedicated tab for Percentage / Multi-Outcome Skills (e.g. 25% / 25% / 50%).
 * Supports:
 * - Visual Spin Wheel (conic gradient proportional to %)
 * - Fast d100 percentile roll with rich laser sweep & number scramble animation
 * - Direct outcome editing with automatic localStorage persistence
 * - Auto-balance to 100% helper & Reset to Default
 * - Integration with Damage Calculator
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useAnimation, useMotionValue, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAppContext } from '@/context/AppContext';
import { generateId } from '@/utils/math';
import type { SkillOutcome, SkillRollHistoryEntry } from '@/types/skillPercent';

const PALETTE = [
  '#ef4444', // Red / Fire
  '#3b82f6', // Blue / Ice
  '#eab308', // Gold / Holy / Physical
  '#10b981', // Emerald / Acid / Nature
  '#8b5cf6', // Purple / Arcane / Void
  '#f97316', // Orange / Lightning / Flare
  '#06b6d4', // Cyan / Frost
  '#ec4899', // Pink / Psychic
  '#64748b', // Slate / Blunt / Normal
  '#1e293b', // Dark Void
];

const DEFAULT_OUTCOMES: SkillOutcome[] = [
  { id: 'tri-1', label: '🔥 Fire Blast (Burn)', percentage: 25, color: '#ef4444', notes: '+1d6 Fire DoT' },
  { id: 'tri-2', label: '❄️ Frost Chill (Slow)', percentage: 25, color: '#3b82f6', notes: 'Movement halved' },
  { id: 'tri-3', label: '⚔️ Physical Strike (Normal)', percentage: 50, color: '#eab308', notes: 'Standard weapon damage' },
];

const playTickSound = (ctx: AudioContext) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
};

const playFanfare = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [
      { f: 523.25, time: 0, d: 0.25 },
      { f: 659.25, time: 0.1, d: 0.25 },
      { f: 783.99, time: 0.2, d: 0.35 },
      { f: 1046.5, time: 0.35, d: 0.7 },
    ];
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + n.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.d);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.d);
    });
  } catch {}
};

export function SkillPercentTab({ isActive = true }: { isActive?: boolean }) {
  const { sendDiceToCalculator } = useAppContext();

  // Active skill editing
  const [skillName, setSkillName] = useState<string>('Tri-Element Strike (25% / 25% / 50%)');
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>(DEFAULT_OUTCOMES);

  // Display mode: 'wheel' or 'd100bar'
  const [viewMode, setViewMode] = useState<'wheel' | 'd100bar'>('wheel');

  // Rolling state
  const [isSpinning, setIsSpinning] = useState(false);
  const [scramblingNumber, setScramblingNumber] = useState<number | null>(null);
  const [scanningPosition, setScanningPosition] = useState<number>(50);
  const [activeHitSliceId, setActiveHitSliceId] = useState<string | null>(null);

  const [lastRoll, setLastRoll] = useState<{
    outcome: SkillOutcome;
    rollNumber: number;
    rangeStart: number;
    rangeEnd: number;
  } | null>(null);

  // Roll history
  const [history, setHistory] = useState<SkillRollHistoryEntry[]>([]);

  // Wheel motion
  const rotationValue = useMotionValue(0);
  const arrowControls = useAnimation();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const d100IntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore outcomes & name from localStorage on mount
  useEffect(() => {
    try {
      const savedOutcomes = localStorage.getItem('dnd_skill_percent_outcomes');
      if (savedOutcomes) {
        const parsed = JSON.parse(savedOutcomes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOutcomes(parsed);
        }
      }
      const savedName = localStorage.getItem('dnd_skill_percent_name');
      if (savedName) {
        setSkillName(savedName);
      }
    } catch {}
  }, []);

  // Save changes to localStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem('dnd_skill_percent_outcomes', JSON.stringify(outcomes));
    } catch {}
  }, [outcomes]);

  useEffect(() => {
    try {
      localStorage.setItem('dnd_skill_percent_name', skillName);
    } catch {}
  }, [skillName]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (d100IntervalRef.current) clearInterval(d100IntervalRef.current);
    };
  }, []);

  // Reset to default 25/25/50
  const handleResetToDefault = () => {
    if (window.confirm('Reset table back to default 25% / 25% / 50%?')) {
      setSkillName('Tri-Element Strike (25% / 25% / 50%)');
      setOutcomes(DEFAULT_OUTCOMES);
      setLastRoll(null);
    }
  };

  // Percentage metrics
  const totalPercentage = useMemo(() => {
    return outcomes.reduce((sum, o) => sum + (Number(o.percentage) || 0), 0);
  }, [outcomes]);

  const isHundred = Math.abs(totalPercentage - 100) < 0.01;

  // Auto-balance to 100%
  const handleAutoBalance = () => {
    if (outcomes.length === 0) return;
    const currentSum = outcomes.reduce((sum, o) => sum + (Number(o.percentage) || 0), 0) || 1;
    let accumulated = 0;
    const balanced = outcomes.map((o, idx) => {
      if (idx === outcomes.length - 1) {
        const remaining = Math.max(0, 100 - accumulated);
        return { ...o, percentage: remaining };
      }
      const proportional = Math.round(((Number(o.percentage) || 0) / currentSum) * 100);
      accumulated += proportional;
      return { ...o, percentage: proportional };
    });
    setOutcomes(balanced);
  };

  // Slice angles for conic-gradient
  const slicesWithAngles = useMemo(() => {
    let currentDeg = 0;
    let currentPct = 0;
    const safeTotal = totalPercentage || 100;

    return outcomes.map((o) => {
      const pct = (Number(o.percentage) || 0) / safeTotal;
      const deg = pct * 360;
      const startDeg = currentDeg;
      const endDeg = currentDeg + deg;
      const rangeStart = Math.round(currentPct * 100) + 1;
      const rangeEnd = Math.round((currentPct + pct) * 100);

      currentDeg = endDeg;
      currentPct += pct;

      return {
        ...o,
        deg,
        startDeg,
        endDeg,
        rangeStart,
        rangeEnd: Math.min(100, rangeEnd),
      };
    });
  }, [outcomes, totalPercentage]);

  // Gradient string for conic-gradient
  const gradientParts = useMemo(() => {
    if (slicesWithAngles.length === 0) return ['#334155 0deg 360deg'];
    return slicesWithAngles.map((s) => `${s.color} ${s.startDeg.toFixed(2)}deg ${s.endDeg.toFixed(2)}deg`);
  }, [slicesWithAngles]);

  // Execute Roll
  const handleRoll = () => {
    if (isSpinning || outcomes.length === 0) return;
    setIsSpinning(true);
    setLastRoll(null);

    // Audio setup
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }

    // Pick a uniform random integer between 1 and 100
    const rollNumber = Math.floor(Math.random() * 100) + 1;

    // Find the winning outcome
    let winning = slicesWithAngles[slicesWithAngles.length - 1];
    for (const slice of slicesWithAngles) {
      if (rollNumber >= slice.rangeStart && rollNumber <= slice.rangeEnd) {
        winning = slice;
        break;
      }
    }

    // ── Fast d100 with Dynamic Laser Sweep & Counter Scramble Animation ──
    if (viewMode === 'd100bar') {
      const startTime = Date.now();
      const duration = 1250; // 1.25s animation

      if (d100IntervalRef.current) clearInterval(d100IntervalRef.current);

      d100IntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
          const randPos = Math.floor(Math.random() * 100) + 1;
          setScramblingNumber(randPos);
          setScanningPosition(randPos);

          const hovered = slicesWithAngles.find((s) => randPos >= s.rangeStart && randPos <= s.rangeEnd);
          if (hovered) setActiveHitSliceId(hovered.id);

          if (audioCtxRef.current) {
            playTickSound(audioCtxRef.current);
          }
        } else {
          if (d100IntervalRef.current) clearInterval(d100IntervalRef.current);
          setScramblingNumber(null);
          setScanningPosition(rollNumber);
          setActiveHitSliceId(winning.id);
          setIsSpinning(false);

          setLastRoll({
            outcome: winning,
            rollNumber,
            rangeStart: winning.rangeStart,
            rangeEnd: winning.rangeEnd,
          });

          playFanfare();
          confetti({
            particleCount: 65,
            spread: 65,
            origin: { y: 0.6 },
            colors: [winning.color, '#ffd700', '#ffffff'],
          });

          setHistory((prev) => [
            {
              id: generateId(),
              timestamp: Date.now(),
              skillName,
              rollNumber,
              winningOutcome: winning,
            },
            ...prev,
          ]);
        }
      }, 45);
      return;
    }

    // ── Wheel Mode: calculate target rotation ──
    const sliceCenter = (winning.startDeg + winning.endDeg) / 2;
    const targetBaseAngle = (360 - sliceCenter) % 360;

    // Full rotations (5 to 7 turns)
    const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360;
    const currentRot = rotationValue.get();
    const currentBase = currentRot % 360;
    let forwardDiff = targetBaseAngle - currentBase;
    if (forwardDiff < 0) forwardDiff += 360;

    const finalTarget = currentRot + extraSpins + forwardDiff;
    const duration = 3.6;

    let lastTickAngle = currentRot;

    animate(rotationValue, finalTarget, {
      duration,
      ease: [0.15, 0.9, 0.2, 1], // Realistic cubic bezier deceleration
      onUpdate: (latest) => {
        if (Math.abs(latest - lastTickAngle) >= 18) {
          lastTickAngle = latest;
          if (audioCtxRef.current) {
            playTickSound(audioCtxRef.current);
          }
          arrowControls.start({
            rotate: [0, -18, 0],
            transition: { duration: 0.08 },
          });
        }
      },
      onComplete: () => {
        setIsSpinning(false);
        setLastRoll({
          outcome: winning,
          rollNumber,
          rangeStart: winning.rangeStart,
          rangeEnd: winning.rangeEnd,
        });

        playFanfare();
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.55 },
          colors: [winning.color, '#ffd700', '#ffffff'],
        });

        setHistory((prev) => [
          {
            id: generateId(),
            timestamp: Date.now(),
            skillName,
            rollNumber,
            winningOutcome: winning,
          },
          ...prev,
        ]);
      },
    });
  };

  // Outcome modifiers
  const handleUpdateOutcome = (id: string, patch: Partial<SkillOutcome>) => {
    setOutcomes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  };

  const handleAddOutcome = () => {
    if (outcomes.length >= 8) return;
    const nextColor = PALETTE[outcomes.length % PALETTE.length];
    setOutcomes((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `Outcome ${String.fromCharCode(65 + prev.length)}`,
        percentage: 10,
        color: nextColor,
      },
    ]);
  };

  const handleRemoveOutcome = (id: string) => {
    if (outcomes.length <= 1) return;
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h2 className="font-display text-xl font-bold text-gold-400">
              Skill % & Outcome Roulette
            </h2>
            <p className="text-xs text-muted">
              Multi-outcome probability calculator (e.g. 25% / 25% / 50%) with interactive wheel & d100 roll
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('wheel')}
            className={`px-3 py-1.5 transition-all ${
              viewMode === 'wheel' ? 'bg-gold-700 text-bg font-bold shadow' : 'bg-surface text-muted hover:text-white'
            }`}
          >
            🎰 Spin Wheel
          </button>
          <button
            type="button"
            onClick={() => setViewMode('d100bar')}
            className={`px-3 py-1.5 transition-all ${
              viewMode === 'd100bar' ? 'bg-gold-700 text-bg font-bold shadow' : 'bg-surface text-muted hover:text-white'
            }`}
          >
            ⚡ Fast d100
          </button>
        </div>
      </div>

      {/* ── Main Layout: Left = Wheel/Roll Area, Right = Table / Slice Editor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Wheel & Result Display (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col items-center gap-4">
          <div className="card w-full p-6 flex flex-col items-center justify-center relative min-h-[460px] overflow-hidden">
            {viewMode === 'wheel' ? (
              /* Wheel Visual */
              <div className="relative flex items-center justify-center my-4" style={{ width: 340, height: 340 }}>
                {/* Pointer Arrow at top */}
                <motion.div
                  animate={arrowControls}
                  style={{ transformOrigin: 'top center' }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                >
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-gold-400 relative">
                    <div className="absolute -top-[22px] -left-[10px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-gold-900" />
                  </div>
                </motion.div>

                {/* Rotating Conic Gradient Wheel */}
                <motion.div
                  className="relative rounded-full border-[6px] border-gold-600 shadow-[0_0_30px_rgba(201,168,76,0.35)] overflow-hidden"
                  style={{
                    width: '320px',
                    height: '320px',
                    background: `conic-gradient(${gradientParts.join(', ')})`,
                    rotate: rotationValue,
                  }}
                >
                  {/* Subtle rim highlight */}
                  <div className="absolute inset-1 rounded-full border border-white/20 pointer-events-none" />

                  {/* Slice labels placed radially */}
                  {slicesWithAngles.map((slice) => {
                    if (slice.deg < 12) return null;
                    const labelAngle = slice.startDeg + slice.deg / 2;
                    return (
                      <div
                        key={slice.id}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{ transform: `rotate(${labelAngle}deg)` }}
                      >
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center font-display font-black text-white text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] max-w-[80px] text-center leading-tight">
                          <span>{slice.percentage}%</span>
                          <span className="truncate text-[10px] opacity-90">{slice.label.split(' ')[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Golden Center Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-surface border-[4px] border-gold-500 rounded-full z-20 shadow-2xl flex items-center justify-center">
                  <div className="w-5 h-5 bg-gold-400 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                </div>
              </div>
            ) : (
              /* ── Fast d100 with Dynamic Animation ── */
              <div className="w-full flex flex-col items-center gap-6 py-4">
                {/* Header */}
                <div className="text-center">
                  <h3 className="font-display font-bold text-lg text-gold-400 flex items-center justify-center gap-2">
                    <span>⚡</span>
                    <span>Fast Percentile Check (d100)</span>
                  </h3>
                  <p className="text-xs text-muted">
                    Rapid roll with real-time threshold laser scanning & probability lock
                  </p>
                </div>

                {/* Big Rolling Die HUD Box */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`relative flex flex-col items-center justify-center w-36 h-36 rounded-3xl border-2 transition-all duration-200 select-none ${
                      isSpinning
                        ? 'border-gold-400 bg-gold-950/70 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-105'
                        : lastRoll
                        ? 'border-gold-500 bg-surface shadow-2xl scale-100 ring-2 ring-gold-400/30'
                        : 'border-border bg-surface2/40'
                    }`}
                  >
                    {/* Spinning ring effect when rolling */}
                    {isSpinning && (
                      <div className="absolute inset-0 rounded-3xl border-2 border-gold-400 border-dashed animate-spin" style={{ animationDuration: '4s' }} />
                    )}

                    <span className="text-xs font-bold uppercase tracking-wider text-muted mb-0.5">
                      {isSpinning ? 'Rolling…' : lastRoll ? 'd100 Landed' : 'd100 Ready'}
                    </span>

                    <span
                      className={`text-5xl font-display font-black tracking-tight tabular-nums transition-all ${
                        isSpinning
                          ? 'text-gold-300 animate-pulse scale-110'
                          : lastRoll
                          ? 'text-white'
                          : 'text-muted/60'
                      }`}
                    >
                      {isSpinning
                        ? (scramblingNumber ?? '??')
                        : lastRoll
                        ? lastRoll.rollNumber
                        : 'd100'}
                    </span>

                    {/* Active hovering slice label */}
                    <div className="mt-1 h-4 flex items-center justify-center px-2">
                      {isSpinning ? (
                        <span className="text-[10px] font-bold text-gold-400 animate-fade-in truncate max-w-[120px]">
                          {slicesWithAngles.find((s) => s.id === activeHitSliceId)?.label.split(' ')[0] || 'Scanning…'}
                        </span>
                      ) : lastRoll ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <span>✓</span>
                          <span className="truncate max-w-[120px]">{lastRoll.outcome.label}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">Press Roll below</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1-100 Segmented Bar with Laser Needle */}
                <div className="w-full flex flex-col gap-1.5 px-2">
                  <div className="flex items-center justify-between text-xs text-muted font-bold px-1">
                    <span>Threshold Range: 1%</span>
                    <span>100%</span>
                  </div>

                  <div className="relative w-full h-14 rounded-2xl overflow-hidden border-2 border-gold-600 flex shadow-2xl bg-surface2">
                    {slicesWithAngles.map((slice) => {
                      const isWinning = lastRoll && lastRoll.outcome.id === slice.id && !isSpinning;
                      const isCurrentlyScanned = isSpinning && activeHitSliceId === slice.id;
                      return (
                        <div
                          key={slice.id}
                          style={{
                            width: `${slice.percentage}%`,
                            backgroundColor: slice.color,
                          }}
                          className={`h-full flex flex-col items-center justify-center text-xs font-bold text-white relative transition-all duration-150 select-none ${
                            isWinning
                              ? 'ring-4 ring-inset ring-white brightness-125 z-10 shadow-[0_0_20px_rgba(255,255,255,0.7)]'
                              : isCurrentlyScanned
                              ? 'brightness-125 scale-y-105 z-10'
                              : 'opacity-85 hover:opacity-100'
                          }`}
                        >
                          <span className="truncate px-1 drop-shadow-md text-center leading-tight">
                            {slice.percentage >= 15 ? slice.label.split(' ')[0] : `${slice.percentage}%`}
                          </span>
                          <span className="text-[10px] font-mono opacity-90 drop-shadow">
                            {slice.rangeStart}–{slice.rangeEnd}%
                          </span>
                        </div>
                      );
                    })}

                    {/* Animated Laser Scanning Needle */}
                    {(isSpinning || lastRoll) && (
                      <div
                        className="absolute top-0 bottom-0 w-2.5 bg-white shadow-[0_0_18px_6px_rgba(255,255,255,0.95)] z-30 transition-all duration-75 pointer-events-none rounded-full"
                        style={{
                          left: `${isSpinning ? scanningPosition : (lastRoll?.rollNumber ?? 0)}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] border-t-white drop-shadow" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[9px] border-b-white drop-shadow" />
                      </div>
                    )}
                  </div>

                  {/* Range tick marks */}
                  <div className="flex items-center justify-between text-[11px] text-muted font-mono px-1">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Roll Button ── */}
            <button
              id="spin-skill-button"
              type="button"
              disabled={isSpinning || !isHundred}
              onClick={handleRoll}
              className={`w-full max-w-md py-4 rounded-xl font-display font-bold text-xl border-2 transition-all duration-200 mt-2 ${
                isSpinning || !isHundred
                  ? 'border-gold-700 bg-gold-900/20 text-gold-600 cursor-not-allowed opacity-60'
                  : 'border-gold-500 bg-gold-900/40 text-gold-300 hover:bg-gold-800/50 hover:shadow-gold hover:scale-[1.01] active:scale-95'
              }`}
            >
              {isSpinning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🎲</span>
                  <span>{viewMode === 'd100bar' ? 'Scanning d100 Threshold…' : 'Calculating Probability…'}</span>
                </span>
              ) : !isHundred ? (
                `⚠️ Percentages Must Total 100% (Currently ${totalPercentage}%)`
              ) : (
                `🎲 ${viewMode === 'd100bar' ? 'Roll d100 Percentile' : 'Spin & Roll Outcome'}`
              )}
            </button>
          </div>

          {/* ── Result Callout Card ── */}
          {lastRoll && (
            <div
              className="card w-full p-4 border-2 rounded-xl flex items-center justify-between gap-4 animate-slide-in shadow-xl"
              style={{ borderColor: lastRoll.outcome.color, backgroundColor: `${lastRoll.outcome.color}15` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0"
                  style={{ backgroundColor: lastRoll.outcome.color }}
                >
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Triggered Outcome:
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-gold-300">
                      Roll: {lastRoll.rollNumber} (Range: {lastRoll.rangeStart}–{lastRoll.rangeEnd}%)
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg text-white">
                    {lastRoll.outcome.label}
                  </h3>
                  {lastRoll.outcome.notes && (
                    <p className="text-xs text-muted italic">{lastRoll.outcome.notes}</p>
                  )}
                </div>
              </div>

              {/* Action: Send to Calculator */}
              <button
                type="button"
                onClick={() => {
                  const bonus = lastRoll.outcome.bonusDamage || 10;
                  sendDiceToCalculator(bonus, 'base');
                  alert(`Sent ${lastRoll.outcome.label} (+${bonus}) to Damage Calculator as Base Damage!`);
                }}
                className="btn-gold text-xs py-2 px-3 whitespace-nowrap"
                title="Send result to Damage Calculator"
              >
                ⚔️ Send to Calc
              </button>
            </div>
          )}
        </div>

        {/* ── Right Column: Outcome Table / Slice Editor (5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3">
            {/* Skill Name Input & Reset Header */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-muted font-bold">
                Skill / Table Name:
              </label>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-gold-400 hover:text-gold-200 border border-gold-600/40 rounded px-2 py-0.5 transition-colors"
                title="Reset table to default 25/25/50 values"
              >
                ↺ Reset Default
              </button>
            </div>

            <input
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="input w-full font-bold text-sm text-gold-300"
              placeholder="e.g. Chaos Strike (25/25/50)"
            />

            {/* Total Percentage Status Bar */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface2 border border-border">
              <span className="text-xs font-semibold text-muted">Total Percentage:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-display font-bold text-sm ${
                    isHundred ? 'text-emerald-400' : 'text-red-400 animate-pulse'
                  }`}
                >
                  {totalPercentage}% {isHundred ? '✓' : '(Must be 100%)'}
                </span>
                {!isHundred && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/50 transition-colors"
                  >
                    ⚖️ Auto 100%
                  </button>
                )}
              </div>
            </div>

            {/* Outcome Rows */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gold-400 uppercase">
                  Outcomes / Slices:
                </span>
                {outcomes.length < 8 && (
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="text-xs text-gold-400 hover:text-gold-200 border border-gold-600/50 rounded px-2 py-0.5 transition-colors"
                  >
                    + Add Outcome
                  </button>
                )}
              </div>

              {outcomes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-surface/60 border border-border"
                >
                  <div className="flex items-center gap-2">
                    {/* Color dot picker */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="w-6 h-6 rounded-full border border-white/30 shrink-0 shadow"
                        style={{ backgroundColor: item.color }}
                        title="Click to cycle color"
                        onClick={() => {
                          const currentIdx = PALETTE.indexOf(item.color);
                          const nextColor = PALETTE[(currentIdx + 1) % PALETTE.length];
                          handleUpdateOutcome(item.id, { color: nextColor });
                        }}
                      />
                    </div>

                    {/* Label */}
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateOutcome(item.id, { label: e.target.value })}
                      className="input flex-1 text-xs py-1 font-semibold"
                      placeholder="Outcome label"
                    />

                    {/* Percentage % */}
                    <div className="flex items-center gap-1 bg-surface2 border border-border rounded px-2 py-0.5">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={item.percentage || ''}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                          handleUpdateOutcome(item.id, { percentage: val });
                        }}
                        className="w-10 text-center text-xs font-bold text-white bg-transparent outline-none"
                      />
                      <span className="text-xs font-bold text-muted">%</span>
                    </div>

                    {/* Delete button */}
                    {outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOutcome(item.id)}
                        className="text-red-400 hover:text-red-300 text-base font-bold px-1"
                        title="Remove outcome"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Optional notes */}
                  <div className="pl-8">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleUpdateOutcome(item.id, { notes: e.target.value })}
                      placeholder="Notes / Effect (e.g. +5 Fire Dmg, Stun 1 turn)"
                      className="input w-full text-[11px] py-0.5 text-muted hover:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Roll History Card ── */}
          {history.length > 0 && (
            <div className="card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="font-display font-bold text-xs text-gold-400 uppercase">
                  📜 Recent Skill Rolls ({history.length})
                </span>
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[11px] text-muted hover:text-red-400"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-1.5 rounded bg-surface2/40 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: h.winningOutcome.color }}
                      />
                      <span className="font-bold text-white">{h.winningOutcome.label}</span>
                    </div>
                    <span className="font-mono text-gold-300 text-[11px]">
                      d100: {h.rollNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
