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
  PartitionBreakdown
} from '@/types/damage';
import type { StatusType } from '@/types/config';
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
  if (critTable.length === 0) return { multiplier: 1, label: 'No Crit' };
  
  let entry = critTable.find(
    (e) => roll >= e.minRoll && roll <= e.maxRoll,
  );
  
  // If the roll is higher than the max of the highest tier, assign it to the highest tier
  if (!entry) {
    const highestTier = critTable[critTable.length - 1];
    if (roll > highestTier.maxRoll) {
      entry = highestTier;
    }
  }

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
  resistanceStacks: number = 1
): { multiplier: number; label: string } {
  switch (state) {
    case 'immunity':
      return { multiplier: 0, label: 'Immune (×0)' };
    case 'resistance': {
      const stacks = Math.max(1, resistanceStacks);
      const multiplier = 1 / Math.pow(2, stacks);
      return {
        multiplier,
        label: `Resistance ×${stacks} stack${stacks > 1 ? 's' : ''} (÷${Math.pow(2, stacks)})`,
      };
    }
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
  statusTypes: StatusType[] = [],
): DamageResult {
  const steps: DamageStep[] = [];

  // Step 1 — Base Damage
  const baseDamage = Math.max(0, input.baseDamage);
  steps.push({
    label: 'Base Damage',
    value: baseDamage,
    detail: `${baseDamage} raw damage`,
  });

  // Step 1.5 — Resolve Status Effects (Calculation mode only)
  const attackerStatuses = (input.attackerStatusTypeIds || [])
    .map(id => statusTypes.find(s => s.id === id))
    .filter((s): s is StatusType => s !== undefined && s.mode === 'calculation');
    
  const targetStatuses = (input.targetStatusTypeIds || [])
    .map(id => statusTypes.find(s => s.id === id))
    .filter((s): s is StatusType => s !== undefined && s.mode === 'calculation');

  const attackRollBonus = attackerStatuses.reduce((sum, s) => sum + (s.attackRollModifier || 0), 0);
  const effectiveAttackRoll = input.attackRoll + attackRollBonus;
  
  const critOverrides = attackerStatuses
    .map(s => s.critThresholdOverride)
    .filter((v): v is number => v !== undefined);
  const lowestCritThreshold = critOverrides.length > 0 ? Math.min(...critOverrides) : undefined;

  let rollForCrit = effectiveAttackRoll;
  if (lowestCritThreshold !== undefined && effectiveAttackRoll >= lowestCritThreshold) {
    // If the effective roll meets the overridden crit threshold, treat it as a max roll (20) for the crit table
    rollForCrit = 20;
  }

  // Step 2 — Critical Hit Multiplier
  const { multiplier: critMultiplier, label: critLabel } = getCritMultiplier(
    rollForCrit,
    critTable,
  );
  const afterCrit = baseDamage * critMultiplier;
  const isCrit = critMultiplier > 1;
  steps.push({
    label: 'Critical Multiplier',
    value: afterCrit,
    detail: `${baseDamage} × ${critMultiplier} — ${critLabel} (Roll: ${effectiveAttackRoll}${attackRollBonus !== 0 ? ` [${input.attackRoll}${formatSigned(attackRollBonus)}]` : ''})`,
  });

  // Step 3 — Partitions & Resistance
  const partitionBreakdowns: PartitionBreakdown[] = [];
  let totalAfterResistance = 0;

  input.damagePartitions.forEach((partition) => {
    // True damage normally ignores resistance, but we rely on user input (default resistance state)
    // If they set it to resistance, it will resist. By default they should set it to 'none'.
    const allocated = afterCrit * (partition.percentage / 100);
    const { multiplier: resMult, label: resLabel } = getResistanceMultiplier(
      partition.resistanceState,
      partition.vulnerabilityStacks,
      partition.resistanceStacks
    );
    const isImmune = partition.resistanceState === 'immunity';
    const afterResist = isImmune ? 0 : allocated * resMult;
    
    partitionBreakdowns.push({
      partition,
      allocatedDamage: allocated,
      resistanceMultiplier: resMult,
      afterResistance: afterResist,
      isImmune,
    });
    totalAfterResistance += afterResist;
  });

  steps.push({
    label: 'Damage Distribution & Resistance',
    value: totalAfterResistance,
    detail: input.damagePartitions
      .map((p, i) => `${p.percentage}% ${p.damageType} → ${roundTo(partitionBreakdowns[i].afterResistance, 1)}`)
      .join(' | '),
  });

  // Step 4 — Status Effect Multipliers
  let totalAfterStatus = totalAfterResistance;
  let statusMultiplierDetail: string[] = [];
  let combinedMultiplier = 1;

  attackerStatuses.forEach(s => {
    if (s.damageMultiplier !== 1) {
      combinedMultiplier *= s.damageMultiplier;
      statusMultiplierDetail.push(`${s.label}: ×${s.damageMultiplier}`);
    }
  });

  targetStatuses.forEach(s => {
    if (s.incomingDamageMultiplier && s.incomingDamageMultiplier !== 1) {
      combinedMultiplier *= s.incomingDamageMultiplier;
      statusMultiplierDetail.push(`${s.label} (Target): ×${s.incomingDamageMultiplier}`);
    }
  });

  if (combinedMultiplier !== 1) {
    totalAfterStatus = totalAfterResistance * combinedMultiplier;
    steps.push({
      label: 'Status Effects',
      value: totalAfterStatus,
      detail: statusMultiplierDetail.join(', '),
    });
  }

  // Step 5 — Flat Modifiers (user-defined +damage & status flat damage)
  const flatModifiers = input.modifiers.filter((m) => m.type === 'flat');
  let flatModifiersTotal = flatModifiers.reduce((sum, m) => sum + m.value, 0);
  
  let flatModifierDetails = flatModifiers.map((m) => `${m.label}: ${formatSigned(m.value)}`);

  attackerStatuses.forEach(s => {
    if (s.damageFlatModifier) {
      flatModifiersTotal += s.damageFlatModifier;
      flatModifierDetails.push(`${s.label}: ${formatSigned(s.damageFlatModifier)}`);
    }
  });

  const afterFlatModifiers = totalAfterStatus + flatModifiersTotal;
  if (flatModifierDetails.length > 0) {
    steps.push({
      label: 'Flat Modifiers',
      value: afterFlatModifiers,
      detail: flatModifierDetails.join(', '),
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

  // Step 7 — Final Damage (rounded)
  const finalDamage = Math.round(afterPercentageModifiers);
  steps.push({
    label: 'Final Damage',
    value: finalDamage,
    detail: `Rounded to nearest integer`,
  });

  const breakdown: DamageBreakdown = {
    baseDamage,
    critMultiplier,
    afterCrit: roundTo(afterCrit, 2),
    partitionBreakdowns,
    totalAfterResistance: roundTo(totalAfterResistance, 2),
    flatModifiersTotal,
    afterFlatModifiers: roundTo(afterFlatModifiers, 2),
    percentageModifiersTotal,
    afterPercentageModifiers: roundTo(afterPercentageModifiers, 2),
    finalDamage,
    isCrit,
    steps,
  };

  return { input, breakdown, finalDamage };
}
