'use client';

/**
 * AppContext
 * Global state provider for crit table, app settings, roll history,
 * and cross-tab communication (send dice value to calculator).
 * Initial config is passed from the server (layout.tsx fetches it from Redis).
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { CritTableEntry, StatusType, DamageTypeConfig } from '@/types/config';
import type { AppSettings } from '@/types/config';
import type { RollHistoryEntry } from '@/types/dice';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS, MAX_ROLL_HISTORY } from '@/config/defaults';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';
import { generateId } from '@/utils/math';
import type { RollResult } from '@/types/dice';
import type { AdminConfig } from '@/types/config';

interface AppContextValue {
  // Crit Table (editable)
  critTable: CritTableEntry[];
  setCritTable: (table: CritTableEntry[]) => void;

  // App Settings (background, theme)
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Admin-managed: custom status types
  statusTypes: StatusType[];
  setStatusTypes: (types: StatusType[]) => void;

  // Admin-managed: custom damage types
  damageTypes: DamageTypeConfig[];
  setDamageTypes: (types: DamageTypeConfig[]) => void;

  // Roll History
  rollHistory: RollHistoryEntry[];
  addToHistory: (label: string, result: RollResult) => void;
  clearHistory: () => void;

  // Cross-tab: last dice grand total sent to the calculator
  pendingDice: { value: number; target: 'base' | 'attack' } | null;
  sendDiceToCalculator: (value: number, target: 'base' | 'attack') => void;
  consumePendingDice: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
  /** Initial config pre-fetched server-side by layout.tsx */
  initialConfig?: AdminConfig;
}

export function AppProvider({ children, initialConfig }: AppProviderProps) {
  // Use server-provided initial config if available, otherwise fall back to defaults
  const [critTable, setCritTable] = useState<CritTableEntry[]>(
    initialConfig?.critTable ?? DEFAULT_CRIT_TABLE
  );
  const [settings, setSettings] = useState<AppSettings>(
    initialConfig?.settings ?? DEFAULT_APP_SETTINGS
  );
  const [statusTypes, setStatusTypes] = useState<StatusType[]>(
    initialConfig?.statusTypes ?? []
  );
  const [damageTypes, setDamageTypes] = useState<DamageTypeConfig[]>(
    initialConfig?.damageTypes ?? DEFAULT_DAMAGE_TYPES
  );
  const [rollHistory, setRollHistory] = useState<RollHistoryEntry[]>([]);
  const [pendingDice, setPendingDice] = useState<{ value: number; target: 'base' | 'attack' } | null>(null);

  // If no server-side config was provided, fall back to client-side fetch
  useEffect(() => {
    if (initialConfig) return; // Already have data from server — skip
    fetch(`/api/admin/config?_t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.critTable?.length) setCritTable(cfg.critTable);
        if (cfg.settings) setSettings((prev) => ({ ...prev, ...cfg.settings }));
        if (cfg.statusTypes) setStatusTypes(cfg.statusTypes);
        if (cfg.damageTypes) setDamageTypes(cfg.damageTypes);
      })
      .catch(() => {/* silently use defaults */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sendDiceToCalculator = useCallback((value: number, target: 'base' | 'attack') => {
    setPendingDice({ value, target });
  }, []);

  const consumePendingDice = useCallback(() => {
    setPendingDice(null);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    critTable,
    setCritTable,
    settings,
    updateSettings,
    statusTypes,
    setStatusTypes,
    damageTypes,
    setDamageTypes,
    rollHistory,
    addToHistory,
    clearHistory,
    pendingDice,
    sendDiceToCalculator,
    consumePendingDice,
  }), [
    critTable, setCritTable,
    settings, updateSettings,
    statusTypes, setStatusTypes,
    damageTypes, setDamageTypes,
    rollHistory, addToHistory, clearHistory,
    pendingDice, sendDiceToCalculator, consumePendingDice,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
