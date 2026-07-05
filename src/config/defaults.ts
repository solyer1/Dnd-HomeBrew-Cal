/**
 * Default Application Settings
 */

import type { AppSettings } from '@/types/config';
import type { DamageInput } from '@/types/damage';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  bgMode: 'color',
  bgColor: '#0a0a12',
  bgImageUrl: '',
  bgOpacity: 0.85,
};

export const DEFAULT_DAMAGE_INPUT: DamageInput = {
  baseDamage: 10,
  attackRoll: 15,
  damageType: 'physical',
  resistanceState: 'none',
  vulnerabilityStacks: 1,
  modifiers: [],
};

export const MAX_ROLL_HISTORY = 20;
