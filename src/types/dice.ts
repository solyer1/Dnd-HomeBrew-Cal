/**
 * Dice System Types
 */

// ─── Dice ─────────────────────────────────────────────────────────────────────

/** All supported dice types in the RPG dice roller */
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

/** Sides for each dice type */
export const DICE_SIDES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

// ─── Roll Results ─────────────────────────────────────────────────────────────

/** Result of a single die roll */
export interface IndividualRoll {
  value: number;
  sides: number;
  /** True if rolled the maximum value on a d20 */
  isNat20: boolean;
  /** True if rolled 1 on a d20 */
  isNat1: boolean;
}

/** A group of dice to roll together (e.g. "2d6") */
export interface DiceGroup {
  id: string;
  diceType: DiceType;
  quantity: number;
  /** Optional flat modifier for this group (e.g. +3) */
  modifier: number;
  label?: string;
}

/** Result of rolling one DiceGroup */
export interface RollGroupResult {
  group: DiceGroup;
  rolls: IndividualRoll[];
  subtotal: number; // sum of rolls (before modifier)
  total: number;    // subtotal + modifier
}

/** Full result of rolling all groups */
export interface RollResult {
  groups: RollGroupResult[];
  /** Sum of all group totals */
  grandTotal: number;
  timestamp: number;
}

// ─── History ──────────────────────────────────────────────────────────────────

/** An entry stored in the roll history log */
export interface RollHistoryEntry {
  id: string;
  label: string;
  result: RollResult;
  timestamp: number;
}
