'use client';

/**
 * SpinWheelRoller
 * Dice wheel roller for d1..d100 with advantage/disadvantage.
 * Features:
 * - User/Character Presets: Save, switch, duplicate, and delete custom wheels per player/character
 * - Clean Face Chips Selector + Dedicated Focused Inspector (no messy expanding grid)
 * - Custom colors per face (native color picker + hex input + 16 preset palette swatches)
 * - Custom Images or Emojis per face (auto-resized local upload, image URL, 40+ RPG emoji picker)
 * - Custom labels & probability sliders per piece
 * - Live Piece Preview badge with immediate visual feedback on the wheel
 * - Result popups with custom media celebration & confetti
 * - Full localStorage persistence
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { DiceType, RollResult } from '@/types/dice';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence, useAnimation, useMotionValue, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { generateId } from '@/utils/math';

const DICE_TYPES: DiceType[] = [
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10',
  'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd100'
];

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Gold
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#64748b', // Slate
  '#18181b', // Dark Obsidian
];

const COMMON_EMOJIS = [
  '⚔️', '🗡️', '🏹', '🛡️', '🔥', '❄️', '⚡', '💥', '💀', '🩸',
  '🧪', '💰', '💎', '👑', '🐉', '🐺', '🦅', '👁️', '🔮', '✨',
  '🌪️', '🌙', '☀️', '🎯', '🎲', '🧟', '🧙', '👹', '🪵', '🪨',
  '🍃', '🍖', '🍺', '📜', '⭐', '❤️', '🖤', '🍀', '🕯️', '🪄',
];

export interface SlotCustomConfig {
  color?: string;
  iconType?: 'emoji' | 'image' | 'none';
  iconValue?: string;
  label?: string;
}

export interface WheelUserPreset {
  id: string;
  name: string;
  diceType: DiceType;
  weights: Record<number, number>;
  slotConfigs: Record<number, SlotCustomConfig>;
}

const getDiceSides = (type: DiceType) => parseInt(type.substring(1), 10);

const DEFAULT_PRESETS: WheelUserPreset[] = [
  {
    id: 'preset-standard-d20',
    name: 'Standard d20',
    diceType: 'd20',
    weights: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 1])),
    slotConfigs: {
      20: { color: '#eab308', iconType: 'emoji', iconValue: '👑', label: '20' },
      1:  { color: '#ef4444', iconType: 'emoji', iconValue: '💀', label: '1' },
    },
  },
  {
    id: 'preset-crit-fumble',
    name: 'Critical & Fumble Focus',
    diceType: 'd20',
    weights: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 1])),
    slotConfigs: {
      20: { color: '#eab308', iconType: 'emoji', iconValue: '🌟', label: 'Crit 20' },
      1:  { color: '#dc2626', iconType: 'emoji', iconValue: '💀', label: 'Fail 1' },
      10: { color: '#3b82f6', iconType: 'emoji', iconValue: '⚔️', label: 'Mid 10' },
    },
  },
  {
    id: 'preset-elemental-chaos',
    name: 'Elemental Chaos Wheel',
    diceType: 'd20',
    weights: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, 1])),
    slotConfigs: {
      20: { color: '#eab308', iconType: 'emoji', iconValue: '✨', label: 'Jackpot' },
      19: { color: '#ef4444', iconType: 'emoji', iconValue: '🔥', label: 'Flame' },
      18: { color: '#06b6d4', iconType: 'emoji', iconValue: '❄️', label: 'Frost' },
      17: { color: '#8b5cf6', iconType: 'emoji', iconValue: '⚡', label: 'Shock' },
      1:  { color: '#18181b', iconType: 'emoji', iconValue: '💀', label: 'Void' },
    },
  },
];

/**
 * Resizes an uploaded image file down to max 128x128 pixels using an offscreen canvas.
 * Keeps localStorage footprint minimal (~5-15 KB per image).
 */
function resizeImageToDataUrl(file: File, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const playTick = (ctx: AudioContext) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
};

const playWinSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(523.25, now, 0.4);       // C5
    playNote(659.25, now + 0.1, 0.4); // E5
    playNote(783.99, now + 0.2, 0.6); // G5
    playNote(1046.50, now + 0.3, 1.0);// C6
  } catch {}
};

interface SpinWheelRollerProps {
  onResult: (result: RollResult, label: string) => void;
  rollMode?: 'normal' | 'advantage' | 'disadvantage';
}

interface WheelVisualProps {
  rotationValue: ReturnType<typeof useMotionValue<number>>;
  gradientParts: string[];
  sliceAngles: Array<{ slot: number; weight: number; angle: number; start: number; end: number }>;
  numSlots: number;
  arrowControls: ReturnType<typeof useAnimation>;
  slotConfigs: Record<number, SlotCustomConfig>;
  size?: number;
}

function WheelVisual({ 
  rotationValue, gradientParts, sliceAngles, numSlots, arrowControls, slotConfigs = {}, size = 380 
}: WheelVisualProps) {
  const scale = size / 380;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div 
        className="absolute inset-0" 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left', 
          left: '50%', 
          top: '50%', 
          marginLeft: -190 * scale, 
          marginTop: -190 * scale, 
          width: 380, 
          height: 380 
        }}
      >
        {/* Top Pointer Arrow */}
        <motion.div 
          animate={arrowControls}
          style={{ transformOrigin: 'top center' }}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
        >
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] relative" style={{ borderTopColor: 'var(--color-gold-600)' }}>
            <div className="absolute -top-[24px] -left-[12px] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px]" style={{ borderTopColor: 'var(--color-gold-950)' }} />
          </div>
        </motion.div>
        
        {/* Conic Gradient Wheel with custom slice colors and media */}
        <motion.div 
          className="relative rounded-full border-[6px] border-gold-600 shadow-[0_0_30px_rgba(201,168,76,0.35)] overflow-hidden"
          style={{
            width: '380px', 
            height: '380px',
            background: `conic-gradient(${gradientParts.join(', ')})`,
            rotate: rotationValue
          }}
        >
          <div className="absolute inset-2 rounded-full border border-gold-900/30 z-0 pointer-events-none" />
          
          {numSlots <= 24 && sliceAngles.map((slice, index) => {
            if (slice.weight === 0) return null;
            const rotateAngle = slice.start + (slice.angle / 2);
            const cfg = slotConfigs[slice.slot] || {};
            const hasImg = cfg.iconType === 'image' && cfg.iconValue;
            const hasEmo = (cfg.iconType === 'emoji' || !cfg.iconType) && cfg.iconValue;
            const isNarrow = slice.angle < 17;

            return (
              <div
                key={index}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ transform: `rotate(${rotateAngle}deg)` }}
              >
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center font-display font-bold text-gold-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] z-10 max-w-[65px] text-center leading-none">
                  {/* Image or Emoji */}
                  {hasImg ? (
                    <img 
                      src={cfg.iconValue} 
                      alt="" 
                      className={`${isNarrow ? 'w-4 h-4' : 'w-6 h-6'} rounded-full object-cover border border-white/80 shadow mb-0.5`}
                    />
                  ) : hasEmo ? (
                    <span className={`${isNarrow ? 'text-xs' : 'text-base'} mb-0.5 select-none drop-shadow`}>
                      {cfg.iconValue}
                    </span>
                  ) : null}

                  {/* Face Number or Label */}
                  <span className={`${isNarrow ? 'text-xs' : 'text-sm'} font-black tracking-tight text-white drop-shadow`}>
                    {cfg.label ? cfg.label : slice.slot}
                  </span>
                </div>
              </div>
            );
          })}
        </motion.div>
        
        {/* Center Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-surface border-[4px] border-gold-600 rounded-full z-20 shadow-2xl flex items-center justify-center">
          <div className="w-5 h-5 bg-gold-400 rounded-full shadow-[0_0_10px_rgba(201,168,76,0.8)]" />
        </div>
      </div>
    </div>
  );
}

export function SpinWheelRoller({ onResult, rollMode = 'normal' }: SpinWheelRollerProps) {
  const { addToHistory } = useAppContext();
  const { t } = useTranslation();
  
  const [selectedDie, setSelectedDie] = useState<DiceType>('d20');
  
  // ── Preset System ──
  const [presets, setPresets] = useState<WheelUserPreset[]>(DEFAULT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string>('preset-standard-d20');
  
  // Active selected face to inspect in the focused panel
  const [selectedFace, setSelectedFace] = useState<number>(20);
  const [iconSubTab, setIconSubTab] = useState<'emoji' | 'image' | 'none'>('emoji');

  const [isSpinning, setIsSpinning] = useState(false);
  const rotationValue = useMotionValue(0);
  const rotationValue2 = useMotionValue(0);
  const [resultPopup, setResultPopup] = useState<number | null>(null);
  const arrowControls = useAnimation();
  const arrowControls2 = useAnimation();
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetUploadSlotRef = useRef<number | null>(null);

  const [doubleWheelPopup, setDoubleWheelPopup] = useState<{
    result1: number | null;
    result2: number | null;
    finalResult: number | null;
    mode: 'advantage' | 'disadvantage';
  } | null>(null);

  // Restore presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dnd_dice_wheel_presets_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets(parsed);
          setActivePresetId(parsed[0].id);
        }
      }
    } catch {}
  }, []);

  // Save presets automatically
  useEffect(() => {
    try {
      localStorage.setItem('dnd_dice_wheel_presets_v2', JSON.stringify(presets));
    } catch {}
  }, [presets]);

  // Current active preset
  const currentPreset = useMemo(() => {
    const found = presets.find((p) => p.id === activePresetId);
    return found || presets[0] || DEFAULT_PRESETS[0];
  }, [presets, activePresetId]);

  // Synchronize die selection when switching preset
  useEffect(() => {
    if (currentPreset.diceType !== selectedDie) {
      setSelectedDie(currentPreset.diceType);
    }
  }, [currentPreset.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived slots array for current die
  const slots = useMemo(() => {
    const sides = getDiceSides(selectedDie);
    return Array.from({ length: sides }, (_, i) => i + 1);
  }, [selectedDie]);

  // Ensure selectedFace is within bounds
  useEffect(() => {
    if (!slots.includes(selectedFace)) {
      setSelectedFace(slots[slots.length - 1] || 1);
    }
  }, [slots, selectedFace]);

  const weights = currentPreset.weights || {};
  const slotConfigs = currentPreset.slotConfigs || {};

  // Preset operations
  const handleUpdateCurrentPreset = (patch: Partial<WheelUserPreset>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === currentPreset.id ? { ...p, ...patch } : p))
    );
  };

  const handleCreateNewPreset = () => {
    const newName = prompt('Enter preset name (e.g. Alice D20, Bob Rogue Wheel):', `Custom ${selectedDie} #${presets.length + 1}`);
    if (!newName) return;

    const newPreset: WheelUserPreset = {
      id: generateId(),
      name: newName.trim(),
      diceType: selectedDie,
      weights: Object.fromEntries(slots.map((s) => [s, 1])),
      slotConfigs: {
        [slots[slots.length - 1]]: { color: '#eab308', iconType: 'emoji', iconValue: '👑', label: `${slots[slots.length - 1]}` },
        1: { color: '#ef4444', iconType: 'emoji', iconValue: '💀', label: '1' },
      },
    };

    setPresets((prev) => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
  };

  const handleDuplicatePreset = () => {
    const cloned: WheelUserPreset = {
      ...currentPreset,
      id: generateId(),
      name: `Copy of ${currentPreset.name}`,
    };
    setPresets((prev) => [...prev, cloned]);
    setActivePresetId(cloned.id);
  };

  const handleDeletePreset = () => {
    if (presets.length <= 1) return;
    if (confirm(`Delete preset "${currentPreset.name}"?`)) {
      const remaining = presets.filter((p) => p.id !== currentPreset.id);
      setPresets(remaining);
      setActivePresetId(remaining[0].id);
    }
  };

  const handleRenamePreset = (newName: string) => {
    handleUpdateCurrentPreset({ name: newName });
  };

  const updateSlotConfig = (slot: number, patch: Partial<SlotCustomConfig>) => {
    const nextConfigs = {
      ...slotConfigs,
      [slot]: {
        ...(slotConfigs[slot] || {}),
        ...patch,
      },
    };
    handleUpdateCurrentPreset({ slotConfigs: nextConfigs });
  };

  const handleEqualizeWeights = () => {
    const equalWeights: Record<number, number> = {};
    slots.forEach((s) => (equalWeights[s] = 1));
    handleUpdateCurrentPreset({ weights: equalWeights });
  };

  const handleResetFaceConfigs = () => {
    if (confirm(`Reset all custom colors, emojis, and images for "${currentPreset.name}"?`)) {
      handleUpdateCurrentPreset({ slotConfigs: {} });
    }
  };

  // Image Upload handler
  const handleTriggerImageUpload = (slot: number) => {
    targetUploadSlotRef.current = slot;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slot = targetUploadSlotRef.current;
    if (!file || slot === null) return;

    try {
      const dataUrl = await resizeImageToDataUrl(file, 128);
      updateSlotConfig(slot, {
        iconType: 'image',
        iconValue: dataUrl,
      });
    } catch {
      alert('Unable to load image. Please select a valid PNG, JPG, or WEBP file.');
    }
  };

  const shuffleSlots = () => {
    if (isSpinning) return;
    const shuffled = [...slots].sort(() => Math.random() - 0.5);
    const newWeights: Record<number, number> = {};
    shuffled.forEach((s, idx) => {
      newWeights[s] = weights[slots[idx]] ?? 1;
    });
    handleUpdateCurrentPreset({ weights: newWeights });
  };

  // Calculate slice geometry based on weights
  const totalWeight = slots.reduce((sum, slot) => sum + (weights[slot] ?? 1), 0) || 1; 
  
  const handlePercentageChange = (slot: number, newP: number) => {
    const p = Math.max(0, Math.min(100, newP)) / 100;
    const othersSum = Object.entries(weights)
      .filter(([k]) => parseInt(k, 10) !== slot)
      .reduce((sum, [, w]) => sum + w, 0);

    const nextWeights = { ...weights };

    if (p === 1) {
      Object.keys(nextWeights).forEach((k) => (nextWeights[parseInt(k, 10)] = 0));
      nextWeights[slot] = 1;
    } else if (p === 0) {
      nextWeights[slot] = 0;
      if (othersSum === 0) {
        slots.forEach((s) => { if (s !== slot) nextWeights[s] = 1; });
      }
    } else {
      let S = othersSum;
      if (S === 0) {
        slots.forEach((s) => { if (s !== slot) nextWeights[s] = 1; });
        S = slots.length - 1;
      }
      nextWeights[slot] = S * (p / (1 - p));
    }

    handleUpdateCurrentPreset({ weights: nextWeights });
  };
  
  let currentAngle = 0;
  const sliceAngles = slots.map((slot) => {
    const weight = weights[slot] ?? 1;
    const angle = (weight / totalWeight) * 360;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return { slot, weight, angle, start, end };
  });

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResultPopup(null);
    
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = AudioContextClass ? new AudioContextClass() : null;

    if (rollMode === 'advantage' || rollMode === 'disadvantage') {
      setDoubleWheelPopup({ result1: null, result2: null, finalResult: null, mode: rollMode });
      
      const newRotation1 = rotationValue.get() + Math.floor(Math.random() * 360) + (5 * 360);
      const newRotation2 = rotationValue2.get() + Math.floor(Math.random() * 360) + (7 * 360);
      
      let lastSliceIndex1 = -1;
      let lastSliceIndex2 = -1;

      animate(rotationValue, newRotation1, {
        duration: 3.5, 
        ease: [0.1, 0.7, 0.1, 1],
        onUpdate: (latest) => {
          const topAngle = (360 - (latest % 360)) % 360;
          const currentSliceIndex = sliceAngles.findIndex((s) => topAngle >= s.start && topAngle < s.end);
          if (currentSliceIndex !== -1 && lastSliceIndex1 !== -1 && currentSliceIndex !== lastSliceIndex1) {
            if (ctx) playTick(ctx);
            arrowControls.start({ rotate: [0, -25, 0], transition: { duration: 0.15 } });
          }
          lastSliceIndex1 = currentSliceIndex;
        }
      });

      animate(rotationValue2, newRotation2, {
        duration: 4.5, 
        ease: [0.1, 0.7, 0.1, 1],
        onUpdate: (latest) => {
          const topAngle = (360 - (latest % 360)) % 360;
          const currentSliceIndex = sliceAngles.findIndex((s) => topAngle >= s.start && topAngle < s.end);
          if (currentSliceIndex !== -1 && lastSliceIndex2 !== -1 && currentSliceIndex !== lastSliceIndex2) {
            if (ctx) playTick(ctx);
            arrowControls2.start({ rotate: [0, -25, 0], transition: { duration: 0.15 } });
          }
          lastSliceIndex2 = currentSliceIndex;
        },
        onComplete: () => {
          setIsSpinning(false);
          const topAngle1 = (360 - (newRotation1 % 360)) % 360;
          const winningSlice1 = sliceAngles.find((s) => topAngle1 >= s.start && topAngle1 < s.end);
          const result1 = winningSlice1 ? winningSlice1.slot : slots[0];
          
          const topAngle2 = (360 - (newRotation2 % 360)) % 360;
          const winningSlice2 = sliceAngles.find((s) => topAngle2 >= s.start && topAngle2 < s.end);
          const result2 = winningSlice2 ? winningSlice2.slot : slots[0];
          
          const finalResult = rollMode === 'advantage' ? Math.max(result1, result2) : Math.min(result1, result2);
          
          setDoubleWheelPopup({ result1, result2, finalResult, mode: rollMode });
          playWinSound();
          confetti({
            particleCount: 150, 
            spread: 80, 
            origin: { y: 0.6 },
            colors: ['#c9a84c', '#e8c96a', '#a07830', '#fde68a'],
            zIndex: 1000,
          });

          const rollResult: RollResult = {
            groups: [{
              group: { id: `spin-${Date.now()}`, diceType: selectedDie, quantity: 1, modifier: 0, modifierMode: 'total', label: '' },
              rolls: [
                { value: result1, sides: slots.length, isNat20: selectedDie === 'd20' && result1 === 20, isNat1: selectedDie === 'd20' && result1 === 1, dropped: result1 !== finalResult || (result1 === result2 ? false : true) },
                { value: result2, sides: slots.length, isNat20: selectedDie === 'd20' && result2 === 20, isNat1: selectedDie === 'd20' && result2 === 1, dropped: result2 !== finalResult }
              ],
              subtotal: finalResult,
              total: finalResult
            }],
            grandTotal: finalResult,
            timestamp: Date.now()
          };
          
          const label = `Spin Wheel (${selectedDie}) with ${rollMode}`;
          onResult(rollResult, label);
          addToHistory(label, rollResult);
          
          setTimeout(() => setDoubleWheelPopup(null), 3500);
        }
      });
      return;
    }

    const currentRotation = rotationValue.get();
    const spinRotations = 5 * 360; 
    const randomRotation = Math.floor(Math.random() * 360) + spinRotations;
    const newRotation = currentRotation + randomRotation;
    
    let lastSliceIndex = -1;

    animate(rotationValue, newRotation, {
      duration: 3.5,
      ease: [0.1, 0.7, 0.1, 1],
      onUpdate: (latest) => {
        const normalizedRotation = latest % 360;
        const topAngle = (360 - normalizedRotation) % 360;
        const currentSliceIndex = sliceAngles.findIndex((s) => topAngle >= s.start && topAngle < s.end);
        
        if (currentSliceIndex !== -1 && lastSliceIndex !== -1 && currentSliceIndex !== lastSliceIndex) {
          if (ctx) playTick(ctx);
          arrowControls.start({
            rotate: [0, -25, 0],
            transition: { duration: 0.15 }
          });
        }
        lastSliceIndex = currentSliceIndex;
      },
      onComplete: () => {
        setIsSpinning(false);
        
        const normalizedRotation = newRotation % 360;
        const topAngle = (360 - normalizedRotation) % 360;
        
        const winningSlice = sliceAngles.find((s) => topAngle >= s.start && topAngle < s.end);
        const result = winningSlice ? winningSlice.slot : slots[0];
        const numSlots = slots.length;
        
        // Fire confetti and win sound
        playWinSound();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#c9a84c', '#e8c96a', '#a07830', '#fde68a']
        });
        
        const rollResult: RollResult = {
          groups: [{
            group: { id: `spin-${Date.now()}`, diceType: selectedDie, quantity: 1, modifier: 0, modifierMode: 'total', label: '' },
            rolls: [{ value: result, sides: numSlots, isNat20: selectedDie === 'd20' && result === 20, isNat1: selectedDie === 'd20' && result === 1, dropped: false }],
            subtotal: result,
            total: result
          }],
          grandTotal: result,
          timestamp: Date.now()
        };
        
        const label = `Spin Wheel (${selectedDie})`;
        onResult(rollResult, label);
        addToHistory(label, rollResult);
        
        setResultPopup(result);
        setTimeout(() => setResultPopup(null), 3000);
      }
    });
  };

  const numSlots = slots.length;
  // Default alternating dark fantasy palette
  const defaultPalette = ['#0a0a14', '#151522', '#1e1c36', '#141426'];
  
  // Custom piece colors in conic gradient
  const gradientParts = sliceAngles.map((slice, index) => {
    const startPercent = (slice.start / 360) * 100;
    const endPercent = (slice.end / 360) * 100;
    const cfg = slotConfigs[slice.slot];
    const color = cfg?.color || defaultPalette[index % defaultPalette.length];
    return `${color} ${startPercent.toFixed(2)}% ${endPercent.toFixed(2)}%`;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden File Input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Dice Selection Tabs ── */}
      <div className="flex flex-wrap gap-2 justify-center bg-surface p-2 rounded-xl border border-border">
        {DICE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => {
              if (isSpinning) return;
              setSelectedDie(type);
              handleUpdateCurrentPreset({ diceType: type });
            }}
            disabled={isSpinning}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedDie === type
                ? 'bg-gold-600 text-bg shadow-gold'
                : 'bg-bg text-muted hover:text-white hover:bg-gold-900/50'
            } ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ── User Presets Bar ── */}
      <div className="card p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-surface/90 border border-gold-800/40 shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <span>👤</span>
            <span>Player Preset:</span>
          </span>

          {/* Preset Select Dropdown */}
          <select
            value={activePresetId}
            onChange={(e) => setActivePresetId(e.target.value)}
            className="bg-surface2 text-xs font-bold text-white border border-border rounded-lg px-3 py-1.5 outline-none hover:border-gold-500 transition-colors cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.diceType})
              </option>
            ))}
          </select>

          {/* Preset Name Editor */}
          <input
            type="text"
            value={currentPreset.name}
            onChange={(e) => handleRenamePreset(e.target.value)}
            placeholder="Preset Name"
            className="input text-xs py-1 px-2.5 font-bold text-gold-300 w-44"
          />
        </div>

        {/* Preset Action Buttons */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <button
            type="button"
            onClick={handleCreateNewPreset}
            className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1 font-bold shadow"
            title="Create a new preset for a party member or custom wheel"
          >
            <span>+</span>
            <span>New Preset</span>
          </button>
          <button
            type="button"
            onClick={handleDuplicatePreset}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-surface2 border border-border text-muted hover:text-white transition-colors"
            title="Duplicate this preset"
          >
            📋 Clone
          </button>
          {presets.length > 1 && (
            <button
              type="button"
              onClick={handleDeletePreset}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-950/30 border border-red-800/50 text-red-400 hover:text-red-200 transition-colors"
              title="Delete this preset"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* ── Wheel & Roll Controls ── */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Wheel container */}
        <div className="relative flex items-center justify-center">
          <WheelVisual 
            rotationValue={rotationValue}
            gradientParts={gradientParts}
            sliceAngles={sliceAngles}
            numSlots={numSlots}
            arrowControls={arrowControls}
            slotConfigs={slotConfigs}
          />
          
          {/* Result Popup with custom color & image/emoji */}
          <AnimatePresence>
            {resultPopup !== null && (() => {
              const cfg = slotConfigs[resultPopup] || {};
              const hasImg = cfg.iconType === 'image' && cfg.iconValue;
              const hasEmo = (cfg.iconType === 'emoji' || !cfg.iconType) && cfg.iconValue;
              const badgeColor = cfg.color || '#c9a84c';

              return (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -50 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <div 
                    className="bg-surface/95 backdrop-blur-md border-[4px] rounded-3xl p-6 min-w-[180px] max-w-[260px] flex flex-col items-center justify-center shadow-[0_0_60px_rgba(201,168,76,0.8)] gap-2 animate-popup-appear"
                    style={{ borderColor: badgeColor }}
                  >
                    {hasImg ? (
                      <img 
                        src={cfg.iconValue} 
                        alt="" 
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-lg" 
                      />
                    ) : hasEmo ? (
                      <span className="text-4xl drop-shadow select-none">{cfg.iconValue}</span>
                    ) : null}

                    <span className="text-5xl font-display font-black text-white drop-shadow-[0_0_15px_rgba(253,230,138,1)]">
                      {resultPopup}
                    </span>

                    {cfg.label && (
                      <span className="text-xs font-bold text-gold-300 truncate max-w-[180px]">
                        {cfg.label}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={shuffleSlots}
            disabled={isSpinning}
            className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${
              isSpinning 
                ? 'border-gold-900 bg-gold-950/50 text-gold-800 cursor-not-allowed'
                : 'border-gold-600 bg-gold-900/30 text-gold-400 hover:bg-gold-800/40 hover:shadow-[0_0_15px_rgba(201,168,76,0.3)]'
            }`}
          >
            🔀 Shuffle Slots
          </button>
          
          <button
            onClick={spin}
            disabled={isSpinning}
            className={`py-5 px-4 rounded-xl font-display text-2xl font-bold border-2 transition-all ${
              isSpinning 
                ? 'border-gold-700 bg-gold-900/30 text-gold-600 cursor-not-allowed'
                : 'border-gold-500 bg-gold-900/30 text-gold-300 hover:bg-gold-800/40 hover:text-gold-200 hover:shadow-gold active:scale-95'
            }`}
          >
            🎲 Spin!
          </button>
        </div>
      </div>
      
      {/* ── Clean Face Chips Bar + Focused Inspector ── */}
      {numSlots <= 24 && (
        <div className="card p-4 flex flex-col gap-3.5 bg-surface/90 border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span className="font-display font-bold text-sm text-gold-400 uppercase tracking-wider">
                Wheel Faces ({slots.length})
              </span>
              <span className="text-xs text-muted hidden sm:inline">
                — Click any face to edit its color, emoji/photo & odds
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleEqualizeWeights}
                className="text-[11px] font-semibold text-muted hover:text-gold-300 border border-border px-2.5 py-1 rounded-lg transition-colors"
                title="Set all faces to equal probability"
              >
                ⚖️ Equalize (All {(100 / slots.length).toFixed(1)}%)
              </button>
              <button
                type="button"
                onClick={handleResetFaceConfigs}
                className="text-[11px] font-semibold text-muted hover:text-red-400 border border-border px-2.5 py-1 rounded-lg transition-colors"
                title="Reset all custom colors and icons for this preset"
              >
                ↺ Reset Colors
              </button>
            </div>
          </div>

          {/* Compact Face Chips Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {slots.map((slot) => {
              const cfg = slotConfigs[slot] || {};
              const isSelected = selectedFace === slot;
              const weight = weights[slot] ?? 1;
              const pct = Math.round((weight / totalWeight) * 100);
              const hasImg = cfg.iconType === 'image' && cfg.iconValue;
              const hasEmo = (cfg.iconType === 'emoji' || !cfg.iconType) && cfg.iconValue;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedFace(slot)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-gold-400 bg-gold-950/80 ring-2 ring-gold-400/70 shadow-gold scale-105 z-10'
                      : 'border-border bg-surface2/50 hover:bg-surface2 hover:border-gold-700/60'
                  }`}
                  style={{
                    borderLeftColor: cfg.color ? cfg.color : undefined,
                    borderLeftWidth: cfg.color ? '4px' : undefined,
                  }}
                >
                  {/* Top row: Color pill / icon + slot number */}
                  <div className="flex items-center gap-1.5">
                    {hasImg ? (
                      <img src={cfg.iconValue} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                    ) : hasEmo ? (
                      <span className="text-xs select-none shrink-0">{cfg.iconValue}</span>
                    ) : (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: cfg.color || defaultPalette[(slot - 1) % defaultPalette.length] }}
                      />
                    )}
                    <span className={`font-display font-bold text-xs ${isSelected ? 'text-gold-300' : 'text-white'}`}>
                      {slot}
                    </span>
                  </div>

                  {/* Bottom row: percentage */}
                  <span className="text-[10px] text-muted font-mono font-semibold mt-0.5">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Focused Face Inspector Panel (Clean, Spacious, No Staircase jumping!) ── */}
          {selectedFace !== null && (() => {
            const slot = selectedFace;
            const cfg = slotConfigs[slot] || {};
            const weight = weights[slot] ?? 1;
            const pct = Math.round((weight / totalWeight) * 100);
            const hasImg = cfg.iconType === 'image' && cfg.iconValue;
            const hasEmo = (cfg.iconType === 'emoji' || !cfg.iconType) && cfg.iconValue;
            const faceColor = cfg.color || defaultPalette[(slot - 1) % defaultPalette.length];

            const prevSlot = slot > 1 ? slot - 1 : slots[slots.length - 1];
            const nextSlot = slot < slots.length ? slot + 1 : slots[0];

            return (
              <div className="mt-2 p-4 rounded-xl bg-surface2/60 border border-gold-800/40 flex flex-col gap-4 animate-fade-in shadow-inner">
                {/* Inspector Header with Live Preview Badge and Prev/Next Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                  <div className="flex items-center gap-3.5">
                    {/* Live Piece Preview Badge */}
                    <div
                      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-lg border-2 border-white/40 shrink-0 relative overflow-hidden"
                      style={{ backgroundColor: faceColor }}
                    >
                      {hasImg ? (
                        <img src={cfg.iconValue} alt="" className="w-full h-full object-cover" />
                      ) : hasEmo ? (
                        <span className="text-xl select-none drop-shadow">{cfg.iconValue}</span>
                      ) : null}
                      <span className="text-[11px] font-black text-white drop-shadow font-display leading-none">
                        {cfg.label ? cfg.label : slot}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-base text-gold-300">
                          Editing Face {slot}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border font-mono font-bold text-white">
                          Chance: {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        Customize color, emoji/photo, custom name, and odds for this piece
                      </p>
                    </div>
                  </div>

                  {/* Quick Prev / Next Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFace(prevSlot)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-muted hover:text-white transition-colors"
                    >
                      ◀ Face {prevSlot}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFace(nextSlot)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-muted hover:text-white transition-colors"
                    >
                      Face {nextSlot} ▶
                    </button>
                  </div>
                </div>

                {/* 3 Clean Columns: 1. Color, 2. Media (Emoji/Image), 3. Label & Probability */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Column 1: Color Picker */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-border">
                    <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                      🎨 Piece Color
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Native Color Picker Swatch */}
                      <label
                        className="relative w-8 h-8 rounded-lg border-2 border-white/50 cursor-pointer overflow-hidden shadow shrink-0 hover:scale-105 transition-transform"
                        style={{ backgroundColor: faceColor }}
                        title="Click to pick custom color"
                      >
                        <input
                          type="color"
                          value={faceColor}
                          onChange={(e) => updateSlotConfig(slot, { color: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>

                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-xs text-muted font-mono">HEX:</span>
                        <input
                          type="text"
                          value={cfg.color || ''}
                          onChange={(e) => updateSlotConfig(slot, { color: e.target.value })}
                          placeholder={defaultPalette[(slot - 1) % defaultPalette.length]}
                          className="input text-xs font-mono py-1 px-2 flex-1 uppercase"
                        />
                      </div>
                    </div>

                    {/* Quick 16 Palette Swatches */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateSlotConfig(slot, { color: c })}
                          className={`w-5 h-5 rounded-md border transition-transform ${
                            faceColor.toLowerCase() === c.toLowerCase()
                              ? 'scale-125 border-white ring-2 ring-gold-400 z-10'
                              : 'border-white/20 hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Media (Emoji / Image) */}
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                        😀 Icon or Photo
                      </span>
                      <div className="flex rounded overflow-hidden border border-border text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setIconSubTab('emoji');
                            updateSlotConfig(slot, { iconType: 'emoji' });
                          }}
                          className={`px-2 py-0.5 ${iconSubTab === 'emoji' ? 'bg-gold-700 text-bg font-bold' : 'bg-surface text-muted'}`}
                        >
                          Emoji
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIconSubTab('image');
                            updateSlotConfig(slot, { iconType: 'image' });
                          }}
                          className={`px-2 py-0.5 ${iconSubTab === 'image' ? 'bg-gold-700 text-bg font-bold' : 'bg-surface text-muted'}`}
                        >
                          Image
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSlotConfig(slot, { iconType: 'none', iconValue: '' })}
                          className="px-2 py-0.5 bg-surface text-muted hover:text-white"
                          title="Remove icon"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {iconSubTab === 'emoji' ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-8 gap-1 p-1.5 bg-surface2 rounded border border-border max-h-24 overflow-y-auto">
                          {COMMON_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => updateSlotConfig(slot, { iconType: 'emoji', iconValue: em })}
                              className={`w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gold-900/40 hover:scale-110 transition-all ${
                                cfg.iconValue === em ? 'bg-gold-900/70 ring-1 ring-gold-400' : ''
                              }`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={cfg.iconType === 'emoji' ? cfg.iconValue || '' : ''}
                          onChange={(e) => updateSlotConfig(slot, { iconType: 'emoji', iconValue: e.target.value })}
                          placeholder="Type any emoji (e.g. 🐉)"
                          className="input text-xs py-1"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTriggerImageUpload(slot)}
                            className="btn-gold text-xs py-1.5 px-2.5 shrink-0"
                          >
                            📁 Upload Photo
                          </button>
                          <input
                            type="url"
                            value={cfg.iconType === 'image' ? cfg.iconValue || '' : ''}
                            onChange={(e) => updateSlotConfig(slot, { iconType: 'image', iconValue: e.target.value })}
                            placeholder="or paste Image URL..."
                            className="input flex-1 text-xs py-1"
                          />
                        </div>
                        {hasImg && (
                          <div className="flex items-center justify-between p-1.5 bg-surface2 border border-border rounded">
                            <div className="flex items-center gap-2">
                              <img src={cfg.iconValue} alt="" className="w-7 h-7 rounded object-cover border border-white/40" />
                              <span className="text-xs text-white font-semibold">Active Photo</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateSlotConfig(slot, { iconType: 'none', iconValue: '' })}
                              className="text-xs text-red-400 hover:text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column 3: Label & Probability Slider */}
                  <div className="flex flex-col gap-3 p-3 rounded-lg bg-surface border border-border">
                    <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                      🏷️ Label & Probability
                    </span>

                    {/* Custom Label */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-muted">Custom Label / Skill Name:</span>
                      <input
                        type="text"
                        value={cfg.label || ''}
                        onChange={(e) => updateSlotConfig(slot, { label: e.target.value })}
                        placeholder={`Default: ${slot}`}
                        className="input text-xs py-1"
                      />
                    </div>

                    {/* Probability slider & input */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Chance on Wheel:</span>
                        <div className="flex items-center gap-1 bg-surface2 border border-border rounded px-1.5 py-0.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={pct}
                            onChange={(e) => handlePercentageChange(slot, parseInt(e.target.value, 10) || 0)}
                            className="w-10 text-right bg-transparent font-bold text-xs text-white outline-none"
                          />
                          <span className="text-muted font-bold">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={pct}
                        onChange={(e) => handlePercentageChange(slot, parseInt(e.target.value, 10) || 0)}
                        className="w-full accent-gold-500 cursor-pointer h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Double Wheel Popup Overlay for Advantage / Disadvantage */}
      <AnimatePresence>
        {doubleWheelPopup !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ backgroundColor: 'rgba(10, 10, 18, 0.85)', backdropFilter: 'blur(6px)' }}
          >
            <div className="text-gold-400 font-display font-bold text-2xl uppercase tracking-widest mb-10 drop-shadow-md">
              Rolling with {doubleWheelPopup.mode === 'advantage' ? 'Advantage' : 'Disadvantage'}
            </div>
            
            <div className="flex items-center justify-center gap-8 w-full max-w-4xl px-4">
              <div className={`transition-all duration-1000 ${doubleWheelPopup.finalResult !== null && doubleWheelPopup.result1 !== doubleWheelPopup.finalResult ? 'opacity-30 grayscale scale-75' : 'scale-100'}`}>
                <WheelVisual 
                  rotationValue={rotationValue}
                  gradientParts={gradientParts}
                  sliceAngles={sliceAngles}
                  numSlots={numSlots}
                  arrowControls={arrowControls}
                  slotConfigs={slotConfigs}
                  size={300}
                />
              </div>
              <div className={`transition-all duration-1000 ${doubleWheelPopup.finalResult !== null && doubleWheelPopup.result2 !== doubleWheelPopup.finalResult ? 'opacity-30 grayscale scale-75' : 'scale-100'}`}>
                <WheelVisual 
                  rotationValue={rotationValue2}
                  gradientParts={gradientParts}
                  sliceAngles={sliceAngles}
                  numSlots={numSlots}
                  arrowControls={arrowControls2}
                  slotConfigs={slotConfigs}
                  size={300}
                />
              </div>
            </div>

            <AnimatePresence>
              {doubleWheelPopup.finalResult !== null && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="absolute z-[110] flex items-center justify-center pointer-events-none mt-16"
                >
                  <div className="bg-surface/90 backdrop-blur-sm border-[4px] border-gold-400 rounded-full w-48 h-48 flex items-center justify-center shadow-[0_0_80px_rgba(201,168,76,1)]">
                    <span className="text-7xl font-display font-bold text-gold-300 drop-shadow-[0_0_20px_rgba(253,230,138,1)]">
                      {doubleWheelPopup.finalResult}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
