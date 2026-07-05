'use client';

/**
 * RollResultDisplay
 * Shows individual rolls per group with nat20/nat1 highlighting and animations.
 */

import React from 'react';
import type { RollResult, IndividualRoll } from '@/types/dice';

interface Props {
  result: RollResult;
  isRolling: boolean;
}

function DieChip({ roll }: { roll: IndividualRoll }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-display font-bold text-lg border-2 transition-all duration-300
        ${roll.isNat20
          ? 'border-gold-400 bg-gold-900 text-gold-300 shadow-gold animate-pulse'
          : roll.isNat1
          ? 'border-red-500 bg-red-950 text-red-400 shadow-red'
          : 'border-border bg-surface text-white'}`}
      title={roll.isNat20 ? 'Natural 20!' : roll.isNat1 ? 'Natural 1!' : undefined}
    >
      {roll.value}
    </span>
  );
}

export function RollResultDisplay({ result, isRolling }: Props) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-gold-400">🎯 Roll Results</h3>
        <span className="text-xs text-muted">
          {new Date(result.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Per group results */}
      {result.groups.map((groupResult, gi) => (
        <div key={gi} className="p-3 rounded-lg bg-surface/60 border border-border">
          {/* Group header */}
          <div className="text-xs font-semibold text-muted mb-2">
            {groupResult.group.label || `${groupResult.group.quantity}${groupResult.group.diceType}`}
            {groupResult.group.modifier !== 0 && (
              <span className="text-blue-400 ml-1">
                {groupResult.group.modifier > 0 ? '+' : ''}{groupResult.group.modifier}
              </span>
            )}
          </div>

          {/* Individual dice */}
          <div className={`flex flex-wrap gap-2 transition-all duration-300 ${isRolling ? 'animate-bounce opacity-50' : ''}`}>
            {groupResult.rolls.map((roll, ri) => (
              <DieChip key={ri} roll={roll} />
            ))}
            {/* Modifier chip */}
            {groupResult.group.modifier !== 0 && (
              <span className="inline-flex items-center justify-center px-3 h-10 rounded-lg font-bold text-sm border-2 border-blue-700 bg-blue-950 text-blue-300">
                {groupResult.group.modifier > 0 ? '+' : ''}{groupResult.group.modifier}
              </span>
            )}
          </div>

          {/* Subtotal */}
          <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
            <span className="text-xs text-muted">Subtotal</span>
            <span className="font-display font-bold text-white">{groupResult.total}</span>
          </div>
        </div>
      ))}

      {/* Grand total */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gold-950/40 border border-gold-700">
        <span className="font-display font-bold text-gold-400">Grand Total</span>
        <span className="font-display font-bold text-3xl text-gold-300">
          {result.grandTotal}
        </span>
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
    </div>
  );
}
