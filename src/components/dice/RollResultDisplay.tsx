'use client';

/**
 * RollResultDisplay
 * Shows individual rolls per group with nat20/nat1 highlighting,
 * scrambling animation while rolling, and a "Send to Calculator" button.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { RollResult, IndividualRoll } from '@/types/dice';
import { useAppContext } from '@/context/AppContext';

interface Props {
  result: RollResult;
  isRolling: boolean;
}

function DieChip({
  roll,
  isRolling,
  diceType,
}: {
  roll: IndividualRoll;
  isRolling: boolean;
  diceType: string;
}) {
  const [displayValue, setDisplayValue] = useState<number | string>(roll.value);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRolling) {
      const max = parseInt(diceType.replace('d', ''), 10) || 20;
      intervalRef.current = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * max) + 1);
      }, 45);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayValue(roll.value);
    }
  }, [isRolling, roll.value, diceType]);

  const is20 = !isRolling && roll.isNat20;
  const is1 = !isRolling && roll.isNat1;

  return (
    <span
      className={`
        inline-flex items-center justify-center w-11 h-11 rounded-xl font-display font-bold text-lg border-2
        transition-all duration-200 select-none
        ${isRolling
          ? 'border-gold-500 bg-gold-900/60 text-gold-300 shadow-gold animate-chip-tumble'
          : is20
          ? 'border-gold-400 bg-gold-900 text-gold-300 shadow-gold animate-pulse scale-110'
          : is1
          ? 'border-red-500 bg-red-950 text-red-400 shadow-red'
          : 'border-border bg-surface text-white hover:border-gold-700 hover:scale-105'}
      `}
      title={is20 ? 'Natural 20!' : is1 ? 'Natural 1!' : undefined}
    >
      {displayValue}
    </span>
  );
}

export function RollResultDisplay({ result, isRolling }: Props) {
  const { sendDiceToCalculator } = useAppContext();
  const [sentFlash, setSentFlash] = useState(false);

  const handleSend = (target: 'base' | 'attack') => {
    let finalVal = result.grandTotal;
    if (target === 'attack') {
      finalVal = Math.min(20, Math.max(1, finalVal));
    }
    sendDiceToCalculator(finalVal, target);
    setSentFlash(true);
    setTimeout(() => setSentFlash(false), 1500);
  };

  return (
    <div
      className={`card flex flex-col gap-4 transition-all duration-300 ${
        isRolling ? 'border-gold-600/60 shadow-gold' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gold-400">
          {isRolling ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin text-base">🎲</span> Rolling…
            </span>
          ) : (
            '🎯 Roll Results'
          )}
        </h3>
        {!isRolling && (
          <span className="text-xs text-muted">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Per group results */}
      <div
        className={`flex flex-col gap-3 transition-opacity duration-300 ${
          isRolling ? 'opacity-70' : 'opacity-100'
        }`}
      >
        {result.groups.map((groupResult, gi) => (
          <div
            key={gi}
            className={`p-3 rounded-lg bg-surface/60 border transition-all duration-300 ${
              isRolling ? 'border-gold-700/40' : 'border-border'
            }`}
          >
            {/* Group header */}
            <div className="text-xs font-semibold text-muted mb-2">
              {groupResult.group.label ||
                `${groupResult.group.quantity}${groupResult.group.diceType}`}
              {groupResult.group.modifier !== 0 && (
                <span className="text-blue-400 ml-1">
                  {groupResult.group.modifier > 0 ? '+' : ''}
                  {groupResult.group.modifier}
                </span>
              )}
            </div>

            {/* Individual dice — shake the container while rolling */}
            <div
              className={`flex flex-wrap gap-2 transition-all duration-200 ${
                isRolling ? 'animate-dice-shake' : ''
              }`}
            >
              {groupResult.rolls.map((roll, ri) => (
                <DieChip
                  key={ri}
                  roll={roll}
                  isRolling={isRolling}
                  diceType={groupResult.group.diceType}
                />
              ))}
              {groupResult.group.modifier !== 0 && (
                <span
                  className="inline-flex items-center justify-center px-3 h-11 rounded-xl font-bold text-sm border-2 border-blue-700 bg-blue-950 text-blue-300 flex-col gap-0"
                  title={groupResult.group.modifierMode === 'per-die'
                    ? `+${groupResult.group.modifier} applied to each of the ${groupResult.group.quantity} dice`
                    : `+${groupResult.group.modifier} added to the group sum`}
                >
                  <span>
                    {groupResult.group.modifier > 0 ? '+' : ''}{groupResult.group.modifierMode === 'per-die'
                      ? groupResult.group.modifier * groupResult.group.quantity
                      : groupResult.group.modifier}
                  </span>
                  <span className="text-[9px] font-normal text-blue-400 leading-none">
                    {groupResult.group.modifierMode === 'per-die' ? 'per die' : 'sum'}
                  </span>
                </span>
              )}
            </div>

            {/* Subtotal */}
            {!isRolling && (
              <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center animate-fade-in">
                <span className="text-xs text-muted">Subtotal</span>
                <span className="font-display font-bold text-white">
                  {groupResult.total}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grand total + Send buttons */}
      {!isRolling && (
        <>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gold-950/50 border border-gold-700 animate-slide-in">
            <span className="font-display font-bold text-gold-400">
              Grand Total
            </span>
            <span className="font-display font-bold text-4xl text-gold-300 tabular-nums">
              {result.grandTotal}
            </span>
          </div>

          {/* ── Send to Calculator ── */}
          <div className="flex flex-col gap-2 animate-fade-in">
            <p className="text-xs text-muted text-center">
              Send roll result to Damage Calculator:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="send-to-base-damage"
                onClick={() => handleSend('base')}
                className={`btn-gold text-sm py-2.5 gap-2 transition-all duration-300 ${
                  sentFlash ? 'border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]' : ''
                }`}
              >
                <span>{sentFlash ? '✓' : '⚔️'}</span>
                {sentFlash ? 'Sent!' : 'As Base Damage'}
              </button>
              <button
                id="send-to-attack-roll"
                onClick={() => handleSend('attack')}
                className="btn-ghost text-sm py-2.5"
              >
                🎯 As Attack Roll (d20)
              </button>
            </div>
          </div>

          {/* Nat 20 / Nat 1 callouts */}
          {result.groups.some((g) => g.rolls.some((r) => r.isNat20)) && (
            <div className="text-center py-2 rounded-lg bg-gold-900/30 border border-gold-600 animate-pulse">
              <span className="text-gold-400 font-display font-bold text-sm">
                ⭐ NATURAL 20! ⭐
              </span>
            </div>
          )}
          {result.groups.some((g) => g.rolls.some((r) => r.isNat1)) && (
            <div className="text-center py-2 rounded-lg bg-red-950/30 border border-red-700">
              <span className="text-red-400 font-display font-bold text-sm">
                💀 Natural 1…
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
