'use client';
import { useTranslation } from '@/hooks/useTranslation';


/**
 * ModifierPanel
 * Allows users to add flat (+damage), percentage (+%), or multiplier (×N) modifiers.
 */

import React, { useState } from 'react';
import type { DamageModifier } from '@/types/damage';

type ModType = 'flat' | 'percentage' | 'multiplier';

interface Props {
  modifiers: DamageModifier[];
  onAdd: (mod: Omit<DamageModifier, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<DamageModifier>) => void;
}

const TYPE_CONFIG: Record<ModType, { label: string; badge: string; color: string; activeBg: string; activeTxt: string; borderCls: string; bgCls: string; unit: string; defaultValue: number }> = {
  flat:       { label: '+DMG',  badge: '+DMG', color: 'emerald', activeBg: 'bg-emerald-900', activeTxt: 'text-emerald-300', borderCls: 'border-emerald-600', bgCls: 'bg-emerald-950/30', unit: 'dmg', defaultValue: 0 },
  percentage: { label: '+%',   badge: '+%',   color: 'blue',    activeBg: 'bg-blue-900',    activeTxt: 'text-blue-300',    borderCls: 'border-blue-600',    bgCls: 'bg-blue-950/30',    unit: '%',   defaultValue: 0 },
  multiplier: { label: '×N',   badge: '×N',   color: 'amber',   activeBg: 'bg-amber-900',   activeTxt: 'text-amber-300',   borderCls: 'border-amber-600',   bgCls: 'bg-amber-950/30',   unit: '×',   defaultValue: 2 },
};

const TYPES: ModType[] = ['flat', 'percentage', 'multiplier'];

function cycleType(current: ModType): ModType {
  const i = TYPES.indexOf(current);
  return TYPES[(i + 1) % TYPES.length];
}

export function ModifierPanel({ modifiers, onAdd, onRemove, onUpdate }: Props) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ModType>('flat');
  const [value, setValue] = useState<number>(0);

  const handleTypeChange = (next: ModType) => {
    setType(next);
    setValue(TYPE_CONFIG[next].defaultValue);
  };

  const handleAdd = () => {
    if (value === 0 && label.trim() === '') return;
    onAdd({ label: label.trim() || TYPE_CONFIG[type].badge, type, value });
    setLabel('');
    setValue(TYPE_CONFIG[type].defaultValue);
  };

  const formatDisplayValue = (mod: DamageModifier) => {
    if (mod.type === 'flat') return `${mod.value > 0 ? '+' : ''}${mod.value} dmg`;
    if (mod.type === 'percentage') return `${mod.value > 0 ? '+' : ''}${mod.value}%`;
    return `×${mod.value}`;
  };

  return (
    <div className="card">
      <label className="label">{t('calc.modifiers')}</label>
      <p className="text-xs text-muted mb-3">
        Add flat damage bonuses, percentage multipliers, or direct ×N multipliers from buffs, conditions, etc.
      </p>

      {/* Existing modifiers */}
      {modifiers.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {modifiers.map((mod) => {
            const cfg = TYPE_CONFIG[mod.type] ?? TYPE_CONFIG.flat;
            return (
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
                {/* Type cycle button */}
                <button
                  onClick={() => onUpdate(mod.id, { type: cycleType(mod.type) })}
                  title="Click to cycle type"
                  className={`px-2 py-1 text-xs font-bold rounded border transition-all ${cfg.borderCls} ${cfg.activeTxt} ${cfg.bgCls}`}
                >
                  {cfg.badge}
                </button>
                {/* Value */}
                <input
                  type="number"
                  step={mod.type === 'multiplier' ? 0.1 : 1}
                  value={mod.value}
                  onChange={(e) => onUpdate(mod.id, { value: Number(e.target.value) })}
                  className="input w-20 text-sm py-1 text-center"
                />
                <span className="text-muted text-xs w-6 text-center">
                  {mod.type === 'multiplier' ? '×' : mod.type === 'percentage' ? '%' : 'dmg'}
                </span>
                {/* Preview */}
                <span className={`text-xs font-mono w-16 text-right ${cfg.activeTxt}`}>
                  {formatDisplayValue(mod)}
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
            );
          })}
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
          {/* 3-way type selector */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              const isActive = type === t;
              return (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all
                    ${isActive ? `${cfg.activeBg} ${cfg.activeTxt}` : 'bg-surface text-muted hover:text-white'}`}
                  title={t === 'flat' ? 'Flat damage bonus' : t === 'percentage' ? 'Percentage increase' : 'Direct multiplier (×N)'}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="number"
            step={type === 'multiplier' ? 0.1 : 1}
            min={type === 'multiplier' ? 0.1 : undefined}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="input flex-1 text-sm py-1.5"
            placeholder={type === 'flat' ? 'e.g. 5' : type === 'percentage' ? 'e.g. 20' : 'e.g. 2'}
          />
          <span className={`text-sm w-8 font-bold ${TYPE_CONFIG[type].activeTxt}`}>
            {type === 'percentage' ? '%' : type === 'multiplier' ? '×' : 'dmg'}
          </span>

          {/* Live preview */}
          {value !== 0 && (
            <span className={`text-xs font-mono px-2 py-1 rounded border ${TYPE_CONFIG[type].borderCls} ${TYPE_CONFIG[type].bgCls} ${TYPE_CONFIG[type].activeTxt}`}>
              {type === 'flat' ? `${value > 0 ? '+' : ''}${value} dmg`
               : type === 'percentage' ? `${value > 0 ? '+' : ''}${value}%`
               : `×${value}`}
            </span>
          )}

          <button
            onClick={handleAdd}
            className="btn-gold px-4 py-1.5 text-sm"
          >
            Add
          </button>
        </div>

        {/* Helper text */}
        <p className="text-[10px] text-muted/70 leading-tight">
          {type === 'flat' && 'Adds a flat amount directly to damage after resistance.'}
          {type === 'percentage' && 'Increases damage by a percentage (e.g. +20% = ×1.2).'}
          {type === 'multiplier' && 'Multiplies total damage by this factor (e.g. ×2 doubles it). Stacks multiplicatively.'}
        </p>
      </div>
    </div>
  );
}
