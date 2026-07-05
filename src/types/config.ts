/**
 * Configuration Types
 * Defines shapes for all configurable engine settings.
 */

/** A single row in the critical hit table */
export interface CritTableEntry {
  minRoll: number;
  maxRoll: number;
  /** e.g. 1, 1.5, 2, 2.5 */
  multiplier: number;
  label?: string;
}

/** Global app settings (background, theme) */
export interface AppSettings {
  /** 'color' uses a solid/gradient color; 'image' uses a URL */
  bgMode: 'color' | 'image';
  bgColor: string;
  bgImageUrl: string;
  bgOpacity: number; // 0–1
  rollSpeed: 'fast' | 'normal' | 'slow';
}
