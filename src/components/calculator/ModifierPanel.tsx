'use client';

/**
 * ModifierPanel
 * Allows users to add flat (+damage) or percentage (+%) modifiers.
 * Comment: "make it we can add + damage or + percentage ourselves"
 */

import React, { useState } from 'react';
import type { DamageModifier } from '@/types/damage';

interface Props {
  modifiers: DamageModifier[];
  onAdd: (mod: Omit<DamageModifier, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<DamageModifier>) => void;
}

export function ModifierPanel({ modifiers, onAdd, onRemove, onUpdate }: Props) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'flat' | 'percentage'>('flat');
  const [value, setValue] = useState<number>(0);

  const handleAdd = () => {
    if (value === 0 && label.trim() === '') return;
    onAdd({ label: label.trim() || (type === 'flat' ? '+Damage' : '+%'), type, value });
    setLabel('');
    setValue(0);
  };

  return (
    <div className="card">
      <label className="label">Custom Modifiers</label>
      <p className="text-xs text-muted mb-3">
        Add flat damage bonuses or percentage multipliers from buffs, conditions, etc.
      </p>

      {/* Existing modifiers */}
      {modifiers.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {modifiers.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-surface/60 border border-border"
            >
              {/* Label editable */}
              <input
                type="text"
                value={mod.label}
                onChange={(e) => onUpdate(mod.id, { label: e.target.value })}
                className="input flex-1 text-sm py-1"
                placeholder="Label"
              />
              {/* Type toggle */}
              <button
                onClick={() => onUpdate(mod.id, { type: mod.type === 'flat' ? 'percentage' : 'flat' })}
                className={`px-2 py-1 text-xs font-bold rounded border transition-all
                  ${mod.type === 'flat'
                    ? 'border-emerald-600 text-emerald-400 bg-emerald-950/30'
                    : 'border-blue-600 text-blue-400 bg-blue-950/30'}`}
              >
                {mod.type === 'flat' ? '+DMG' : '+%'}
              </button>
              {/* Value */}
              <input
                type="number"
                value={mod.value}
                onChange={(e) => onUpdate(mod.id, { value: Number(e.target.value) })}
                className="input w-20 text-sm py-1 text-center"
              />
              <span className="text-muted text-xs">
                {mod.type === 'percentage' ? '%' : 'dmg'}
              </span>
              {/* Remove */}
              <button
                onClick={() => onRemove(mod.id)}
                className="text-red-500 hover:text-red-400 text-lg leading-none transition-colors px-1"
                title="Remove modifier"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new modifier */}
      <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface/40 border border-dashed border-border">
        <div className="text-xs text-muted font-semibold">Add Modifier</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input flex-1 text-sm py-1.5"
            placeholder="Label (e.g. Rage, Inspire)"
          />
          {/* Type selector */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setType('flat')}
              className={`px-3 py-1.5 text-xs font-bold transition-all
                ${type === 'flat' ? 'bg-emerald-900 text-emerald-300' : 'bg-surface text-muted hover:text-white'}`}
            >
              +DMG
            </button>
            <button
              onClick={() => setType('percentage')}
              className={`px-3 py-1.5 text-xs font-bold transition-all
                ${type === 'percentage' ? 'bg-blue-900 text-blue-300' : 'bg-surface text-muted hover:text-white'}`}
            >
              +%
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="input flex-1 text-sm py-1.5"
            placeholder={type === 'flat' ? 'e.g. 5' : 'e.g. 20'}
          />
          <span className="text-muted text-sm w-8">{type === 'percentage' ? '%' : 'dmg'}</span>
          <button
            onClick={handleAdd}
            className="btn-gold px-4 py-1.5 text-sm"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
