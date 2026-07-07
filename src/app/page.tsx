'use client';

/**
 * Main Application Page
 * Tabs: Damage Calculator | Dice Roller
 * Dynamic background controlled by settings.
 */

import React, { useState, useEffect } from 'react';
import { DamageCalculator } from '@/components/calculator/DamageCalculator';
import { DiceRoller } from '@/components/dice/DiceRoller';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { useAppContext } from '@/context/AppContext';
import { useAnalytics } from '@/hooks/useAnalytics';

type Tab = 'calculator' | 'dice';

function Background() {
  const { settings } = useAppContext();
  const isImage = settings.bgMode === 'image' && settings.bgImageUrl;

  return (
    <>
      {/* Base background color / image */}
      <div
        className="fixed inset-0 z-0 transition-all duration-500"
        style={
          isImage
            ? {
                backgroundImage: `url(${settings.bgImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { backgroundColor: settings.bgColor }
        }
      />
      {/* Dark overlay for readability */}
      <div
        className="fixed inset-0 z-0 transition-all duration-500"
        style={{
          backgroundColor: `rgba(0,0,0,${1 - settings.bgOpacity})`,
        }}
      />
      {/* Subtle pattern overlay */}
      <div
        className="fixed inset-0 z-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('calculator');
  const { trackPageVisit, trackTabSwitch } = useAnalytics();

  // Track page visit once on mount
  useEffect(() => {
    trackPageVisit();
  }, [trackPageVisit]);

  function handleTabSwitch(newTab: Tab) {
    setTab(newTab);
    trackTabSwitch(newTab === 'calculator' ? '⚔️ Damage' : '🎲 Dice');
  }

  return (
    <div className="relative min-h-screen">
      <Background />

      {/* Settings panel */}
      <SettingsPanel />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <h1 className="font-display font-bold text-lg text-gold-400 leading-none">
                  D&D Combat Calculator
                </h1>
                <p className="text-xs text-muted">v0.1 — Damage & Dice</p>
              </div>
            </div>

            {/* Tab bar */}
            <nav className="flex rounded-lg overflow-hidden border border-border" role="tablist">
              <button
                id="tab-calculator"
                role="tab"
                aria-selected={tab === 'calculator'}
                onClick={() => handleTabSwitch('calculator')}
                className={`px-4 py-2 text-sm font-semibold transition-all duration-200
                  ${tab === 'calculator'
                    ? 'bg-gold-900/60 text-gold-300 border-r border-gold-700'
                    : 'bg-surface text-muted hover:text-white border-r border-border'}`}
              >
                ⚔️ Damage
              </button>
              <button
                id="tab-dice"
                role="tab"
                aria-selected={tab === 'dice'}
                onClick={() => handleTabSwitch('dice')}
                className={`px-4 py-2 text-sm font-semibold transition-all duration-200
                  ${tab === 'dice'
                    ? 'bg-gold-900/60 text-gold-300'
                    : 'bg-surface text-muted hover:text-white'}`}
              >
                🎲 Dice
              </button>
            </nav>
          </div>
        </header>

        {/* ── Content ───────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          {tab === 'calculator' ? <DamageCalculator /> : <DiceRoller />}
        </main>

        {/* ── Footer ────────────────────────────────────── */}
        <footer className="border-t border-border bg-bg/40 py-3 text-xs text-muted flex items-center justify-center gap-3">
          <span>
            D&D Damage Calculator v0.1 · Rules from{' '}
            <span className="text-gold-600">dnd cal.txt</span>
          </span>
          <span className="opacity-30">|</span>
          <a href="/admin" className="hover:text-gold-400 transition-colors flex items-center gap-1 font-semibold">
            ⚙️ Admin
          </a>
        </footer>
      </div>
    </div>
  );
}
