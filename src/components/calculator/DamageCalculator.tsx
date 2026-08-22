'use client';
import { useTranslation } from '@/hooks/useTranslation';
import { useHoldAction } from '@/hooks/useHoldAction';

/**
 * DamageCalculator
 * Main calculator UI with embedded dice roller (popup animation).
 * ZERO combat logic — all math is in damageEngine.ts.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { DamageInput, DamageModifier, ResistanceState, DamageType, DamagePartition } from '@/types/damage';
import { calculateDamage } from '@/engine/damageEngine';
import { useAppContext } from '@/context/AppContext';
import { DEFAULT_DAMAGE_INPUT } from '@/config/defaults';
import { DamageBreakdownDisplay } from './DamageBreakdownDisplay';
import { ModifierPanel } from './ModifierPanel';
import { generateId } from '@/utils/math';
import { DiceThrowOverlay } from './DiceThrowOverlay';
import { rollAllGroups } from '@/engine/diceEngine';
import type { DiceGroup } from '@/types/dice';

const RESISTANCE_OPTIONS: { value: ResistanceState; label: string; color: string }[] = [
  { value: 'none',          label: 'None',          color: 'text-gray-300' },
  { value: 'resistance',    label: 'Resistance',    color: 'text-blue-400' },
  { value: 'vulnerability', label: 'Vulnerability', color: 'text-red-400'  },
  { value: 'immunity',      label: 'Immunity',      color: 'text-purple-400' },
];

const DICE_OPTIONS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd100'];

type RollTarget = 'baseDamage' | 'attackRoll';

// ─── Floating Particle ───────────────────────────────────────────────────────
function FloatingParticle({ value, x, y, onDone }: { value: number; x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed pointer-events-none z-[200] font-display font-bold text-gold-300 animate-float-up select-none"
      style={{ left: x, top: y, fontSize: '1.5rem' }}
    >
      {value}
    </div>
  );
}

// ─── Dice Roll Popup Modal ───────────────────────────────────────────────────
interface PopupState {
  values: number[];
  total: number;
  modifier: number;
  diceType: string;
  visible: boolean;
  exiting: boolean;
  target: RollTarget;
}

function DicePopup({
  state,
  onApply,
  onClose,
}: {
  state: PopupState;
  onApply: (value: number, target: RollTarget) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isAttack = state.target === 'attackRoll';
  const finalVal = isAttack ? Math.min(20, Math.max(1, state.total)) : state.total;
  const max = parseInt(state.diceType.replace('d', ''), 10) || 20;
  const hasNat20 = state.diceType === 'd20' && state.values.includes(20);
  const hasNat1 = state.diceType === 'd20' && state.values.includes(1);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center animate-backdrop`}
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`relative bg-surface border-2 rounded-2xl p-6 w-80 shadow-2xl flex flex-col gap-4
          ${hasNat20 ? 'border-gold-400 shadow-gold' : hasNat1 ? 'border-red-500' : 'border-gold-700'}
          ${state.exiting ? 'animate-popup-exit' : 'animate-popup-appear'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-gold-400 text-base">
            {state.values.length}{state.diceType}
            {state.modifier !== 0 ? (state.modifier > 0 ? `+${state.modifier}` : state.modifier) : ''}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Nat callout */}
        {hasNat20 && (
          <div className="text-center py-1 rounded-lg bg-gold-900/50 border border-gold-600 animate-pulse">
            <span className="text-gold-400 font-display font-bold text-sm">{t('calc.nat20star')}</span>
          </div>
        )}
        {hasNat1 && (
          <div className="text-center py-1 rounded-lg bg-red-950/40 border border-red-700">
            <span className="text-red-400 font-display font-bold text-sm">💀 {t('calc.critFail')}</span>
          </div>
        )}

        {/* Dice chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {state.values.map((v, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-display font-bold text-xl border-2 transition-all
                ${v === max && state.diceType !== 'd100' ? 'border-gold-400 bg-gold-900 text-gold-300 shadow-gold' :
                  v === 1 && state.diceType !== 'd100' ? 'border-red-500 bg-red-950 text-red-400' :
                  'border-border bg-surface2 text-white'}`}
              style={{ animation: `chip-tumble 0.45s ease-in-out ${i * 0.08}s 1` }}
            >
              {v}
            </span>
          ))}
          {state.modifier !== 0 && (
            <span className="inline-flex items-center justify-center px-3 h-12 rounded-xl font-bold text-sm border-2 border-blue-700 bg-blue-950 text-blue-300">
              {state.modifier > 0 ? '+' : ''}{state.modifier}
            </span>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-gold-950/50 border border-gold-700">
          <span className="text-sm text-gold-400 font-semibold">Total</span>
          <span className="font-display font-bold text-4xl text-gold-300">{state.total}</span>
        </div>

        {/* Apply buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onApply(state.total, 'baseDamage'); onClose(); }}
            className="btn-gold text-xs py-2.5"
          >
            ⚔️ → Base Damage
          </button>
          <button
            onClick={() => { onApply(state.total, 'attackRoll'); onClose(); }}
            className="btn-ghost text-xs py-2.5"
          >
            🎯 → Attack Roll {isAttack && finalVal !== state.total ? `(${finalVal})` : ''}
          </button>
        </div>

        <p className="text-xs text-muted text-center">{t('calc.clickOutside')}</p>
      </div>
    </div>
  );
}

// ─── Inline Dice Roller (with popup) ─────────────────────────────────────────
function MiniDiceRoller({ onApply }: { onApply: (value: number, target: RollTarget) => void }) {
  const { t } = useTranslation();
  const [diceType, setDiceType] = useState('d8');
  const [quantity, setQuantity] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [modifierMode, setModifierMode] = useState<'total' | 'per-die'>('total');
  const [isRolling, setIsRolling] = useState(false);
  const [scramblingValues, setScramblingValues] = useState<number[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [particles, setParticles] = useState<{ id: string; value: number; x: number; y: number }[]>([]);
  const rollBtnRef = useRef<HTMLButtonElement>(null);
  
  const decrementQuantity = useHoldAction(() => setQuantity(q => Math.max(1, q - 1)), 300, 50);
  const incrementQuantity = useHoldAction(() => setQuantity(q => q + 1), 300, 50);

  const doRoll = useCallback(async () => {
    if (isRolling) return;
    setIsRolling(true);

    const max = parseInt(diceType.replace('d', ''), 10) || 20;
    const qty = Math.max(1, quantity);

    // Start scrambling
    setScramblingValues(Array.from({ length: qty }, () => Math.floor(Math.random() * max) + 1));
    let count = 0;
    const scramble = setInterval(() => {
      setScramblingValues(Array.from({ length: qty }, () => Math.floor(Math.random() * max) + 1));
      if (++count > 14) clearInterval(scramble);
    }, 45);

    await new Promise(r => setTimeout(r, 700));
    clearInterval(scramble);

    // Real roll — use the engine so per-die mode is calculated correctly
    const group: DiceGroup = {
      id: 'mini',
      diceType: diceType as DiceGroup['diceType'],
      quantity: qty,
      modifier,
      modifierMode,
      label: '',
    };
    const result = rollAllGroups([group]);
    const realValues = result.groups[0].rolls.map(r => r.value);
    const total = result.grandTotal;

    setScramblingValues(realValues);
    setIsRolling(false);

    // Spawn floating particles from button position
    if (rollBtnRef.current) {
      const rect = rollBtnRef.current.getBoundingClientRect();
      const newParticles = realValues.slice(0, 4).map((v, i) => ({
        id: generateId(),
        value: v,
        x: rect.left + rect.width / 2 + (i - 1.5) * 30,
        y: rect.top,
      }));
      setParticles(p => [...p, ...newParticles]);
    }

    // Show popup
    setPopup({
      values: realValues,
      total,
      modifier,
      diceType,
      visible: true,
      exiting: false,
      target: 'baseDamage',
    });
  }, [isRolling, diceType, quantity, modifier, modifierMode]);

  const closePopup = useCallback(() => {
    setPopup(p => p ? { ...p, exiting: true } : null);
    setTimeout(() => setPopup(null), 250);
  }, []);

  return (
    <>
      {/* Particles */}
      {particles.map(p => (
        <FloatingParticle
          key={p.id}
          value={p.value}
          x={p.x}
          y={p.y}
          onDone={() => setParticles(prev => prev.filter(x => x.id !== p.id))}
        />
      ))}

      {/* Popup */}
      {popup && (
        <DicePopup state={popup} onApply={onApply} onClose={closePopup} />
      )}

      <div className="flex flex-col gap-3">
        {/* Config row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quantity */}
          <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg px-2 py-1">
            <button
              {...decrementQuantity}
              className="w-6 h-6 flex items-center justify-center text-muted hover:text-white font-bold text-base transition-colors select-none"
            >−</button>
            <input
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setQuantity(isNaN(val) ? 0 : Math.max(0, val));
              }}
              onBlur={() => {
                if (!quantity || quantity < 1) setQuantity(1);
              }}
              className="w-10 py-0.5 text-center font-bold text-sm text-white bg-transparent border border-transparent focus:border-gold-500 focus:outline-none rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              {...incrementQuantity}
              className="w-6 h-6 flex items-center justify-center text-muted hover:text-white font-bold text-base transition-colors select-none"
            >+</button>
          </div>

          {/* Dice type grid */}
          <div className="flex flex-wrap gap-1">
            {DICE_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDiceType(d)}
                className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all
                  ${diceType === d
                    ? 'border-gold-500 bg-gold-900/50 text-gold-300'
                    : 'border-border bg-surface text-muted hover:border-gold-700 hover:text-white'}`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Modifier + mode toggle */}
          <div className="flex items-center gap-1 ml-auto">
            {/* +sum / +each toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
              <button
                onClick={() => setModifierMode('total')}
                title="Add modifier once to the total"
                className={`px-2 py-1 transition-all ${
                  modifierMode === 'total'
                    ? 'bg-blue-700 text-white'
                    : 'bg-surface text-muted hover:text-white'
                }`}
              >{t('calc.modSum')}</button>
              <button
                onClick={() => setModifierMode('per-die')}
                title="Add modifier to each individual die"
                className={`px-2 py-1 transition-all ${
                  modifierMode === 'per-die'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-surface text-muted hover:text-white'
                }`}
              >{t('calc.modEach')}</button>
            </div>
            <span className="text-xs text-muted">{t('calc.bonusWord')}</span>
            <input
              type="number"
              value={modifier}
              onChange={e => setModifier(Number(e.target.value))}
              className="input py-1 text-xs w-14 text-center"
            />
          </div>
        </div>

        {/* Current scrambling dice preview */}
        {scramblingValues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] items-center">
            {scramblingValues.map((v, i) => (
              <span
                key={i}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-display font-bold text-sm border-2 transition-all duration-100
                  ${isRolling ? 'border-gold-600/70 bg-gold-900/50 text-gold-400 animate-chip-tumble' : 'border-border bg-surface text-white'}`}
                style={isRolling ? { animationDelay: `${i * 0.05}s` } : {}}
              >
                {v}
              </span>
            ))}
            {modifier !== 0 && !isRolling && (
              <span className="inline-flex items-center justify-center px-2 h-9 rounded-lg font-bold text-xs border-2 border-blue-700 bg-blue-950 text-blue-300">
                {modifier > 0 ? '+' : ''}{modifier}
              </span>
            )}
          </div>
        )}

        {/* Roll button */}
        <button
          ref={rollBtnRef}
          disabled={isRolling}
          onClick={doRoll}
          className={`w-full py-3 rounded-xl font-display font-bold text-base border-2 transition-all duration-200
            ${isRolling
              ? 'border-gold-700 bg-gold-900/20 text-gold-600 cursor-not-allowed'
              : 'border-gold-500 bg-gold-900/30 text-gold-300 hover:bg-gold-800/40 hover:shadow-gold active:scale-95'}`}
        >
          {isRolling ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">🎲</span>
              <span className="animate-pulse">Rolling {quantity}{diceType}{modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}${modifierMode === 'per-die' ? ' each' : ''}` : ''}…</span>
              <span className="animate-spin" style={{ animationDirection: 'reverse' }}>🎲</span>
            </span>
          ) : (
            `🎲 Roll ${quantity}${diceType}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) + (modifierMode === 'per-die' ? ' each' : '') : ''}`
          )}
        </button>
      </div>
    </>
  );
}

// ─── Main Calculator ──────────────────────────────────────────────────────────
export function DamageCalculator() {
  const { critTable, pendingDice, consumePendingDice, settings, statusTypes, damageTypes } = useAppContext();
  const { t } = useTranslation();

  const [input, setInput] = useState<DamageInput>(DEFAULT_DAMAGE_INPUT);

  // Base Damage local dice config
  const [baseQty, setBaseQty] = useState(1);
  const [baseType, setBaseType] = useState('d20');
  const [baseModifier, setBaseModifier] = useState(0);
  const [baseModifierMode, setBaseModifierMode] = useState<'total' | 'per-die'>('total');

  // Attack Roll modifier config
  const [attackModifier, setAttackModifier] = useState(0);
  const [hasRolledAttack, setHasRolledAttack] = useState(false);

  // Dice throw overlay state
  const [throwOverlay, setThrowOverlay] = useState<{
    target: RollTarget;
    values: number[];
    total: number;
    diceType: string;
    isNat20?: boolean;
    isNat1?: boolean;
    modifiers?: number[];
  } | null>(null);

  const triggerThrow = useCallback((target: RollTarget) => {
    if (target === 'attackRoll') {
      // Roll 2d20 if advantage or disadvantage is active
      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;
      
      // Pick the right die based on rollMode (need to access it — recompute inline)
      const activeAttacker = (input.attackerStatusTypeIds || [])
        .map(id => statusTypes.find(s => s.id === id))
        .filter((s): s is (typeof statusTypes)[0] => s !== undefined);
      const activeTarget = (input.targetStatusTypeIds || [])
        .map(id => statusTypes.find(s => s.id === id))
        .filter((s): s is (typeof statusTypes)[0] => s !== undefined);
      const hasAdv = activeAttacker.some(s => s.advantage) || activeTarget.some(s => s.targetGrantsAdvantage);
      const hasDis = activeAttacker.some(s => s.disadvantage);
      const mode = hasAdv && !hasDis ? 'advantage' : hasDis && !hasAdv ? 'disadvantage' : 'normal';

      const roll = mode === 'advantage' ? Math.max(roll1, roll2)
        : mode === 'disadvantage' ? Math.min(roll1, roll2)
        : roll1;
      
      const rawTotal = roll + attackModifier;
      const total = settings.enableDieCap 
        ? Math.min(20, Math.max(1, rawTotal))
        : Math.max(1, rawTotal);
      
      setThrowOverlay({
        target,
        values: mode !== 'normal' ? [roll1, roll2] : [roll],
        total: total,
        diceType: 'd20',
        isNat20: roll === 20,
        isNat1: roll === 1,
        modifiers: [attackModifier],
      });
    } else {
      // Use the engine so per-die modifier is correctly applied
      const group: DiceGroup = {
        id: 'calc-base',
        diceType: baseType as DiceGroup['diceType'],
        quantity: Math.max(1, baseQty),
        modifier: baseModifier,
        modifierMode: baseModifierMode,
        label: '',
      };
      const result = rollAllGroups([group], settings.enableDieCap);
      const rolls = result.groups[0].rolls.map(r => r.value);
      
      setThrowOverlay({
        target,
        values: rolls,
        total: result.grandTotal,
        diceType: baseType,
        modifiers: rolls.map(() => {
          if (baseModifierMode === 'per-die') return baseModifier;
          if (baseQty === 1) return baseModifier;
          return 0;
        }),
      });
    }
  }, [baseQty, baseType, baseModifier, baseModifierMode, settings.enableDieCap, attackModifier, throwOverlay]);

  const handleThrowComplete = useCallback(() => {
    if (!throwOverlay) return;
    if (throwOverlay.target === 'attackRoll') setHasRolledAttack(true);
    const newInput = {
      ...input,
      [throwOverlay.target]: throwOverlay.target === 'attackRoll'
        ? Math.min(20, Math.max(1, throwOverlay.values[0]))
        : throwOverlay.total,
    };
    setInput(newInput);
    setThrowOverlay(null);
  }, [throwOverlay, input, attackModifier, settings.enableDieCap, critTable, statusTypes]);

  // Receive value from Dice tab
  useEffect(() => {
    if (pendingDice !== null) {
      const { value, target } = pendingDice;
      if (target === 'attack') setHasRolledAttack(true);
      
      setThrowOverlay({
        target: target === 'attack' ? 'attackRoll' : 'baseDamage',
        values: [value],
        total: value,
        diceType: target === 'attack' ? 'd20' : 'Total',
        isNat20: target === 'attack' && value >= 20,
        isNat1: target === 'attack' && value <= 1,
      });
      consumePendingDice();
    }
  }, [pendingDice, consumePendingDice]);

  const effectiveAttackRoll = settings.enableDieCap 
    ? Math.min(20, Math.max(1, input.attackRoll + attackModifier))
    : Math.max(1, input.attackRoll + attackModifier);

  // Derive advantage/disadvantage from active statuses (dnd cal.txt line 13-17)
  const activeAttackerStatuses = (input.attackerStatusTypeIds || [])
    .map(id => statusTypes.find(s => s.id === id))
    .filter((s): s is (typeof statusTypes)[0] => s !== undefined);
  const activeTargetStatuses = (input.targetStatusTypeIds || [])
    .map(id => statusTypes.find(s => s.id === id))
    .filter((s): s is (typeof statusTypes)[0] => s !== undefined);

  const hasAdvantage = activeAttackerStatuses.some(s => s.advantage) || activeTargetStatuses.some(s => s.targetGrantsAdvantage);
  const hasDisadvantage = activeAttackerStatuses.some(s => s.disadvantage);
  // Advantage + Disadvantage cancel out per dnd cal.txt line 15
  const rollMode: 'advantage' | 'disadvantage' | 'normal' =
    hasAdvantage && !hasDisadvantage ? 'advantage' :
    hasDisadvantage && !hasAdvantage ? 'disadvantage' : 'normal';
    
  const result = useMemo(() => calculateDamage({ ...input, attackRoll: effectiveAttackRoll }, critTable, statusTypes), [input, effectiveAttackRoll, critTable, statusTypes]);

  const update = useCallback(<K extends keyof DamageInput>(key: K, value: DamageInput[K]) => {
    setInput(prev => ({ ...prev, [key]: value }));
  }, []);

  // Partition helpers
  const addPartition = useCallback(() => {
    const firstType = damageTypes[0]?.id ?? 'physical';
    setInput(prev => ({
      ...prev,
      damagePartitions: [
        ...prev.damagePartitions,
        { id: generateId(), damageType: firstType, percentage: 0, resistanceState: 'none', resistanceStacks: 1, vulnerabilityStacks: 1 }
      ]
    }));
  }, [damageTypes]);

  const removePartition = useCallback((id: string) => {
    setInput(prev => ({ ...prev, damagePartitions: prev.damagePartitions.filter(p => p.id !== id) }));
  }, []);

  const updatePartition = useCallback((id: string, patch: Partial<DamagePartition>) => {
    setInput(prev => ({ ...prev, damagePartitions: prev.damagePartitions.map(p => p.id === id ? { ...p, ...patch } : p) }));
  }, []);

  const addModifier = useCallback((mod: Omit<DamageModifier, 'id'>) => {
    setInput(prev => ({ ...prev, modifiers: [...prev.modifiers, { ...mod, id: generateId() }] }));
  }, []);

  const removeModifier = useCallback((id: string) => {
    setInput(prev => ({ ...prev, modifiers: prev.modifiers.filter(m => m.id !== id) }));
  }, []);

  const updateModifier = useCallback((id: string, patch: Partial<DamageModifier>) => {
    setInput(prev => ({ ...prev, modifiers: prev.modifiers.map(m => m.id === id ? { ...m, ...patch } : m) }));
  }, []);

  const toggleAttackerStatusType = useCallback((id: string) => {
    setInput(prev => {
      const active = prev.attackerStatusTypeIds || [];
      if (active.includes(id)) {
        return { ...prev, attackerStatusTypeIds: active.filter(x => x !== id) };
      }
      return { ...prev, attackerStatusTypeIds: [...active, id] };
    });
  }, []);

  const toggleTargetStatusType = useCallback((id: string) => {
    setInput(prev => {
      const active = prev.targetStatusTypeIds || [];
      if (active.includes(id)) {
        return { ...prev, targetStatusTypeIds: active.filter(x => x !== id) };
      }
      return { ...prev, targetStatusTypeIds: [...active, id] };
    });
  }, []);



  const { breakdown } = result;
  const isCrit = breakdown.isCrit;
  const totalPercentage = input.damagePartitions.reduce((sum, p) => sum + p.percentage, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚔️</span>
          <div>
            <h2 className="font-display text-xl font-bold text-gold-400">{t('calc.title')}</h2>
            <p className="text-xs text-muted">{t('calc.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Inputs ── */}
        <div className="flex flex-col gap-4">

          {/* Base Damage */}
          <div className="card relative overflow-hidden">

            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{t('calc.baseDamage')}</label>
              <div className="flex items-center gap-1 bg-surface2 border border-border rounded overflow-hidden">
                <input
                  type="number"
                  min={1}
                  value={baseQty}
                  onChange={e => setBaseQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-8 text-center text-xs bg-transparent py-1 outline-none font-bold text-white"
                />
                <select
                  value={baseType}
                  onChange={e => setBaseType(e.target.value)}
                  className="text-xs bg-transparent py-1 outline-none text-muted hover:text-white cursor-pointer pr-1"
                >
                  {DICE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <button
                  onClick={() => triggerThrow('baseDamage')}
                  disabled={throwOverlay !== null}
                  className="text-xs text-gold-400 bg-gold-900/30 hover:bg-gold-900/50 px-2 py-1 border-l border-border transition-colors disabled:opacity-40 font-semibold"
                >{'🎲 ' + t('calc.roll')}</button>
              </div>
            </div>

            {/* Bonus modifier row */}
            <div className="flex items-center gap-2 mb-3">
              {/* +sum / +each toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
                <button
                  onClick={() => setBaseModifierMode('total')}
                  title={t('calc.modSumDesc')}
                  className={`px-2 py-1 transition-all ${
                    baseModifierMode === 'total'
                      ? 'bg-blue-700 text-white'
                      : 'bg-surface text-muted hover:text-white'
                  }`}
                >{t('calc.modSum')}</button>
                <button
                  onClick={() => setBaseModifierMode('per-die')}
                  title={t('calc.modEachDesc')}
                  className={`px-2 py-1 transition-all ${
                    baseModifierMode === 'per-die'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-surface text-muted hover:text-white'
                  }`}
                >{t('calc.modEach')}</button>
              </div>
              <span className="text-xs text-muted">{t('calc.bonusWord')}</span>
              <input
                type="number"
                value={baseModifier}
                onChange={e => setBaseModifier(Number(e.target.value))}
                className="input w-16 text-xs py-1 text-center"
                placeholder="0"
              />
              {baseModifier !== 0 && (
                <span className="text-xs text-muted italic">
                  {baseModifierMode === 'per-die'
                    ? `(+${baseModifier} × ${baseQty} dice = +${baseModifier * baseQty} total)`
                    : `(+${baseModifier} to sum)`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                id="base-damage"
                type="number"
                min={0}
                value={input.baseDamage}
                onChange={e => update('baseDamage', Math.max(0, Number(e.target.value)))}
                className="input flex-1 text-2xl font-bold text-center"
                placeholder="0"
              />
              <div className="text-center w-24">
                <div className={`text-3xl font-display font-bold transition-all duration-300
                  ${isCrit ? 'text-gold-400 drop-shadow-[0_0_8px_rgba(201,168,76,0.5)] scale-110' : 'text-white'}`}>
                  {breakdown.finalDamage}
                </div>
                <div className="text-xs text-muted">Final</div>
              </div>
            </div>
          </div>

          {/* Attack Roll */}
          <div className="card relative overflow-hidden">

            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">
                Attack Roll (d20)
                {isCrit && (
                  <span className="ml-2 text-xs text-gold-400 font-semibold animate-pulse">
                    ⚡ {breakdown.critMultiplier > 2 ? 'NATURAL 20!' : breakdown.critMultiplier > 1.5 ? 'CRITICAL!' : 'CRIT HIT'}
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {rollMode === 'advantage' && (
                  <span className="text-xs font-bold text-gold-300 bg-gold-900/40 border border-gold-700 px-2 py-0.5 rounded-full animate-pulse">
                    ⬆️ ADV
                  </span>
                )}
                {rollMode === 'disadvantage' && (
                  <span className="text-xs font-bold text-red-300 bg-red-900/30 border border-red-700 px-2 py-0.5 rounded-full animate-pulse">
                    ⬇️ DIS
                  </span>
                )}
                {hasAdvantage && hasDisadvantage && (
                  <span className="text-xs text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
                    ADV+DIS = Normal
                  </span>
                )}
                <button
                  onClick={() => triggerThrow('attackRoll')}
                  disabled={throwOverlay !== null}
                  className="btn-ghost text-xs disabled:opacity-40"
                >{'🎲 ' + t('calc.roll') + ' d20' + (rollMode !== 'normal' ? ` (2d20 ${rollMode === 'advantage' ? 'High' : 'Low'})` : '')}</button>
              </div>
            </div>

            {/* Bonus modifier row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted font-semibold">{t('calc.bonusToHit')}</span>
              <input
                type="number"
                value={attackModifier}
                onChange={e => setAttackModifier(Number(e.target.value))}
                className="input w-16 text-xs py-1 text-center"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="attack-roll"
                type="range"
                min={settings.enableDieCap ? Math.min(20, Math.max(1, 1 + attackModifier)) : Math.max(1, 1 + attackModifier)}
                max={settings.enableDieCap ? 20 : Math.max(1, 20 + attackModifier)}
                value={effectiveAttackRoll}
                onChange={e => {
                  setHasRolledAttack(true);
                  const newTotal = Number(e.target.value);
                  const raw = newTotal - attackModifier;
                  update('attackRoll', Math.min(20, Math.max(1, raw)));
                }}
                className="flex-1 accent-gold"
              />
              <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-300
                ${!hasRolledAttack ? 'bg-surface border-border opacity-50' :
                  effectiveAttackRoll >= 20 ? 'bg-gold-900 border-gold-400 shadow-gold' :
                  input.attackRoll === 1  ? 'bg-red-950 border-red-500' :
                  effectiveAttackRoll >= 20 ? 'bg-amber-950 border-amber-500' :
                  'bg-surface border-border'}`}
              >
                <div className={`font-display font-bold text-2xl leading-none
                  ${!hasRolledAttack ? 'text-muted' :
                    effectiveAttackRoll >= 20 ? 'text-gold-300' :
                    input.attackRoll === 1 ? 'text-red-400' :
                    effectiveAttackRoll >= 20 ? 'text-amber-300' : 'text-white'}`}
                >
                  {!hasRolledAttack ? '—' : effectiveAttackRoll}
                </div>
                {hasRolledAttack && attackModifier !== 0 && (
                  <div className={`text-[10px] font-semibold mt-0.5 leading-none
                    ${input.attackRoll === 20 ? 'text-gold-500' :
                      input.attackRoll === 1 ? 'text-red-500' :
                      effectiveAttackRoll >= 20 ? 'text-amber-500/70' : 'text-muted'}`}
                  >
                    ({input.attackRoll} {attackModifier > 0 ? '+' : ''}{attackModifier})
                  </div>
                )}
              </div>
            </div>
            {/* Crit tiers */}
            <div className="mt-2 flex gap-1">
              {critTable.map((tier, idx) => {
                // If it's the highest tier in the table, let it catch any rolls that go over (if cap is off)
                const isHighestTier = idx === critTable.length - 1;
                const isActive = effectiveAttackRoll >= tier.minRoll && (effectiveAttackRoll <= tier.maxRoll || (isHighestTier && effectiveAttackRoll > tier.maxRoll));
                const r = tier.minRoll === tier.maxRoll ? `${tier.minRoll}` : `${tier.minRoll}-${tier.maxRoll}`;
                return (
                  <div key={`${r}-${idx}`}
                    className={`flex-1 text-center py-1 rounded text-xs transition-all duration-200
                      ${isActive ? 'bg-gold-900 text-gold-300 border border-gold-600 shadow-[0_0_10px_rgba(250,212,0,0.2)]' : 'bg-surface/60 text-muted border border-border'}`}
                  >
                    <div className="font-bold">×{tier.multiplier}</div>
                    <div className="opacity-70 text-[10px]">{r}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attacker Status Effects */}
          {statusTypes.length > 0 && (
            <div className="card flex flex-col gap-3">
              <label className="label mb-0">Attacker Status Effects</label>
              <div className="flex flex-wrap gap-2">
                {statusTypes.map(st => {
                  const isActive = (input.attackerStatusTypeIds || []).includes(st.id);
                  return (
                    <button
                      key={st.id}
                      onClick={() => toggleAttackerStatusType(st.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm
                        ${isActive
                          ? 'border-gold-500 bg-gold-900/40 text-gold-300 shadow-[0_0_8px_rgba(201,168,76,0.3)]'
                          : 'border-border bg-surface/50 text-muted hover:border-gold-700/50 hover:text-white'}`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded overflow-hidden" style={{ background: st.bgColor, color: st.color, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {st.iconType === 'image' && st.imageUrl
                          ? <img src={st.imageUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs">{st.icon}</span>}
                      </span>
                      <span className="font-semibold">{st.label}</span>
                      {st.mode === 'calculation' && (
                        <span className={`text-[10px] ml-1 ${isActive ? 'text-gold-400' : 'text-muted'}`}>
                          {st.attackRollModifier ? ` (Hit ${st.attackRollModifier > 0 ? '+' : ''}${st.attackRollModifier})` : ''}
                          {st.damageFlatModifier ? ` (DMG ${st.damageFlatModifier > 0 ? '+' : ''}${st.damageFlatModifier})` : ''}
                          {st.damageMultiplier !== 1 ? ` (×${st.damageMultiplier})` : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Status Effects */}
          {statusTypes.length > 0 && (
            <div className="card flex flex-col gap-3">
              <label className="label mb-0">{t('calc.targetStatusEffects')}</label>
              <div className="flex flex-wrap gap-2">
                {statusTypes.map(st => {
                  const isActive = (input.targetStatusTypeIds || []).includes(st.id);
                  return (
                    <button
                      key={st.id}
                      onClick={() => toggleTargetStatusType(st.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm
                        ${isActive
                          ? 'border-blue-500 bg-blue-900/30 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                          : 'border-border bg-surface/50 text-muted hover:border-blue-700/50 hover:text-white'}`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded overflow-hidden" style={{ background: st.bgColor, color: st.color, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {st.iconType === 'image' && st.imageUrl
                          ? <img src={st.imageUrl} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xs">{st.icon}</span>}
                      </span>
                      <span className="font-semibold">{st.label}</span>
                      {st.mode === 'calculation' && st.incomingDamageMultiplier !== undefined && st.incomingDamageMultiplier !== 1 && (
                        <span className={`text-[10px] ml-1 ${isActive ? 'text-blue-400' : 'text-muted'}`}>
                          (×{st.incomingDamageMultiplier})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Damage Partitions */}
          <div className="card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="label mb-0">{t('calc.distribution')}</label>
              <button onClick={addPartition} className="btn-ghost text-xs">{t('calc.addPartition')}</button>
            </div>

            {totalPercentage !== 100 && (
              <div className="text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-800 flex items-center justify-between">
                <span>⚠ Total must be 100% (currently {totalPercentage}%)</span>
                <button
                  onClick={() => {
                    const each = Math.floor(100 / input.damagePartitions.length);
                    const rem = 100 - each * input.damagePartitions.length;
                    setInput(prev => ({
                      ...prev,
                      damagePartitions: prev.damagePartitions.map((p, i) => ({ ...p, percentage: i === 0 ? each + rem : each }))
                    }));
                  }}
                  className="btn-ghost text-xs border-red-700 text-red-400 ml-2"
                >
                  Auto-Fix
                </button>
              </div>
            )}

            {input.damagePartitions.map(partition => {
              const cfg = damageTypes.find(d => d.id === partition.damageType);
              return (
                <div key={partition.id}
                  className="p-3 bg-surface/50 border border-border rounded-xl flex flex-col gap-3 relative"
                  style={{ borderLeftWidth: '3px', borderLeftColor: 'transparent' }}
                >
                  {/* Colored left accent via CSS variable trick */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: cfg ? 'currentColor' : 'transparent', opacity: 0.6 }}
                  />

                  {input.damagePartitions.length > 1 && (
                    <button
                      onClick={() => removePartition(partition.id)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-950/30 rounded transition-all"
                    >×</button>
                  )}

                  <div className="flex items-end gap-2 pr-6">
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-xs text-muted">Damage Type</span>
                      <div className="flex items-center gap-2">
                        {cfg && (
                          cfg.iconType === 'image' && cfg.imageUrl ? (
                            <div className="w-7 h-7 flex-shrink-0 rounded bg-surface border border-border overflow-hidden flex items-center justify-center">
                              <img src={cfg.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 flex-shrink-0 rounded bg-surface border border-border flex items-center justify-center text-lg">
                              {cfg.icon}
                            </div>
                          )
                        )}
                        <select
                          value={partition.damageType}
                          onChange={e => updatePartition(partition.id, { damageType: e.target.value as DamageType })}
                          className="input py-1 text-sm flex-1"
                        >
                          {damageTypes.map(dt => (
                            <option key={dt.id} value={dt.id}>{dt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="w-28 flex flex-col gap-1">
                      <span className="text-xs text-muted">{t('calc.percentageWord')}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100"
                          value={partition.percentage}
                          onChange={e => updatePartition(partition.id, { percentage: Number(e.target.value) })}
                          className="input py-1 text-sm text-center font-bold"
                        />
                        <span className="text-sm text-muted">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Target's Resistance</span>
                    <div className="grid grid-cols-4 gap-1">
                      {RESISTANCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updatePartition(partition.id, { resistanceState: opt.value })}
                          className={`py-1.5 rounded text-xs font-semibold border transition-all
                            ${partition.resistanceState === opt.value
                              ? `border-gold-500 bg-gold-900/30 ${opt.color}`
                              : 'border-border bg-surface/50 text-muted hover:border-gold-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {partition.resistanceState === 'resistance' && (
                    <div className="p-2 rounded bg-blue-950/30 border border-blue-800 flex items-center gap-2">
                      <label className="text-xs text-blue-400 whitespace-nowrap">Stacks</label>
                      <input
                        type="range" min={1} max={10}
                        value={partition.resistanceStacks ?? 1}
                        onChange={e => updatePartition(partition.id, { resistanceStacks: Number(e.target.value) })}
                        className="flex-1 accent-blue-500"
                      />
                      <span className="text-xs font-bold text-blue-400 w-12 text-right">
                        ÷{Math.pow(2, partition.resistanceStacks ?? 1)}
                      </span>
                    </div>
                  )}

                  {partition.resistanceState === 'vulnerability' && (
                    <div className="p-2 rounded bg-red-950/30 border border-red-800 flex items-center gap-2">
                      <label className="text-xs text-red-400 whitespace-nowrap">Stacks</label>
                      <input
                        type="range" min={1} max={10}
                        value={partition.vulnerabilityStacks}
                        onChange={e => updatePartition(partition.id, { vulnerabilityStacks: Number(e.target.value) })}
                        className="flex-1 accent-red"
                      />
                      <span className="text-xs font-bold text-red-400 w-12 text-right">
                        ×{Math.pow(2, partition.vulnerabilityStacks)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Modifiers */}
          <ModifierPanel
            modifiers={input.modifiers}
            onAdd={addModifier}
            onRemove={removeModifier}
            onUpdate={updateModifier}
          />
        </div>

        {/* ── Right: Breakdown ── */}
        <div className="flex flex-col gap-4">
          <DamageBreakdownDisplay result={result} isCrit={isCrit} />
        </div>
      </div>
      
      {/* ── Global Throw Overlay ── */}
      {throwOverlay && (
        <DiceThrowOverlay
          values={throwOverlay.values}
          total={throwOverlay.total}
          diceType={throwOverlay.diceType}
          label={throwOverlay.target === 'attackRoll' ? 'Attack Roll' : 'Base Damage'}
          isNat20={throwOverlay.isNat20}
          isNat1={throwOverlay.isNat1}
          modifiers={throwOverlay.modifiers}
          onComplete={handleThrowComplete}
        />
      )}
    </div>
  );
}
