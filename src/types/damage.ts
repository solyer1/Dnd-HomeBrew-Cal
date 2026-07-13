/**
 * Damage System Types
 * Every type used by the damage engine and calculator UI.
 * Rules source: dnd cal.txt
 */

// ─── Resistance States ───────────────────────────────────────────────────────

/**
 * Resistance state for a damage instance.
 * - none:         Damage passes through unmodified.
 * - resistance:   Damage is halved (÷2). [dnd cal.txt line 9]
 * - vulnerability: Damage is doubled (×2) per stack. [dnd cal.txt line 11]
 * - immunity:     Damage is reduced to 0. [dnd cal.txt line 7]
 */
export type ResistanceState = 'none' | 'resistance' | 'vulnerability' | 'immunity';

// ─── Damage Types ─────────────────────────────────────────────────────────────

/**
 * All damage types derived from status effects and class descriptions in dnd cal.txt.
 * Extending this enum is safe and will not break the engine.
 */
export type DamageType = string;

// ─── Modifiers ────────────────────────────────────────────────────────────────

/** A single user-defined modifier that can be flat (+damage), percentage (+%), or multiplier (×N) */
export interface DamageModifier {
  id: string;
  label: string;
  type: 'flat' | 'percentage' | 'multiplier';
  value: number; // flat: raw damage; percentage: % (e.g. 20 means +20%); multiplier: factor (e.g. 2 means ×2)
}

// ─── Calculator Input ─────────────────────────────────────────────────────────

export interface DamagePartition {
  id: string;
  damageType: DamageType;
  /** Percentage of the base damage (0 to 100) */
  percentage: number;
  resistanceState: ResistanceState;
  resistanceStacks: number;
  vulnerabilityStacks: number;
}

/**
 * All inputs needed to calculate a single damage instance.
 */
export interface DamageInput {
  /** The base damage roll value before any modifiers */
  baseDamage: number;
  /** The d20 attack roll result (1–20) */
  attackRoll: number;
  /** The distribution of damage types (percentages should sum to 100) */
  damagePartitions: DamagePartition[];
  /** User-defined modifiers (flat bonus or percentage bonus) */
  modifiers: DamageModifier[];
  /** IDs of active status types applied to the attacker */
  attackerStatusTypeIds?: string[];
  /** IDs of active status types applied to the target */
  targetStatusTypeIds?: string[];
}

// ─── Calculation Breakdown ────────────────────────────────────────────────────

/** One step in the damage pipeline shown to the user */
export interface DamageStep {
  label: string;
  value: number;
  detail?: string; // e.g. "×2.5 (Natural 20)"
}

export interface PartitionBreakdown {
  partition: DamagePartition;
  allocatedDamage: number;
  resistanceMultiplier: number;
  afterResistance: number;
  isImmune: boolean;
}

/**
 * Full breakdown of every calculation step.
 * Shown in the DamageBreakdownDisplay component.
 */
export interface DamageBreakdown {
  baseDamage: number;
  critMultiplier: number;
  afterCrit: number;
  partitionBreakdowns: PartitionBreakdown[];
  totalAfterResistance: number;
  flatModifiersTotal: number;
  afterFlatModifiers: number;
  percentageModifiersTotal: number; // total % applied
  afterPercentageModifiers: number;
  multiplierModifiersTotal: number; // combined ×N factor (1 = no change)
  afterMultiplierModifiers: number;
  finalDamage: number;
  isCrit: boolean;
  steps: DamageStep[];
}

/** Full result from the damage engine */
export interface DamageResult {
  input: DamageInput;
  breakdown: DamageBreakdown;
  finalDamage: number;
}
