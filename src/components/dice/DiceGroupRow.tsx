'use client';

/**
 * DiceGroupRow
 * A single row representing one dice group (e.g. 2d6+3).
 */

import React from 'react';
import type { DiceGroup, DiceType } from '@/types/dice';

interface Props {
  group: DiceGroup;
  diceTypes: DiceType[];
  index: number;
  onUpdate: (patch: Partial<DiceGroup>) => void;
  onRemove?: () => void;
}

export function DiceGroupRow({ group, diceTypes, index, onUpdate, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-surface/60 border border-border">
      <div className="flex items-center gap-2">
        {/* Group number */}
        <span className="text-xs text-muted w-5 text-center font-bold">{index + 1}</span>

        {/* Quantity */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ quantity: Math.max(1, group.quantity - 1) })}
            className="w-7 h-7 rounded flex items-center justify-center bg-surface border border-border text-muted hover:text-white transition-colors"
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-white text-sm">
            {group.quantity}
          </span>
          <button
            onClick={() => onUpdate({ quantity: Math.min(20, group.quantity + 1) })}
            className="w-7 h-7 rounded flex items-center justify-center bg-surface border border-border text-muted hover:text-white transition-colors"
          >
            +
          </button>
        </div>

        {/* Dice Type */}
        <select
          value={group.diceType}
          onChange={(e) => onUpdate({ diceType: e.target.value as DiceType })}
          className="input text-sm py-1.5 flex-1"
        >
          {diceTypes.map((dt) => (
            <option key={dt} value={dt}>{dt}</option>
          ))}
        </select>

        {/* Remove */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-400 text-xl leading-none transition-colors px-1"
            title="Remove group"
          >
            ×
          </button>
        )}
      </div>

      {/* Modifier row */}
      <div className="flex items-center gap-2 pl-7">
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
          <button
            onClick={() => onUpdate({ modifierMode: 'total' })}
            title="Add modifier once to the group total"
            className={`px-2 py-1 transition-all ${
              group.modifierMode === 'total'
                ? 'bg-blue-700 text-white'
                : 'bg-surface text-muted hover:text-white'
            }`}
          >
            +sum
          </button>
          <button
            onClick={() => onUpdate({ modifierMode: 'per-die' })}
            title="Add modifier to each die individually"
            className={`px-2 py-1 transition-all ${
              group.modifierMode === 'per-die'
                ? 'bg-emerald-700 text-white'
                : 'bg-surface text-muted hover:text-white'
            }`}
          >
            +each
          </button>
        </div>

        {/* Modifier value */}
        <span className="text-muted text-sm">bonus</span>
        <input
          type="number"
          value={group.modifier}
          onChange={(e) => onUpdate({ modifier: Number(e.target.value) })}
          className="input w-16 text-sm py-1.5 text-center"
          placeholder="0"
        />

        {/* Preview */}
        {group.modifier !== 0 && (
          <span className="text-xs text-muted italic">
            {group.modifierMode === 'per-die'
              ? `+${group.modifier} × ${group.quantity} = +${group.modifier * group.quantity} total`
              : `+${group.modifier} to sum`}
          </span>
        )}
      </div>

      {/* Optional label */}
      <div className="pl-7">
        <input
          type="text"
          value={group.label ?? ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="input w-full text-xs py-1.5"
          placeholder="Label (optional)"
        />
      </div>
    </div>
  );
}
