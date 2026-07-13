'use client';

/**
 * GuideModal
 * An in-app user guide displayed as a slide carousel.
 * Supports English and Thai. Triggered by a "?" button in the header.
 */

import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Guide Content ─────────────────────────────────────────────────────────────

interface Slide {
  icon: string;
  titleEn: string;
  titleTh: string;
  bodyEn: string[];
  bodyTh: string[];
  tip?: { en: string; th: string };
}

const SLIDES: Slide[] = [
  {
    icon: '⚔️',
    titleEn: 'Welcome to D&D Combat Calculator',
    titleTh: 'ยินดีต้อนรับสู่ D&D Combat Calculator',
    bodyEn: [
      'This tool helps you calculate damage, roll dice, and track combat results in your D&D sessions.',
      'There are two main tabs: ⚔️ Damage Calculator and 🎲 Dice Roller.',
      'Use the ⚙️ Settings button (top right) to customise the app — background, roll speed, and crit table.',
    ],
    bodyTh: [
      'เครื่องมือนี้ช่วยคำนวณความเสียหาย ทอยลูกเต๋า และติดตามผลการต่อสู้ใน D&D',
      'มีแท็บหลักสองแท็บ: ⚔️ Damage Calculator และ 🎲 Dice Roller',
      'ใช้ปุ่ม ⚙️ Settings (ด้านบนขวา) เพื่อปรับพื้นหลัง ความเร็วลูกเต๋า และตาราง Crit',
    ],
  },
  {
    icon: '🎯',
    titleEn: 'Attack Roll & Crit Tiers',
    titleTh: 'การทอย Attack Roll และระดับ Crit',
    bodyEn: [
      'Set your d20 Attack Roll using the slider or click "🎲 Roll d20" to animate a dice throw.',
      'Type a Bonus to Hit value — this is added to your natural roll to get the effective total.',
      'The four tier chips (×1, ×1.5, ×2, ×2.5) highlight automatically based on your TOTAL roll.',
      '• 1–10 = ×1 (No crit)  •  11–17 = ×1.5  •  18–19 = ×2  •  20 = ×2.5 (Natural 20!)',
    ],
    bodyTh: [
      'ตั้งค่า d20 Attack Roll ด้วยแถบเลื่อน หรือกด "🎲 Roll d20" เพื่อดูแอนิเมชันลูกเต๋า',
      'ใส่ค่า Bonus to Hit — ค่านี้จะถูกบวกเข้ากับ Natural Roll เพื่อให้ได้ผลรวม',
      'ช่องระดับ (×1, ×1.5, ×2, ×2.5) จะไฮไลต์อัตโนมัติตามผลรวม TOTAL ของคุณ',
      '• 1–10 = ×1  •  11–17 = ×1.5  •  18–19 = ×2  •  20 = ×2.5 (Natural 20!)',
    ],
    tip: {
      en: 'Tip: Drag the slider to set your roll manually, or use the Roll button for the full dice animation!',
      th: 'เคล็ดลับ: ลากแถบเลื่อนเพื่อตั้งค่าด้วยตนเอง หรือกดปุ่ม Roll เพื่อดูแอนิเมชันครบถ้วน!',
    },
  },
  {
    icon: '💥',
    titleEn: 'Base Damage & Calculation',
    titleTh: 'Base Damage และการคำนวณ',
    bodyEn: [
      'Enter your Base Damage in the input box, or click "🎲 Roll" to roll dice and auto-fill it.',
      'The damage pipeline runs instantly:',
      '  1. Base Damage × Crit Multiplier',
      '  2. × Resistance / Vulnerability per damage type',
      '  3. + Flat Modifiers',
      '  4. × Percentage Modifiers',
      '  5. × Direct Multipliers (×N)',
      '  6. Round to nearest integer → Final Damage',
    ],
    bodyTh: [
      'ใส่ค่า Base Damage ในกล่องข้อความ หรือกด "🎲 Roll" เพื่อทอยลูกเต๋าและกรอกอัตโนมัติ',
      'ขั้นตอนการคำนวณทำงานทันที:',
      '  1. Base Damage × Crit Multiplier',
      '  2. × Resistance / Vulnerability ตามประเภทความเสียหาย',
      '  3. + Flat Modifiers',
      '  4. × Percentage Modifiers',
      '  5. × ตัวคูณโดยตรง (×N)',
      '  6. ปัดเศษ → Final Damage',
    ],
  },
  {
    icon: '🛡️',
    titleEn: 'Damage Types & Resistance',
    titleTh: 'ประเภทความเสียหายและการต้านทาน',
    bodyEn: [
      'Split your damage across multiple types (Fire, Cold, Slashing, etc.) using percentages that must sum to 100%.',
      'Each type can be set to:',
      '  🔵 Resistance — halves damage (÷2). Stackable.',
      '  🔴 Vulnerability — doubles damage (×2 per stack).',
      '  ⚫ Immunity — reduces to 0.',
      'Click "+ Add Type" to add more damage partitions.',
    ],
    bodyTh: [
      'แบ่งความเสียหายออกเป็นหลายประเภท (ไฟ, น้ำแข็ง, ฟัน ฯลฯ) โดยใช้เปอร์เซ็นต์รวม 100%',
      'แต่ละประเภทสามารถตั้งค่าได้ดังนี้:',
      '  🔵 Resistance — ลดความเสียหายครึ่งหนึ่ง (÷2) สะสมได้',
      '  🔴 Vulnerability — เพิ่มความเสียหายเป็นสองเท่า (×2 ต่อชั้น)',
      '  ⚫ Immunity — ลดเป็น 0',
      'กด "+ Add Type" เพื่อเพิ่มประเภทความเสียหายเพิ่มเติม',
    ],
    tip: {
      en: 'Tip: If percentages don\'t add to 100%, an Auto-Fix button appears to balance them instantly.',
      th: 'เคล็ดลับ: ถ้าเปอร์เซ็นต์รวมไม่ได้ 100% ปุ่ม Auto-Fix จะปรากฏเพื่อปรับสมดุลทันที',
    },
  },
  {
    icon: '✨',
    titleEn: 'Custom Modifiers',
    titleTh: 'Custom Modifiers (ตัวปรับแต่ง)',
    bodyEn: [
      'Add your own modifiers from buffs, conditions, spells, etc. Three types available:',
      '  🟢 +DMG — Adds a flat amount of damage (e.g. Rage: +4).',
      '  🔵 +% — Increases damage by a percentage (e.g. Inspire: +20%).',
      '  🟡 ×N — Multiplies total damage by a factor (e.g. Divine Smite: ×2).',
      'Multiple ×N modifiers stack multiplicatively (×2 then ×3 = ×6).',
      'Click the type badge on an existing modifier to cycle between types.',
    ],
    bodyTh: [
      'เพิ่มตัวปรับแต่งจาก buff, เงื่อนไข, เวท ฯลฯ มีสามประเภท:',
      '  🟢 +DMG — เพิ่มความเสียหายแบบค่าคงที่ (เช่น Rage: +4)',
      '  🔵 +% — เพิ่มความเสียหายเป็นเปอร์เซ็นต์ (เช่น Inspire: +20%)',
      '  🟡 ×N — คูณความเสียหายรวมด้วยตัวประกอบ (เช่น Divine Smite: ×2)',
      'ตัวคูณ ×N หลายตัวสะสมแบบคูณกัน (×2 แล้ว ×3 = ×6)',
      'กดที่แท็กประเภทบนตัวปรับแต่งที่มีอยู่เพื่อเปลี่ยนประเภท',
    ],
  },
  {
    icon: '🎲',
    titleEn: 'Dice Roller Tab',
    titleTh: 'แท็บ Dice Roller',
    bodyEn: [
      'Switch to the 🎲 Dice tab to roll any combination of dice.',
      'Add multiple dice groups — each with its own type (d4–d100), quantity, and modifier.',
      'Modifier modes:',
      '  +sum — adds the modifier once to the group total.',
      '  +each — adds the modifier to each individual die.',
      'After rolling, send the result to the Damage Calculator:',
      '  ⚔️ As Base Damage  or  🎯 As Attack Roll (d20)',
    ],
    bodyTh: [
      'เปลี่ยนไปแท็บ 🎲 Dice เพื่อทอยลูกเต๋าทุกประเภท',
      'เพิ่มกลุ่มลูกเต๋าหลายกลุ่ม แต่ละกลุ่มมีประเภท (d4–d100) จำนวน และ modifier ของตัวเอง',
      'โหมด Modifier:',
      '  +sum — บวก modifier ครั้งเดียวกับผลรวมกลุ่ม',
      '  +each — บวก modifier กับลูกเต๋าแต่ละลูก',
      'หลังทอย ส่งผลลัพธ์ไปยัง Damage Calculator:',
      '  ⚔️ As Base Damage  หรือ  🎯 As Attack Roll (d20)',
    ],
    tip: {
      en: 'Tip: Add a Roll Label before rolling to keep your history organised.',
      th: 'เคล็ดลับ: เพิ่ม Roll Label ก่อนทอยเพื่อจัดระเบียบประวัติการทอย',
    },
  },
  {
    icon: '⚙️',
    titleEn: 'Settings & Crit Table',
    titleTh: 'Settings และตาราง Crit',
    bodyEn: [
      'Open ⚙️ Settings (top-right button) to access:',
      '  🎨 Background — choose a color or paste an image URL.',
      '  ⏱ Roll Speed — Instant / Fast / Normal / Cinematic.',
      '  🔒 Die Cap — prevents modified rolls from exceeding the die max.',
      '  📊 Critical Hit Table — edit or add custom crit tiers.',
      'Crit Table editor (click Edit):',
      '  • ▲ ▼ to reorder rows.  • ✕ to remove.  • + Add Row for custom tiers.',
      '  • New rows glow gold until you Save.',
    ],
    bodyTh: [
      'เปิด ⚙️ Settings (ปุ่มด้านบนขวา) เพื่อเข้าถึง:',
      '  🎨 Background — เลือกสี หรือวาง URL รูปภาพ',
      '  ⏱ Roll Speed — Instant / Fast / Normal / Cinematic',
      '  🔒 Die Cap — ป้องกันไม่ให้ผลรวมเกินค่าสูงสุดของลูกเต๋า',
      '  📊 Critical Hit Table — แก้ไขหรือเพิ่มระดับ crit เอง',
      'ตัวแก้ไขตาราง Crit (กด Edit):',
      '  • ▲ ▼ เพื่อเรียงลำดับแถว  • ✕ เพื่อลบ  • + Add Row สำหรับระดับ crit เอง',
      '  • แถวใหม่จะเรืองแสงสีทองจนกว่าจะกด Save',
    ],
    tip: {
      en: 'Tip: Language toggle (English / ภาษาไทย) is also inside Settings!',
      th: 'เคล็ดลับ: ปุ่มเปลี่ยนภาษา (English / ภาษาไทย) อยู่ใน Settings ด้วย!',
    },
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function GuideModal() {
  const { language } = useTranslation();
  const isTh = language === 'th';
  const [isOpen, setIsOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  const current = SLIDES[slide];
  const total = SLIDES.length;

  const prev = () => setSlide(s => Math.max(0, s - 1));
  const next = () => setSlide(s => Math.min(total - 1, s + 1));

  const close = () => { setIsOpen(false); setSlide(0); };

  return (
    <>
      {/* Trigger button */}
      <button
        id="guide-button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-16 z-50 w-10 h-10 rounded-full border border-gold-700 bg-surface/80 backdrop-blur-md flex items-center justify-center text-gold-400 hover:border-gold-400 hover:text-gold-300 transition-all shadow-lg font-bold text-sm"
        title={isTh ? 'คู่มือการใช้งาน' : 'User Guide'}
      >
        ?
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-xl bg-bg/95 border border-gold-700 rounded-2xl shadow-[0_0_40px_rgba(201,168,76,0.2)] overflow-hidden flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gold-950/40">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{current.icon}</span>
                  <h2 className="font-display font-bold text-gold-300 text-sm leading-tight">
                    {isTh ? 'คู่มือการใช้งาน' : 'User Guide'}
                  </h2>
                </div>
                <button
                  onClick={close}
                  className="text-muted hover:text-white transition-colors text-xl leading-none px-1"
                >×</button>
              </div>

              {/* Slide dots */}
              <div className="flex justify-center gap-1.5 pt-3 px-5">
                {SLIDES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === slide
                        ? 'w-5 h-2 bg-gold-400'
                        : 'w-2 h-2 bg-border hover:bg-gold-700'
                    }`}
                    title={isTh ? s.titleTh : s.titleEn}
                  />
                ))}
              </div>

              {/* Slide content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Slide title */}
                <h3 className="font-display font-bold text-lg text-white mb-3 leading-snug">
                  {isTh ? current.titleTh : current.titleEn}
                </h3>

                {/* Body lines */}
                <ul className="flex flex-col gap-1.5">
                  {(isTh ? current.bodyTh : current.bodyEn).map((line, i) => {
                    const isIndented = line.startsWith('  ');
                    const isNumbered = /^\s+\d\./.test(line);
                    return (
                      <li
                        key={i}
                        className={`text-sm leading-relaxed ${
                          isIndented
                            ? isNumbered
                              ? 'text-muted pl-4 border-l border-border'
                              : 'text-gold-300/80 pl-4 border-l border-gold-900'
                            : 'text-white/90'
                        }`}
                      >
                        {line.trim()}
                      </li>
                    );
                  })}
                </ul>

                {/* Tip box */}
                {current.tip && (
                  <div className="mt-4 p-3 rounded-lg bg-gold-950/40 border border-gold-800/60 flex gap-2">
                    <span className="text-base mt-0.5">💡</span>
                    <p className="text-xs text-gold-300/90 leading-relaxed">
                      {isTh ? current.tip.th : current.tip.en}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface/30">
                <button
                  onClick={prev}
                  disabled={slide === 0}
                  className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← {isTh ? 'ก่อนหน้า' : 'Prev'}
                </button>

                <span className="text-xs text-muted">
                  {slide + 1} / {total}
                </span>

                {slide < total - 1 ? (
                  <button onClick={next} className="btn-gold text-sm px-3 py-1.5">
                    {isTh ? 'ถัดไป' : 'Next'} →
                  </button>
                ) : (
                  <button onClick={close} className="btn-gold text-sm px-3 py-1.5">
                    {isTh ? 'เสร็จสิ้น ✓' : 'Done ✓'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
