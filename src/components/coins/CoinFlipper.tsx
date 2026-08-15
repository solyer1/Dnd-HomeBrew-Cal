'use client';

import React, { useState } from 'react';

type Side = 'gilga' | 'enki';

export function CoinFlipper() {
  const [guess, setGuess] = useState<Side | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<Side | null>(null);
  // Track flips to accumulate rotation
  const [flipCount, setFlipCount] = useState(0);

  const handleToss = () => {
    if (!guess || isFlipping) return;
    setIsFlipping(true);
    setResult(null);

    // Random outcome
    const isGilga = Math.random() > 0.5;
    const nextSide: Side = isGilga ? 'gilga' : 'enki';

    // Update flip count to trigger animation
    // Base 5 full rotations (1800deg) + 0 for heads, 0.5 (180deg) for tails
    // We add to the current flipCount to ensure it always spins forward
    const baseRotations = 5; 
    
    setFlipCount(prev => {
      // Calculate how much rotation we already have
      const currentFullRotations = Math.floor(prev);
      // Next rotation count is current full + 5 + (0.5 if tails)
      return currentFullRotations + baseRotations + (isGilga ? 0 : 0.5);
    });

    setTimeout(() => {
      setIsFlipping(false);
      setResult(nextSide);
    }, 3000); // 3s animation duration
  };

  const rotation = flipCount * 360;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 h-full">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-gold-400 drop-shadow-lg">Guess the Coin Toss</h2>
        <p className="text-sm text-muted mt-2">Select Gilga or Enki, then toss the coin!</p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setGuess('gilga')}
          disabled={isFlipping}
          className={`px-8 py-3 rounded-xl font-bold border-2 transition-all duration-200 min-w-[140px] text-lg flex flex-col items-center
            ${guess === 'gilga' ? 'bg-gold-900 border-gold-500 text-gold-300 shadow-gold' : 'bg-surface border-border text-muted hover:border-gold-700 hover:text-white'}`}
        >
          <span>Gilga</span>
          <span className="text-sm font-normal opacity-75 mt-1">(หัว / Heads)</span>
        </button>
        <button
          onClick={() => setGuess('enki')}
          disabled={isFlipping}
          className={`px-8 py-3 rounded-xl font-bold border-2 transition-all duration-200 min-w-[140px] text-lg flex flex-col items-center
            ${guess === 'enki' ? 'bg-gold-900 border-gold-500 text-gold-300 shadow-gold' : 'bg-surface border-border text-muted hover:border-gold-700 hover:text-white'}`}
        >
          <span>Enki</span>
          <span className="text-sm font-normal opacity-75 mt-1">(ก้อย / Tails)</span>
        </button>
      </div>

      <div className="perspective-[1000px] w-64 h-64 my-6 relative">
        <div className={`w-full h-full ${isFlipping ? 'animate-coin-toss-bounce' : ''}`}>
          <div 
            className="w-full h-full relative transition-transform duration-[3000ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)] preserve-3d"
            style={{ transform: `rotateY(${rotation}deg)` }}
          >
            {/* Front (Gilga) */}
            <div className="absolute inset-0 backface-hidden rounded-full shadow-2xl overflow-hidden bg-gold-900 border-4 border-gold-600">
              <img src="/heads.png" alt="Gilga" className="w-full h-full object-cover" />
            </div>
            {/* Back (Enki) */}
            <div className="absolute inset-0 backface-hidden rounded-full shadow-2xl overflow-hidden bg-gold-900 border-4 border-gold-600 [transform:rotateY(180deg)]">
              <img src="/tails.png" alt="Enki" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleToss}
        disabled={!guess || isFlipping}
        className={`w-72 py-4 rounded-xl font-display font-bold text-xl border-2 transition-all duration-200
          ${!guess || isFlipping 
            ? 'border-gold-700/50 bg-gold-900/30 text-gold-600/50 cursor-not-allowed' 
            : 'border-gold-500 bg-gold-900/50 text-gold-300 hover:bg-gold-800/70 hover:text-gold-200 shadow-gold'}`}
      >
        {isFlipping ? 'Flipping...' : 'Toss Coin'}
      </button>

      <div className="h-24 flex items-center justify-center">
        {result && (
          <div className="text-center animate-fade-in">
            <h3 className={`text-3xl font-bold font-display drop-shadow-md ${result === guess ? 'text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.5)]'}`}>
              {result === guess ? 'You Guessed Right!' : 'Wrong Guess!'}
            </h3>
            <p className="text-muted mt-2 text-lg">
              It landed on <span className="font-bold text-white capitalize">{result} {result === 'gilga' ? '(หัว)' : '(ก้อย)'}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
