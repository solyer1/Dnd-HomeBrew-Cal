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
export type DamageType =
  | 'physical'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'water'
  | 'holy'
  | 'necrotic'
  | 'psychic'
  | 'poison'
  | 'sound'
  | 'force'
  | 'arcane';

// ─── Modifiers ────────────────────────────────────────────────────────────────

/** A single user-defined modifier that can be flat (+damage) or percentage (+%) */
export interface DamageModifier {
  id: string;
  label: string;
  type: 'flat' | 'percentage';
  value: number; // flat: raw damage; percentage: % (e.g. 20 means +20%)
}

// ─── Calculator Input ─────────────────────────────────────────────────────────

/**
 * All inputs needed to calculate a single damage instance.
 */
export interface DamageInput {
  /** The base damage roll value before any modifiers */
  baseDamage: number;
  /** The d20 attack roll result (1–20) */
  attackRoll: number;
  /** Type of damage being dealt */
  damageType: DamageType;
  /** The target's resistance state against this damage type */
  resistanceState: ResistanceState;
  /**
   * Number of vulnerability stacks.
   * Each stack multiplies damage by ×2. [dnd cal.txt line 11]
   * Only relevant when resistanceState === 'vulnerability'.
   */
  vulnerabilityStacks: number;
  /** User-defined modifiers (flat bonus or percentage bonus) */
  modifiers: DamageModifier[];
}

// ─── Calculation Breakdown ────────────────────────────────────────────────────

/** One step in the damage pipeline shown to the user */
export interface DamageStep {
  label: string;
  value: number;
  detail?: string; // e.g. "×2.5 (Natural 20)"
}

/**
 * Full breakdown of every calculation step.
 * Shown in the DamageBreakdownDisplay component.
 */
export interface DamageBreakdown {
  baseDamage: number;
  critMultiplier: number;
  afterCrit: number;
  resistanceMultiplier: number;
  afterResistance: number;
  flatModifiersTotal: number;
  afterFlatModifiers: number;
  percentageModifiersTotal: number; // total % applied
  afterPercentageModifiers: number;
  finalDamage: number;
  isImmune: boolean;
  isCrit: boolean;
  steps: DamageStep[];
}

/** Full result from the damage engine */
export interface DamageResult {
  input: DamageInput;
  breakdown: DamageBreakdown;
  finalDamage: number;
}
