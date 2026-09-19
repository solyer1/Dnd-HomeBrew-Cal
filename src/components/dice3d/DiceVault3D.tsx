'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { buildDie, createStudioEnvironment } from './diceBuilder';
import { DICE_DEFINITIONS, normalizeDieId } from './diceData';

const ALL_DICE = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20', 'D100'
];

interface DiceVault3DProps {
  initialDie?: string;
  onClose?: () => void;
}

export function DiceVault3D({ initialDie = 'D20', onClose }: DiceVault3DProps) {
  const [selectedDie, setSelectedDie] = useState(normalizeDieId(initialDie));
  const [autoRotate, setAutoRotate] = useState(true);
  const [rolledResult, setRolledResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dieGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rollingStateRef = useRef<{
    active: boolean;
    vel: THREE.Vector3;
    angVel: THREE.Vector3;
    startTime: number;
    initialY: number;
    groundY: number;
  }>({
    active: false,
    vel: new THREE.Vector3(),
    angVel: new THREE.Vector3(),
    startTime: 0,
    initialY: 0,
    groundY: 0,
  });

  // Setup Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    let animId: number;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0414);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Studio Environment lighting for brilliant metallic and clearcoat reflections
    const envMap = createStudioEnvironment(renderer);
    scene.environment = envMap;

    // Velvet turntable mat
    const matGeom = new THREE.CylinderGeometry(8, 8, 0.2, 48);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x110424, roughness: 0.88, metalness: 0.05 });
    const matMesh = new THREE.Mesh(matGeom, matMat);
    matMesh.position.y = -0.1;
    matMesh.receiveShadow = true;
    scene.add(matMesh);

    // Gilded Rim
    const rimGeom = new THREE.TorusGeometry(8.1, 0.25, 16, 64);
    rimGeom.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf5c842, roughness: 0.15, metalness: 0.95 });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    rimMesh.position.y = 0.05;
    rimMesh.receiveShadow = true;
    scene.add(rimMesh);

    // Lighting (balanced luxury studio setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.48);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc4adff, 0.75);
    fillLight.position.set(-6, 10, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 1.35);
    rimLight.position.set(0, 10, -8);
    scene.add(rimLight);

    // Pointer drag for manual orbiting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let yaw = 0;
    let pitch = 0.45;
    let dist = 11;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      yaw -= dx * 0.008;
      pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, pitch - dy * 0.008));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.max(4, Math.min(24, dist + e.deltaY * 0.01));
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Load initial die
    const die = buildDie(selectedDie);
    const r = (die.userData?.radius as number) || 2.0;
    die.position.set(0, r + 0.1, 0);
    scene.add(die);
    dieGroupRef.current = die;

    // Animation loop
    let lastTime = performance.now();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Orbit camera calculation
      if (autoRotate && !isDragging && !rollingStateRef.current.active) {
        yaw += 0.008;
      }
      camera.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      camera.position.y = dist * Math.sin(pitch);
      camera.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      camera.lookAt(0, r * 0.8, 0);

      // Rolling physics update
      const rollState = rollingStateRef.current;
      if (rollState.active && dieGroupRef.current) {
        const curDie = dieGroupRef.current;
        rollState.vel.y -= 28.0 * dt;
        curDie.position.addScaledVector(rollState.vel, dt);

        const deltaAng = rollState.angVel.length() * dt;
        if (deltaAng > 0.001) {
          const axis = rollState.angVel.clone().normalize();
          const q = new THREE.Quaternion().setFromAxisAngle(axis, deltaAng);
          curDie.quaternion.premultiply(q);
        }

        if (curDie.position.y <= rollState.groundY) {
          curDie.position.y = rollState.groundY;
          if (rollState.vel.y < 0) {
            rollState.vel.y = -rollState.vel.y * 0.45;
          }
          const decay = Math.pow(0.96, dt * 60);
          rollState.vel.x *= decay;
          rollState.vel.z *= decay;
          rollState.angVel.multiplyScalar(decay);

          const elapsed = (now - rollState.startTime) / 1000;
          if ((rollState.vel.length() < 0.35 && rollState.angVel.length() < 0.8) || elapsed > 1.8) {
            // Smoothly align to nearest top face
            const faces = (curDie.userData?.faceData || []) as Array<{
              value: number;
              normal: THREE.Vector3;
            }>;
            let maxDot = -Infinity;
            let topFace = faces[0];
            const up = new THREE.Vector3(0, 1, 0);
            faces.forEach((f) => {
              const wn = f.normal.clone().applyQuaternion(curDie.quaternion).normalize();
              const dot = wn.dot(up);
              if (dot > maxDot) {
                maxDot = dot;
                topFace = f;
              }
            });

            if (topFace) {
              const wn = topFace.normal.clone().applyQuaternion(curDie.quaternion).normalize();
              const qAlign = new THREE.Quaternion().setFromUnitVectors(wn, up);
              const targetQ = qAlign.clone().multiply(curDie.quaternion);
              curDie.quaternion.slerp(targetQ, Math.min(1.0, dt * 7.0));
            }

            if (rollState.angVel.length() < 0.05 || elapsed > 2.6) {
              rollState.active = false;
              setIsRolling(false);
              setRolledResult(topFace ? topFace.value : 1);
            }
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);

      if (dieGroupRef.current) {
        scene.remove(dieGroupRef.current);
      }
      matGeom.dispose();
      matMat.dispose();
      rimGeom.dispose();
      rimMat.dispose();
      envMap.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedDie, autoRotate]);

  const handleSelectDie = (id: string) => {
    setSelectedDie(id);
    setRolledResult(null);
  };

  const handleRollClick = () => {
    if (isRolling || !dieGroupRef.current) return;
    setIsRolling(true);
    setRolledResult(null);

    const die = dieGroupRef.current;
    const r = (die.userData?.radius as number) || 2.0;
    const groundY = r + 0.05;

    die.position.set(0, groundY + 3.8, 0);
    rollingStateRef.current = {
      active: true,
      vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2, (Math.random() - 0.5) * 1.5),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 8.0,
        (Math.random() - 0.5) * 6.0,
        (Math.random() - 0.5) * 8.0
      ),
      startTime: performance.now(),
      initialY: groundY + 3.8,
      groundY,
    };
  };

  const meta = DICE_DEFINITIONS[selectedDie] || {
    name: selectedDie,
    type: 'Polyhedral Die',
    faces: 20,
    description: '',
  };

  return (
    <div className="relative w-full h-[620px] bg-void rounded-xl border border-gold-500/20 overflow-hidden flex flex-col shadow-2xl">
      {/* Top Header Bar with Die Selector */}
      <div className="p-3 bg-surface/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between gap-2 overflow-x-auto z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {ALL_DICE.map((dieId) => (
            <button
              key={dieId}
              onClick={() => handleSelectDie(dieId)}
              className={`px-2.5 py-1 text-xs font-display font-semibold rounded-lg transition-all whitespace-nowrap ${
                selectedDie === dieId
                  ? 'bg-gold-500/20 text-gold-300 border border-gold-400 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  : 'bg-surface-elevated/60 text-muted hover:text-white hover:bg-surface-elevated border border-transparent'
              }`}
            >
              {dieId}
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-elevated transition-colors ml-2"
          >
            ✕
          </button>
        )}
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative flex-1 w-full h-full">
        <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Die Details Card (Floating Glassmorphism) */}
        <div className="absolute top-4 left-4 max-w-xs p-4 rounded-xl bg-void/70 backdrop-blur-md border border-gold-500/30 text-white pointer-events-none shadow-xl">
          <div className="text-xs font-display tracking-wider text-gold-400 font-bold uppercase mb-0.5">
            {meta.type}
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-1.5">{meta.name}</h3>
          <p className="text-xs text-muted/90 leading-relaxed mb-3">{meta.description}</p>
          <div className="flex items-center justify-between text-[11px] text-muted border-t border-white/10 pt-2">
            <span>Faces: <strong className="text-gold-300">{meta.faces}</strong></span>
            <span>Accents: <strong className="text-gold-300">24k Gilded Brass</strong></span>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          <button
            onClick={handleRollClick}
            disabled={isRolling}
            className="px-6 py-2.5 rounded-full font-display font-bold text-sm bg-gradient-to-r from-gold-600 via-gold-500 to-amber-600 text-black shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isRolling ? '🎲 Rolling 3D…' : `🎲 Roll ${selectedDie}`}
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold border backdrop-blur-md transition-colors ${
              autoRotate
                ? 'bg-gold-500/20 text-gold-300 border-gold-400/50'
                : 'bg-void/60 text-muted border-border hover:text-white'
            }`}
          >
            {autoRotate ? '🔄 Orbit: ON' : '⏸ Orbit: OFF'}
          </button>
        </div>

        {/* Rolled Result Banner */}
        {rolledResult !== null && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl bg-void/85 border border-gold-400 backdrop-blur-lg shadow-2xl flex items-center gap-3 animate-result-reveal pointer-events-none">
            <span className="text-xs text-muted uppercase tracking-wider font-bold">Settled:</span>
            <span className="text-3xl font-display font-extrabold text-gold-300 drop-shadow-[0_0_12px_rgba(201,168,76,0.6)]">
              {rolledResult}
            </span>
            {selectedDie === 'D20' && rolledResult === 20 && (
              <span className="text-xs font-bold text-amber-400 animate-pulse">★ CRITICAL HIT ★</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
