'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildDie, createStudioEnvironment } from './diceBuilder';
import { normalizeDieId } from './diceData';

interface BirdEyeDiceCanvasProps {
  values: number[];
  diceType: string | string[];
  rollDuration?: number;
  isNat20?: boolean;
  isNat1?: boolean;
  dropped?: boolean[];
  onLanded?: () => void;
}

interface PhysicsDie {
  group: THREE.Group;
  radius: number;
  targetValue: number;
  targetNormal: THREE.Vector3;
  isDropped: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  bounces: number;
  settled: boolean;
  groundY: number;
  shadowMesh: THREE.Mesh;

  // Analytical tumble trajectory:
  qAlign: THREE.Quaternion;
  qHeading: THREE.Quaternion;
  tumbleAxis: THREE.Vector3;
  theta0: number;
  yaw0: number;
  dieDuration: number;
}

interface Spark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  birth: number;
  duration: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  birth: number;
  duration: number;
  maxScale: number;
}

export function BirdEyeDiceCanvas({
  values,
  diceType,
  rollDuration = 1.1,
  isNat20 = false,
  isNat1 = false,
  dropped = [],
  onLanded,
}: BirdEyeDiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLandedCalledRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    onLandedCalledRef.current = false;
    let animId: number;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera Setup (Bird's-Eye View)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0414);
    scene.fog = new THREE.FogExp2(0x0a0414, 0.012);

    // Steep top-down high-angle camera looking down into center of tray
    const baseCamPos = new THREE.Vector3(0, 24.5, 2.0);
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0);

    let shakeIntensity = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    // Studio Environment Lighting for sparkling metallic & physical clearcoat reflections
    const envMap = createStudioEnvironment(renderer);
    scene.environment = envMap;

    // 2. Velvet Dice Tray
    const trayGroup = new THREE.Group();
    const trayRadius = 14.2;

    // Deep luxury royal velvet felt floor
    const trayFloorGeom = new THREE.CylinderGeometry(trayRadius + 1.2, trayRadius + 1.2, 0.3, 64);
    const trayFloorMat = new THREE.MeshStandardMaterial({
      color: 0x110424,
      roughness: 0.88,
      metalness: 0.04,
    });
    const trayFloor = new THREE.Mesh(trayFloorGeom, trayFloorMat);
    trayFloor.position.y = -0.15;
    trayFloor.receiveShadow = true;
    trayGroup.add(trayFloor);

    // Inlaid concentric gold-purple ring on felt
    const innerRingGeom = new THREE.RingGeometry(trayRadius * 0.74, trayRadius * 0.76, 64);
    innerRingGeom.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x5a1888,
      transparent: true,
      opacity: 0.40,
    });
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRing.position.y = 0.01;
    trayGroup.add(innerRing);

    // Gilded Boundary Rail
    const rimGeom = new THREE.TorusGeometry(trayRadius, 0.45, 20, 64);
    rimGeom.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf5c842,
      roughness: 0.15,
      metalness: 0.95,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.y = 0.2;
    rim.receiveShadow = true;
    trayGroup.add(rim);

    scene.add(trayGroup);

    // 3. Balanced Studio Lighting Setup (high contrast, crisp highlights, zero muddy wash)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(6, 25, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbca6ff, 0.65);
    fillLight.position.set(-7, 18, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 1.2);
    rimLight.position.set(0, 16, -12);
    scene.add(rimLight);

    // 4. Build and initialize heavy dice
    const diceCount = values.length;
    const physicsDice: PhysicsDie[] = [];
    const shockwaves: Shockwave[] = [];
    const sparks: Spark[] = [];

    function triggerFloorImpact(pos: THREE.Vector3, isCritical = false, isFumble = false, power = 1.0) {
      const ringGeom = new THREE.RingGeometry(0.1, 0.4, 32);
      ringGeom.rotateX(-Math.PI / 2);
      const ringColor = isCritical ? 0xffd700 : isFumble ? 0xef4444 : 0xd4af37;
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: Math.min(0.9, 0.6 * power),
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(pos.x, 0.02, pos.z);
      scene.add(ringMesh);

      shockwaves.push({
        mesh: ringMesh,
        birth: performance.now(),
        duration: 450,
        maxScale: 2.2 * power,
      });
    }

    function triggerDiceCollisionSparks(pos: THREE.Vector3, relativeSpeed: number) {
      const sparkCount = Math.min(6, Math.floor(relativeSpeed * 0.4) + 2);
      const sparkGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });

      for (let s = 0; s < sparkCount; s++) {
        const sparkMesh = new THREE.Mesh(sparkGeom, sparkMat);
        sparkMesh.position.copy(pos);
        scene.add(sparkMesh);

        const sVel = new THREE.Vector3(
          (Math.random() - 0.5) * 8.0,
          Math.random() * 6.0 + 1.0,
          (Math.random() - 0.5) * 8.0
        );

        sparks.push({
          mesh: sparkMesh,
          vel: sVel,
          birth: performance.now(),
          duration: 350,
        });
      }
    }

      // Spawn parameters: Authentic hand toss from the upper edge into the tray!
    values.forEach((targetVal, idx) => {
      const rawType = Array.isArray(diceType) ? diceType[idx] : diceType;
      const dieId = normalizeDieId(rawType || 'd20');
      const dieGroup = buildDie(dieId);

      const radius = (dieGroup.userData?.radius as number) || 2.0;
      const groundY = radius * 0.94;

      // Identify the local normal of target face
      const faceData = (dieGroup.userData?.faceData || []) as Array<{
        value: number;
        normal: THREE.Vector3;
      }>;
      const targetFace = faceData.find((f) => f.value === targetVal) || faceData[0];
      const targetNormal = targetFace ? targetFace.normal.clone().normalize() : new THREE.Vector3(0, 1, 0);

      // Spawn position: TOSS into the tray from the top edge
      const timeScale = 1.55 / Math.max(0.4, rollDuration);
      let startX: number;
      let startZ: number;
      let inwardVx: number;
      let inwardVz: number;

      if (diceCount === 1) {
        startX = (Math.random() - 0.5) * 1.6;
        startZ = -4.2 - Math.random() * 0.6;
        inwardVx = (-startX * 0.7 + (Math.random() - 0.5) * 0.8) * timeScale;
        inwardVz = (6.8 + Math.random() * 0.8) * timeScale;
      } else {
        const spreadX = ((idx - (diceCount - 1) / 2) / Math.max(1, diceCount)) * 4.8;
        startX = spreadX + (Math.random() - 0.5) * 0.6;
        startZ = -4.0 - Math.random() * 0.8;
        inwardVx = (-startX * 0.45 + (Math.random() - 0.5) * 0.8) * timeScale;
        inwardVz = (6.6 + Math.random() * 1.0) * timeScale;
      }

      const startY = 8.2 + Math.random() * 0.6 + idx * 0.12;
      const pos = new THREE.Vector3(startX, startY, startZ);
      const vel = new THREE.Vector3(inwardVx, (1.8 + Math.random() * 0.8) * timeScale, inwardVz);

      // Analytical Resting Alignment: Target face pointing directly UP (0, 1, 0)
      const UP = new THREE.Vector3(0, 1, 0);
      const qAlign = new THREE.Quaternion().setFromUnitVectors(targetNormal, UP);
      const headingAngle = Math.random() * Math.PI * 2;
      const qHeading = new THREE.Quaternion().setFromAxisAngle(UP, headingAngle);

      // Tumble Axis: Horizontal axis perpendicular to toss direction (pure pitch/roll in world space)
      const tumbleAxis = new THREE.Vector3(-inwardVz, 0, inwardVx).normalize();

      // Total Tumble Angle: Choose Theta0 such that at spawn, target face is tilted away/downward
      // Since Rot(tumbleAxis, theta) * UP has y-component = cos(theta),
      // picking theta0 in [4.6*PI, 5.4*PI] guarantees cos(theta0) < -0.3!
      const theta0 = (4.75 + (Math.random() - 0.5) * 0.35) * Math.PI;
      // Secondary yaw rotation for rich 3D precession:
      const yaw0 = (Math.random() - 0.5) * 2.2 * Math.PI;

      const dieDuration = rollDuration + idx * 0.04;

      // Set initial orientation at t = 0 (completely continuous from spawn to rest)
      const qPitch0 = new THREE.Quaternion().setFromAxisAngle(tumbleAxis, theta0);
      const qYaw0 = new THREE.Quaternion().setFromAxisAngle(UP, yaw0);
      const qTumble0 = qPitch0.multiply(qYaw0);
      const qRest0 = qHeading.clone().multiply(qAlign);
      dieGroup.quaternion.multiplyQuaternions(qTumble0, qRest0);

      dieGroup.position.copy(pos);
      scene.add(dieGroup);

      // Contact shadow
      const shadowGeom = new THREE.CircleGeometry(radius * 1.05, 24);
      shadowGeom.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x020005,
        transparent: true,
        opacity: 0.7,
      });
      const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
      shadowMesh.position.set(startX, 0.01, startZ);
      scene.add(shadowMesh);

      physicsDice.push({
        group: dieGroup,
        radius,
        targetValue: targetVal,
        targetNormal,
        isDropped: dropped[idx] || false,
        pos,
        vel,
        groundY,
        shadowMesh,
        bounces: 0,
        settled: false,
        qAlign,
        qHeading,
        tumbleAxis,
        theta0,
        yaw0,
        dieDuration,
      });
    });

    // 5. Physics Simulation Loop
    const startTime = performance.now();
    let lastTime = performance.now();

    const timeScale = 1.55 / Math.max(0.4, rollDuration);
    const gravity = -32.0 * timeScale * timeScale; // Realistic tabletop gravity
    const floorRestitution = 0.38;                 // Felt absorbs energy naturally
    const diceRestitution = 0.55;                  // Crisp clack on inter-dice collisions
    const rimRestitution = 0.45;                   // Smooth cushion off rim rail
    const floorFriction = 0.965;                   // Smooth natural rolling glide across velvet

    function animate() {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dtRaw = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const elapsed = (now - startTime) / 1000;
      // 2 Sub-steps per frame for stable collision detection & momentum exchange
      const subSteps = 2;
      const dt = dtRaw / subSteps;

      for (let step = 0; step < subSteps; step++) {
        // --- 1. Update Positions & Floor Collisions ---
        physicsDice.forEach((die, idx) => {
          if (die.settled) return;

          // Apply gravity
          die.vel.y += gravity * dt;
          die.pos.addScaledVector(die.vel, dt);

          // Floor collision
          if (die.pos.y <= die.groundY) {
            die.pos.y = die.groundY;

            if (die.vel.y < 0) {
              die.bounces++;
              if (Math.abs(die.vel.y) < 2.0 * timeScale) {
                die.vel.y = 0; // micro-bounce cutoff: rests and rolls
              } else {
                die.vel.y = -die.vel.y * floorRestitution;

                if (die.bounces === 1) {
                  if (isNat20 && idx === 0) {
                    shakeIntensity = 0.04;
                  }
                  const isCrit = isNat20 && idx === 0;
                  const isFum = isNat1 && idx === 0;
                  triggerFloorImpact(die.pos, isCrit, isFum, 1.0);
                } else if (die.bounces === 2) {
                  triggerFloorImpact(die.pos, false, false, 0.45);
                }
              }
            }

            // Felt rolling and sliding friction: natural gradual deceleration
            const friction = Math.pow(floorFriction, dt * 60);
            die.vel.x *= friction;
            die.vel.z *= friction;
          }

          // Smooth brake near end of roll so linear motion glides to 0 synchronously with rotation
          const progress = Math.min(1.0, elapsed / die.dieDuration);
          if (progress > 0.75) {
            const brake = Math.pow(0.86, dt * 60);
            die.vel.x *= brake;
            die.vel.z *= brake;
          }

          // Tray Rim Rail Collision (prevents rolling out of bounds)
          const horizDist = Math.sqrt(die.pos.x * die.pos.x + die.pos.z * die.pos.z);
          const maxAllowed = trayRadius - die.radius * 0.9;
          if (horizDist > maxAllowed && horizDist > 0.001) {
            const nx = die.pos.x / horizDist;
            const nz = die.pos.z / horizDist;

            die.pos.x = nx * maxAllowed;
            die.pos.z = nz * maxAllowed;

            const dot = die.vel.x * nx + die.vel.z * nz;
            if (dot > 0) {
              die.vel.x -= (1 + rimRestitution) * dot * nx;
              die.vel.z -= (1 + rimRestitution) * dot * nz;
              // Subtle deflection in compass heading
              die.qHeading.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.4));
            }
          }
        });

        // --- 2. Full Inter-Dice Collisions ---
        for (let i = 0; i < physicsDice.length; i++) {
          for (let j = i + 1; j < physicsDice.length; j++) {
            const dA = physicsDice[i];
            const dB = physicsDice[j];

            const dx = dB.pos.x - dA.pos.x;
            const dy = dB.pos.y - dA.pos.y;
            const dz = dB.pos.z - dA.pos.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            const minAllowedDist = dA.radius + dB.radius;

            if (distSq < minAllowedDist * minAllowedDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;

              // Separate dice so they never overlap
              const overlap = minAllowedDist - dist;
              const halfSep = overlap * 0.5;
              dA.pos.x -= nx * halfSep;
              dA.pos.y -= ny * halfSep;
              dA.pos.z -= nz * halfSep;
              dB.pos.x += nx * halfSep;
              dB.pos.y += ny * halfSep;
              dB.pos.z += nz * halfSep;

              // Relative velocity
              const relVx = dB.vel.x - dA.vel.x;
              const relVy = dB.vel.y - dA.vel.y;
              const relVz = dB.vel.z - dA.vel.z;
              const relNormal = relVx * nx + relVy * ny + relVz * nz;

              if (relNormal < 0) {
                const impulse = -(1 + diceRestitution) * relNormal * 0.5;

                dA.vel.x -= nx * impulse;
                dA.vel.y -= ny * impulse;
                dA.vel.z -= nz * impulse;

                dB.vel.x += nx * impulse;
                dB.vel.y += ny * impulse;
                dB.vel.z += nz * impulse;

                // Subtle yaw heading deflection on collision
                dA.qHeading.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.3));
                dB.qHeading.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.3));

                const contactPt = new THREE.Vector3(
                  dA.pos.x + nx * dA.radius,
                  dA.pos.y + ny * dA.radius,
                  dA.pos.z + nz * dA.radius
                );
                triggerDiceCollisionSparks(contactPt, Math.abs(relNormal));
              }
            }
          }
        }
      }

      // --- 3. Continuous Analytical Orientation & Settle Logic ---
      let allSettled = true;

      physicsDice.forEach((die) => {
        const progress = Math.min(1.0, elapsed / die.dieDuration);

        if (progress >= 1.0) {
          die.settled = true;
          die.vel.set(0, 0, 0);
          die.pos.y = die.groundY;
          // Final exact resting orientation (flat on felt, target face UP):
          const qRest = die.qHeading.clone().multiply(die.qAlign);
          die.group.quaternion.copy(qRest);
        } else {
          allSettled = false;
          // Smooth non-linear decay: vigorous tumble early, smooth organic glide to rest
          const decay = Math.pow(1 - progress, 2.3);
          const curTheta = die.theta0 * decay;
          const curYaw = die.yaw0 * decay;

          const qPitch = new THREE.Quaternion().setFromAxisAngle(die.tumbleAxis, curTheta);
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), curYaw);
          const qTumble = qPitch.multiply(qYaw);

          const qRest = die.qHeading.clone().multiply(die.qAlign);
          die.group.quaternion.multiplyQuaternions(qTumble, qRest);
        }
      });

      // Apply updated position
      physicsDice.forEach((die) => {
        die.group.position.copy(die.pos);

        // Update contact shadow beneath die
        const heightAboveGround = Math.max(0, die.pos.y - die.groundY);
        const shadowScale = 1.0 + heightAboveGround * 0.12;
        const shadowOpacity = Math.max(0.2, 0.78 - heightAboveGround * 0.05);

        die.shadowMesh.position.set(die.pos.x, 0.015, die.pos.z);
        die.shadowMesh.scale.set(shadowScale, shadowScale, 1);
        (die.shadowMesh.material as THREE.MeshBasicMaterial).opacity = shadowOpacity;
      });

      // Update shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        const age = now - sw.birth;
        if (age >= sw.duration) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          (sw.mesh.material as THREE.Material).dispose();
          shockwaves.splice(i, 1);
        } else {
          const progress = age / sw.duration;
          const scale = 1.0 + progress * sw.maxScale;
          sw.mesh.scale.set(scale, scale, 1);
          (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
        }
      }

      // Update collision sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        const age = now - sp.birth;
        if (age >= sp.duration) {
          scene.remove(sp.mesh);
          sp.mesh.geometry.dispose();
          (sp.mesh.material as THREE.Material).dispose();
          sparks.splice(i, 1);
        } else {
          sp.vel.y += gravity * 0.3 * dtRaw;
          sp.mesh.position.addScaledVector(sp.vel, dtRaw);
          const progress = age / sp.duration;
          const scale = 1.0 - progress;
          sp.mesh.scale.set(scale, scale, scale);
        }
      }

      // Apply subtle camera impact shake decay
      if (shakeIntensity > 0.001) {
        camera.position.x = baseCamPos.x + (Math.random() - 0.5) * shakeIntensity * 2.5;
        camera.position.y = baseCamPos.y + (Math.random() - 0.5) * shakeIntensity * 1.5;
        camera.position.z = baseCamPos.z + (Math.random() - 0.5) * shakeIntensity * 2.5;
        shakeIntensity *= 0.88;
      } else {
        camera.position.copy(baseCamPos);
      }

      // Check roll completion: only when ALL dice are settled AND rollDuration has elapsed
      if (allSettled && elapsed >= rollDuration * 0.95 && !onLandedCalledRef.current) {
        onLandedCalledRef.current = true;
        if (onLanded) {
          setTimeout(onLanded, 220);
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      shockwaves.forEach((sw) => {
        scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
      });

      sparks.forEach((sp) => {
        scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        (sp.mesh.material as THREE.Material).dispose();
      });

      physicsDice.forEach((d) => {
        scene.remove(d.group);
        scene.remove(d.shadowMesh);
        d.shadowMesh.geometry.dispose();
        (d.shadowMesh.material as THREE.Material).dispose();
      });

      scene.remove(trayGroup);
      trayFloorGeom.dispose();
      trayFloorMat.dispose();
      innerRingGeom.dispose();
      innerRingMat.dispose();
      rimGeom.dispose();
      rimMat.dispose();

      envMap.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [values, diceType, rollDuration, isNat20, isNat1, dropped, onLanded]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
    />
  );
}
