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
    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface/60 border border-border">
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
          onClick={() => onUpdate({ quantity: Math.min(99, group.quantity + 1) })}
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

      {/* Modifier */}
      <div className="flex items-center gap-1">
        <span className="text-muted text-sm">+</span>
        <input
          type="number"
          value={group.modifier}
          onChange={(e) => onUpdate({ modifier: Number(e.target.value) })}
          className="input w-14 text-sm py-1.5 text-center"
          placeholder="0"
        />
      </div>

      {/* Optional label */}
      <input
        type="text"
        value={group.label ?? ''}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="input hidden sm:block w-20 text-xs py-1.5"
        placeholder="Label"
      />

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
  );
}
