/**
 * Skill Percent & Outcome Table Types
 */

export interface SkillOutcome {
  id: string;
  label: string;
  percentage: number; // e.g. 25 (means 25%)
  color: string;      // HEX color code for wheel slice & badge
  bonusDamage?: number;
  notes?: string;
}

export interface SkillPercentPreset {
  id: string;
  name: string;
  description?: string;
  outcomes: SkillOutcome[];
}

export interface SkillRollHistoryEntry {
  id: string;
  timestamp: number;
  skillName: string;
  rollNumber: number; // 1–100
  winningOutcome: SkillOutcome;
}
