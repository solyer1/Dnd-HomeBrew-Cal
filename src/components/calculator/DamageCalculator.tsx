'use client';

/**
 * DamageCalculator
 * Main calculator UI. Reads inputs, calls engine, passes breakdown to display.
 * Contains ZERO combat logic — all math is in damageEngine.ts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { DamageInput, DamageModifier, ResistanceState, DamageType } from '@/types/damage';
import { calculateDamage } from '@/engine/damageEngine';
import { useAppContext } from '@/context/AppContext';
import { DEFAULT_DAMAGE_INPUT } from '@/config/defaults';
import { DAMAGE_TYPES } from '@/config/damageTypes';
import { DamageBreakdownDisplay } from './DamageBreakdownDisplay';
import { ModifierPanel } from './ModifierPanel';
import { generateId } from '@/utils/math';

const RESISTANCE_OPTIONS: { value: ResistanceState; label: string; color: string }[] = [
  { value: 'none',          label: 'None',          color: 'text-gray-300' },
  { value: 'resistance',    label: 'Resistance',    color: 'text-blue-400' },
  { value: 'vulnerability', label: 'Vulnerability', color: 'text-red-400'  },
  { value: 'immunity',      label: 'Immunity',      color: 'text-purple-400' },
];

export function DamageCalculator() {
  const { critTable } = useAppContext();

  const [input, setInput] = useState<DamageInput>(DEFAULT_DAMAGE_INPUT);

  const result = useMemo(
    () => calculateDamage(input, critTable),
    [input, critTable],
  );

  const update = useCallback(<K extends keyof DamageInput>(
    key: K,
    value: DamageInput[K],
  ) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addModifier = useCallback((mod: Omit<DamageModifier, 'id'>) => {
    setInput((prev) => ({
      ...prev,
      modifiers: [...prev.modifiers, { ...mod, id: generateId() }],
    }));
  }, []);

  const removeModifier = useCallback((id: string) => {
    setInput((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((m) => m.id !== id),
    }));
  }, []);

  const updateModifier = useCallback((id: string, patch: Partial<DamageModifier>) => {
    setInput((prev) => ({
      ...prev,
      modifiers: prev.modifiers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const { breakdown } = result;
  const isCrit = breakdown.critMultiplier > 1;
  const isImmune = breakdown.isImmune;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚔️</span>
        <div>
          <h2 className="font-display text-xl font-bold text-gold-400">
            Damage Calculator
          </h2>
          <p className="text-xs text-muted">
            Updates instantly — no button needed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Inputs ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Base Damage */}
          <div className="card">
            <label className="label">Base Damage</label>
            <div className="flex items-center gap-3">
              <input
                id="base-damage"
                type="number"
                min={0}
                value={input.baseDamage}
                onChange={(e) => update('baseDamage', Math.max(0, Number(e.target.value)))}
                className="input flex-1 text-2xl font-bold text-center"
                placeholder="0"
              />
              <div className="text-center">
                <div className={`text-3xl font-display font-bold ${isCrit ? 'text-gold-400 animate-pulse' : 'text-white'}`}>
                  {breakdown.finalDamage}
                </div>
                <div className="text-xs text-muted">Final</div>
              </div>
            </div>
          </div>

          {/* Attack Roll (d20) */}
          <div className="card">
            <label className="label">
              Attack Roll (d20)
              {isCrit && (
                <span className="ml-2 text-xs text-gold-400 font-semibold animate-pulse">
                  ⚡ {breakdown.critMultiplier > 2 ? 'NATURAL 20!' : breakdown.critMultiplier > 1.5 ? 'CRITICAL!' : 'CRIT HIT'}
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="attack-roll"
                type="range"
                min={1}
                max={20}
                value={input.attackRoll}
                onChange={(e) => update('attackRoll', Number(e.target.value))}
                className="flex-1 accent-gold"
              />
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-xl border-2 transition-all duration-300
                  ${input.attackRoll === 20 ? 'bg-gold-900 border-gold-400 text-gold-300 shadow-gold' :
                    input.attackRoll === 1  ? 'bg-red-950 border-red-500 text-red-400' :
                    isCrit ? 'bg-amber-950 border-amber-500 text-amber-300' :
                    'bg-surface border-border text-white'}`}
              >
                {input.attackRoll}
              </div>
            </div>
            {/* Crit tier indicator */}
            <div className="mt-2 flex gap-1">
              {[{r:'1-10',mul:'×1',active:input.attackRoll<=10},
                {r:'11-17',mul:'×1.5',active:input.attackRoll>=11&&input.attackRoll<=17},
                {r:'18-19',mul:'×2',active:input.attackRoll>=18&&input.attackRoll<=19},
                {r:'20',mul:'×2.5',active:input.attackRoll===20}
              ].map((tier) => (
                <div key={tier.r}
                  className={`flex-1 text-center py-1 rounded text-xs transition-all duration-200
                    ${tier.active ? 'bg-gold-900 text-gold-300 border border-gold-600' : 'bg-surface text-muted border border-border'}`}
                >
                  <div className="font-bold">{tier.mul}</div>
                  <div className="opacity-70">{tier.r}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Damage Type */}
          <div className="card">
            <label className="label">Damage Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {DAMAGE_TYPES.map((dt) => (
                <button
                  key={dt.id}
                  id={`dmg-type-${dt.id}`}
                  onClick={() => update('damageType', dt.id as DamageType)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 flex flex-col items-center gap-1
                    ${input.damageType === dt.id
                      ? 'border-gold-500 bg-gold-900/30 text-gold-300'
                      : 'border-border bg-surface/50 text-muted hover:border-gold-700 hover:text-white'}`}
                >
                  <span className="text-lg">{dt.icon}</span>
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resistance State */}
          <div className="card">
            <label className="label">Resistance State</label>
            <div className="grid grid-cols-2 gap-2">
              {RESISTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  id={`resistance-${opt.value}`}
                  onClick={() => update('resistanceState', opt.value)}
                  className={`px-3 py-3 rounded-lg text-sm font-semibold border transition-all duration-150
                    ${input.resistanceState === opt.value
                      ? `border-gold-500 bg-gold-900/30 ${opt.color}`
                      : 'border-border bg-surface/50 text-muted hover:border-gold-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Vulnerability Stacks */}
            {input.resistanceState === 'vulnerability' && (
              <div className="mt-3 p-3 rounded-lg bg-red-950/30 border border-red-800">
                <label className="label text-red-400">
                  Vulnerability Stacks
                  <span className="ml-2 text-xs text-red-300">
                    (×{Math.pow(2, input.vulnerabilityStacks)} total damage)
                  </span>
                </label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    id="vuln-stacks"
                    type="range"
                    min={1}
                    max={10}
                    value={input.vulnerabilityStacks}
                    onChange={(e) => update('vulnerabilityStacks', Number(e.target.value))}
                    className="flex-1 accent-red"
                  />
                  <span className="w-8 text-center font-bold text-red-400">
                    {input.vulnerabilityStacks}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => update('vulnerabilityStacks', n)}
                      className={`px-2 py-0.5 rounded text-xs font-bold border transition-all
                        ${input.vulnerabilityStacks === n
                          ? 'border-red-500 bg-red-950 text-red-300'
                          : 'border-border bg-surface text-muted hover:border-red-700'}`}
                    >
                      ×{Math.pow(2, n)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modifiers Panel */}
          <ModifierPanel
            modifiers={input.modifiers}
            onAdd={addModifier}
            onRemove={removeModifier}
            onUpdate={updateModifier}
          />
        </div>

        {/* ── Right: Breakdown ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <DamageBreakdownDisplay
            result={result}
            isImmune={isImmune}
            isCrit={isCrit}
          />
        </div>
      </div>
    </div>
  );
}
