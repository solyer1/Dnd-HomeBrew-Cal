'use client';

/**
 * DamageBreakdownDisplay
 * Visualizes every step in the damage pipeline.
 * Reads DamageResult — contains zero logic.
 */

import React from 'react';
import type { DamageResult, PartitionBreakdown } from '@/types/damage';
import { useAppContext } from '@/context/AppContext';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';
import type { DamageTypeConfig } from '@/types/config';

interface Props {
  result: DamageResult;
  isCrit: boolean;
}

export function DamageBreakdownDisplay({ result, isCrit }: Props) {
  const { damageTypes } = useAppContext();
  const { breakdown } = result;
  
  // If ALL partitions are immune, the whole attack is immune
  const isFullyImmune = breakdown.partitionBreakdowns.length > 0 && breakdown.partitionBreakdowns.every(p => p.isImmune);

  const getPartitionFinal = (p: PartitionBreakdown) => {
    if (breakdown.totalAfterResistance === 0) return 0;
    return Math.round(breakdown.finalDamage * (p.afterResistance / breakdown.totalAfterResistance));
  };

  function getDamageTypeCfg(id: string): DamageTypeConfig {
    return damageTypes.find(d => d.id === id) || DEFAULT_DAMAGE_TYPES.find(d => d.id === id) || DEFAULT_DAMAGE_TYPES[0];
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Final Damage Hero - Distribution Layout */}
      <div
        className={`card py-6 transition-all duration-300
          ${isFullyImmune ? 'border-purple-700 bg-purple-950/20' :
            isCrit && breakdown.critMultiplier >= 2.5 ? 'border-gold-400 shadow-gold bg-gold-950/20' :
            isCrit ? 'border-amber-600 bg-amber-950/20' :
            'border-border'}`}
      >
        {isFullyImmune ? (
          <div className="text-center">
            <div className="text-4xl mb-2">🛡️</div>
            <div className="font-display text-2xl font-bold text-purple-400">IMMUNE</div>
            <div className="text-sm text-muted mt-1">No damage taken</div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {isCrit && (
              <div className={`text-sm font-bold mb-4 text-center ${breakdown.critMultiplier >= 2.5 ? 'text-gold-400' : 'text-amber-400'}`}>
                {breakdown.critMultiplier >= 2.5 ? '⭐ NATURAL 20 — CRITICAL!' :
                 breakdown.critMultiplier >= 2   ? '💥 CRITICAL HIT!' :
                 '⚡ CRIT HIT'}
              </div>
            )}
            
            <div className="flex flex-row flex-wrap items-center justify-center w-full gap-8 md:gap-12">
              {/* Left partitions (up to half) */}
              {breakdown.partitionBreakdowns.slice(0, Math.ceil(breakdown.partitionBreakdowns.length / 2)).map(p => {
                const cfg = getDamageTypeCfg(p.partition.damageType);
                return (
                  <div key={p.partition.id} className="flex flex-col items-center text-center">
                    <div className="text-xs text-muted mb-1">{p.partition.percentage}%</div>
                    <div className="font-display text-4xl font-bold text-white mb-1">
                      {getPartitionFinal(p)}
                    </div>
                    <div className="text-sm" style={{ color: cfg.color }}>{cfg.label} Damage</div>
                  </div>
                );
              })}

              {/* Center Final Damage */}
              <div className="flex flex-col items-center mx-4">
                <div className={`font-display text-6xl md:text-7xl font-bold transition-all duration-300
                  ${breakdown.critMultiplier >= 2.5 ? 'text-gold-400 drop-shadow-[0_0_15px_rgba(201,168,76,0.5)]' :
                    isCrit ? 'text-amber-400' :
                    'text-white'}`}>
                  {breakdown.finalDamage}
                </div>
                <div className="text-sm text-muted mt-2 uppercase tracking-widest font-semibold">Final Damage</div>
              </div>

              {/* Right partitions (remaining half) */}
              {breakdown.partitionBreakdowns.slice(Math.ceil(breakdown.partitionBreakdowns.length / 2)).map(p => {
                const cfg = getDamageTypeCfg(p.partition.damageType);
                return (
                  <div key={p.partition.id} className="flex flex-col items-center text-center">
                    <div className="text-xs text-muted mb-1">{p.partition.percentage}%</div>
                    <div className="font-display text-4xl font-bold text-white mb-1">
                      {getPartitionFinal(p)}
                    </div>
                    <div className="text-sm" style={{ color: cfg.color }}>{cfg.label} Damage</div>
                  </div>
                );
              })}
            </div>
          </div>
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
                      ? isFullyImmune
                        ? 'bg-purple-950/40 border border-purple-700'
                        : 'bg-gold-950/40 border border-gold-700'
                      : isFirst
                        ? 'bg-surface/60 border border-border'
                        : 'bg-surface/40 border border-border/50'}`}
                >
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${isLast ? (isFullyImmune ? 'text-purple-300' : 'text-gold-300') : 'text-white'}`}>
                      {step.label}
                    </div>
                    {step.detail && (
                      <div className="text-xs text-muted mt-0.5">{step.detail}</div>
                    )}
                  </div>
                  <div className={`font-display font-bold text-lg ml-4
                    ${isLast
                      ? isFullyImmune ? 'text-purple-400' : 'text-gold-400'
                      : 'text-white'}`}>
                    {isFullyImmune && isLast ? '0' : step.value % 1 !== 0 ? step.value.toFixed(1) : step.value}
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
      <div className="grid grid-cols-2 gap-2">
        <div className="card text-center py-3">
          <div className="text-xs text-muted">Crit ×</div>
          <div className={`font-display text-lg font-bold ${breakdown.critMultiplier > 1 ? 'text-gold-400' : 'text-white'}`}>
            {breakdown.critMultiplier}
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

