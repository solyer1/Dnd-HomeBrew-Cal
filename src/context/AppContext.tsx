'use client';

/**
 * AppContext
 * Global state provider for crit table, app settings, and roll history.
 * All state that must be shared across the Damage Calculator and Dice Roller.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { CritTableEntry } from '@/types/config';
import type { AppSettings } from '@/types/config';
import type { RollHistoryEntry } from '@/types/dice';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS, MAX_ROLL_HISTORY } from '@/config/defaults';
import { generateId } from '@/utils/math';
import type { RollResult } from '@/types/dice';

interface AppContextValue {
  // Crit Table (editable)
  critTable: CritTableEntry[];
  setCritTable: (table: CritTableEntry[]) => void;

  // App Settings (background, theme)
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Roll History
  rollHistory: RollHistoryEntry[];
  addToHistory: (label: string, result: RollResult) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [critTable, setCritTable] = useState<CritTableEntry[]>(DEFAULT_CRIT_TABLE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [rollHistory, setRollHistory] = useState<RollHistoryEntry[]>([]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const addToHistory = useCallback((label: string, result: RollResult) => {
    const entry: RollHistoryEntry = {
      id: generateId(),
      label,
      result,
      timestamp: Date.now(),
    };
    setRollHistory((prev) => [entry, ...prev].slice(0, MAX_ROLL_HISTORY));
  }, []);

  const clearHistory = useCallback(() => setRollHistory([]), []);

  return (
    <AppContext.Provider
      value={{
        critTable,
        setCritTable,
        settings,
        updateSettings,
        rollHistory,
        addToHistory,
        clearHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
