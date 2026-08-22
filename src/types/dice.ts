/**
 * Dice System Types
 */

// ─── Dice ─────────────────────────────────────────────────────────────────────

/** All supported dice types in the RPG dice roller */
export type DiceType = 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'd10' | 'd11' | 'd12' | 'd13' | 'd14' | 'd15' | 'd16' | 'd17' | 'd18' | 'd19' | 'd20' | 'd100';

/** Sides for each dice type */
export const DICE_SIDES: Record<DiceType, number> = {
  d1: 1,
  d2: 2,
  d3: 3,
  d4: 4,
  d5: 5,
  d6: 6,
  d7: 7,
  d8: 8,
  d9: 9,
  d10: 10,
  d11: 11,
  d12: 12,
  d13: 13,
  d14: 14,
  d15: 15,
  d16: 16,
  d17: 17,
  d18: 18,
  d19: 19,
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
  /**
   * How to apply the modifier:
   * - 'total'   → added once to the group sum (default, e.g. 2d6+3 = sum+3)
   * - 'per-die' → added to each individual die roll (e.g. 2d6+3 = (d6+3)+(d6+3))
   */
  modifierMode: 'total' | 'per-die';
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
