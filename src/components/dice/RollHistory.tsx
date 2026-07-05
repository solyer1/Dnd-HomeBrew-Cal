'use client';

/**
 * RollHistory
 * Displays the last N rolls with collapse/expand per entry.
 */

import React, { useState } from 'react';
import type { RollHistoryEntry } from '@/types/dice';

interface Props {
  history: RollHistoryEntry[];
  onClear: () => void;
}

function HistoryEntry({ entry }: { entry: RollHistoryEntry }) {
  const [open, setOpen] = useState(false);
  const { result } = entry;
  const hasNat20 = result.groups.some((g) => g.rolls.some((r) => r.isNat20));
  const hasNat1  = result.groups.some((g) => g.rolls.some((r) => r.isNat1));

  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden
        ${hasNat20 ? 'border-gold-700 bg-gold-950/10' :
          hasNat1  ? 'border-red-800 bg-red-950/10' :
          'border-border bg-surface/40'}`}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${hasNat20 ? 'text-gold-400' : hasNat1 ? 'text-red-400' : 'text-white'}`}>
            {entry.label}
          </span>
          {hasNat20 && <span className="text-xs text-gold-500">⭐ Nat 20</span>}
          {hasNat1  && <span className="text-xs text-red-500">💀 Nat 1</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-display font-bold text-lg ${hasNat20 ? 'text-gold-300' : hasNat1 ? 'text-red-400' : 'text-white'}`}>
            {result.grandTotal}
          </span>
          <span className="text-muted text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2">
          {result.groups.map((gr, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-muted">
                {gr.group.quantity}{gr.group.diceType}
                {gr.group.modifier !== 0 ? (gr.group.modifier > 0 ? `+${gr.group.modifier}` : gr.group.modifier) : ''}:
              </span>
              {gr.rolls.map((r, ri) => (
                <span
                  key={ri}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border
                    ${r.isNat20 ? 'border-gold-500 bg-gold-950 text-gold-300' :
                      r.isNat1  ? 'border-red-600 bg-red-950 text-red-400' :
                      'border-border bg-surface text-white'}`}
                >
                  {r.value}
                </span>
              ))}
              <span className="text-xs text-muted">= <span className="text-white font-bold">{gr.total}</span></span>
            </div>
          ))}
          <div className="text-xs text-muted mt-1">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

export function RollHistory({ history, onClear }: Props) {
  if (history.length === 0) {
    return (
      <div className="card text-center py-6 text-muted text-sm">
        <div className="text-2xl mb-2 opacity-30">📜</div>
        No roll history yet
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-sm font-bold text-gold-400">
          📜 Roll History ({history.length})
        </h3>
        <button onClick={onClear} className="btn-ghost text-xs text-red-500 hover:text-red-400">
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {history.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
