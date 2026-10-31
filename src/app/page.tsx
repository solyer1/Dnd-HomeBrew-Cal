'use client';

/**
 * Main Application Page
 * Tabs: Damage Calculator | Dice Roller
 * Dynamic background controlled by settings.
 */

import React, { useState, useEffect } from 'react';
import { DamageCalculator } from '@/components/calculator/DamageCalculator';
import { DiceRoller } from '@/components/dice/DiceRoller';
import { CoinFlipper } from '@/components/coins/CoinFlipper';
import { SkillPercentTab } from '@/components/skill/SkillPercentTab';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

type Tab = 'calculator' | 'dice' | 'coins' | 'skillPercent';

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
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('calculator');
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleTabSwitch(newTab: Tab) {
    setTab(newTab);
  }

  // Pre-mount SSR shell: renders clean layout with <div> tab placeholders (no buttons or inputs)
  // to prevent browser extensions & autofill from injecting fdprocessedid before React hydration
  if (!mounted) {
    return (
      <div className="relative min-h-screen" suppressHydrationWarning>
        <Background />
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 self-start md:self-auto">
                <span className="text-2xl">⚔️</span>
                <div>
                  <h1 className="font-display font-bold text-lg text-gold-400 leading-none">
                    D&D Combat Calculator
                  </h1>
                  <p className="text-xs text-muted">v0.1 — Damage & Dice</p>
                </div>
              </div>

              {/* Tab bar placeholder using divs */}
              <div className="w-full md:w-auto overflow-x-auto pb-1 -mb-1 scrollbar-hide">
                <div className="flex w-max rounded-lg overflow-hidden border border-border">
                  <div className="px-4 py-2 text-sm font-semibold bg-gold-900/60 text-gold-300 border-r border-gold-700 select-none">
                    ⚔️ Damage
                  </div>
                  <div className="px-4 py-2 text-sm font-semibold bg-surface text-muted border-r border-border select-none">
                    🎲 Dice
                  </div>
                  <div className="px-4 py-2 text-sm font-semibold bg-surface text-muted border-r border-border select-none">
                    🎯 Skill %
                  </div>
                  <div className="px-4 py-2 text-sm font-semibold bg-surface text-muted select-none">
                    Coin Toss
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
            <div className="flex items-center justify-center min-h-[360px]">
              <div className="flex flex-col items-center gap-3 text-gold-500/60">
                <span className="text-3xl animate-bounce">⚔️</span>
                <span className="font-display text-sm tracking-widest uppercase">Loading...</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" suppressHydrationWarning>
      <Background />

      {/* Settings panel */}
      <SettingsPanel />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 self-start md:self-auto">
              <span className="text-2xl">⚔️</span>
              <div>
                <h1 className="font-display font-bold text-lg text-gold-400 leading-none">
                  D&D Combat Calculator
                </h1>
                <p className="text-xs text-muted">v0.1 — Damage & Dice</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="w-full md:w-auto overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              <nav className="flex w-max rounded-lg overflow-hidden border border-border" role="tablist">
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
                  {t('tabs.damage')}
                </button>
                <button
                  id="tab-dice"
                  role="tab"
                  aria-selected={tab === 'dice'}
                  onClick={() => handleTabSwitch('dice')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200
                    ${tab === 'dice'
                      ? 'bg-gold-900/60 text-gold-300 border-r border-gold-700'
                      : 'bg-surface text-muted hover:text-white border-r border-border'}`}
                >
                  {t('tabs.dice')}
                </button>
                <button
                  id="tab-skill-percent"
                  role="tab"
                  aria-selected={tab === 'skillPercent'}
                  onClick={() => handleTabSwitch('skillPercent')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200
                    ${tab === 'skillPercent'
                      ? 'bg-gold-900/60 text-gold-300 border-r border-gold-700'
                      : 'bg-surface text-muted hover:text-white border-r border-border'}`}
                >
                  {t('tabs.skillPercent') || '🎯 Skill %'}
                </button>
                <button
                  id="tab-coins"
                  role="tab"
                  aria-selected={tab === 'coins'}
                  onClick={() => handleTabSwitch('coins')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200
                    ${tab === 'coins'
                      ? 'bg-gold-900/60 text-gold-300'
                      : 'bg-surface text-muted hover:text-white'}`}
                >
                  Coin Toss
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* ── Content ───────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          <div className={tab === 'calculator' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="tab-calculator">
            <DamageCalculator isActive={tab === 'calculator'} />
          </div>
          <div className={tab === 'dice' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="tab-dice">
            <DiceRoller isActive={tab === 'dice'} />
          </div>
          <div className={tab === 'skillPercent' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="tab-skill-percent">
            <SkillPercentTab isActive={tab === 'skillPercent'} />
          </div>
          <div className={tab === 'coins' ? 'block' : 'hidden'} role="tabpanel" aria-labelledby="tab-coins">
            <CoinFlipper />
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────── */}
        <footer className="border-t border-border bg-bg/40 py-4 px-4 text-xs text-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <span>
            D&D Damage Calculator v0.1 · Rules from{' '}
            <span className="text-gold-600">dnd cal.txt</span>
          </span>
          <span className="hidden sm:inline opacity-30">|</span>
          <a href="/guide" className="hover:text-gold-400 transition-colors flex items-center gap-1 font-semibold">
            📖 Guide
          </a>
          <span className="opacity-30">|</span>
          <a href="/admin" className="hover:text-gold-400 transition-colors flex items-center gap-1 font-semibold">
            ⚙️ Admin
          </a>
        </footer>
      </div>
    </div>
  );
}
