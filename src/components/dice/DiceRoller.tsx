'use client';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * DiceRoller
 * Full RPG dice roller with multiple groups, animations, roll history,
 * and "Send to Calculator" that can target Base Damage or Attack Roll.
 */

import React, { useState, useCallback } from 'react';
import type { DiceGroup, DiceType } from '@/types/dice';
import { rollAllGroups } from '@/engine/diceEngine';
import { useAppContext } from '@/context/AppContext';
import { generateId } from '@/utils/math';
import { DiceGroupRow } from './DiceGroupRow';
import { RollResultDisplay } from './RollResultDisplay';
import { RollHistory } from './RollHistory';
import { DiceThrowOverlay } from '../calculator/DiceThrowOverlay';
import { SpinWheelRoller } from './SpinWheelRoller';
import type { RollResult } from '@/types/dice';

const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const makeDefaultGroup = (): DiceGroup => ({
  id: generateId(),
  diceType: 'd20',
  quantity: 1,
  modifier: 0,
  modifierMode: 'total',
  label: '',
});

export function DiceRoller() {
  const { addToHistory, rollHistory, clearHistory, settings } = useAppContext();
  const { t } = useTranslation();

  const [groups, setGroups] = useState<DiceGroup[]>([makeDefaultGroup()]);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [mode, setMode] = useState<'classic' | 'wheel'>('classic');

  const [throwOverlay, setThrowOverlay] = useState<{
    values: number[];
    total: number;
    diceType: string | string[];
    modifiers?: number[];
    result: RollResult;
    groups: DiceGroup[];
  } | null>(null);

  const [rollLabel, setRollLabel] = useState('');

  const addGroup = useCallback(() => {
    setGroups((prev) => [...prev, makeDefaultGroup()]);
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const updateGroup = useCallback((id: string, patch: Partial<DiceGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }, []);

  const handleRoll = useCallback(() => {
    if (throwOverlay) return;
    const result = rollAllGroups(groups, settings.enableDieCap);
    const flatValues = result.groups.flatMap(g => g.rolls.map(r => r.value));
    const flatTypes = result.groups.flatMap(g => g.rolls.map(() => g.group.diceType));
    const flatModifiers = result.groups.flatMap(g => {
      return g.rolls.map(() => {
        if (g.group.modifierMode === 'per-die') return g.group.modifier;
        if (g.group.quantity === 1) return g.group.modifier;
        return 0; // If sum mode and multiple dice, we don't animate a single die for it
      });
    });

    setThrowOverlay({
      values: flatValues,
      total: result.grandTotal,
      diceType: flatTypes,
      modifiers: flatModifiers,
      result,
      groups,
    });
  }, [groups, throwOverlay]);

  const handleThrowComplete = useCallback(() => {
    if (!throwOverlay) return;
    setLastResult(throwOverlay.result);
    const label = rollLabel.trim() || buildLabel(groups);
    addToHistory(label, throwOverlay.result);
    setThrowOverlay(null);
  }, [throwOverlay, rollLabel, groups, addToHistory]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎲</span>
        <div>
          <h2 className="font-display text-xl font-bold text-gold-400">{t('dice.title')}</h2>
          <p className="text-xs text-muted">{t('dice.subtitle')}</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-bg rounded-lg p-1 w-max border border-border">
        <button 
          onClick={() => setMode('classic')}
          className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${mode === 'classic' ? 'bg-gold-700 text-bg shadow-sm' : 'text-muted hover:text-white'}`}
        >
          Classic Roller
        </button>
        <button 
          onClick={() => setMode('wheel')}
          className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${mode === 'wheel' ? 'bg-gold-700 text-bg shadow-sm' : 'text-muted hover:text-white'}`}
        >
          Spin Wheel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Setup ─────────────────────────────────────── */}
        {mode === 'classic' ? (
        <div className="flex flex-col gap-4">
          {/* Roll label */}
          <div className="card">
            <label className="label">{t('dice.rollLabel')}</label>
            <input
              type="text"
              value={rollLabel}
              onChange={(e) => setRollLabel(e.target.value)}
              className="input w-full"
              placeholder={t('dice.placeholderLabel')}
            />
          </div>

          {/* Dice Groups */}
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">{t('dice.diceGroups')}</label>
              <button onClick={addGroup} className="btn-ghost text-xs">{t('dice.addDice')}</button>
            </div>

            {groups.map((group, index) => (
              <DiceGroupRow
                key={group.id}
                group={group}
                diceTypes={DICE_TYPES}
                index={index}
                onUpdate={(patch) => updateGroup(group.id, patch)}
                onRemove={groups.length > 1 ? () => removeGroup(group.id) : undefined}
              />
            ))}

            {/* Summary */}
            <div className="mt-1 pt-3 border-t border-border text-center text-sm text-muted">
              Rolling:{' '}
              <span className="text-white font-semibold">
                {buildLabel(groups)}
              </span>
            </div>
          </div>

          {/* Roll Button */}
          <button
            id="roll-button"
            onClick={handleRoll}
            disabled={throwOverlay !== null}
            className={`w-full py-5 rounded-xl font-display font-bold text-2xl border-2 transition-all duration-200
              ${throwOverlay !== null
                ? 'border-gold-700 bg-gold-900/30 text-gold-600 cursor-not-allowed'
                : 'border-gold-500 bg-gold-900/30 text-gold-300 hover:bg-gold-800/40 hover:text-gold-200 hover:shadow-gold active:scale-95'}`}
          >
            🎲 Roll Dice
          </button>
        </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SpinWheelRoller 
              onResult={(res) => setLastResult(res)} 
            />
          </div>
        )}

        {/* ── Right: Result + History ───────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Current result */}
          {lastResult ? (
            <RollResultDisplay result={lastResult} isRolling={throwOverlay !== null} />
          ) : (
            <div className="card flex items-center justify-center h-40 text-muted text-center">
              <div>
                <div className="text-5xl mb-3 opacity-20 animate-pulse">🎲</div>
                <div className="text-sm">Roll dice to see results</div>
                <div className="text-xs mt-1 opacity-60">Then send to Calculator!</div>
              </div>
            </div>
          )}

          {/* History */}
          <RollHistory history={rollHistory} onClear={clearHistory} />
        </div>
      </div>

      {/* ── Global Throw Overlay ── */}
      {throwOverlay && (
        <DiceThrowOverlay
          values={throwOverlay.values}
          total={throwOverlay.total}
          diceType={throwOverlay.diceType}
          modifiers={throwOverlay.modifiers}
          label={rollLabel.trim() || buildLabel(throwOverlay.groups)}
          onComplete={handleThrowComplete}
        />
      )}
    </div>
  );
}

/** Build a human-readable label like "2d6+3 + 1d8" */
function buildLabel(groups: DiceGroup[]): string {
  return groups
    .map((g) => {
      const base = `${g.quantity}${g.diceType}`;
      if (g.modifier === 0) return base;
      const modStr = `${g.modifier > 0 ? '+' : ''}${g.modifier}`;
      const modeStr = g.modifierMode === 'per-die' ? ' each' : '';
      return `${base}${modStr}${modeStr}`;
    })
    .join(' + ');
}
