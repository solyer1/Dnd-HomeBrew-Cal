'use client';

import React from 'react';
import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-bg text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h1 className="font-display font-bold text-lg text-gold-400 leading-none">
                User Guide / คู่มือการใช้งาน
              </h1>
              <p className="text-xs text-muted">D&D Combat Calculator</p>
            </div>
          </div>
          <Link href="/" className="btn-ghost text-sm px-4 py-1.5">
            ← Back to App
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-12">
        
        {/* Intro */}
        <section className="text-center">
          <p className="text-muted mb-2">This guide covers everything you need to know about using the app.</p>
          <p className="text-muted">คู่มือนี้จะอธิบายวิธีการใช้งานแอป D&D Combat Calculator ทั้งหมด</p>
        </section>

        {/* Section 1: Damage Calculator */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-gold-900/50 pb-2">
            <h2 className="text-2xl font-bold text-gold-300">1. The Main Dashboard (Damage Calculator)</h2>
            <h3 className="text-lg text-gold-500/80">หน้าหลัก (ตัวคำนวณความเสียหาย)</h3>
          </div>
          
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
            <img src="/guide/damage_calculator.png" alt="Damage Calculator" className="w-full object-cover" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-2">
            <div>
              <h4 className="font-semibold text-white mb-3">English:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">Base Damage & Attack Roll:</strong> Enter the raw damage of your attack and slide to set your d20 roll (or press <strong className="text-gold-400">Roll d20</strong> to animate).</li>
                <li><strong className="text-white">Crit Tiers:</strong> Based on your total Attack Roll, the correct multiplier (×1, ×1.5, ×2, etc.) highlights automatically.</li>
                <li><strong className="text-white">Damage Types & Resistances:</strong> Split the damage by type (must equal 100%). You can set each to Normal, Resistance (÷2), Vulnerability (×2), or Immune (0).</li>
                <li><strong className="text-white">Custom Modifiers:</strong> Need a flat damage bonus, a percentage increase, or a direct multiplier? Use the 3-way toggle button to add +DMG, +%, or ×N effects.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">ภาษาไทย:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">Base Damage และ Attack Roll:</strong> ใส่ค่าความเสียหายตั้งต้นและเลื่อนแถบเพื่อตั้งค่าทอยลูกเต๋า d20 (หรือกดปุ่ม <strong className="text-gold-400">Roll d20</strong> เพื่อดูแอนิเมชัน)</li>
                <li><strong className="text-white">ระดับคริติคอล (Crit Tiers):</strong> ตัวคูณความเสียหายจะไฮไลต์อัตโนมัติตามผลรวมของการทอยโจมตี (×1, ×1.5, ×2 ฯลฯ)</li>
                <li><strong className="text-white">ประเภทความเสียหาย และการต้านทาน:</strong> แบ่งสัดส่วนความเสียหายตามเปอร์เซ็นต์ (รวมกันต้องได้ 100%) และสามารถตั้งค่าการต้านทาน (ลดครึ่ง), แพ้ทาง (เพิ่มสองเท่า) หรือ อมตะ (ความเสียหายเป็น 0)</li>
                <li><strong className="text-white">ตัวปรับแต่งพิเศษ (Custom Modifiers):</strong> สามารถเพิ่มโบนัสแบบหน่วย (+DMG), เปอร์เซ็นต์ (+%) หรือการคูณตรงๆ (×N) ได้จากแผงควบคุมนี้</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Dice Roller */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-gold-900/50 pb-2">
            <h2 className="text-2xl font-bold text-gold-300">2. The Dice Roller</h2>
            <h3 className="text-lg text-gold-500/80">หน้าทอยลูกเต๋า</h3>
          </div>
          
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
            <img src="/guide/dice_roller.png" alt="Dice Roller" className="w-full object-cover" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-2">
            <div>
              <h4 className="font-semibold text-white mb-3">English:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">Custom Groups:</strong> Roll multiple groups of dice at once (e.g., 2d8 + 1d6 + 3).</li>
                <li><strong className="text-white">History Tracking:</strong> Name your rolls (e.g., "Fireball", "Sneak Attack") to easily see them in the history on the right.</li>
                <li><strong className="text-white">Send to Calculator:</strong> You can send your rolled total directly back to the Damage Calculator as either <strong className="text-gold-400">Base Damage</strong> or an <strong className="text-gold-400">Attack Roll</strong>.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">ภาษาไทย:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">กลุ่มลูกเต๋า:</strong> ทอยลูกเต๋าได้หลายกลุ่มพร้อมกัน (เช่น 2d8 + 1d6 + 3)</li>
                <li><strong className="text-white">ประวัติการทอย:</strong> คุณสามารถตั้งชื่อการทอย (เช่น "โจมตีแอบซ่อน") เพื่อให้ดูย้อนหลังง่ายๆ ทางด้านขวา</li>
                <li><strong className="text-white">ส่งไปคำนวณ:</strong> สามารถกดส่งผลรวมที่ทอยได้ ไปยังหน้าเครื่องคิดเลขได้ทันที โดยเลือกส่งเป็น <strong className="text-gold-400">Base Damage</strong> หรือ <strong className="text-gold-400">Attack Roll</strong></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Settings & Crit Table */}
        <section className="flex flex-col gap-6">
          <div className="border-b border-gold-900/50 pb-2">
            <h2 className="text-2xl font-bold text-gold-300">3. Settings & Critical Hit Table</h2>
            <h3 className="text-lg text-gold-500/80">การตั้งค่า และตารางคริติคอล</h3>
          </div>
          
          <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
            <img src="/guide/settings_panel.png" alt="Settings Panel" className="w-full object-cover" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-2">
            <div>
              <h4 className="font-semibold text-white mb-3">English:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">Theme:</strong> Change the background color or input a custom image URL.</li>
                <li><strong className="text-white">Critical Hit Table:</strong> Customise your crit thresholds. Click <strong className="text-gold-400">Edit</strong> to add, remove, or reorder tiers. Newly added rows glow gold so you know they are unsaved.</li>
                <li><strong className="text-white">Die Cap Enforcement:</strong> Ensures that modifiers don’t push an attack roll beyond a natural max limit.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">ภาษาไทย:</h4>
              <ul className="list-disc list-outside ml-5 text-sm text-white/80 space-y-3">
                <li><strong className="text-white">ธีมและพื้นหลัง:</strong> เปลี่ยนสีพื้นหลังหรือใส่ลิงก์รูปภาพของตัวคุณเอง</li>
                <li><strong className="text-white">ตารางคริติคอล:</strong> ปรับแก้ช่วงคริติคอลของคุณเอง กด <strong className="text-gold-400">Edit</strong> เพื่อเพิ่ม ลบ หรือสลับแถว (แถวที่เพิ่มใหม่จะเรืองแสงสีทองจนกว่าคุณจะบันทึก)</li>
                <li><strong className="text-white">กฎจำกัดหน้าลูกเต๋า (Die Cap):</strong> เปิดเพื่อป้องกันไม่ให้โบนัสผลรวมเกินขีดจำกัดสูงสุดของหน้าลูกเต๋า</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
