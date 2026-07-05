/**
 * Damage Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * The ONLY place where damage math lives. React components NEVER contain
 * combat logic — they call these functions exclusively.
 *
 * Rules source: dnd cal.txt
 * Formula (line 22): (D20 × Damage) × Vulnerability/Resistance +/- Modifiers
 *
 * Step pipeline:
 *  1. baseDamage
 *  2. × critMultiplier  (lookup critTable by attackRoll)
 *  3. × resistanceMultiplier  (immunity=0, resistance=0.5, vulnerability=2^stacks)
 *  4. + flatModifiers  (user-defined flat +damage)
 *  5. × percentageModifiers  (user-defined +% modifiers)
 *  6. Math.round() → finalDamage
 */

import type { CritTableEntry } from '@/types/config';
import type {
  DamageInput,
  DamageBreakdown,
  DamageResult,
  DamageStep,
  ResistanceState,
} from '@/types/damage';
import { roundTo, formatMultiplier, formatSigned } from '@/utils/math';

// ─── Crit Lookup ──────────────────────────────────────────────────────────────

/**
 * Look up the critical multiplier for a given d20 roll.
 * Falls back to ×1 if no matching entry is found (safe default).
 */
export function getCritMultiplier(
  roll: number,
  critTable: CritTableEntry[],
): { multiplier: number; label: string } {
  const entry = critTable.find(
    (e) => roll >= e.minRoll && roll <= e.maxRoll,
  );
  if (!entry) return { multiplier: 1, label: 'No Crit' };
  return { multiplier: entry.multiplier, label: entry.label ?? `×${entry.multiplier}` };
}

// ─── Resistance Multiplier ────────────────────────────────────────────────────

/**
 * Return the damage multiplier for a resistance state.
 *
 * Vulnerability is handled separately because it stacks:
 * each stack applies ×2. [dnd cal.txt line 11]
 *   1 stack → ×2
 *   2 stacks → ×4
 *   3 stacks → ×8
 *
 * For immunity, we return 0 to wipe all damage. [line 7]
 * For resistance, we return 0.5. [line 9]
 */
export function getResistanceMultiplier(
  state: ResistanceState,
  vulnerabilityStacks: number,
): { multiplier: number; label: string } {
  switch (state) {
    case 'immunity':
      return { multiplier: 0, label: 'Immune (×0)' };
    case 'resistance':
      return { multiplier: 0.5, label: 'Resistance (÷2)' };
    case 'vulnerability': {
      const stacks = Math.max(1, vulnerabilityStacks);
      const multiplier = Math.pow(2, stacks);
      return {
        multiplier,
        label: `Vulnerability ×${stacks} stack${stacks > 1 ? 's' : ''} (${formatMultiplier(multiplier)})`,
      };
    }
    case 'none':
    default:
      return { multiplier: 1, label: 'No modifier (×1)' };
  }
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

/**
 * Calculate final damage from a DamageInput.
 * Returns a full DamageResult including step-by-step breakdown.
 */
export function calculateDamage(
  input: DamageInput,
  critTable: CritTableEntry[],
): DamageResult {
  const steps: DamageStep[] = [];

  // Step 1 — Base Damage
  const baseDamage = Math.max(0, input.baseDamage);
  steps.push({
    label: 'Base Damage',
    value: baseDamage,
    detail: `${baseDamage} raw damage`,
  });

  // Step 2 — Critical Hit Multiplier
  const { multiplier: critMultiplier, label: critLabel } = getCritMultiplier(
    input.attackRoll,
    critTable,
  );
  const afterCrit = baseDamage * critMultiplier;
  const isCrit = critMultiplier > 1;
  steps.push({
    label: 'Critical Multiplier',
    value: afterCrit,
    detail: `${baseDamage} × ${critMultiplier} — ${critLabel} (Roll: ${input.attackRoll})`,
  });

  // Step 3 — Resistance / Vulnerability / Immunity
  const { multiplier: resistMultiplier, label: resistLabel } =
    getResistanceMultiplier(input.resistanceState, input.vulnerabilityStacks);
  const isImmune = input.resistanceState === 'immunity';
  const afterResistance = isImmune ? 0 : afterCrit * resistMultiplier;
  steps.push({
    label: 'Resistance / Vulnerability',
    value: afterResistance,
    detail: resistLabel,
  });

  // Step 4 — Flat Modifiers (user-defined +damage)
  const flatModifiers = input.modifiers.filter((m) => m.type === 'flat');
  const flatModifiersTotal = flatModifiers.reduce((sum, m) => sum + m.value, 0);
  const afterFlatModifiers = afterResistance + flatModifiersTotal;
  if (flatModifiers.length > 0) {
    steps.push({
      label: 'Flat Modifiers',
      value: afterFlatModifiers,
      detail: flatModifiers
        .map((m) => `${m.label}: ${formatSigned(m.value)}`)
        .join(', '),
    });
  }

  // Step 5 — Percentage Modifiers (user-defined +%)
  const percentageModifiers = input.modifiers.filter((m) => m.type === 'percentage');
  const percentageModifiersTotal = percentageModifiers.reduce(
    (sum, m) => sum + m.value,
    0,
  );
  // Apply as multiplicative: value × (1 + totalPercent/100)
  const afterPercentageModifiers =
    percentageModifiers.length > 0
      ? afterFlatModifiers * (1 + percentageModifiersTotal / 100)
      : afterFlatModifiers;

  if (percentageModifiers.length > 0) {
    steps.push({
      label: 'Percentage Modifiers',
      value: afterPercentageModifiers,
      detail: percentageModifiers
        .map((m) => `${m.label}: ${formatSigned(m.value)}%`)
        .join(', ') + ` (${formatSigned(percentageModifiersTotal)}% total)`,
    });
  }

  // Step 6 — Final Damage (rounded)
  const finalDamage = isImmune ? 0 : Math.round(afterPercentageModifiers);
  steps.push({
    label: 'Final Damage',
    value: finalDamage,
    detail: isImmune ? 'IMMUNE — no damage taken' : `Rounded to nearest integer`,
  });

  const breakdown: DamageBreakdown = {
    baseDamage,
    critMultiplier,
    afterCrit: roundTo(afterCrit, 2),
    resistanceMultiplier: resistMultiplier,
    afterResistance: roundTo(afterResistance, 2),
    flatModifiersTotal,
    afterFlatModifiers: roundTo(afterFlatModifiers, 2),
    percentageModifiersTotal,
    afterPercentageModifiers: roundTo(afterPercentageModifiers, 2),
    finalDamage,
    isImmune,
    isCrit,
    steps,
  };

  return { input, breakdown, finalDamage };
}
