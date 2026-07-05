/**
 * Critical Hit Table Configuration
 * Source: dnd cal.txt lines 1–5
 *
 * This is the single source of truth for crit thresholds.
 * The UI reads from this config — never hardcoded in components.
 *
 * To customize: modify the entries below or replace via the UI settings.
 */

import type { CritTableEntry } from '@/types/config';

export const DEFAULT_CRIT_TABLE: CritTableEntry[] = [
  {
    minRoll: 1,
    maxRoll: 10,
    multiplier: 1,
    label: 'No Crit',
  },
  {
    minRoll: 11,
    maxRoll: 17,
    multiplier: 1.5,
    label: 'Minor Crit',
  },
  {
    minRoll: 18,
    maxRoll: 19,
    multiplier: 2,
    label: 'Critical Hit',
  },
  {
    minRoll: 20,
    maxRoll: 20,
    multiplier: 2.5,
    label: 'Natural 20!',
  },
];
