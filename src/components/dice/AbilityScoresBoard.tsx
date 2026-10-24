'use client';

/**
 * AbilityScoresBoard
 * Reference table for standard D&D 5e Ability Scores and Modifiers.
 * Interactive: clicking any row applies the modifier to the active dice group,
 * and allows easily saving to a Stats Modifier preset slot.
 */

import React, { useState, useEffect } from 'react';

export interface AbilityScoreEntry {
  score: string;
  modifier: number;
}

export const LEFT_SCORES: AbilityScoreEntry[] = [
  { score: '1',     modifier: -5 },
  { score: '2–3',   modifier: -4 },
  { score: '4–5',   modifier: -3 },
  { score: '6–7',   modifier: -2 },
  { score: '8–9',   modifier: -1 },
  { score: '10–11', modifier: 0 },
  { score: '12–13', modifier: 1 },
  { score: '14–15', modifier: 2 },
];

export const RIGHT_SCORES: AbilityScoreEntry[] = [
  { score: '16–17', modifier: 3 },
  { score: '18–19', modifier: 4 },
  { score: '20–21', modifier: 5 },
  { score: '22–23', modifier: 6 },
  { score: '24–25', modifier: 7 },
  { score: '26–27', modifier: 8 },
  { score: '28–29', modifier: 9 },
  { score: '30',    modifier: 10 },
];

interface Props {
  currentModifier: number;
  onSelectModifier: (modifier: number) => void;
  onAddToPreset?: (modifier: number) => void;
  position?: 'left' | 'right';
  onTogglePosition?: () => void;
}

export function AbilityScoresBoard({
  currentModifier,
  onSelectModifier,
  onAddToPreset,
  position = 'right',
  onTogglePosition,
}: Props) {
  const [theme, setTheme] = useState<'parchment' | 'dark'>('dark');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [customScore, setCustomScore] = useState<string>('');

  // Restore theme preference from localStorage on mount (defaults to dark)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dnd_ability_board_theme');
      if (saved === 'parchment' || saved === 'dark') {
        setTheme(saved);
      }
    } catch {}
  }, []);

  const handleSetTheme = (newTheme: 'parchment' | 'dark') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('dnd_ability_board_theme', newTheme);
    } catch {}
  };

  const formatMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);

  const handleRowClick = (mod: number, scoreLabel: string) => {
    onSelectModifier(mod);
    setFeedback(`Applied ${formatMod(mod)} (Score ${scoreLabel})`);
    setTimeout(() => setFeedback(null), 1800);
  };

  const handleCustomApply = () => {
    const num = parseInt(customScore, 10);
    if (!isNaN(num)) {
      const mod = Math.floor((num - 10) / 2);
      onSelectModifier(mod);
      setFeedback(`Applied ${formatMod(mod)} (Score ${num})`);
      setTimeout(() => setFeedback(null), 1800);
    }
  };

  const isParchment = theme === 'parchment';

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border shadow-xl overflow-hidden select-none ${
        isParchment
          ? 'bg-[#faf8f0] border-[#c8beaa] text-[#1f2920] shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
          : 'bg-surface border-border text-white shadow-xl'
      }`}
    >
      {/* ── Header ── */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b gap-2 flex-wrap ${
          isParchment
            ? 'bg-[#f1ebe0] border-[#d8d0bd]'
            : 'bg-surface2/60 border-border'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <h3
            className={`font-serif font-black tracking-wider uppercase text-sm sm:text-base ${
              isParchment ? 'text-[#1d3522]' : 'text-gold-400'
            }`}
          >
            Ability Scores and Modifiers
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold ml-auto">
          {/* Position dock toggle */}
          {onTogglePosition && (
            <button
              type="button"
              onClick={onTogglePosition}
              className={`px-2 py-0.5 rounded border transition-all ${
                isParchment
                  ? 'border-[#c8beaa] text-[#3e3526] hover:bg-[#e4dcce] hover:text-[#1d3522]'
                  : 'border-border text-muted hover:text-white hover:border-gold-500'
              }`}
              title={`Move board to ${position === 'left' ? 'Right column' : 'Left column'}`}
            >
              ⇋ {position === 'left' ? 'To Right' : 'To Left'}
            </button>
          )}

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => handleSetTheme('parchment')}
            className={`px-2 py-0.5 rounded transition-all ${
              isParchment
                ? 'bg-[#29422f] text-white shadow-sm'
                : 'text-muted hover:text-white'
            }`}
            title="D&D Basic Rules Parchment Style"
          >
            Parchment
          </button>
          <button
            type="button"
            onClick={() => handleSetTheme('dark')}
            className={`px-2 py-0.5 rounded transition-all ${
              !isParchment
                ? 'bg-gold-700 text-bg shadow-sm'
                : 'text-[#665e4d] hover:text-[#1d3522]'
            }`}
            title="Dark Theme"
          >
            Dark
          </button>
        </div>
      </div>

      {/* ── Visual feedback banner ── */}
      {feedback && (
        <div className="bg-amber-500/20 text-amber-900 border-b border-amber-500/40 px-3 py-1 text-center text-xs font-bold animate-fade-in flex items-center justify-center gap-1">
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* ── Table Grid ── */}
      <div className="p-2 sm:p-3 overflow-x-auto">
        <div className="min-w-[280px] grid grid-cols-2 gap-2 text-xs sm:text-sm">
          {/* Left Column Table (Scores 1 to 15) */}
          <table className="w-full border-collapse">
            <thead>
              <tr
                className={`${
                  isParchment
                    ? 'bg-[#e4edd6] text-[#244229] border-b border-[#c8d6b8]'
                    : 'bg-surface2 text-gold-400 border-b border-border'
                }`}
              >
                <th className="py-1 px-2.5 text-center font-serif font-bold">Score</th>
                <th className="py-1 px-2.5 text-center font-serif font-bold">Modifier</th>
              </tr>
            </thead>
            <tbody>
              {LEFT_SCORES.map((item, idx) => {
                const isActive = currentModifier === item.modifier;
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={item.score}
                    onClick={() => handleRowClick(item.modifier, item.score)}
                    title={`Click to apply ${formatMod(item.modifier)} modifier to roll`}
                    className={`cursor-pointer transition-all duration-150 group ${
                      isActive
                        ? isParchment
                          ? 'bg-[#fef08a] font-bold ring-2 ring-inset ring-amber-500 text-[#78350f]'
                          : 'bg-gold-900/60 font-bold ring-2 ring-inset ring-gold-500 text-gold-200'
                        : isParchment
                        ? isEven
                          ? 'bg-[#faf8f2] hover:bg-[#fde68a]/70'
                          : 'bg-[#edf3e2] hover:bg-[#fde68a]/70'
                        : isEven
                        ? 'bg-surface/40 hover:bg-gold-900/30'
                        : 'bg-surface2/40 hover:bg-gold-900/30'
                    }`}
                  >
                    <td className="py-1.5 px-2 text-center font-medium opacity-90">
                      {item.score}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      <span className="flex items-center justify-center gap-1">
                        <span>{formatMod(item.modifier)}</span>
                        {onAddToPreset && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPreset(item.modifier);
                              setFeedback(`Pinned ${formatMod(item.modifier)} to preset slot!`);
                              setTimeout(() => setFeedback(null), 1800);
                            }}
                            title="Add to modifier presets"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-800"
                          >
                            +preset
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Right Column Table (Scores 16 to 30) */}
          <table className="w-full border-collapse">
            <thead>
              <tr
                className={`${
                  isParchment
                    ? 'bg-[#e4edd6] text-[#244229] border-b border-[#c8d6b8]'
                    : 'bg-surface2 text-gold-400 border-b border-border'
                }`}
              >
                <th className="py-1 px-2.5 text-center font-serif font-bold">Score</th>
                <th className="py-1 px-2.5 text-center font-serif font-bold">Modifier</th>
              </tr>
            </thead>
            <tbody>
              {RIGHT_SCORES.map((item, idx) => {
                const isActive = currentModifier === item.modifier;
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={item.score}
                    onClick={() => handleRowClick(item.modifier, item.score)}
                    title={`Click to apply ${formatMod(item.modifier)} modifier to roll`}
                    className={`cursor-pointer transition-all duration-150 group ${
                      isActive
                        ? isParchment
                          ? 'bg-[#fef08a] font-bold ring-2 ring-inset ring-amber-500 text-[#78350f]'
                          : 'bg-gold-900/60 font-bold ring-2 ring-inset ring-gold-500 text-gold-200'
                        : isParchment
                        ? isEven
                          ? 'bg-[#faf8f2] hover:bg-[#fde68a]/70'
                          : 'bg-[#edf3e2] hover:bg-[#fde68a]/70'
                        : isEven
                        ? 'bg-surface/40 hover:bg-gold-900/30'
                        : 'bg-surface2/40 hover:bg-gold-900/30'
                    }`}
                  >
                    <td className="py-1.5 px-2 text-center font-medium opacity-90">
                      {item.score}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold">
                      <span className="flex items-center justify-center gap-1">
                        <span>{formatMod(item.modifier)}</span>
                        {onAddToPreset && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPreset(item.modifier);
                              setFeedback(`Pinned ${formatMod(item.modifier)} to preset slot!`);
                              setTimeout(() => setFeedback(null), 1800);
                            }}
                            title="Add to modifier presets"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0.2 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-800"
                          >
                            +preset
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer: Quick Score Lookup & Hint ── */}
      <div
        className={`px-3 py-2 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
          isParchment
            ? 'bg-[#f5f0e4] border-[#d8d0bd] text-[#554d3e]'
            : 'bg-surface2/40 border-border text-muted'
        }`}
      >
        <span className="italic">
          💡 Click any row to apply its modifier to your dice roll.
        </span>

        {/* Quick Custom Score input */}
        <div className="flex items-center gap-1 ml-auto">
          <span>Custom Score:</span>
          <input
            type="number"
            min={1}
            max={50}
            placeholder="e.g. 18"
            value={customScore}
            onChange={(e) => setCustomScore(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomApply()}
            className={`w-14 px-1.5 py-0.5 rounded text-center text-xs font-bold outline-none border ${
              isParchment
                ? 'bg-white border-[#c8beaa] text-[#1f2920] focus:border-amber-600'
                : 'bg-surface border-border text-white focus:border-gold-500'
            }`}
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!customScore}
            className={`px-2 py-0.5 rounded font-bold transition-all disabled:opacity-40 ${
              isParchment
                ? 'bg-[#29422f] hover:bg-[#1d3522] text-white'
                : 'bg-gold-700 hover:bg-gold-600 text-bg'
            }`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
