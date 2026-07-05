'use client';

/**
 * DamageBreakdownDisplay
 * Visualizes every step in the damage pipeline.
 * Reads DamageResult — contains zero logic.
 */

import React from 'react';
import type { DamageResult } from '@/types/damage';

interface Props {
  result: DamageResult;
  isImmune: boolean;
  isCrit: boolean;
}

export function DamageBreakdownDisplay({ result, isImmune, isCrit }: Props) {
  const { breakdown } = result;

  return (
    <div className="flex flex-col gap-3">
      {/* Final Damage Hero */}
      <div
        className={`card text-center py-6 transition-all duration-300
          ${isImmune ? 'border-purple-700 bg-purple-950/20' :
            isCrit && breakdown.critMultiplier >= 2.5 ? 'border-gold-400 shadow-gold bg-gold-950/20' :
            isCrit ? 'border-amber-600 bg-amber-950/20' :
            'border-border'}`}
      >
        {isImmune ? (
          <>
            <div className="text-4xl mb-2">🛡️</div>
            <div className="font-display text-2xl font-bold text-purple-400">IMMUNE</div>
            <div className="text-sm text-muted mt-1">No damage taken</div>
          </>
        ) : (
          <>
            {isCrit && (
              <div className={`text-sm font-bold mb-2 ${breakdown.critMultiplier >= 2.5 ? 'text-gold-400' : 'text-amber-400'}`}>
                {breakdown.critMultiplier >= 2.5 ? '⭐ NATURAL 20 — CRITICAL!' :
                 breakdown.critMultiplier >= 2   ? '💥 CRITICAL HIT!' :
                 '⚡ CRIT HIT'}
              </div>
            )}
            <div className={`font-display text-6xl font-bold transition-all duration-300
              ${breakdown.critMultiplier >= 2.5 ? 'text-gold-400' :
                isCrit ? 'text-amber-400' :
                'text-white'}`}>
              {breakdown.finalDamage}
            </div>
            <div className="text-sm text-muted mt-2">Final Damage</div>
          </>
        )}
      </div>

      {/* Step-by-step Breakdown */}
      <div className="card">
        <h3 className="font-display text-sm font-bold text-gold-400 mb-4">
          📊 Damage Breakdown
        </h3>
        <div className="flex flex-col gap-1">
          {breakdown.steps.map((step, i) => {
            const isLast = i === breakdown.steps.length - 1;
            const isFirst = i === 0;
            return (
              <React.Fragment key={i}>
                <div
                  className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200
                    ${isLast
                      ? isImmune
                        ? 'bg-purple-950/40 border border-purple-700'
                        : 'bg-gold-950/40 border border-gold-700'
                      : isFirst
                        ? 'bg-surface/60 border border-border'
                        : 'bg-surface/40 border border-border/50'}`}
                >
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${isLast ? (isImmune ? 'text-purple-300' : 'text-gold-300') : 'text-white'}`}>
                      {step.label}
                    </div>
                    {step.detail && (
                      <div className="text-xs text-muted mt-0.5">{step.detail}</div>
                    )}
                  </div>
                  <div className={`font-display font-bold text-lg ml-4
                    ${isLast
                      ? isImmune ? 'text-purple-400' : 'text-gold-400'
                      : 'text-white'}`}>
                    {isImmune && isLast ? '0' : step.value % 1 !== 0 ? step.value.toFixed(1) : step.value}
                  </div>
                </div>
                {!isLast && (
                  <div className="flex justify-center">
                    <div className="text-gold-700 text-lg leading-none">↓</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-3">
          <div className="text-xs text-muted">Crit ×</div>
          <div className={`font-display text-lg font-bold ${breakdown.critMultiplier > 1 ? 'text-gold-400' : 'text-white'}`}>
            {breakdown.critMultiplier}
          </div>
        </div>
        <div className="card text-center py-3">
          <div className="text-xs text-muted">Resist ×</div>
          <div className={`font-display text-lg font-bold
            ${breakdown.resistanceMultiplier === 0 ? 'text-purple-400' :
              breakdown.resistanceMultiplier < 1 ? 'text-blue-400' :
              breakdown.resistanceMultiplier > 1 ? 'text-red-400' :
              'text-white'}`}>
            {breakdown.resistanceMultiplier}
          </div>
        </div>
        <div className="card text-center py-3">
          <div className="text-xs text-muted">Mod %</div>
          <div className={`font-display text-lg font-bold ${breakdown.percentageModifiersTotal !== 0 ? 'text-emerald-400' : 'text-white'}`}>
            {breakdown.percentageModifiersTotal >= 0 ? '+' : ''}{breakdown.percentageModifiersTotal}%
          </div>
        </div>
      </div>
    </div>
  );
}
