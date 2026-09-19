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
  /** Controls how fast the dice animation plays */
  rollSpeed: 'fast' | 'normal' | 'slow';
  /** If true, the final modified roll cannot exceed the die's natural max */
  enableDieCap: boolean;
  /** Dice rolling animation mode: 3D bird's-eye view or 2D classic overlay */
  diceAnimationMode?: '3d' | '2d';
}

// ─── Admin-managed types ─────────────────────────────────────────────────────

/**
 * A custom status type created by the admin.
 * Can be cosmetic-only OR affect damage calculations.
 */
export interface StatusType {
  id: string;
  label: string;
  /** 'emoji' uses the icon field; 'image' uses imageUrl */
  iconType: 'emoji' | 'image';
  icon: string;        // emoji char (e.g. '🔥') or fallback
  imageUrl: string;    // URL when iconType === 'image'
  color: string;       // hex or css color for badge text
  bgColor: string;     // hex or css color for badge background
  /**
   * 'cosmetic' = display only, no mechanical effect.
   * 'calculation' = affects damage math.
   */
  mode: 'cosmetic' | 'calculation';
  
  // ── Attacker modifiers ───────────────────────────────────────────────────────
  /** Modifies the attack roll itself (e.g. -5 for Blind, +4 for Inspired) */
  attackRollModifier?: number;
  /** Roll 2d20 and take the highest (e.g. Inspired). dnd cal.txt line 13. */
  advantage?: boolean;
  /** Roll 2d20 and take the lowest (e.g. Frightened). dnd cal.txt line 59. */
  disadvantage?: boolean;
  /** Adds flat damage to the final calculation */
  damageFlatModifier?: number;
  /** Replaces the required roll for a critical hit (e.g. 18 for Paralyzed) */
  critThresholdOverride?: number;
  /** Outgoing damage multiplier (e.g. 1.5) */
  damageMultiplier: number;
  
  // ── Target modifiers ─────────────────────────────────────────────────────────
  /** Incoming damage multiplier (e.g. 1.4 for Charmed) */
  incomingDamageMultiplier?: number;
  /** Attacker automatically gets advantage when attacking this target (e.g. Paralyzed) */
  targetGrantsAdvantage?: boolean;
  /** Attacker automatically scores a critical hit against this target (e.g. Paralyzed) */
  targetGrantsAutoCrit?: boolean;
  /** Damage type IDs that this target is immune to (e.g. Wet → Fire Immune) */
  immuneDamageTypes?: string[];
  /** Damage type IDs that this target resists (takes half, e.g. Wet → Fire Resistance) */
  resistDamageTypes?: string[];
  /** Damage type IDs that this target is vulnerable to (e.g. Wet → Lightning) */
  vulnDamageTypes?: string[];
}

/**
 * Full configuration for a custom Damage Type.
 */
export interface DamageTypeConfig {
  id: string;
  label: string;
  color: string;     // hex color for text (e.g. '#fb923c')
  bgColor: string;   // hex color for badge background (e.g. '#1c0900')
  iconType: 'emoji' | 'image';
  icon: string;      // emoji or icon char
  imageUrl: string;  // custom image URL
}

export interface AdminConfig {
  critTable: CritTableEntry[];
  settings: AppSettings;
  statusTypes: StatusType[];
  damageTypes: DamageTypeConfig[];
}
