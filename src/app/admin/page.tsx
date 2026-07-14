'use client';

/**
 * Admin Panel — /admin
 * Password-protected config dashboard.
 * Tabs: Status Types | Damage Prefixes | Crit Table | App Settings | Danger Zone
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  AdminConfig,
  StatusType,
  DamageTypeConfig,
  CritTableEntry,
  AppSettings,
} from '@/types/config';
import { DEFAULT_CRIT_TABLE } from '@/config/critTable';
import { DEFAULT_APP_SETTINGS } from '@/config/defaults';
import { DEFAULT_DAMAGE_TYPES } from '@/config/damageTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AdminConfig = {
  critTable: DEFAULT_CRIT_TABLE,
  settings: DEFAULT_APP_SETTINGS,
  statusTypes: [],
  damageTypes: DEFAULT_DAMAGE_TYPES,
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Login Gate ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Login failed.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #080b12 70%)',
    }}>
      <div style={{
        width: 400, padding: '2.5rem', borderRadius: '1.25rem',
        background: 'rgba(15,18,30,0.97)',
        border: '1px solid rgba(180,140,60,0.25)',
        boxShadow: '0 0 60px rgba(180,140,60,0.08), 0 25px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem',
            fontWeight: 700, color: '#c9a84c', margin: 0,
          }}>Admin Panel</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            D&D Damage Calculator
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your secret password"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '0.7rem 1rem', borderRadius: '0.5rem',
                background: '#0f1520', border: '1px solid rgba(100,116,139,0.4)',
                color: '#e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.6rem 1rem', borderRadius: '0.5rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', fontSize: '0.85rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading || !password}
            style={{
              padding: '0.75rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
              background: loading ? '#374151' : 'linear-gradient(135deg, #c9a84c, #a07830)',
              color: loading ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: '1rem',
              transition: 'all 0.2s', fontFamily: 'var(--font-display)',
            }}
          >
            {loading ? 'Verifying…' : 'Enter Admin Panel →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Status Types Tab ─────────────────────────────────────────────────────────

function StatusTypesTab({
  statusTypes,
  damageTypes,
  onChange,
}: {
  statusTypes: StatusType[];
  damageTypes: DamageTypeConfig[];
  onChange: (types: StatusType[]) => void;
}) {
  function addNew() {
    const newType: StatusType = {
      id: uid(), label: 'New Status', iconType: 'emoji', icon: '⭐',
      imageUrl: '', color: '#e2e8f0', bgColor: '#1e293b',
      mode: 'cosmetic', damageMultiplier: 1,
    };
    onChange([...statusTypes, newType]);
  }

  function update(id: string, patch: Partial<StatusType>) {
    onChange(statusTypes.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  function remove(id: string) {
    onChange(statusTypes.filter((s) => s.id !== id));
  }

  // Toggle a damage type id in an array field
  function toggleDmgType(id: string, field: 'immuneDamageTypes' | 'resistDamageTypes' | 'vulnDamageTypes', typeId: string) {
    const s = statusTypes.find(x => x.id === id);
    if (!s) return;
    const current = s[field] ?? [];
    const next = current.includes(typeId) ? current.filter(x => x !== typeId) : [...current, typeId];
    update(id, { [field]: next });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={sectionTitle}>✨ Status Types</h2>
          <p style={sectionDesc}>Create custom status conditions. Toggle between cosmetic badges or ones that affect damage math.</p>
        </div>
        <button id="add-status-btn" onClick={addNew} style={btnGold}>+ Add Status</button>
      </div>

      {statusTypes.length === 0 && (
        <EmptyState icon="🏷️" text="No custom status types yet. Click Add Status to create one." />
      )}

      {statusTypes.map((s) => (
        <div key={s.id} style={card}>
          {/* Row 1: Icon + Label */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Icon preview */}
            <div style={{
              width: 44, height: 44, borderRadius: '0.5rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              background: s.bgColor, border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {s.iconType === 'image' && s.imageUrl
                ? <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : s.icon}
            </div>

            <FieldGroup label="Label">
              <input
                style={inputStyle}
                value={s.label}
                onChange={(e) => update(s.id, { label: e.target.value })}
                placeholder="Status name"
              />
            </FieldGroup>

            <FieldGroup label="Icon Type">
              <SegmentedControl
                options={[{ value: 'emoji', label: '😀 Emoji' }, { value: 'image', label: '🖼️ Image' }]}
                value={s.iconType}
                onChange={(v) => update(s.id, { iconType: v as 'emoji' | 'image' })}
              />
            </FieldGroup>

            <button
              onClick={() => remove(s.id)}
              style={{ marginLeft: 'auto', ...btnDanger }}
              title="Delete status type"
            >🗑️</button>
          </div>

          {/* Row 2: Icon value */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {s.iconType === 'emoji' ? (
              <FieldGroup label="Emoji Icon">
                <input
                  style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: '1.2rem' }}
                  value={s.icon}
                  onChange={(e) => update(s.id, { icon: e.target.value })}
                  placeholder="😀"
                />
              </FieldGroup>
            ) : (
              <FieldGroup label="Image URL" style={{ flex: 1 }}>
                <input
                  style={inputStyle}
                  value={s.imageUrl}
                  onChange={(e) => update(s.id, { imageUrl: e.target.value })}
                  placeholder="https://example.com/icon.png"
                />
              </FieldGroup>
            )}

            <FieldGroup label="Text Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="color" value={s.color} onChange={(e) => update(s.id, { color: e.target.value })} style={colorInput} />
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{s.color}</span>
              </div>
            </FieldGroup>

            <FieldGroup label="Badge BG">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="color" value={s.bgColor} onChange={(e) => update(s.id, { bgColor: e.target.value })} style={colorInput} />
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{s.bgColor}</span>
              </div>
            </FieldGroup>
          </div>

          {/* Row 3: Mode + multiplier */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <FieldGroup label="Mode">
              <SegmentedControl
                options={[
                  { value: 'cosmetic', label: '👁️ Cosmetic' },
                  { value: 'calculation', label: '⚔️ Affects Damage' },
                ]}
                value={s.mode}
                onChange={(v) => update(s.id, { mode: v as 'cosmetic' | 'calculation' })}
              />
            </FieldGroup>

            {s.mode === 'calculation' && (
              <>
                {/* ── Attacker Effects ── */}
                <div style={{ width: '100%', borderTop: '1px solid rgba(100,116,139,0.2)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚔️ Attacker Effects</span>
                </div>

                <FieldGroup label="Atk Roll Mod (e.g. -5)">
                  <input
                    type="number" step={0.5}
                    value={s.attackRollModifier ?? ''}
                    onChange={(e) => update(s.id, { attackRollModifier: e.target.value ? Number(e.target.value) : undefined })}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                  />
                </FieldGroup>

                <FieldGroup label="Advantage (Roll 2d20 High)">
                  <button
                    onClick={() => update(s.id, { advantage: !s.advantage })}
                    style={{
                      ...checkToggleStyle,
                      background: s.advantage ? 'rgba(201,168,76,0.2)' : 'transparent',
                      color: s.advantage ? '#c9a84c' : '#64748b',
                      border: `1px solid ${s.advantage ? '#c9a84c' : 'rgba(100,116,139,0.35)'}`,
                    }}
                  >
                    {s.advantage ? '✅ On' : '○ Off'}
                  </button>
                </FieldGroup>

                <FieldGroup label="Disadvantage (Roll 2d20 Low)">
                  <button
                    onClick={() => update(s.id, { disadvantage: !s.disadvantage })}
                    style={{
                      ...checkToggleStyle,
                      background: s.disadvantage ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: s.disadvantage ? '#fca5a5' : '#64748b',
                      border: `1px solid ${s.disadvantage ? 'rgba(239,68,68,0.5)' : 'rgba(100,116,139,0.35)'}`,
                    }}
                  >
                    {s.disadvantage ? '✅ On' : '○ Off'}
                  </button>
                </FieldGroup>

                <FieldGroup label="Crit Override (e.g. 18)">
                  <input
                    type="number" step={1} min={1} max={20}
                    value={s.critThresholdOverride ?? ''}
                    onChange={(e) => update(s.id, { critThresholdOverride: e.target.value ? Number(e.target.value) : undefined })}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                  />
                </FieldGroup>

                <FieldGroup label="Flat DMG Bonus">
                  <input
                    type="number" step={1}
                    value={s.damageFlatModifier ?? ''}
                    onChange={(e) => update(s.id, { damageFlatModifier: e.target.value ? Number(e.target.value) : undefined })}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                  />
                </FieldGroup>

                <FieldGroup label="Outgoing DMG Multiplier">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number" step={0.1} min={0} max={10}
                      value={s.damageMultiplier}
                      onChange={(e) => update(s.id, { damageMultiplier: Number(e.target.value) })}
                      style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>×</span>
                  </div>
                </FieldGroup>

                {/* ── Target Effects ── */}
                <div style={{ width: '100%', borderTop: '1px solid rgba(100,116,139,0.2)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🛡️ Target Effects</span>
                </div>

                <FieldGroup label="Incoming DMG Multiplier">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number" step={0.1} min={0} max={10}
                      value={s.incomingDamageMultiplier ?? ''}
                      onChange={(e) => update(s.id, { incomingDamageMultiplier: e.target.value ? Number(e.target.value) : undefined })}
                      style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>×</span>
                  </div>
                </FieldGroup>

                <FieldGroup label="Grants Attacker Advantage">
                  <button
                    onClick={() => update(s.id, { targetGrantsAdvantage: !s.targetGrantsAdvantage })}
                    style={{
                      ...checkToggleStyle,
                      background: s.targetGrantsAdvantage ? 'rgba(201,168,76,0.2)' : 'transparent',
                      color: s.targetGrantsAdvantage ? '#c9a84c' : '#64748b',
                      border: `1px solid ${s.targetGrantsAdvantage ? '#c9a84c' : 'rgba(100,116,139,0.35)'}`,
                    }}
                  >
                    {s.targetGrantsAdvantage ? '✅ On' : '○ Off'}
                  </button>
                </FieldGroup>

                <FieldGroup label="Grants Attacker Auto-Crit">
                  <button
                    onClick={() => update(s.id, { targetGrantsAutoCrit: !s.targetGrantsAutoCrit })}
                    style={{
                      ...checkToggleStyle,
                      background: s.targetGrantsAutoCrit ? 'rgba(201,168,76,0.2)' : 'transparent',
                      color: s.targetGrantsAutoCrit ? '#c9a84c' : '#64748b',
                      border: `1px solid ${s.targetGrantsAutoCrit ? '#c9a84c' : 'rgba(100,116,139,0.35)'}`,
                    }}
                  >
                    {s.targetGrantsAutoCrit ? '✅ On' : '○ Off'}
                  </button>
                </FieldGroup>

                {/* Damage Type Overrides */}
                {damageTypes.length > 0 && (
                  <>
                    <DmgTypeMultiSelect
                      label="Immune to Damage Types"
                      damageTypes={damageTypes}
                      selected={s.immuneDamageTypes ?? []}
                      onToggle={(typeId) => toggleDmgType(s.id, 'immuneDamageTypes', typeId)}
                      accentColor="#64748b"
                    />
                    <DmgTypeMultiSelect
                      label="Resists Damage Types (÷2)"
                      damageTypes={damageTypes}
                      selected={s.resistDamageTypes ?? []}
                      onToggle={(typeId) => toggleDmgType(s.id, 'resistDamageTypes', typeId)}
                      accentColor="#60a5fa"
                    />
                    <DmgTypeMultiSelect
                      label="Vulnerable to Damage Types (×2)"
                      damageTypes={damageTypes}
                      selected={s.vulnDamageTypes ?? []}
                      onToggle={(typeId) => toggleDmgType(s.id, 'vulnDamageTypes', typeId)}
                      accentColor="#f87171"
                    />
                  </>
                )}
              </>
            )}

            {/* Badge preview */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Preview:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
                background: s.bgColor, color: s.color, border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {s.iconType === 'image' && s.imageUrl
                  ? <img src={s.imageUrl} alt="" style={{ width: 14, height: 14, borderRadius: 2, objectFit: 'cover' }} />
                  : s.icon}
                {s.label}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Damage Types Tab ─────────────────────────────────────────────────────────

function DamageTypesTab({
  damageTypes,
  onChange,
}: {
  damageTypes: DamageTypeConfig[];
  onChange: (types: DamageTypeConfig[]) => void;
}) {
  function addNew() {
    const newType: DamageTypeConfig = {
      id: uid(), label: 'New Type', iconType: 'emoji', icon: '✨',
      imageUrl: '', color: '#ffffff', bgColor: '#1e293b',
    };
    onChange([...damageTypes, newType]);
  }

  function update(id: string, patch: Partial<DamageTypeConfig>) {
    onChange(damageTypes.map((dt) => dt.id === id ? { ...dt, ...patch } : dt));
  }

  function remove(id: string) {
    onChange(damageTypes.filter((dt) => dt.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={sectionTitle}>🎨 Damage Types</h2>
          <p style={sectionDesc}>Create and customize damage types for the calculator.</p>
        </div>
        <button onClick={addNew} style={btnGold}>+ Add Type</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '0.75rem' }}>
        {damageTypes.map((dt) => (
          <div key={dt.id} style={card}>
            {/* Header */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '0.5rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                background: dt.bgColor.startsWith('#') ? dt.bgColor : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0,
              }}>
                {dt.iconType === 'image' && dt.imageUrl
                  ? <img src={dt.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : dt.icon}
              </div>

              <FieldGroup label="Label" style={{ flex: 1 }}>
                <input
                  style={inputStyle}
                  value={dt.label}
                  onChange={(e) => update(dt.id, { label: e.target.value })}
                  placeholder="e.g. Cosmic"
                />
              </FieldGroup>
              
              <button
                onClick={() => remove(dt.id)}
                style={{ marginLeft: 'auto', ...btnDanger }}
                title="Delete damage type"
              >🗑️</button>
            </div>

            {/* Icon / Image config */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <FieldGroup label="Icon Type">
                <SegmentedControl
                  options={[{ value: 'emoji', label: '😀 Emoji' }, { value: 'image', label: '🖼️ Image' }]}
                  value={dt.iconType}
                  onChange={(v) => update(dt.id, { iconType: v as 'emoji' | 'image' })}
                />
              </FieldGroup>

              {dt.iconType === 'emoji' ? (
                <FieldGroup label="Emoji">
                  <input
                    style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: '1.2rem' }}
                    value={dt.icon}
                    onChange={(e) => update(dt.id, { icon: e.target.value })}
                    placeholder="🔥"
                  />
                </FieldGroup>
              ) : (
                <FieldGroup label="Image URL" style={{ flex: 1 }}>
                  <input
                    style={inputStyle}
                    value={dt.imageUrl}
                    onChange={(e) => update(dt.id, { imageUrl: e.target.value })}
                    placeholder="https://.../icon.png"
                  />
                </FieldGroup>
              )}
            </div>
            
            {/* Colors */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <FieldGroup label="Text Color (Hex)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="color" value={dt.color.startsWith('#') ? dt.color : '#ffffff'} onChange={(e) => update(dt.id, { color: e.target.value })} style={colorInput} />
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{dt.color.startsWith('#') ? dt.color : '(Tailwind)'}</span>
                </div>
              </FieldGroup>

              <FieldGroup label="Badge BG (Hex)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="color" value={dt.bgColor.startsWith('#') ? dt.bgColor : '#1e293b'} onChange={(e) => update(dt.id, { bgColor: e.target.value })} style={colorInput} />
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{dt.bgColor.startsWith('#') ? dt.bgColor : '(Tailwind)'}</span>
                </div>
              </FieldGroup>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Crit Table Tab ───────────────────────────────────────────────────────────

function CritTableTab({
  critTable,
  onChange,
}: {
  critTable: CritTableEntry[];
  onChange: (t: CritTableEntry[]) => void;
}) {
  function update(i: number, patch: Partial<CritTableEntry>) {
    const next = [...critTable];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...critTable, { minRoll: 1, maxRoll: 20, multiplier: 1, label: 'New Row' }]);
  }

  function removeRow(i: number) {
    onChange(critTable.filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={sectionTitle}>🎯 Critical Hit Table</h2>
          <p style={sectionDesc}>Define roll ranges and their damage multipliers.</p>
        </div>
        <button id="add-crit-row-btn" onClick={addRow} style={btnGold}>+ Add Row</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(100,116,139,0.3)' }}>
              {['Min Roll', 'Max Roll', 'Multiplier', 'Label', ''].map((h) => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {critTable.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(100,116,139,0.12)' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <input type="number" min={1} max={20} value={row.minRoll}
                    onChange={(e) => update(i, { minRoll: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 64, textAlign: 'center' }} />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <input type="number" min={1} max={20} value={row.maxRoll}
                    onChange={(e) => update(i, { maxRoll: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 64, textAlign: 'center' }} />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <input type="number" step={0.1} min={0} value={row.multiplier}
                    onChange={(e) => update(i, { multiplier: Number(e.target.value) })}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }} />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <input type="text" value={row.label ?? ''}
                    onChange={(e) => update(i, { label: e.target.value })}
                    style={{ ...inputStyle, width: 140 }} placeholder="Label" />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <button onClick={() => removeRow(i)} style={btnDanger}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── App Settings Tab ─────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: 'Void', value: '#0a0a12' },
  { label: 'Crimson', value: '#120a0a' },
  { label: 'Forest', value: '#0a120a' },
  { label: 'Ocean', value: '#0a0a20' },
  { label: 'Amethyst', value: '#120a18' },
];

function AppSettingsTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}) {
  function update(patch: Partial<AppSettings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={sectionTitle}>⚙️ App Settings</h2>
        <p style={sectionDesc}>Configure background, roll speed, and die caps. These are the same as the in-app settings but saved permanently.</p>
      </div>

      {/* Background Mode */}
      <div style={card}>
        <h3 style={subTitle}>Background</h3>
        <SegmentedControl
          options={[{ value: 'color', label: '🎨 Color' }, { value: 'image', label: '🖼️ Image URL' }]}
          value={settings.bgMode}
          onChange={(v) => update({ bgMode: v as 'color' | 'image' })}
        />

        {settings.bgMode === 'color' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => update({ bgColor: p.value })}
                  title={p.label}
                  style={{
                    width: 44, height: 44, borderRadius: '0.5rem', cursor: 'pointer',
                    background: p.value,
                    border: settings.bgColor === p.value
                      ? '2px solid #c9a84c'
                      : '2px solid rgba(100,116,139,0.3)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Custom:</label>
              <input type="color" value={settings.bgColor}
                onChange={(e) => update({ bgColor: e.target.value })}
                style={colorInput} />
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{settings.bgColor}</span>
            </div>
          </div>
        )}

        {settings.bgMode === 'image' && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Image URL</label>
            <input
              style={inputStyle}
              value={settings.bgImageUrl}
              onChange={(e) => update({ bgImageUrl: e.target.value })}
              placeholder="https://example.com/background.jpg"
            />
            {settings.bgImageUrl && (
              <div style={{
                height: 80, borderRadius: '0.5rem', border: '1px solid rgba(100,116,139,0.3)',
                backgroundImage: `url(${settings.bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}
          </div>
        )}

        {/* Opacity */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Overlay Opacity</label>
            <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              {Math.round(settings.bgOpacity * 100)}%
            </span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={settings.bgOpacity}
            onChange={(e) => update({ bgOpacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#c9a84c' }} />
        </div>
      </div>

      {/* Roll Speed */}
      <div style={card}>
        <h3 style={subTitle}>Dice Roll Speed</h3>
        <SegmentedControl
          options={[
            { value: 'fast', label: '⚡ Fast (0.6s)' },
            { value: 'normal', label: '🎲 Normal (0.9s)' },
            { value: 'slow', label: '🎬 Cinematic (1.5s)' },
          ]}
          value={settings.rollSpeed}
          onChange={(v) => update({ rollSpeed: v as 'fast' | 'normal' | 'slow' })}
        />
      </div>

      {/* Die Cap */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ ...subTitle, marginBottom: '0.25rem' }}>Enforce Max Natural Roll (Cap)</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
              Prevents modified totals from exceeding the die's natural maximum.
            </p>
          </div>
          <button
            onClick={() => update({ enableDieCap: !settings.enableDieCap })}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: settings.enableDieCap ? '#c9a84c' : '#1e293b',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: settings.enableDieCap ? 22 : 3,
              width: 18, height: 18, borderRadius: 9, background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerZoneTab({ onReset }: { onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ ...sectionTitle, color: '#ef4444' }}>☢️ Danger Zone</h2>
        <p style={sectionDesc}>Irreversible actions. Be careful.</p>
      </div>

      <div style={{
        ...card,
        border: '1px solid rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.05)',
      }}>
        <h3 style={{ color: '#fca5a5', margin: '0 0 0.5rem' }}>Reset All Configuration</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Clears all custom status types, damage type overrides, crit table changes, and app settings.
          Resets everything to factory defaults.
        </p>

        {!confirm ? (
          <button
            id="reset-confirm-btn"
            onClick={() => setConfirm(true)}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.4)',
              background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Reset All to Defaults
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>⚠️ Are you sure? This cannot be undone.</span>
            <button
              id="reset-final-btn"
              onClick={() => { onReset(); setConfirm(false); }}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setConfirm(false)}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(100,116,139,0.4)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DmgType Multi-Select Sub-component ─────────────────────────────────────

function DmgTypeMultiSelect({
  label, damageTypes, selected, onToggle, accentColor,
}: {
  label: string;
  damageTypes: DamageTypeConfig[];
  selected: string[];
  onToggle: (id: string) => void;
  accentColor: string;
}) {
  return (
    <FieldGroup label={label} style={{ flexBasis: '100%', width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {damageTypes.map(dt => {
          const active = selected.includes(dt.id);
          return (
            <button
              key={dt.id}
              onClick={() => onToggle(dt.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem',
                cursor: 'pointer', border: `1px solid ${active ? accentColor : 'rgba(100,116,139,0.35)'}`,
                background: active ? `${accentColor}20` : 'transparent',
                color: active ? accentColor : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {dt.icon} {dt.label}
            </button>
          );
        })}
      </div>
    </FieldGroup>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function SegmentedControl({
  options, value, onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)', width: 'fit-content' }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '0.4rem 0.8rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            background: value === o.value ? 'rgba(201,168,76,0.2)' : 'transparent',
            color: value === o.value ? '#c9a84c' : '#64748b',
            borderRight: '1px solid rgba(100,116,139,0.3)', transition: 'all 0.15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FieldGroup({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', ...style }}>
      <label style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '3rem', borderRadius: '0.75rem',
      border: '2px dashed rgba(100,116,139,0.2)', color: '#475569',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>{text}</p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const checkToggleStyle: React.CSSProperties = {
  padding: '0.35rem 0.75rem', borderRadius: '0.4rem', cursor: 'pointer',
  fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
};

const card: React.CSSProperties = {
  padding: '1.25rem', borderRadius: '0.75rem',
  background: 'rgba(15,18,30,0.8)',
  border: '1px solid rgba(100,116,139,0.15)',
  display: 'flex', flexDirection: 'column', gap: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', borderRadius: '0.4rem',
  background: '#0f1520', border: '1px solid rgba(100,116,139,0.35)',
  color: '#e2e8f0', fontSize: '0.875rem', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const colorInput: React.CSSProperties = {
  width: 36, height: 28, padding: 0, border: '1px solid rgba(100,116,139,0.3)',
  borderRadius: '0.3rem', cursor: 'pointer', background: 'transparent',
};

const btnGold: React.CSSProperties = {
  padding: '0.55rem 1.1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #c9a84c, #a07830)', color: '#fff',
  fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap',
};

const btnDanger: React.CSSProperties = {
  padding: '0.35rem 0.65rem', borderRadius: '0.4rem', border: '1px solid rgba(239,68,68,0.35)',
  background: 'rgba(239,68,68,0.08)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.8rem',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', color: '#c9a84c', fontSize: '1.2rem',
  fontWeight: 700, margin: '0 0 0.25rem',
};

const sectionDesc: React.CSSProperties = {
  color: '#64748b', fontSize: '0.85rem', margin: 0,
};

const subTitle: React.CSSProperties = {
  color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.5rem',
};

// ─── Main Admin Page ──────────────────────────────────────────────────────────

type Tab = 'status' | 'prefixes' | 'crit' | 'settings' | 'danger';

const TABS: { id: Tab; label: string }[] = [
  { id: 'status', label: '✨ Status Types' },
  { id: 'prefixes', label: '🎨 Damage Types' },
  { id: 'crit', label: '🎯 Crit Table' },
  { id: 'settings', label: '⚙️ App Settings' },
  { id: 'danger', label: '☢️ Danger Zone' },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [config, setConfig] = useState<AdminConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Check if already logged in by trying to fetch config
  useEffect(() => {
    fetch('/api/admin/config')
      .then(async (r) => {
        if (r.ok) {
          const cfg = await r.json();
          setConfig({ ...DEFAULT_CONFIG, ...cfg });
          // Try a small auth ping — if we can PUT we're authenticated
          const ping = await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...DEFAULT_CONFIG, ...cfg }),
          });
          setIsAuthenticated(ping.ok);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    // Reload config after login
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((cfg) => setConfig({ ...DEFAULT_CONFIG, ...cfg }))
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveMsg('✅ Saved successfully!');
      } else {
        setSaveMsg('❌ Save failed. Try again.');
      }
    } catch {
      setSaveMsg('❌ Network error.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [config]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
  }, []);

  const handleReset = useCallback(async () => {
    const next = DEFAULT_CONFIG;
    setConfig(next);
    await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    setSaveMsg('✅ Reset to defaults.');
    setTimeout(() => setSaveMsg(''), 3000);
  }, []);

  // Loading splash
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080b12' }}>
        <div style={{ color: '#c9a84c', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
          🔐 Checking session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #100820 0%, #080b12 60%)' }}>
      {/* ── Top Bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,11,18,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏰</span>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: '#c9a84c', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Admin Panel
            </h1>
            <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>D&amp;D Damage Calculator</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveMsg && (
            <span style={{
              fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '0.4rem',
              background: saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: saveMsg.startsWith('✅') ? '#86efac' : '#fca5a5',
              border: `1px solid ${saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {saveMsg}
            </span>
          )}

          <a
            href="/"
            style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            ← Back to App
          </a>

          <button
            id="admin-save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnGold, opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : '💾 Save All'}
          </button>

          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            style={{
              padding: '0.5rem 0.9rem', borderRadius: '0.4rem', border: '1px solid rgba(100,116,139,0.3)',
              background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', gap: '1.5rem' }}>
        {/* ── Sidebar Tabs ── */}
        <nav style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem',
          position: 'sticky', top: '5rem', height: 'fit-content',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.65rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontSize: '0.85rem', fontWeight: 600,
                background: activeTab === tab.id
                  ? 'rgba(201,168,76,0.15)'
                  : 'transparent',
                color: activeTab === tab.id ? '#c9a84c' : '#64748b',
                borderLeft: activeTab === tab.id
                  ? '3px solid #c9a84c'
                  : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'status' && (
            <StatusTypesTab
              statusTypes={config.statusTypes}
              damageTypes={config.damageTypes}
              onChange={(types) => setConfig((c) => ({ ...c, statusTypes: types }))}
            />
          )}
          {activeTab === 'prefixes' && (
            <DamageTypesTab
              damageTypes={config.damageTypes}
              onChange={(types) => setConfig((c) => ({ ...c, damageTypes: types }))}
            />
          )}
          {activeTab === 'crit' && (
            <CritTableTab
              critTable={config.critTable}
              onChange={(t) => setConfig((c) => ({ ...c, critTable: t }))}
            />
          )}
          {activeTab === 'settings' && (
            <AppSettingsTab
              settings={config.settings}
              onChange={(s) => setConfig((c) => ({ ...c, settings: s }))}
            />
          )}
          {activeTab === 'danger' && (
            <DangerZoneTab onReset={handleReset} />
          )}
        </main>
      </div>
    </div>
  );
}
