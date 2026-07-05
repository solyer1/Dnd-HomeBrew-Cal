/**
 * Dice Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * All dice-rolling logic. React components NEVER roll dice themselves.
 *
 * Supports: d4, d6, d8, d10, d12, d20, d100
 * Nat 20 glows gold, Nat 1 glows red [project spec].
 */

import type {
  DiceType,
  DiceGroup,
  IndividualRoll,
  RollGroupResult,
  RollResult,
} from '@/types/dice';
import { DICE_SIDES } from '@/types/dice';
import { randomInt } from '@/utils/math';

// ─── Single Die ───────────────────────────────────────────────────────────────

/**
 * Roll a single die with the given number of sides.
 * Returns an IndividualRoll including nat 20 / nat 1 flags.
 */
export function rollDie(sides: number): IndividualRoll {
  const value = randomInt(1, sides);
  return {
    value,
    sides,
    isNat20: sides === 20 && value === 20,
    isNat1: sides === 20 && value === 1,
  };
}

// ─── Dice Group ───────────────────────────────────────────────────────────────

/**
 * Roll all dice in a single group (e.g. 2d6+3).
 */
export function rollGroup(group: DiceGroup): RollGroupResult {
  const sides = DICE_SIDES[group.diceType];
  const rolls: IndividualRoll[] = Array.from({ length: group.quantity }, () =>
    rollDie(sides),
  );
  const subtotal = rolls.reduce((sum, r) => sum + r.value, 0);
  const total = subtotal + group.modifier;
  return { group, rolls, subtotal, total };
}

// ─── All Groups ───────────────────────────────────────────────────────────────

/**
 * Roll all dice groups and return a complete RollResult.
 */
export function rollAllGroups(groups: DiceGroup[]): RollResult {
  const groupResults: RollGroupResult[] = groups.map(rollGroup);
  const grandTotal = groupResults.reduce((sum, r) => sum + r.total, 0);
  return {
    groups: groupResults,
    grandTotal,
    timestamp: Date.now(),
  };
}

// ─── Advantage / Disadvantage ─────────────────────────────────────────────────

export type RollMode = 'normal' | 'advantage' | 'disadvantage' | 'elven_accuracy';

/**
 * Roll a d20 with advantage/disadvantage rules.
 * [dnd cal.txt lines 13–17]
 *
 * - advantage:       Roll 2d20, take highest
 * - disadvantage:    Roll 2d20, take lowest
 * - elven_accuracy:  Roll 3d20, take highest
 * - normal:          Roll 1d20
 *
 * Note: if you have any advantage AND any disadvantage, they cancel → normal.
 */
export function rollD20WithMode(
  mode: RollMode,
): { rolls: IndividualRoll[]; result: IndividualRoll } {
  const sides = 20;
  switch (mode) {
    case 'advantage': {
      const rolls = [rollDie(sides), rollDie(sides)];
      const result = rolls.reduce((best, r) =>
        r.value >= best.value ? r : best,
      );
      return { rolls, result };
    }
    case 'disadvantage': {
      const rolls = [rollDie(sides), rollDie(sides)];
      const result = rolls.reduce((worst, r) =>
        r.value <= worst.value ? r : worst,
      );
      return { rolls, result };
    }
    case 'elven_accuracy': {
      const rolls = [rollDie(sides), rollDie(sides), rollDie(sides)];
      const result = rolls.reduce((best, r) =>
        r.value >= best.value ? r : best,
      );
      return { rolls, result };
    }
    case 'normal':
    default: {
      const roll = rollDie(sides);
      return { rolls: [roll], result: roll };
    }
  }
}
