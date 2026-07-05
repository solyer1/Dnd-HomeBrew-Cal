'use client';

/**
 * SettingsPanel
 * Allows user to change background image/color and its transparency.
 * Comment: "make it I can Change bg image or color and its transparency"
 */

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import type { CritTableEntry } from '@/types/config';

const PRESET_COLORS = [
  { label: 'Void',    value: '#0a0a12' },
  { label: 'Crimson', value: '#120a0a' },
  { label: 'Forest',  value: '#0a120a' },
  { label: 'Ocean',   value: '#0a0a20' },
  { label: 'Amethyst',value: '#120a18' },
  { label: 'Custom',  value: null },
];

export function SettingsPanel() {
  const { settings, updateSettings, critTable, setCritTable } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCrit, setEditingCrit] = useState(false);

  // Local crit table editing state
  const [localCrit, setLocalCrit] = useState<CritTableEntry[]>(critTable);

  const handleCritSave = () => {
    setCritTable(localCrit);
    setEditingCrit(false);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        id="settings-toggle"
        onClick={() => setIsOpen((p) => !p)}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full border border-gold-700 bg-surface/80 backdrop-blur-md flex items-center justify-center text-gold-400 hover:border-gold-400 transition-all shadow-lg"
        title="Settings"
      >
        ⚙️
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 z-50 bg-bg/95 backdrop-blur-xl border-l border-border shadow-2xl overflow-y-auto">
            <div className="p-6 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-gold-400">⚙️ Settings</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted hover:text-white transition-colors text-xl"
                >
                  ×
                </button>
              </div>

              {/* ── Background ───────────────────────────────── */}
              <section className="flex flex-col gap-3">
                <h3 className="font-semibold text-sm text-white">Background</h3>

                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    onClick={() => updateSettings({ bgMode: 'color' })}
                    className={`flex-1 py-2 text-xs font-bold transition-all
                      ${settings.bgMode === 'color' ? 'bg-gold-900 text-gold-300' : 'bg-surface text-muted'}`}
                  >
                    Color
                  </button>
                  <button
                    onClick={() => updateSettings({ bgMode: 'image' })}
                    className={`flex-1 py-2 text-xs font-bold transition-all
                      ${settings.bgMode === 'image' ? 'bg-gold-900 text-gold-300' : 'bg-surface text-muted'}`}
                  >
                    Image
                  </button>
                </div>

                {settings.bgMode === 'color' && (
                  <>
                    {/* Preset swatches */}
                    <div className="grid grid-cols-3 gap-2">
                      {PRESET_COLORS.filter((p) => p.value).map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => updateSettings({ bgColor: preset.value! })}
                          className={`h-10 rounded-lg border-2 transition-all flex items-end pb-1 px-1
                            ${settings.bgColor === preset.value ? 'border-gold-400' : 'border-border hover:border-gold-700'}`}
                          style={{ backgroundColor: preset.value! }}
                        >
                          <span className="text-xs text-white/60">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Custom color */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">Custom:</label>
                      <input
                        type="color"
                        value={settings.bgColor}
                        onChange={(e) => updateSettings({ bgColor: e.target.value })}
                        className="w-10 h-8 rounded cursor-pointer border border-border bg-surface"
                      />
                      <span className="text-xs text-muted font-mono">{settings.bgColor}</span>
                    </div>
                  </>
                )}

                {settings.bgMode === 'image' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted">Image URL</label>
                    <input
                      type="text"
                      value={settings.bgImageUrl}
                      onChange={(e) => updateSettings({ bgImageUrl: e.target.value })}
                      className="input text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                    {settings.bgImageUrl && (
                      <div
                        className="h-20 rounded-lg border border-border bg-cover bg-center"
                        style={{ backgroundImage: `url(${settings.bgImageUrl})` }}
                      />
                    )}
                  </div>
                )}

                {/* Opacity / Transparency */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-muted">Overlay Opacity</label>
                    <span className="text-xs text-white font-mono">
                      {Math.round(settings.bgOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.bgOpacity}
                    onChange={(e) => updateSettings({ bgOpacity: Number(e.target.value) })}
                    className="w-full accent-gold"
                  />
                  <div className="flex justify-between text-xs text-muted mt-0.5">
                    <span>Transparent</span>
                    <span>Opaque</span>
                  </div>
                </div>
              </section>

              {/* ── Crit Table ────────────────────────────────── */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">Critical Hit Table</h3>
                  {!editingCrit ? (
                    <button
                      onClick={() => { setLocalCrit(critTable); setEditingCrit(true); }}
                      className="btn-ghost text-xs"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleCritSave} className="btn-gold text-xs px-2 py-1">Save</button>
                      <button onClick={() => setEditingCrit(false)} className="btn-ghost text-xs">Cancel</button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {(editingCrit ? localCrit : critTable).map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/60 border border-border">
                      <div className="flex-1">
                        {editingCrit ? (
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              value={localCrit[i].minRoll}
                              onChange={(e) => {
                                const next = [...localCrit];
                                next[i] = { ...next[i], minRoll: Number(e.target.value) };
                                setLocalCrit(next);
                              }}
                              className="input w-12 text-xs py-1 text-center"
                              min={1} max={20}
                            />
                            <span className="text-muted text-xs">–</span>
                            <input
                              type="number"
                              value={localCrit[i].maxRoll}
                              onChange={(e) => {
                                const next = [...localCrit];
                                next[i] = { ...next[i], maxRoll: Number(e.target.value) };
                                setLocalCrit(next);
                              }}
                              className="input w-12 text-xs py-1 text-center"
                              min={1} max={20}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-white">{entry.minRoll}–{entry.maxRoll}</span>
                        )}
                      </div>
                      <div>
                        {editingCrit ? (
                          <input
                            type="number"
                            step={0.1}
                            value={localCrit[i].multiplier}
                            onChange={(e) => {
                              const next = [...localCrit];
                              next[i] = { ...next[i], multiplier: Number(e.target.value) };
                              setLocalCrit(next);
                            }}
                            className="input w-16 text-xs py-1 text-center"
                          />
                        ) : (
                          <span className={`text-sm font-bold ${entry.multiplier > 1 ? 'text-gold-400' : 'text-white'}`}>
                            ×{entry.multiplier}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted w-20 text-right">
                        {editingCrit ? (
                          <input
                            type="text"
                            value={localCrit[i].label ?? ''}
                            onChange={(e) => {
                              const next = [...localCrit];
                              next[i] = { ...next[i], label: e.target.value };
                              setLocalCrit(next);
                            }}
                            className="input text-xs py-1"
                            placeholder="Label"
                          />
                        ) : (
                          entry.label
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Version footer */}
              <div className="text-center text-xs text-muted pt-4 border-t border-border">
                D&D Damage Calculator v0.1
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
