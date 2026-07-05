/**
 * Damage Type Configuration
 * Derived from status effects and class descriptions in dnd cal.txt.
 */

import type { DamageType } from '@/types/damage';

export interface DamageTypeConfig {
  id: DamageType;
  label: string;
  color: string;     // Tailwind text color class
  bgColor: string;   // Tailwind bg color class
  icon: string;      // emoji or icon char
}

export const DAMAGE_TYPES: DamageTypeConfig[] = [
  { id: 'physical', label: 'Physical',   color: 'text-stone-300',  bgColor: 'bg-stone-800',   icon: '⚔️' },
  { id: 'fire',     label: 'Fire',       color: 'text-orange-400', bgColor: 'bg-orange-950',  icon: '🔥' },
  { id: 'frost',    label: 'Frost',      color: 'text-blue-300',   bgColor: 'bg-blue-950',    icon: '❄️' },
  { id: 'lightning',label: 'Lightning',  color: 'text-yellow-300', bgColor: 'bg-yellow-950',  icon: '⚡' },
  { id: 'water',    label: 'Water',      color: 'text-cyan-400',   bgColor: 'bg-cyan-950',    icon: '💧' },
  { id: 'holy',     label: 'Holy',       color: 'text-amber-300',  bgColor: 'bg-amber-950',   icon: '✨' },
  { id: 'necrotic', label: 'Necrotic',   color: 'text-purple-400', bgColor: 'bg-purple-950',  icon: '💀' },
  { id: 'psychic',  label: 'Psychic',    color: 'text-pink-400',   bgColor: 'bg-pink-950',    icon: '🧠' },
  { id: 'poison',   label: 'Poison',     color: 'text-green-400',  bgColor: 'bg-green-950',   icon: '☠️' },
  { id: 'sound',    label: 'Sound',      color: 'text-teal-300',   bgColor: 'bg-teal-950',    icon: '🔊' },
  { id: 'force',    label: 'Force',      color: 'text-violet-400', bgColor: 'bg-violet-950',  icon: '💫' },
  { id: 'arcane',   label: 'Arcane',     color: 'text-indigo-400', bgColor: 'bg-indigo-950',  icon: '🌀' },
  { id: 'wind',     label: 'Wind',       color: 'text-green-300',  bgColor: 'bg-green-950',   icon: '🌪️' },
  { id: 'true',     label: 'True',       color: 'text-slate-300',  bgColor: 'bg-slate-800',   icon: '☄️' },
];

export const getDamageTypeConfig = (id: DamageType): DamageTypeConfig =>
  DAMAGE_TYPES.find((dt) => dt.id === id) ?? DAMAGE_TYPES[0];
