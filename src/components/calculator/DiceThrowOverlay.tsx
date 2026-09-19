'use client';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * DiceThrowOverlay
 * Supports both 3D Bird's-Eye View Dice Throwing (Three.js WebGL)
 * and 2D Classic SVG bounce & scramble animation.
 * Features an instant 2D / 3D toggle so the player can switch on the fly.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { BirdEyeDiceCanvas } from '@/components/dice3d/BirdEyeDiceCanvas';
import confetti from 'canvas-confetti';

interface DiceThrowProps {
  /** Array of individual dice values (raw, without per-die modifier applied) */
  values: number[];
  /** Total sum (or final evaluated value, with modifier already included) */
  total: number;
  /** Dice type string (e.g. 'd20', 'd6') or array of types for multiple groups */
  diceType: string | string[];
  /** Called when the full animation finishes */
  onComplete: () => void;
  /** Label like "Base Damage" */
  label?: string;
  /** Whether this was a nat 20 (only applies if 1d20) */
  isNat20?: boolean;
  /** Whether this was a nat 1 (only applies if 1d20) */
  isNat1?: boolean;
  /** Optional array of modifiers, one per die */
  modifiers?: number[];
  /** Optional array indicating which dice were dropped (e.g. from disadvantage) */
  dropped?: boolean[];
}

const getDiceSVG = (type: string, phase: string, isNat20: boolean, isNat1: boolean, isDropped = false) => {
  let stroke = 'rgba(201, 168, 76, 0.6)';
  let fill = 'rgba(30, 25, 15, 0.6)';
  let filter = 'none';

  if (phase === 'landed') {
    if (isDropped) {
      stroke = '#71717a';
      fill = '#0a0a12';
      filter = 'none';
    } else if (isNat20) {
      stroke = '#C9A84C';
      fill = '#382b0f';
      filter = 'drop-shadow(0 0 15px rgba(201,168,76,0.8))';
    } else if (isNat1) {
      stroke = '#EF4444';
      fill = '#450a0a';
      filter = 'drop-shadow(0 0 10px rgba(239,68,68,0.5))';
    } else {
      stroke = '#C9A84C';
      fill = '#0a0a12';
      filter = 'drop-shadow(0 0 8px rgba(201,168,76,0.3))';
    }
  }

  const common = { stroke, fill, strokeWidth: '5', strokeLinejoin: 'round' as const, style: { filter } };

  switch (type.toLowerCase()) {
    case 'd4': return <polygon points="50,10 90,85 10,85" {...common} />;
    case 'd6': return <rect x="15" y="15" width="70" height="70" rx="12" {...common} />;
    case 'd8': return <polygon points="50,10 90,50 50,90 10,50" {...common} />;
    case 'd10':
    case 'd100': return <polygon points="50,10 90,40 50,90 10,40" {...common} />;
    case 'd12': return <polygon points="50,10 90,38 75,90 25,90 10,38" {...common} />;
    case 'd20':
    default: return <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" {...common} />;
  }
};

const getNumberOffset = (type: string) => {
  const t = type.toLowerCase();
  if (t === 'd4') return 'translateY(15%)';
  if (t === 'd10' || t === 'd100') return 'translateY(5%)';
  return 'translateY(0)';
};

export function DiceThrowOverlay({
  values,
  total,
  diceType,
  onComplete,
  label = 'Roll',
  isNat20 = false,
  isNat1 = false,
  modifiers = [],
  dropped = [],
}: DiceThrowProps) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppContext();

  const is3D = (settings.diceAnimationMode || '3d') === '3d';

  const [phase, setPhase] = useState<'throwing' | 'landed' | 'absorbing' | 'exiting'>('throwing');
  const [scrambleValues, setScrambleValues] = useState<number[]>(values);

  const maxFacesArray = useMemo(() => {
    return Array.isArray(diceType)
      ? diceType.map(dt => parseInt(dt.replace(/[^0-9]/g, ''), 10) || 20)
      : [parseInt(String(diceType).replace(/[^0-9]/g, ''), 10) || 20];
  }, [diceType]);
  const defaultMaxFaces = maxFacesArray[0];

  const speedMap2D: Record<string, number> = { instant: 0.2, fast: 0.6, normal: 0.95, slow: 1.6 };
  const speedMap3D: Record<string, number> = { instant: 0.45, fast: 1.15, normal: 1.55, slow: 2.1 };
  const rollDuration = is3D
    ? (speedMap3D[settings.rollSpeed] || 1.55)
    : (speedMap2D[settings.rollSpeed] || 0.95);

  const spinDirs = useMemo(() => values.map(() => (Math.random() > 0.5 ? 1 : -1)), [values]);

  // Handle Confetti on Nat 20
  useEffect(() => {
    if (isNat20 && (phase === 'landed' || phase === 'absorbing')) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#c9a84c', '#9333ea', '#ffffff'],
      });
    }
  }, [isNat20, phase]);

  // 2D Scramble interval & timing
  useEffect(() => {
    if (phase !== 'throwing') return;

    if (!is3D) {
      const interval = setInterval(() => {
        setScrambleValues(
          values.map((_, i) => {
            const max = Array.isArray(diceType) ? maxFacesArray[i] : defaultMaxFaces;
            return Math.floor(Math.random() * max) + 1;
          })
        );
      }, 55);

      const maxStaggerMs = Math.max(0, values.length - 1) * 80;
      const landTimer = setTimeout(() => {
        clearInterval(interval);
        setScrambleValues(values);
        setPhase('landed');
      }, rollDuration * 1000 + maxStaggerMs);

      return () => {
        clearInterval(interval);
        clearTimeout(landTimer);
      };
    }
  }, [phase, values, defaultMaxFaces, rollDuration, is3D, diceType, maxFacesArray]);

  // Settle callback for 3D simulation
  const handle3DLanded = useCallback(() => {
    setScrambleValues(values);
    setPhase('landed');
  }, [values]);

  // After landing, transition to absorbing or exiting
  useEffect(() => {
    if (phase !== 'landed') return;

    const hasAnyModifier = modifiers.some((m: number) => m !== 0);

    if (hasAnyModifier) {
      const tId = setTimeout(() => setPhase('absorbing'), 800);
      return () => clearTimeout(tId);
    } else {
      const tId = setTimeout(() => setPhase('exiting'), is3D ? 1400 : 1200);
      return () => clearTimeout(tId);
    }
  }, [phase, modifiers, is3D]);

  // After absorbing, hold to show final total, then exit
  useEffect(() => {
    if (phase !== 'absorbing') return;
    const tId = setTimeout(() => setPhase('exiting'), 1100);
    return () => clearTimeout(tId);
  }, [phase]);

  // After exit animation, call onComplete
  useEffect(() => {
    if (phase !== 'exiting') return;
    const tId = setTimeout(onComplete, 320);
    return () => clearTimeout(tId);
  }, [phase, onComplete]);

  const hasAnyModifier = useMemo(() => modifiers.some((m: number) => m !== 0), [modifiers]);
  const showTotal = hasAnyModifier
    ? (phase === 'absorbing' || phase === 'exiting')
    : (phase === 'landed' || phase === 'exiting');

  // Quick toggle mode handler
  const handleToggleMode = (mode: '2d' | '3d', e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ diceAnimationMode: mode });
  };

  return (
    <div
      onClick={() => {
        if (phase === 'landed' || phase === 'absorbing') {
          setPhase('exiting');
        }
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden select-none cursor-pointer
        ${phase === 'exiting' ? 'animate-throw-exit' : ''}`}
      style={{
        backgroundColor: is3D ? 'rgba(8, 4, 16, 0.88)' : 'rgba(10, 10, 18, 0.85)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* ── Top-Right Floating Mode Switcher (2D / 3D) ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-5 right-5 z-50 flex items-center gap-1 bg-void/90 border border-gold-500/30 p-1 rounded-full shadow-2xl backdrop-blur-md"
      >
        <span className="text-[10px] text-muted font-bold pl-2 pr-1 uppercase tracking-wider">Mode:</span>
        <button
          onClick={(e) => handleToggleMode('2d', e)}
          className={`px-3 py-1 rounded-full text-xs font-display font-bold transition-all ${
            !is3D
              ? 'bg-gold-500 text-black shadow-md scale-105'
              : 'text-muted hover:text-white bg-transparent'
          }`}
        >
          2D
        </button>
        <button
          onClick={(e) => handleToggleMode('3d', e)}
          className={`px-3 py-1 rounded-full text-xs font-display font-bold transition-all ${
            is3D
              ? 'bg-gold-500 text-black shadow-md scale-105'
              : 'text-muted hover:text-white bg-transparent'
          }`}
        >
          3D
        </button>
      </div>

      {/* ── 3D Bird's-Eye View Throwing Simulation ── */}
      {is3D && (
        <BirdEyeDiceCanvas
          values={values}
          diceType={diceType}
          rollDuration={rollDuration}
          isNat20={isNat20}
          isNat1={isNat1}
          dropped={dropped}
          onLanded={handle3DLanded}
        />
      )}

      {/* ── 2D Classic Dice Group (Only rendered in 2D mode, or subtle chip row in 3D on landed) ── */}
      {!is3D && (
        <div className="flex flex-col items-center z-20">
          <div className="relative flex flex-wrap items-center justify-center gap-3 max-w-[80vw]">
            {values.map((finalVal, i) => {
              const currentType = Array.isArray(diceType) ? diceType[i] : (diceType as string);
              const displayVal = phase === 'throwing' ? scrambleValues[i] : finalVal;
              const currentMod = modifiers[i] || 0;

              const maxFaces = parseInt(currentType.replace(/[^0-9]/g, ''), 10) || 20;
              const uncapped = finalVal + currentMod;
              const clampedFinal = settings.enableDieCap
                ? Math.max(1, Math.min(maxFaces, uncapped))
                : Math.max(1, uncapped);
              const showAbsorbed = phase === 'absorbing' || phase === 'exiting';
              const renderVal = currentMod !== 0 && showAbsorbed ? clampedFinal : displayVal;

              const isDieNat20 = currentType.toLowerCase() === 'd20' && renderVal === 20;
              const isDieNat1 = currentType.toLowerCase() === 'd20' && renderVal === 1;
              const isDropped = dropped[i] || false;

              return (
                <div key={i} className="relative w-16 h-16 flex items-center justify-center">
                  {phase === 'throwing' && (
                    <div
                      className="absolute animate-dice-shadow pointer-events-none"
                      style={{
                        top: 'calc(100% - (-7.5px))',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'radial-gradient(ellipse, rgba(201,168,76,0.5), transparent)',
                        animationDuration: `${rollDuration}s`,
                        animationDelay: `${i * 0}s`,
                        zIndex: -1,
                      }}
                    />
                  )}

                  {phase === 'throwing' && (
                    <div
                      className="absolute animate-impact-ring pointer-events-none"
                      style={{
                        top: 'calc(100% - (-7.5px))',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60px',
                        height: '12px',
                        borderRadius: '100%',
                        border: '2px solid rgba(201, 168, 76, 0.6)',
                        animationDelay: `${rollDuration * 0.35 + i * 0}s`,
                        animationDuration: '0.6s',
                        animationFillMode: 'forwards',
                        opacity: 0,
                        zIndex: -1,
                      }}
                    />
                  )}

                  <div
                    className={`
                      absolute inset-0 flex items-center justify-center font-display font-bold text-2xl
                      transition-all duration-200 select-none
                      ${phase === 'throwing' ? 'animate-dice-throw' : ''}
                      ${phase === 'landed' ? 'animate-result-reveal' : ''}
                    `}
                    style={{
                      animationDelay: phase === 'throwing' ? `${i * 0.08}s` : '0s',
                      animationDuration: `${rollDuration}s`,
                      '--spin-dir': spinDirs[i],
                    } as React.CSSProperties}
                  >
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                      {getDiceSVG(currentType, phase, isDieNat20, isDieNat1, isDropped)}
                    </svg>
                    <span
                      className={`
                        ${phase === 'landed' && isDieNat20 ? 'text-gold-300 drop-shadow-[0_0_8px_rgba(253,230,138,0.8)]'
                          : phase === 'landed' && isDieNat1 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                          : phase === 'landed' && isDropped ? 'text-zinc-300'
                          : phase === 'landed' ? 'text-white'
                          : 'text-gold-300'}
                      `}
                      style={{ transform: getNumberOffset(currentType) }}
                    >
                      <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showAbsorbed ? 'opacity-0 scale-50 delay-300' : 'opacity-100 scale-100'}`}>
                        {displayVal}
                      </span>
                      <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showAbsorbed ? 'opacity-100 scale-100 delay-300' : 'opacity-0 scale-150'}`}>
                        {renderVal}
                      </span>
                    </span>
                  </div>

                  {(phase === 'landed' || phase === 'absorbing') && currentMod !== 0 && !isDropped && (
                    <div
                      className={`
                        absolute -bottom-6 whitespace-nowrap text-[10px] font-bold text-blue-400
                        bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800 backdrop-blur-sm
                        transition-all duration-500 ease-in-out
                        ${phase === 'landed' ? 'animate-chip-pop opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 scale-75'}
                      `}
                      style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                    >
                      ({currentMod > 0 ? '+' : ''}{currentMod})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3D Modifier / Per-Die Badges when settled ── */}
      {is3D && (phase === 'landed' || phase === 'absorbing' || phase === 'exiting') && values.length > 1 && (
        <div className="z-30 flex flex-wrap items-center justify-center gap-2 mb-2 px-4 max-w-lg animate-fade-in">
          {values.map((v, i) => {
            const currentMod = modifiers[i] || 0;
            const isDropped = dropped[i] || false;
            return (
              <div
                key={i}
                className={`px-2.5 py-1 rounded-lg text-xs font-display font-semibold border backdrop-blur-md shadow-md ${
                  isDropped
                    ? 'bg-zinc-900/80 text-zinc-500 border-zinc-700 line-through'
                    : 'bg-void/80 text-gold-300 border-gold-500/40'
                }`}
              >
                {v} {currentMod !== 0 && <span className="text-blue-400 text-[10px]">({currentMod > 0 ? '+' : ''}{currentMod})</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Label and Result Banner ── */}
      {showTotal && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 text-center flex flex-col items-center bg-void/85 border border-gold-400/40 px-8 py-3.5 rounded-2xl backdrop-blur-xl shadow-2xl min-w-[260px]"
          style={{
            animation: 'backdrop-fade-in 0.35s ease-out forwards',
            animationDelay: hasAnyModifier && phase === 'absorbing' ? '0.35s' : '0s',
          }}
        >
          {isNat20 && (
            <div className="text-gold-300 font-display font-bold text-sm mb-1 animate-pulse">
              ★ NATURAL 20 — CRITICAL HIT! ★
            </div>
          )}
          {isNat1 && (
            <div className="text-red-400 font-display font-bold text-sm mb-1">
              💀 Natural 1 — Fumble!
            </div>
          )}
          <div className="font-display font-bold text-4xl text-gold-300 mb-0.5 drop-shadow-[0_0_20px_rgba(201,168,76,0.6)]">
            {total}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest font-semibold">{label}</div>
          <div className="text-[10px] text-muted/60 mt-1">Tap anywhere to continue</div>
        </div>
      )}

      {/* ── Throwing Status Label ── */}
      {phase === 'throwing' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-gold-400 text-xs font-semibold animate-pulse uppercase tracking-widest bg-void/80 px-5 py-2 rounded-full border border-gold-500/30 backdrop-blur-md shadow-lg pointer-events-none whitespace-nowrap">
          {is3D ? '🦅 Bird\'s-Eye Throwing' : 'Rolling'} {values.length} {Array.isArray(diceType) ? 'dice' : diceType}
          {` ${label}`}…
        </div>
      )}
    </div>
  );
}
