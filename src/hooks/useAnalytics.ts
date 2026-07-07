'use client';

/**
 * useAnalytics
 * Lightweight client hook that fires analytics events to /api/analytics.
 * The server reads the real IP — the client never touches the webhook directly.
 */

import { useCallback, useRef } from 'react';

type EventType = 'page_visit' | 'dice_roll' | 'damage_calculated' | 'tab_switch';

interface TrackOptions {
  details?: Record<string, string | number | boolean>;
}

export function useAnalytics() {
  // Prevent duplicate page_visit events within the same session
  const sentVisit = useRef(false);

  const track = useCallback((type: EventType, options: TrackOptions = {}) => {
    // Fire-and-forget — never await this
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        details: options.details ?? {},
        userAgent: navigator.userAgent,
        page: window.location.pathname,
      }),
    }).catch(() => {/* analytics should never throw */});
  }, []);

  const trackPageVisit = useCallback(() => {
    if (sentVisit.current) return;
    sentVisit.current = true;
    track('page_visit', {
      details: {
        referrer: document.referrer || 'Direct',
        screenSize: `${window.screen.width}×${window.screen.height}`,
        language: navigator.language,
      },
    });
  }, [track]);

  const trackDiceRoll = useCallback((label: string, total: number, formula?: string) => {
    track('dice_roll', {
      details: { 
        dice: label, 
        total,
        ...(formula ? { formula } : {})
      },
    });
  }, [track]);

  const trackDamage = useCallback((total: number, isCrit: boolean, partitions: number) => {
    track('damage_calculated', {
      details: { totalDamage: total, isCrit, partitions },
    });
  }, [track]);

  const trackTabSwitch = useCallback((tabName: string) => {
    track('tab_switch', { details: { tab: tabName } });
  }, [track]);

  return { trackPageVisit, trackDiceRoll, trackDamage, trackTabSwitch };
}
