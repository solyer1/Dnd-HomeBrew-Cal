'use client';

/**
 * DiceRoller
 * Full RPG dice roller with multiple groups, animations, and roll history.
 */

import React, { useState, useCallback } from 'react';
import type { DiceGroup, DiceType } from '@/types/dice';
import { rollAllGroups } from '@/engine/diceEngine';
import { useAppContext } from '@/context/AppContext';
import { generateId } from '@/utils/math';
import { DiceGroupRow } from './DiceGroupRow';
import { RollResultDisplay } from './RollResultDisplay';
import { RollHistory } from './RollHistory';
import type { RollResult } from '@/types/dice';

const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const makeDefaultGroup = (): DiceGroup => ({
  id: generateId(),
  diceType: 'd6',
  quantity: 1,
  modifier: 0,
  label: '',
});

export function DiceRoller() {
  const { addToHistory, rollHistory, clearHistory } = useAppContext();

  const [groups, setGroups] = useState<DiceGroup[]>([makeDefaultGroup()]);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
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

  const handleRoll = useCallback(async () => {
    if (isRolling) return;
    setIsRolling(true);
    setLastResult(null);

    // Small delay for animation
    await new Promise((r) => setTimeout(r, 600));

    const result = rollAllGroups(groups);
    setLastResult(result);
    addToHistory(rollLabel.trim() || buildLabel(groups), result);

    setIsRolling(false);
  }, [groups, isRolling, rollLabel, addToHistory]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎲</span>
        <div>
          <h2 className="font-display text-xl font-bold text-gold-400">
            Dice Roller
          </h2>
          <p className="text-xs text-muted">
            Add dice groups · Roll · See history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Setup ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Roll label */}
          <div className="card">
            <label className="label">Roll Label (optional)</label>
            <input
              type="text"
              value={rollLabel}
              onChange={(e) => setRollLabel(e.target.value)}
              className="input w-full"
              placeholder="e.g. Attack Roll, Damage Roll..."
            />
          </div>

          {/* Dice Groups */}
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="label">Dice Groups</label>
              <button onClick={addGroup} className="btn-ghost text-xs">
                + Add Group
              </button>
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
            disabled={isRolling}
            className={`w-full py-4 rounded-xl font-display font-bold text-xl border-2 transition-all duration-200
              ${isRolling
                ? 'border-gold-700 bg-gold-900/20 text-gold-600 cursor-not-allowed animate-pulse'
                : 'border-gold-500 bg-gold-900/30 text-gold-300 hover:bg-gold-800/40 hover:text-gold-200 hover:shadow-gold active:scale-95'}`}
          >
            {isRolling ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin">🎲</span> Rolling…
              </span>
            ) : (
              '🎲 Roll Dice'
            )}
          </button>
        </div>

        {/* ── Right: Result + History ───────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Current result */}
          {lastResult ? (
            <RollResultDisplay result={lastResult} isRolling={isRolling} />
          ) : (
            <div className="card flex items-center justify-center h-40 text-muted text-center">
              <div>
                <div className="text-4xl mb-2 opacity-30">🎲</div>
                <div className="text-sm">Roll to see results</div>
              </div>
            </div>
          )}

          {/* History */}
          <RollHistory
            history={rollHistory}
            onClear={clearHistory}
          />
        </div>
      </div>
    </div>
  );
}

/** Build a human-readable label like "2d6+3 + 1d8" */
function buildLabel(groups: DiceGroup[]): string {
  return groups
    .map((g) => {
      const base = `${g.quantity}${g.diceType}`;
      if (g.modifier === 0) return base;
      return `${base}${g.modifier > 0 ? '+' : ''}${g.modifier}`;
    })
    .join(' + ');
}
