'use client';

/**
 * DiceThrowOverlay
 * A visual overlay that shows a d20 dice falling from above,
 * bouncing, then revealing the final number.
 * Used by the Calculator's quick roll buttons.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

interface DiceThrowProps {
  /** Array of individual dice values */
  values: number[];
  /** Total sum (or final evaluated value) */
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
}

const getDiceSVG = (type: string, phase: string, isNat20: boolean, isNat1: boolean) => {
  let stroke = 'rgba(201, 168, 76, 0.6)';
  let fill = 'rgba(30, 25, 15, 0.6)';
  let filter = 'none';

  if (phase === 'landed') {
    if (isNat20) {
      stroke = '#C9A84C';
      fill = '#382b0f';
      filter = 'drop-shadow(0 0 10px rgba(201,168,76,0.5))';
    } else if (isNat1) {
      stroke = '#EF4444';
      fill = '#450a0a';
      filter = 'drop-shadow(0 0 10px rgba(239,68,68,0.5))';
    } else {
      stroke = '#B49339';
      fill = '#0a0a12';
    }
  }

  const common = { stroke, fill, strokeWidth: "5", strokeLinejoin: "round" as const, style: { filter } };

  switch (type) {
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
  if (type === 'd4') return 'translateY(15%)';
  if (type === 'd10' || type === 'd100') return 'translateY(5%)';
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
}: DiceThrowProps) {

  const [phase, setPhase] = useState<'throwing' | 'landed' | 'exiting'>('throwing');
  const [scrambleValues, setScrambleValues] = useState<number[]>(values);

  const maxFacesArray = Array.isArray(diceType) 
    ? diceType.map(t => parseInt(t.replace('d', ''), 10) || 20)
    : [parseInt(diceType.replace('d', ''), 10) || 20];
  const defaultMaxFaces = maxFacesArray[0];

  const { settings } = useAppContext();
  const speedMap = { fast: 0.6, normal: 0.9, slow: 1.5 };
  const rollDuration = speedMap[settings.rollSpeed] || 0.9;

  // Pre-calculate spin directions so they don't change on re-render
  const spinDirs = useMemo(() => values.map(() => Math.random() > 0.5 ? 1 : -1), [values]);

  // Scramble numbers during the throw
  useEffect(() => {
    if (phase !== 'throwing') return;
    const interval = setInterval(() => {
      setScrambleValues(values.map((_, i) => {
        const max = Array.isArray(diceType) ? maxFacesArray[i] : defaultMaxFaces;
        return Math.floor(Math.random() * max) + 1;
      }));
    }, 55);

    // Land at end of throw animation + stagger
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
  }, [phase, values, defaultMaxFaces, rollDuration]);

  // After landing, hold for a moment then exit
  useEffect(() => {
    if (phase !== 'landed') return;
    const t = setTimeout(() => setPhase('exiting'), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  // After exit animation, call onComplete
  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(onComplete, 300);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
        ${phase === 'exiting' ? 'animate-throw-exit' : ''}`}
      style={{ backgroundColor: 'rgba(10, 10, 18, 0.85)', backdropFilter: 'blur(6px)' }}
    >
      {/* The dice group */}
      <div className="flex flex-col items-center">
        <div className="relative flex flex-wrap items-center justify-center gap-3 max-w-[80vw]">
          {values.map((finalVal, i) => {
            const currentType = Array.isArray(diceType) ? diceType[i] : (diceType as string);
            const displayVal = phase === 'throwing' ? scrambleValues[i] : finalVal;
            const isDieNat20 = currentType === 'd20' && finalVal === 20;
            const isDieNat1 = currentType === 'd20' && finalVal === 1;

            return (
              <div key={i} className="relative w-16 h-16 flex items-center justify-center">
                {/* Shadow for this specific die */}
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

                {/* Impact ring for this specific die */}
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
                    '--spin-dir': spinDirs[i]
                  } as React.CSSProperties}
                >
                  <svg 
                    viewBox="0 0 100 100" 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: -1 }}
                  >
                    {getDiceSVG(currentType, phase, isDieNat20, isDieNat1)}
                  </svg>
                  <span
                    className={`
                      ${phase === 'landed' && isDieNat20 ? 'text-gold-300' 
                        : phase === 'landed' && isDieNat1 ? 'text-red-400'
                        : phase === 'landed' ? 'text-white'
                        : 'text-gold-300'}
                    `}
                    style={{ transform: getNumberOffset(currentType) }}
                  >
                    {displayVal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Label and result text */}
      {phase === 'landed' && (
        <div className="mt-6 text-center flex flex-col items-center animate-fade-in">
          {isNat20 && (
            <div className="text-gold-400 font-display font-bold text-sm mb-1 animate-pulse">
              ⭐ NATURAL 20! ⭐
            </div>
          )}
          {isNat1 && (
            <div className="text-red-400 font-display font-bold text-sm mb-1">
              💀 Natural 1…
            </div>
          )}
          <div className="font-display font-bold text-5xl text-gold-300 mb-2 drop-shadow-[0_0_15px_rgba(201,168,76,0.5)]">
            {total}
          </div>
          <div className="text-xs text-muted uppercase tracking-widest">{label}</div>
        </div>
      )}

      {/* Throwing label */}
      {phase === 'throwing' && (
        <div className="mt-8 text-gold-600 text-xs font-semibold animate-pulse uppercase tracking-widest">
          Rolling {values.length} {Array.isArray(diceType) ? 'dice' : diceType} {label}…
        </div>
      )}
    </div>
  );
}
