'use client';

/**
 * SkillPercentTab
 * Dedicated tab for Percentage / Multi-Outcome Skills (e.g. 25% / 25% / 50%).
 * Fully customizable:
 * - Custom color per piece (native color picker + hex + palette swatches)
 * - Custom Image or Emoji per piece (file upload with auto-resize, image URL, or 40+ RPG emoji picker)
 * - Visual Spin Wheel with radial image/emoji rendering
 * - Fast d100 percentile roll with laser sweep & probability lock
 * - Auto-balance to 100% helper & Reset to Default
 * - Automatic localStorage persistence
 * - Integration with Damage Calculator
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useAnimation, useMotionValue, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAppContext } from '@/context/AppContext';
import { generateId } from '@/utils/math';
import type { SkillOutcome, SkillRollHistoryEntry } from '@/types/skillPercent';

const PRESET_COLORS = [
  '#ef4444', // Red / Fire
  '#f97316', // Orange / Flare
  '#f59e0b', // Amber / Sun
  '#eab308', // Gold / Holy
  '#84cc16', // Lime / Acid
  '#10b981', // Emerald / Nature
  '#14b8a6', // Teal / Water
  '#06b6d4', // Cyan / Frost
  '#3b82f6', // Blue / Ice
  '#6366f1', // Indigo / Lightning
  '#8b5cf6', // Purple / Arcane
  '#d946ef', // Fuchsia / Magic
  '#ec4899', // Pink / Psychic
  '#f43f5e', // Rose / Blood
  '#64748b', // Slate / Physical
  '#1e293b', // Dark Void
];

const COMMON_EMOJIS = [
  '⚔️', '🗡️', '🏹', '🛡️', '🔥', '❄️', '⚡', '💥', '💀', '🩸',
  '🧪', '💰', '💎', '👑', '🐉', '🐺', '🦅', '👁️', '🔮', '✨',
  '🌪️', '🌙', '☀️', '🎯', '🎲', '🧟', '🧙', '👹', '🪵', '🪨',
  '🍃', '🍖', '🍺', '📜', '⭐', '❤️', '🖤', '🍀', '🕯️', '🪄',
];

const DEFAULT_OUTCOMES: SkillOutcome[] = [
  {
    id: 'tri-1',
    label: 'Fire Blast (Burn)',
    percentage: 25,
    color: '#ef4444',
    iconType: 'emoji',
    iconValue: '🔥',
    notes: '+1d6 Fire DoT',
  },
  {
    id: 'tri-2',
    label: 'Frost Chill (Slow)',
    percentage: 25,
    color: '#3b82f6',
    iconType: 'emoji',
    iconValue: '❄️',
    notes: 'Movement halved',
  },
  {
    id: 'tri-3',
    label: 'Physical Strike (Normal)',
    percentage: 50,
    color: '#eab308',
    iconType: 'emoji',
    iconValue: '⚔️',
    notes: 'Standard weapon damage',
  },
];

/**
 * Resizes an uploaded image file down to max 128x128 pixels using an offscreen canvas.
 * Keeps localStorage footprint minimal (~5-15 KB per image).
 */
function resizeImageToDataUrl(file: File, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [skillName, setSkillName] = useState<string>('Custom Party Roulette (25% / 25% / 50%)');
  const [outcomes, setOutcomes] = useState<SkillOutcome[]>(DEFAULT_OUTCOMES);

  // Track which slice is currently expanded for media/color customizer
  const [editingSliceId, setEditingSliceId] = useState<string | null>(null);
  const [iconTab, setIconTab] = useState<'emoji' | 'image' | 'none'>('emoji');

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetUploadSliceIdRef = useRef<string | null>(null);

  // Restore outcomes & name from localStorage on mount
  useEffect(() => {
    try {
      const savedOutcomes = localStorage.getItem('dnd_skill_percent_outcomes');
      if (savedOutcomes) {
        const parsed = JSON.parse(savedOutcomes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Gracefully sanitize saved items
          const sanitized = parsed.map((item: Partial<SkillOutcome> & { label?: string; percentage?: number; color?: string }) => {
            let iconType = item.iconType || 'none';
            let iconValue = item.iconValue || '';
            if (!iconValue && item.label) {
              const emojiMatch = item.label.match(/^(\p{Extended_Pictographic}+|\p{Emoji}+)/u);
              if (emojiMatch) {
                iconType = 'emoji';
                iconValue = emojiMatch[0];
              }
            }
            return {
              id: item.id || generateId(),
              label: item.label || 'Outcome',
              percentage: typeof item.percentage === 'number' ? item.percentage : 10,
              color: item.color || '#ef4444',
              iconType,
              iconValue,
              bonusDamage: item.bonusDamage,
              notes: item.notes,
            };
          });
          setOutcomes(sanitized);
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

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (d100IntervalRef.current) clearInterval(d100IntervalRef.current);
    };
  }, []);

  // Total percentage check
  const totalPercentage = useMemo(() => {
    return outcomes.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
  }, [outcomes]);

  const isHundred = totalPercentage === 100;

  // Auto-balance outcomes to 100%
  const handleAutoBalance = () => {
    if (outcomes.length === 0) return;
    const baseShare = Math.floor(100 / outcomes.length);
    const remainder = 100 - baseShare * outcomes.length;
    setOutcomes(
      outcomes.map((o, idx) => ({
        ...o,
        percentage: idx === 0 ? baseShare + remainder : baseShare,
      }))
    );
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (confirm('Reset to default 3 outcomes (25% / 25% / 50%)?')) {
      setOutcomes(DEFAULT_OUTCOMES);
      setSkillName('Custom Party Roulette (25% / 25% / 50%)');
    }
  };

  // Slice angles for conic-gradient
  const slicesWithAngles = useMemo(() => {
    let currentDeg = 0;
    let currentPct = 0;
    const safeTotal = totalPercentage || 100;
    const result = [];

    for (const o of outcomes) {
      const pct = (Number(o.percentage) || 0) / safeTotal;
      const deg = pct * 360;
      const startDeg = currentDeg;
      const endDeg = currentDeg + deg;
      const rangeStart = Math.round(currentPct * 100) + 1;
      const rangeEnd = Math.round((currentPct + pct) * 100);

      currentDeg = endDeg;
      currentPct += pct;

      result.push({
        ...o,
        deg,
        startDeg,
        endDeg,
        rangeStart,
        rangeEnd: Math.min(100, rangeEnd),
      });
    }

    return result;
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
    if (outcomes.length >= 16) return;
    const nextColor = PRESET_COLORS[outcomes.length % PRESET_COLORS.length];
    const nextEmoji = COMMON_EMOJIS[outcomes.length % COMMON_EMOJIS.length];
    const letter = String.fromCharCode(65 + outcomes.length);
    setOutcomes((prev) => [
      ...prev,
      {
        id: generateId(),
        label: `Outcome ${letter}`,
        percentage: 10,
        color: nextColor,
        iconType: 'emoji',
        iconValue: nextEmoji,
      },
    ]);
  };

  const handleRemoveOutcome = (id: string) => {
    if (outcomes.length <= 1) return;
    setOutcomes((prev) => prev.filter((o) => o.id !== id));
    if (editingSliceId === id) setEditingSliceId(null);
  };

  // Trigger file upload for a specific slice
  const handleTriggerImageUpload = (sliceId: string) => {
    targetUploadSliceIdRef.current = sliceId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle uploaded image file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const sliceId = targetUploadSliceIdRef.current;
    if (!file || !sliceId) return;

    try {
      const dataUrl = await resizeImageToDataUrl(file, 128);
      handleUpdateOutcome(sliceId, {
        iconType: 'image',
        iconValue: dataUrl,
      });
    } catch {
      alert('Unable to load image. Please select a valid PNG, JPG, or WEBP image.');
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ display: isActive ? 'flex' : 'none' }}>
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h2 className="font-display text-xl font-bold text-gold-400">
              Custom Spinner Wheel & Skill %
            </h2>
            <p className="text-xs text-muted">
              Fully customizable party roulette: assign custom colors, images, or emojis to each piece!
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
          <div className="card w-full p-6 flex flex-col items-center justify-center relative min-h-[480px] overflow-hidden">
            {viewMode === 'wheel' ? (
              /* Wheel Visual */
              <div className="relative flex items-center justify-center my-4" style={{ width: 360, height: 360 }}>
                {/* Pointer Arrow at top */}
                <motion.div
                  animate={arrowControls}
                  style={{ transformOrigin: 'top center' }}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
                >
                  <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[24px] border-t-gold-400 relative">
                    <div className="absolute -top-[24px] -left-[11px] w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[18px] border-t-gold-950" />
                  </div>
                </motion.div>

                {/* Rotating Conic Gradient Wheel */}
                <motion.div
                  className="relative rounded-full border-[6px] border-gold-600 shadow-[0_0_35px_rgba(201,168,76,0.4)] overflow-hidden"
                  style={{
                    width: '340px',
                    height: '340px',
                    background: `conic-gradient(${gradientParts.join(', ')})`,
                    rotate: rotationValue,
                  }}
                >
                  {/* Subtle rim highlight */}
                  <div className="absolute inset-1 rounded-full border border-white/25 pointer-events-none" />

                  {/* Slice labels and icons placed radially */}
                  {slicesWithAngles.map((slice) => {
                    if (slice.deg < 8) return null;
                    const labelAngle = slice.startDeg + slice.deg / 2;
                    const isNarrow = slice.deg < 22;
                    const isUltraNarrow = slice.deg < 14;

                    const hasImage = slice.iconType === 'image' && slice.iconValue;
                    const hasEmoji = (slice.iconType === 'emoji' || !slice.iconType) && slice.iconValue;

                    return (
                      <div
                        key={slice.id}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{ transform: `rotate(${labelAngle}deg)` }}
                      >
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center font-display font-black text-white text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] max-w-[95px] text-center leading-tight">
                          {/* Image or Emoji */}
                          {hasImage ? (
                            <img
                              src={slice.iconValue}
                              alt=""
                              className={`${
                                isNarrow ? 'w-5 h-5' : 'w-7 h-7'
                              } rounded-full object-cover border-2 border-white/90 shadow-md mb-0.5 pointer-events-none`}
                            />
                          ) : hasEmoji ? (
                            <span className={`${isNarrow ? 'text-sm' : 'text-xl'} mb-0.5 select-none drop-shadow`}>
                              {slice.iconValue}
                            </span>
                          ) : null}

                          {/* Percentage */}
                          <span className={`${isNarrow ? 'text-[11px]' : 'text-xs'} font-black text-amber-200 tracking-tight`}>
                            {slice.percentage}%
                          </span>

                          {/* Short Label */}
                          {!isUltraNarrow && (
                            <span className="truncate text-[10px] opacity-95 max-w-[75px] font-sans font-bold">
                              {slice.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Golden Center Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-surface border-[4px] border-gold-500 rounded-full z-20 shadow-2xl flex items-center justify-center">
                  <div className="w-5 h-5 bg-gold-400 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.9)]" />
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
                      <div
                        className="absolute inset-0 rounded-3xl border-2 border-gold-400 border-dashed animate-spin"
                        style={{ animationDuration: '4s' }}
                      />
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
                        ? scramblingNumber ?? '??'
                        : lastRoll
                        ? lastRoll.rollNumber
                        : 'd100'}
                    </span>

                    {/* Active hovering slice label */}
                    <div className="mt-1 h-5 flex items-center justify-center px-2">
                      {isSpinning ? (
                        <span className="text-[11px] font-bold text-gold-400 animate-fade-in truncate max-w-[125px]">
                          {slicesWithAngles.find((s) => s.id === activeHitSliceId)?.label || 'Scanning…'}
                        </span>
                      ) : lastRoll ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 max-w-[130px] truncate">
                          {lastRoll.outcome.iconType === 'image' && lastRoll.outcome.iconValue ? (
                            <img src={lastRoll.outcome.iconValue} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                          ) : lastRoll.outcome.iconValue ? (
                            <span>{lastRoll.outcome.iconValue}</span>
                          ) : (
                            <span>✓</span>
                          )}
                          <span className="truncate">{lastRoll.outcome.label}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted">Press Roll below</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Segmented 1-100 Laser Threshold Scanner Bar */}
                <div className="w-full max-w-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted px-1">
                    <span>Probability Distribution (1–100)</span>
                    <span className="text-gold-400 font-mono">Position: {scanningPosition}</span>
                  </div>

                  <div className="relative w-full h-11 bg-surface rounded-xl overflow-hidden border-2 border-border shadow-inner flex">
                    {/* Slices representation with icons and % */}
                    {slicesWithAngles.map((s) => {
                      const pct = s.deg / 3.6;
                      if (pct <= 0) return null;
                      const isHovered = activeHitSliceId === s.id;
                      const hasImg = s.iconType === 'image' && s.iconValue;
                      const hasEmo = (s.iconType === 'emoji' || !s.iconType) && s.iconValue;

                      return (
                        <div
                          key={s.id}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: s.color,
                          }}
                          className={`h-full flex items-center justify-center transition-all duration-150 relative overflow-hidden ${
                            isHovered ? 'brightness-125 ring-2 ring-white z-10 scale-y-110' : 'opacity-90 hover:opacity-100'
                          }`}
                          title={`${s.label}: ${s.percentage}% (${s.rangeStart}–${s.rangeEnd})`}
                        >
                          {pct >= 8 && (
                            <div className="flex items-center gap-1 px-1 font-bold text-white text-[11px] drop-shadow truncate">
                              {hasImg ? (
                                <img src={s.iconValue} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/60" />
                              ) : hasEmo ? (
                                <span className="text-xs shrink-0">{s.iconValue}</span>
                              ) : null}
                              {pct >= 14 && <span className="truncate">{s.percentage}%</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Laser Scanner Line */}
                    {isSpinning && (
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_#fff,0_0_25px_#ffd700] z-20 pointer-events-none transition-all duration-75"
                        style={{ left: `calc(${scanningPosition}% - 3px)` }}
                      />
                    )}

                    {/* Result Target Marker */}
                    {!isSpinning && lastRoll && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#fff] z-20 pointer-events-none"
                        style={{ left: `calc(${lastRoll.rollNumber}% - 2px)` }}
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
                  <span>{viewMode === 'd100bar' ? 'Scanning d100 Threshold…' : 'Spinning Party Wheel…'}</span>
                </span>
              ) : !isHundred ? (
                `⚠️ Percentages Must Total 100% (Currently ${totalPercentage}%)`
              ) : (
                `🎲 ${viewMode === 'd100bar' ? 'Roll d100 Percentile' : 'Spin Wheel Outcome'}`
              )}
            </button>
          </div>

          {/* ── Result Callout Card ── */}
          {lastRoll && (
            <div
              className="card w-full p-4 border-2 rounded-xl flex items-center justify-between gap-4 animate-slide-in shadow-xl"
              style={{ borderColor: lastRoll.outcome.color, backgroundColor: `${lastRoll.outcome.color}18` }}
            >
              <div className="flex items-center gap-3.5">
                {/* Visual Badge */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-white/30 shrink-0 overflow-hidden"
                  style={{ backgroundColor: lastRoll.outcome.color }}
                >
                  {lastRoll.outcome.iconType === 'image' && lastRoll.outcome.iconValue ? (
                    <img
                      src={lastRoll.outcome.iconValue}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : lastRoll.outcome.iconValue ? (
                    <span className="text-3xl select-none">{lastRoll.outcome.iconValue}</span>
                  ) : (
                    <span className="text-2xl font-black">✓</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Triggered Outcome:
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-gold-300">
                      Roll: {lastRoll.rollNumber} ({lastRoll.rangeStart}–{lastRoll.rangeEnd}%)
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

        {/* ── Right Column: Outcome Table / Piece Customizer (5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3">
            {/* Skill / Roulette Title */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-muted font-bold">
                Wheel / Table Title:
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
              placeholder="e.g. Chaos Strike / Loot Wheel / Party Decisions"
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

            {/* Outcome Rows / Slices */}
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                  Wheel Slices ({outcomes.length}):
                </span>
                {outcomes.length < 16 && (
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="text-xs text-gold-400 hover:text-gold-200 border border-gold-600/50 rounded px-2 py-0.5 transition-colors font-bold"
                  >
                    + Add Piece
                  </button>
                )}
              </div>

              {outcomes.map((item) => {
                const isExpanded = editingSliceId === item.id;
                const hasImage = item.iconType === 'image' && item.iconValue;
                const hasEmoji = (item.iconType === 'emoji' || !item.iconType) && item.iconValue;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-surface border-gold-500/80 shadow-lg'
                        : 'bg-surface/70 border-border hover:border-gold-700/50'
                    }`}
                  >
                    {/* Primary Row Controls */}
                    <div className="flex items-center gap-2 p-2.5">
                      {/* Native Color Picker Swatch */}
                      <label
                        className="relative w-8 h-8 rounded-lg border-2 border-white/40 cursor-pointer overflow-hidden shadow shrink-0 hover:scale-105 transition-transform"
                        style={{ backgroundColor: item.color }}
                        title="Click to pick custom color"
                      >
                        <input
                          type="color"
                          value={item.color}
                          onChange={(e) => handleUpdateOutcome(item.id, { color: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>

                      {/* Icon / Media Preview & Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isExpanded) {
                            setEditingSliceId(null);
                          } else {
                            setEditingSliceId(item.id);
                            setIconTab(item.iconType === 'image' ? 'image' : 'emoji');
                          }
                        }}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          hasImage || hasEmoji
                            ? 'bg-surface2 border-gold-600/70 hover:scale-105'
                            : 'bg-surface2/50 border-border text-muted hover:text-white'
                        }`}
                        title="Set Image or Emoji"
                      >
                        {hasImage ? (
                          <img
                            src={item.iconValue}
                            alt=""
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : hasEmoji ? (
                          <span className="text-base select-none">{item.iconValue}</span>
                        ) : (
                          <span className="text-xs">➕</span>
                        )}
                      </button>

                      {/* Label Input */}
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateOutcome(item.id, { label: e.target.value })}
                        className="input flex-1 text-xs py-1.5 font-semibold"
                        placeholder="Piece label"
                      />

                      {/* Percentage Input */}
                      <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={item.percentage || ''}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                            handleUpdateOutcome(item.id, { percentage: val });
                          }}
                          className="w-9 text-center text-xs font-bold text-white bg-transparent outline-none"
                        />
                        <span className="text-xs font-bold text-muted">%</span>
                      </div>

                      {/* Expand / Customize Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isExpanded) {
                            setEditingSliceId(null);
                          } else {
                            setEditingSliceId(item.id);
                            setIconTab(item.iconType === 'image' ? 'image' : 'emoji');
                          }
                        }}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isExpanded
                            ? 'bg-gold-500/20 text-gold-300'
                            : 'text-muted hover:text-white hover:bg-surface2'
                        }`}
                        title="Customize color, emoji, and image"
                      >
                        🎨
                      </button>

                      {/* Delete button */}
                      {outcomes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOutcome(item.id)}
                          className="text-red-400 hover:text-red-300 text-lg font-bold px-1"
                          title="Remove piece"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* ── Expanded Full Piece Customizer ── */}
                    {isExpanded && (
                      <div className="border-t border-border/80 p-3 bg-surface2/40 flex flex-col gap-3 rounded-b-xl animate-fade-in">
                        {/* 1. Color Customization (Hex + Presets) */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted uppercase">
                              Piece Color:
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-muted">HEX:</span>
                              <input
                                type="text"
                                value={item.color}
                                onChange={(e) => handleUpdateOutcome(item.id, { color: e.target.value })}
                                className="w-20 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface border border-border text-white text-center"
                              />
                            </div>
                          </div>

                          {/* Quick Color Swatches */}
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_COLORS.map((colorHex) => (
                              <button
                                key={colorHex}
                                type="button"
                                onClick={() => handleUpdateOutcome(item.id, { color: colorHex })}
                                className={`w-5 h-5 rounded-md border transition-transform ${
                                  item.color.toLowerCase() === colorHex.toLowerCase()
                                    ? 'scale-125 border-white ring-2 ring-gold-400 z-10'
                                    : 'border-white/20 hover:scale-110'
                                }`}
                                style={{ backgroundColor: colorHex }}
                                title={colorHex}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 2. Media / Icon Selector (Emoji or Image) */}
                        <div className="flex flex-col gap-2 border-t border-border/50 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted uppercase">
                              Piece Media / Icon:
                            </span>
                            <div className="flex rounded overflow-hidden border border-border text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() => {
                                  setIconTab('emoji');
                                  handleUpdateOutcome(item.id, { iconType: 'emoji' });
                                }}
                                className={`px-2 py-0.5 transition-colors ${
                                  iconTab === 'emoji' ? 'bg-gold-700 text-bg font-bold' : 'bg-surface text-muted hover:text-white'
                                }`}
                              >
                                😀 Emoji
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIconTab('image');
                                  handleUpdateOutcome(item.id, { iconType: 'image' });
                                }}
                                className={`px-2 py-0.5 transition-colors ${
                                  iconTab === 'image' ? 'bg-gold-700 text-bg font-bold' : 'bg-surface text-muted hover:text-white'
                                }`}
                              >
                                🖼️ Image
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIconTab('none');
                                  handleUpdateOutcome(item.id, { iconType: 'none', iconValue: '' });
                                }}
                                className={`px-2 py-0.5 transition-colors ${
                                  iconTab === 'none' ? 'bg-gold-700 text-bg font-bold' : 'bg-surface text-muted hover:text-white'
                                }`}
                              >
                                None
                              </button>
                            </div>
                          </div>

                          {/* Sub-view: Emoji */}
                          {iconTab === 'emoji' && (
                            <div className="flex flex-col gap-2">
                              {/* Popular RPG Emojis Grid */}
                              <div className="grid grid-cols-10 gap-1 p-1.5 rounded-lg bg-surface border border-border max-h-28 overflow-y-auto">
                                {COMMON_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOutcome(item.id, {
                                        iconType: 'emoji',
                                        iconValue: emoji,
                                      })
                                    }
                                    className={`w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-gold-900/40 hover:scale-110 transition-all ${
                                      item.iconValue === emoji ? 'bg-gold-900/60 ring-1 ring-gold-400' : ''
                                    }`}
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>

                              {/* Custom Emoji / Text Input */}
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted">Custom Emoji:</span>
                                <input
                                  type="text"
                                  value={item.iconType === 'emoji' ? item.iconValue || '' : ''}
                                  onChange={(e) =>
                                    handleUpdateOutcome(item.id, {
                                      iconType: 'emoji',
                                      iconValue: e.target.value,
                                    })
                                  }
                                  placeholder="Type or paste any emoji (e.g. 🐉)"
                                  className="input flex-1 text-xs py-1"
                                />
                              </div>
                            </div>
                          )}

                          {/* Sub-view: Image */}
                          {iconTab === 'image' && (
                            <div className="flex flex-col gap-2.5">
                              {/* Upload Button + Image URL */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTriggerImageUpload(item.id)}
                                  className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
                                >
                                  <span>📁</span>
                                  <span>Upload Photo</span>
                                </button>
                                <span className="text-xs text-muted">or</span>
                                <input
                                  type="url"
                                  value={item.iconType === 'image' ? item.iconValue || '' : ''}
                                  onChange={(e) =>
                                    handleUpdateOutcome(item.id, {
                                      iconType: 'image',
                                      iconValue: e.target.value,
                                    })
                                  }
                                  placeholder="Paste Image URL (https://...)"
                                  className="input flex-1 text-xs py-1"
                                />
                              </div>

                              {/* Active Image Preview & Remove */}
                              {hasImage && (
                                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={item.iconValue}
                                      alt="Preview"
                                      className="w-9 h-9 rounded-lg object-cover border border-gold-600/60 shadow"
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white">Active Image Attached</span>
                                      <span className="text-[10px] text-muted truncate max-w-[200px]">
                                        Renders directly on wheel piece
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOutcome(item.id, {
                                        iconType: 'none',
                                        iconValue: '',
                                      })
                                    }
                                    className="text-xs text-red-400 hover:text-red-300 font-semibold"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Notes / Bonus Effect */}
                        <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
                          <label className="text-[11px] font-bold text-muted">
                            Effect Notes / Combat Details:
                          </label>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateOutcome(item.id, { notes: e.target.value })}
                            placeholder="e.g. +10 Fire Damage, Target is Burned for 2 turns"
                            className="input w-full text-xs py-1"
                          />
                        </div>

                        {/* Close drawer button */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSliceId(null)}
                            className="text-xs font-bold text-gold-400 hover:text-white px-2 py-1 rounded bg-surface border border-border"
                          >
                            ✓ Done Customizing
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Roll History Card ── */}
          {history.length > 0 && (
            <div className="card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="font-display font-bold text-xs text-gold-400 uppercase">
                  📜 Recent Spins ({history.length})
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
                {history.map((h) => {
                  const isImg = h.winningOutcome.iconType === 'image' && h.winningOutcome.iconValue;
                  const isEmo = (h.winningOutcome.iconType === 'emoji' || !h.winningOutcome.iconType) && h.winningOutcome.iconValue;

                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-1.5 rounded bg-surface2/40 border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {isImg ? (
                          <img
                            src={h.winningOutcome.iconValue}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover border border-white/40 shrink-0"
                          />
                        ) : isEmo ? (
                          <span className="text-sm shrink-0">{h.winningOutcome.iconValue}</span>
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: h.winningOutcome.color }}
                          />
                        )}
                        <span className="font-bold text-white truncate max-w-[170px]">
                          {h.winningOutcome.label}
                        </span>
                      </div>
                      <span className="font-mono text-gold-300 text-[11px] shrink-0">
                        d100: {h.rollNumber}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
