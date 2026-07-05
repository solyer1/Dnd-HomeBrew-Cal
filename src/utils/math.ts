/**
 * Math Utilities
 * Small, reusable pure functions used by the engines.
 */

/** Clamp a number between min and max (inclusive) */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Round to a given number of decimal places */
export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/** Generate a random integer between min and max (inclusive) */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Generate a unique ID for list items */
export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Format a number with a sign prefix (e.g. +5, -3) */
export const formatSigned = (value: number): string =>
  value >= 0 ? `+${value}` : `${value}`;

/** Format a multiplier for display (e.g. 2.5 → "×2.5") */
export const formatMultiplier = (value: number): string => `×${value}`;
