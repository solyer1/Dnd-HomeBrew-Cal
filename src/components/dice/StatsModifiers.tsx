'use client';

/**
 * StatsModifiers
 * Minimal, inline preset pills panel for quick stat modifiers (e.g. +1, +2, STR +3).
 * Zero popup modals: empty slots ("...") can be typed into directly inline,
 * or populated simply by clicking any row in the Ability Scores board!
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ModifierPreset } from '@/types/dice';
import { generateId } from '@/utils/math';

interface Props {
  currentModifier: number;
  onApplyModifier: (modifier: number) => void;
  presets: ModifierPreset[];
  onUpdatePresets: (presets: ModifierPreset[]) => void;
  activeSlotId?: string | null;
  onSetActiveSlotId?: (id: string | null) => void;
}

export function StatsModifiers({
  currentModifier,
  onApplyModifier,
  presets,
  onUpdatePresets,
  activeSlotId: controlledSlotId,
  onSetActiveSlotId,
}: Props) {
  const [internalSlotId, setInternalSlotId] = useState<string | null>(null);
  const activeSlotId = controlledSlotId !== undefined ? controlledSlotId : internalSlotId;

  const setActiveSlotId = (id: string | null) => {
    if (onSetActiveSlotId) {
      onSetActiveSlotId(id);
    } else {
      setInternalSlotId(id);
    }
  };

  const [inlineValue, setInlineValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSlotId) {
      const target = presets.find((p) => p.id === activeSlotId);
      setInlineValue(target && target.value !== null ? String(target.value) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeSlotId, presets]);

  const formatMod = (m: number | null) => {
    if (m === null) return '...';
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const handleCommitInline = (id: string) => {
    const trimmed = inlineValue.trim();
    if (trimmed === '') {
      // Leave empty
      setActiveSlotId(null);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed)) {
      const next = presets.map((p) =>
        p.id === id ? { ...p, value: parsed } : p
      );
      onUpdatePresets(next);
      onApplyModifier(parsed);
    }
    setActiveSlotId(null);
  };

  const handleClearSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = presets.map((p) =>
      p.id === id ? { ...p, value: null, label: '' } : p
    );
    onUpdatePresets(next);
    if (activeSlotId === id) setActiveSlotId(null);
  };

  const handleAddSlot = () => {
    if (presets.length >= 8) return;
    const newId = generateId();
    const next: ModifierPreset[] = [
      ...presets,
      { id: newId, value: null, label: '' },
    ];
    onUpdatePresets(next);
    setActiveSlotId(newId);
  };

  const handleRemoveSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (presets.length <= 1) return;
    onUpdatePresets(presets.filter((p) => p.id !== id));
    if (activeSlotId === id) setActiveSlotId(null);
  };

  const handlePillClick = (preset: ModifierPreset) => {
    if (preset.value === null) {
      // Start inline editing / board listening mode
      setActiveSlotId(preset.id);
      return;
    }
    // If clicked while already active, toggle off to 0
    if (currentModifier === preset.value) {
      onApplyModifier(0);
    } else {
      onApplyModifier(preset.value);
    }
  };

  return (
    <div className="card relative border border-gold-500/40 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h3 className="font-display font-bold text-sm text-gold-400 tracking-wide uppercase">
            Stats Modifiers
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          {activeSlotId ? (
            <span className="text-gold-300 font-semibold animate-pulse text-[11px]">
              👉 Type number or click a row on the table
            </span>
          ) : (
            <span>Click to apply to roll</span>
          )}
          {presets.length < 8 && (
            <button
              type="button"
              onClick={handleAddSlot}
              className="text-xs text-gold-400 hover:text-gold-200 border border-gold-600/50 hover:border-gold-500 rounded px-2 py-0.5 transition-colors"
              title="Add another modifier preset slot"
            >
              + Slot
            </button>
          )}
        </div>
      </div>

      {/* ── Preset Pills Row ── */}
      <div className="flex flex-wrap items-center gap-3">
        {presets.map((preset) => {
          const isEditing = activeSlotId === preset.id;
          const isAssigned = preset.value !== null;
          const isActive = isAssigned && currentModifier === preset.value;

          if (isEditing) {
            return (
              <div
                key={preset.id}
                className="relative flex items-center bg-gold-950/70 border-2 border-gold-400 rounded-full px-3 py-1 shadow-gold ring-2 ring-gold-400/40 animate-fade-in"
              >
                <span className="text-gold-300 font-bold text-sm mr-1">
                  {inlineValue.startsWith('-') ? '' : '+'}
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  placeholder="0"
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitInline(preset.id);
                    if (e.key === 'Escape') setActiveSlotId(null);
                  }}
                  onBlur={() => handleCommitInline(preset.id)}
                  className="w-12 bg-transparent text-white font-bold text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => handleCommitInline(preset.id)}
                  title="Confirm"
                  className="text-xs text-emerald-400 hover:text-emerald-300 ml-1 px-1 font-bold"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlotId(null)}
                  title="Cancel"
                  className="text-xs text-muted hover:text-white ml-0.5 px-1 font-bold"
                >
                  ×
                </button>
              </div>
            );
          }

          return (
            <div key={preset.id} className="relative group">
              <button
                type="button"
                onClick={() => handlePillClick(preset)}
                className={`
                  relative min-w-[72px] px-5 py-2 rounded-full font-bold text-sm tracking-wide transition-all duration-200 select-none flex items-center justify-center gap-1.5
                  ${
                    !isAssigned
                      ? 'border border-dashed border-border/80 text-muted/80 hover:border-gold-500 hover:text-gold-300 bg-surface/40 hover:bg-gold-900/10'
                      : isActive
                      ? 'border-2 border-gold-400 bg-gold-900/60 text-gold-300 shadow-gold scale-105 ring-2 ring-gold-400/30'
                      : 'border border-border bg-surface text-white hover:border-gold-600/70 hover:text-gold-200 hover:scale-102'
                  }
                `}
                title={
                  isAssigned
                    ? `${preset.label ? preset.label + ': ' : ''}${formatMod(preset.value)} (Click to ${isActive ? 'remove' : 'apply'})`
                    : 'Click to type inline or pick from Ability Scores board'
                }
              >
                {/* Active checkmark / indicator */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
                )}

                {/* Optional Label */}
                {preset.label && (
                  <span className="text-[11px] font-semibold text-muted uppercase">
                    {preset.label}
                  </span>
                )}

                {/* Value / "..." */}
                <span>{formatMod(preset.value)}</span>
              </button>

              {/* Edit & Clear hover buttons for assigned slots */}
              {isAssigned && (
                <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlotId(preset.id);
                    }}
                    title="Edit modifier inline"
                    className="w-5 h-5 rounded-full bg-surface2 border border-gold-600 text-gold-300 text-[10px] flex items-center justify-center hover:bg-gold-800 hover:text-white transition-colors"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleClearSlot(preset.id, e)}
                    title="Clear back to ..."
                    className="w-5 h-5 rounded-full bg-surface2 border border-red-700 text-red-400 text-[10px] flex items-center justify-center hover:bg-red-900 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Remove slot entirely if extra empty slot */}
              {!isAssigned && presets.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveSlot(preset.id, e)}
                  title="Remove empty slot"
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-surface2 border border-border text-muted text-[9px] items-center justify-center hover:text-white hover:border-red-500"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
