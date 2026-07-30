'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { DiceType, RollResult } from '@/types/dice';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const getDiceSides = (type: DiceType) => parseInt(type.substring(1), 10);

const playTick = (ctx: AudioContext) => {
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
};

const playWinSound = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  
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
};

interface SpinWheelRollerProps {
  onResult: (result: RollResult, label: string) => void;
}

export function SpinWheelRoller({ onResult }: SpinWheelRollerProps) {
  const { addToHistory } = useAppContext();
  const { t } = useTranslation();
  
  const [selectedDie, setSelectedDie] = useState<DiceType>('d20');
  const [slots, setSlots] = useState<number[]>([]);
  const [weights, setWeights] = useState<Record<number, number>>({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const sides = getDiceSides(selectedDie);
    const newSlots = Array.from({ length: sides }, (_, i) => i + 1);
    
    const newWeights: Record<number, number> = {};
    newSlots.forEach(slot => newWeights[slot] = 1);
    
    setSlots(newSlots);
    setWeights(newWeights);
    setRotation(0);
  }, [selectedDie]);

  const shuffleSlots = () => {
    if (isSpinning) return;
    const shuffled = [...slots].sort(() => Math.random() - 0.5);
    setSlots(shuffled);
  };

  // Calculate slice geometry based on weights
  const totalWeight = slots.reduce((sum, slot) => sum + (weights[slot] || 0), 0) || 1; 
  
  const handlePercentageChange = (slot: number, newP: number) => {
    let p = Math.max(0, Math.min(100, newP)) / 100;
    
    setWeights(prev => {
      const othersSum = Object.entries(prev)
        .filter(([k]) => parseInt(k) !== slot)
        .reduce((sum, [_, w]) => sum + w, 0);
        
      const next = { ...prev };
      
      if (p === 1) {
        Object.keys(next).forEach(k => next[parseInt(k)] = 0);
        next[slot] = 1;
      } else if (p === 0) {
        next[slot] = 0;
        if (othersSum === 0) {
           Object.keys(next).forEach(k => { if (parseInt(k) !== slot) next[parseInt(k)] = 1; });
        }
      } else {
        let S = othersSum;
        if (S === 0) {
           Object.keys(next).forEach(k => { if (parseInt(k) !== slot) next[parseInt(k)] = 1; });
           S = Object.keys(next).length - 1;
        }
        next[slot] = S * (p / (1 - p));
      }
      return next;
    });
  };
  
  let currentAngle = 0;
  const sliceAngles = slots.map(slot => {
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
    
    const spinRotations = 5 * 360; 
    const randomRotation = Math.floor(Math.random() * 360) + spinRotations;
    const newRotation = rotation + randomRotation;
    
    setRotation(newRotation);
    
    // Ticking sound effect
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      let ticks = 31; 
      let delay = 20; 
      const tickLoop = () => {
        if (ticks <= 0) return;
        playTick(ctx);
        ticks--;
        delay = delay * 1.1; 
        setTimeout(tickLoop, delay);
      };
      tickLoop();
    }
    
    setTimeout(() => {
      setIsSpinning(false);
      
      const normalizedRotation = newRotation % 360;
      const topAngle = (360 - normalizedRotation) % 360;
      
      const winningSlice = sliceAngles.find(s => topAngle >= s.start && topAngle < s.end);
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
          rolls: [{ value: result, sides: numSlots, isNat20: selectedDie === 'd20' && result === 20, isNat1: selectedDie === 'd20' && result === 1 }],
          subtotal: result,
          total: result
        }],
        grandTotal: result,
        timestamp: Date.now()
      };
      
      const label = `Spin Wheel (${selectedDie})`;
      onResult(rollResult, label);
      addToHistory(label, rollResult);
    }, 3500); // Wait for the 3s framer-motion transition + 0.5s buffer
  };

  const numSlots = slots.length;
  // Dark theme palette using globals.css variables
  const colors = ['#0a0a12', '#13131f', '#1a1a2e', '#13131f'];
  
  const gradientParts = sliceAngles.map((slice, index) => {
    const startPercent = (slice.start / 360) * 100;
    const endPercent = (slice.end / 360) * 100;
    const color = colors[index % colors.length];
    return `${color} ${startPercent}% ${endPercent}%`;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Dice Tabs */}
      <div className="flex flex-wrap gap-2 justify-center bg-surface p-2 rounded-xl border border-border">
        {DICE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => !isSpinning && setSelectedDie(type)}
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

      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Wheel container */}
        <div className="relative flex items-center justify-center">
          {/* Custom CSS Pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
             <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] relative" style={{ borderTopColor: 'var(--color-gold-700)' }}>
               <div className="absolute -top-[24px] -left-[12px] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px]" style={{ borderTopColor: 'var(--color-surface)' }} />
             </div>
          </div>
          
          <motion.div 
            className="relative rounded-full border-[6px] border-gold-700 shadow-[0_0_20px_rgba(201,168,76,0.3)] overflow-hidden"
            style={{
              width: '380px', height: '380px',
              background: `conic-gradient(${gradientParts.join(', ')})`,
            }}
            animate={{ rotate: rotation }}
            transition={{ duration: 3.5, ease: [0.1, 0.7, 0.1, 1] }}
          >
            {/* Inner dots/decorations */}
            <div className="absolute inset-2 rounded-full border border-gold-900/20 z-0 pointer-events-none"></div>
            
            {/* Render numbers if slots <= 20 */}
            {numSlots <= 20 && sliceAngles.map((slice, index) => {
              if (slice.weight === 0) return null;
              const rotateAngle = slice.start + (slice.angle / 2);
              return (
                <div
                  key={index}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ transform: `rotate(${rotateAngle}deg)` }}
                >
                  <div 
                    className="absolute top-3 left-1/2 -translate-x-1/2 font-display font-bold text-gold-400 text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10"
                  >
                    {slice.slot}
                  </div>
                </div>
              );
            })}
          </motion.div>
          
          {/* Center piece */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-bg border-[4px] border-gold-700 rounded-full z-20 shadow-inner flex items-center justify-center">
             <div className="w-4 h-4 bg-gold-400 rounded-full"></div>
          </div>
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
      
      {/* Adjuster UI */}
      {numSlots <= 20 && (
        <div className="w-full mt-2">
          <h3 className="text-sm font-bold text-gold-500 mb-4 flex items-center gap-2">
            ⚙️ Adjust Probabilities
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-surface border border-border rounded-xl">
            {slots.map(slot => {
              const currentPercent = Math.round((((weights[slot] ?? 1) / totalWeight) * 100));
              return (
                <div key={slot} className="flex flex-col gap-1">
                  <label className="text-xs text-muted flex justify-between items-center mb-1">
                    <span>Face {slot}</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-12 bg-bg border border-border rounded px-1 text-right text-gold-400 outline-none focus:border-gold-500"
                        value={currentPercent}
                        onChange={(e) => handlePercentageChange(slot, parseInt(e.target.value) || 0)}
                      />
                      <span>%</span>
                    </div>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="100" step="1" 
                    value={currentPercent}
                    onChange={(e) => handlePercentageChange(slot, parseInt(e.target.value) || 0)}
                    className="accent-gold-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
