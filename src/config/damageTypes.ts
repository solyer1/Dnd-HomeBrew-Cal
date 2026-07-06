/**
 * Damage Type Configuration
 * Derived from status effects and class descriptions in dnd cal.txt.
 */

import type { DamageTypeConfig } from '@/types/config';

export const DEFAULT_DAMAGE_TYPES: DamageTypeConfig[] = [
  { id: 'physical',  label: 'Physical',   color: '#cbd5e1', bgColor: '#1c1917', iconType: 'emoji', icon: '⚔️', imageUrl: '' },
  { id: 'fire',      label: 'Fire',       color: '#fb923c', bgColor: '#1c0900', iconType: 'emoji', icon: '🔥', imageUrl: '' },
  { id: 'frost',     label: 'Frost',      color: '#93c5fd', bgColor: '#0c1a2e', iconType: 'emoji', icon: '❄️', imageUrl: '' },
  { id: 'lightning', label: 'Lightning',  color: '#fde047', bgColor: '#1c1400', iconType: 'emoji', icon: '⚡', imageUrl: '' },
  { id: 'water',     label: 'Water',      color: '#22d3ee', bgColor: '#0c1e22', iconType: 'emoji', icon: '💧', imageUrl: '' },
  { id: 'holy',      label: 'Holy',       color: '#fcd34d', bgColor: '#1c1200', iconType: 'emoji', icon: '✨', imageUrl: '' },
  { id: 'necrotic',  label: 'Necrotic',   color: '#c084fc', bgColor: '#180c2e', iconType: 'emoji', icon: '💀', imageUrl: '' },
  { id: 'psychic',   label: 'Psychic',    color: '#f472b6', bgColor: '#1c0818', iconType: 'emoji', icon: '🧠', imageUrl: '' },
  { id: 'poison',    label: 'Poison',     color: '#4ade80', bgColor: '#071a0a', iconType: 'emoji', icon: '☠️', imageUrl: '' },
  { id: 'sound',     label: 'Sound',      color: '#5eead4', bgColor: '#0c1c1c', iconType: 'emoji', icon: '🔊', imageUrl: '' },
  { id: 'force',     label: 'Force',      color: '#a78bfa', bgColor: '#120c2a', iconType: 'emoji', icon: '💫', imageUrl: '' },
  { id: 'arcane',    label: 'Arcane',     color: '#818cf8', bgColor: '#0c0e2e', iconType: 'emoji', icon: '🌀', imageUrl: '' },
  { id: 'wind',      label: 'Wind',       color: '#86efac', bgColor: '#071a0f', iconType: 'emoji', icon: '🌪️', imageUrl: '' },
  { id: 'true',      label: 'True',       color: '#e2e8f0', bgColor: '#1e293b', iconType: 'emoji', icon: '☄️', imageUrl: '' },
];
