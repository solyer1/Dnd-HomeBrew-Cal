'use client';
import { useTranslation } from '@/hooks/useTranslation';


/**
 * DiceThrowOverlay
 * A visual overlay that shows a d20 dice falling from above,
 * bouncing, then revealing the final number.
 * Used by the Calculator's quick roll buttons.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

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

const getDiceSVG = (type: string, phase: string, isNat20: boolean, isNat1: boolean, isDropped: boolean = false) => {
  let stroke = 'rgba(201, 168, 76, 0.6)';
  let fill = 'rgba(30, 25, 15, 0.6)';
  let filter = 'none';

  if (phase === 'landed') {
    if (isDropped) {
      stroke = '#71717a'; // Cool silver/gray for dropped dice
      fill = '#0a0a12';
      filter = 'none';
    } else if (isNat20) {
      stroke = '#C9A84C';
      fill = '#382b0f';
      filter = 'drop-shadow(0 0 15px rgba(201,168,76,0.8))'; // Stronger gold glow
    } else if (isNat1) {
      stroke = '#EF4444';
      fill = '#450a0a';
      filter = 'drop-shadow(0 0 10px rgba(239,68,68,0.5))';
    } else {
      stroke = '#C9A84C'; // Base gold
      fill = '#0a0a12';
      filter = 'drop-shadow(0 0 8px rgba(201,168,76,0.3))'; // Light glow for normal
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
  modifiers = [],
  dropped = [],
}: DiceThrowProps) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<'throwing' | 'landed' | 'absorbing' | 'exiting'>('throwing');
  const [scrambleValues, setScrambleValues] = useState<number[]>(values);

  const maxFacesArray = Array.isArray(diceType) 
    ? diceType.map(t => parseInt(t.replace('d', ''), 10) || 20)
    : [parseInt(diceType.replace('d', ''), 10) || 20];
  const defaultMaxFaces = maxFacesArray[0];

  const { settings } = useAppContext();
  const speedMap = {instant: 0.1, fast: 0.6, normal: 0.9, slow: 1.5 };
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

  // After landing, transition to absorbing or exiting
  useEffect(() => {
    if (phase !== 'landed') return;
    
    const hasAnyModifier = modifiers.some((m: number) => m !== 0);
    
    if (hasAnyModifier) {
      // Pause to show raw roll, then animate absorbing the modifier
      const t = setTimeout(() => setPhase('absorbing'), 800);
      return () => clearTimeout(t);
    } else {
      // No modifier to absorb, just hold and exit
      const t = setTimeout(() => setPhase('exiting'), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, modifiers]);

  // After absorbing, hold to show final total, then exit
  useEffect(() => {
    if (phase !== 'absorbing') return;
    const t = setTimeout(() => setPhase('exiting'), 1000);
    return () => clearTimeout(t);
  }, [phase]);

  // After exit animation, call onComplete
  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(onComplete, 300);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const hasAnyModifier = useMemo(() => modifiers.some((m: number) => m !== 0), [modifiers]);
  const showTotal = hasAnyModifier 
    ? (phase === 'absorbing' || phase === 'exiting')
    : (phase === 'landed' || phase === 'exiting');

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
            const currentMod = modifiers[i] || 0;
            
            // Calculate final clamped value for when the modifier is absorbed
            const maxFaces = parseInt(currentType.replace('d', ''), 10) || 20;
            const uncapped = finalVal + currentMod;
            const clampedFinal = settings.enableDieCap 
              ? Math.max(1, Math.min(maxFaces, uncapped)) 
              : Math.max(1, uncapped);
            const showAbsorbed = phase === 'absorbing' || phase === 'exiting';
            const renderVal = (currentMod !== 0 && showAbsorbed) ? clampedFinal : displayVal;

            const isDieNat20 = currentType === 'd20' && renderVal === 20;
            const isDieNat1 = currentType === 'd20' && renderVal === 1;
            const isDropped = dropped[i] || false;

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
                    {getDiceSVG(currentType, phase, isDieNat20, isDieNat1, isDropped)}
                  </svg>
                  <span
                    className={`
                      ${phase === 'landed' && isDieNat20 ? 'text-gold-300 drop-shadow-[0_0_8px_rgba(253,230,138,0.8)]' 
                        : phase === 'landed' && isDieNat1 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'
                        : phase === 'landed' && isDropped ? 'text-zinc-300' // Silver text for dropped
                        : phase === 'landed' ? 'text-white'
                        : 'text-gold-300'}
                    `}
                    style={{ transform: getNumberOffset(currentType) }}
                  >
                    <span
                      className={`
                        absolute inset-0 flex items-center justify-center transition-all duration-300
                        ${showAbsorbed ? 'opacity-0 scale-50 delay-300' : 'opacity-100 scale-100'}
                      `}
                    >
                      {displayVal}
                    </span>
                    <span
                      className={`
                        absolute inset-0 flex items-center justify-center transition-all duration-300
                        ${showAbsorbed ? 'opacity-100 scale-100 delay-300' : 'opacity-0 scale-150'}
                      `}
                    >
                      {renderVal}
                    </span>
                  </span>
                </div>

                {/* Per-die modifier chip shown when landed, animates up in absorbing */}
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

      {/* Label and result text */}
      {showTotal && (
        <div 
          className="mt-6 text-center flex flex-col items-center"
          style={{
            animation: 'backdrop-fade-in 0.3s ease-out forwards',
            animationDelay: (hasAnyModifier && phase === 'absorbing') ? '0.35s' : '0s',
            opacity: 0,
          }}
        >
          {isNat20 && (
            <div className="text-gold-400 font-display font-bold text-sm mb-1 animate-pulse">{t('calc.nat20star')}</div>
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
          Rolling {values.length} {Array.isArray(diceType) ? 'dice' : diceType}
          {` ${label}`}…
        </div>
      )}
    </div>
  );
}
