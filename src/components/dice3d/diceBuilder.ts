import * as THREE from 'three';
import { getDiePolygonData, DICE_DEFINITIONS, type DieDefinition } from './diceData';

let cachedMarbleTexture: THREE.CanvasTexture | null = null;

export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Luminous luxury product studio cyclorama (warm violet/indigo ambient bounce, no black void!)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0.0, '#361b58');
  bgGrad.addColorStop(0.35, '#24103c');
  bgGrad.addColorStop(0.70, '#18092a');
  bgGrad.addColorStop(1.0, '#120520');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Overhead Studio Skylight Panel (gentle champagne highlight on top faces)
  const skyGrad = ctx.createRadialGradient(512, 40, 20, 512, 40, 280);
  skyGrad.addColorStop(0.0, 'rgba(255, 252, 242, 0.70)');
  skyGrad.addColorStop(0.4, 'rgba(255, 238, 190, 0.40)');
  skyGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(200, 0, 624, 180);

  // Key Studio Softbox (top right): brilliant warm white/gold specular
  const keyGrad = ctx.createRadialGradient(730, 140, 10, 730, 140, 260);
  keyGrad.addColorStop(0.0, 'rgba(255, 255, 250, 1.0)');
  keyGrad.addColorStop(0.2, 'rgba(255, 235, 175, 0.90)');
  keyGrad.addColorStop(0.5, 'rgba(218, 175, 55, 0.50)');
  keyGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = keyGrad;
  ctx.beginPath();
  ctx.arc(730, 140, 260, 0, Math.PI * 2);
  ctx.fill();

  // Fill Studio Softbox (top left): clean crisp white with subtle cool tint
  const fillGrad = ctx.createRadialGradient(280, 160, 10, 280, 160, 230);
  fillGrad.addColorStop(0.0, 'rgba(245, 248, 255, 0.95)');
  fillGrad.addColorStop(0.3, 'rgba(210, 225, 255, 0.60)');
  fillGrad.addColorStop(0.7, 'rgba(160, 140, 240, 0.25)');
  fillGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fillGrad;
  ctx.beginPath();
  ctx.arc(280, 160, 230, 0, Math.PI * 2);
  ctx.fill();

  // Horizon Rim Light Strip: rich champagne gold reflection
  const rimGrad = ctx.createLinearGradient(0, 240, 1024, 240);
  rimGrad.addColorStop(0.0, 'rgba(255, 215, 0, 0.0)');
  rimGrad.addColorStop(0.25, 'rgba(255, 215, 0, 0.55)');
  rimGrad.addColorStop(0.5, 'rgba(255, 248, 210, 0.90)');
  rimGrad.addColorStop(0.75, 'rgba(255, 215, 0, 0.55)');
  rimGrad.addColorStop(1.0, 'rgba(255, 215, 0, 0.0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 220, 1024, 45);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const renderTarget = pmremGenerator.fromEquirectangular(tex);
  pmremGenerator.dispose();
  tex.dispose();

  return renderTarget.texture;
}

export function getPurpleMarbleTexture(): THREE.CanvasTexture | null {
  if (typeof window === 'undefined') return null;
  if (cachedMarbleTexture) return cachedMarbleTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Luminous Royal Amethyst Gemstone Base (radiant purple jewel, never dark void!)
  const bgGrad = ctx.createRadialGradient(512, 512, 60, 512, 512, 700);
  bgGrad.addColorStop(0.0, '#7e22ce'); // radiant royal purple core
  bgGrad.addColorStop(0.35, '#6b21a8');
  bgGrad.addColorStop(0.70, '#4c1d95');
  bgGrad.addColorStop(1.0, '#3b0764'); // rich imperial amethyst rim
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Swirling Nebular Violet, Orchid, and Magenta Currents
  const swirlColors = [
    'rgba(192, 132, 252, 0.45)', // light lavender
    'rgba(216, 70, 239, 0.35)',  // radiant orchid magenta
    'rgba(168, 85, 247, 0.40)',  // electric violet
    'rgba(233, 213, 255, 0.30)', // crystalline quartz
  ];

  for (let i = 0; i < 20; i++) {
    ctx.save();
    ctx.beginPath();
    const x0 = 80 + Math.random() * 864;
    const y0 = 80 + Math.random() * 864;
    const r0 = 120 + Math.random() * 320;
    const grad = ctx.createRadialGradient(x0, y0, 15, x0, y0, r0);
    const col = swirlColors[i % swirlColors.length];
    grad.addColorStop(0.0, col);
    grad.addColorStop(0.5, col.replace(/[\d.]+\)$/, '0.18)'));
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.arc(x0, y0, r0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Crystalline Quartz Marble Veins
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    let x = Math.random() * 1024;
    let y = Math.random() * 1024;
    ctx.moveTo(x, y);

    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const cx = x + (Math.random() - 0.5) * 220;
      const cy = y + (Math.random() - 0.5) * 220;
      x = cx + (Math.random() - 0.5) * 130;
      y = cy + (Math.random() - 0.5) * 130;
      ctx.quadraticCurveTo(cx, cy, x, y);
    }

    ctx.strokeStyle = i % 2 === 0 ? 'rgba(250, 245, 255, 0.55)' : 'rgba(216, 180, 254, 0.45)';
    ctx.lineWidth = 1.8 + Math.random() * 2.2;
    ctx.stroke();
  }

  // Suspended Metallic 24K Gold Leaf Flakes in Resin
  for (let i = 0; i < 240; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.35 ? 'rgba(255, 215, 0, 0.90)' : 'rgba(255, 245, 160, 0.95)';
    ctx.beginPath();
    ctx.arc(gx, gy, 1.0 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedMarbleTexture = new THREE.CanvasTexture(canvas);
  cachedMarbleTexture.wrapS = THREE.RepeatWrapping;
  cachedMarbleTexture.wrapT = THREE.RepeatWrapping;
  cachedMarbleTexture.needsUpdate = true;
  return cachedMarbleTexture;
}

const numeralTextureCache = new Map<string, THREE.CanvasTexture>();

export function createGildedNumeralTexture(num: number, isTopFace = false, isD100 = false): THREE.CanvasTexture | null {
  if (typeof window === 'undefined') return null;

  const key = `${num}_${isTopFace}_${isD100}`;
  if (numeralTextureCache.has(key)) {
    return numeralTextureCache.get(key)!;
  }

  // High-Resolution 512x512 Canvas for razor-sharp gilded numerals
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 512, 512);

  const text = `${num}`;
  let fontSize = 260;
  if (isD100) {
    if (text.length === 1) fontSize = 210;
    else if (text.length === 2) fontSize = 175;
    else fontSize = 135;
  } else {
    if (text.length === 2) fontSize = 215;
    if (text.length >= 3) fontSize = 160;
  }

  ctx.font = `900 ${fontSize}px "Cinzel", "Cinzel Decorative", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const yPos = isD100 ? 256 : 265;

  // Layer 1: Deep contrast dark bronze drop shadow and border (guarantees crisp readability on any facet)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 6;
  ctx.strokeStyle = '#271702';
  ctx.lineWidth = isD100 ? 10 : 13;
  ctx.strokeText(text, 256, yPos);

  // Layer 2: Gilded inner bevel outline
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#ffe58f';
  ctx.lineWidth = isD100 ? 4.5 : 6;
  ctx.strokeText(text, 256, yPos);

  // Layer 3: 24K Chiseled Gold Metallic Gradient Fill
  const grad = ctx.createLinearGradient(140, 80, 380, 440);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.20, '#fff4b8');
  grad.addColorStop(0.50, '#f5c236');
  grad.addColorStop(0.80, '#cb9b1e');
  grad.addColorStop(1.0, '#8c5e08');

  ctx.fillStyle = grad;
  ctx.fillText(text, 256, yPos);

  // If this is the "20" on D20, add stylized gilded crest icon
  if (isTopFace && !isD100) {
    ctx.font = 'bold 46px "Cinzel", Georgia, serif';
    ctx.fillStyle = grad;
    ctx.fillText('◆ ⚔ ◆', 256, 110);
  }

  // Underline dot for rotatable ambiguous numbers
  const ambiguous = [6, 9, 66, 68, 86, 89, 96, 98, 99];
  if (ambiguous.includes(num)) {
    ctx.beginPath();
    ctx.arc(256, isD100 ? 385 : 405, 14, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#271702';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  numeralTextureCache.set(key, texture);
  return texture;
}

export interface BuildDieOptions {
  purpleColor?: string;
  purpleEmissive?: string;
  goldColor?: string;
  goldMetalness?: number;
  goldRoughness?: number;
  frameWidth?: number;
  insetDepth?: number;
}

export interface DieFaceMetadata {
  value: number;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
}

export function buildDie(dieId: string, customConfig: BuildDieOptions = {}): THREE.Group {
  const polyData = getDiePolygonData(dieId);
  const metadata: DieDefinition = DICE_DEFINITIONS[dieId] || { name: dieId, type: 'Polyhedron', faces: 20, description: '' };

  const group = new THREE.Group();
  group.name = `Die_${dieId}`;

  const isD100 = dieId === 'D100';
  const frameWidthRatio = customConfig.frameWidth || (isD100 ? 0.13 : 0.19);
  const insetDepth = (customConfig.insetDepth || (isD100 ? 0.04 : 0.08)) * polyData.radius;

  // Luminous 24K Polished Gilded Frame
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customConfig.goldColor || '#ffd45e'),
    emissive: new THREE.Color('#382806'),
    metalness: customConfig.goldMetalness !== undefined ? customConfig.goldMetalness : 0.84,
    roughness: customConfig.goldRoughness !== undefined ? customConfig.goldRoughness : 0.20,
    side: THREE.DoubleSide,
  });

  // Radiant Royal Amethyst Jewel Resin with crystal glass clearcoat
  const marbleTex = getPurpleMarbleTexture();
  const purpleMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customConfig.purpleColor || '#5b138f'),
    emissive: new THREE.Color(customConfig.purpleEmissive || '#270742'),
    map: marbleTex,
    roughness: 0.12,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    specularColor: new THREE.Color('#f3e8ff'),
    ior: 1.54,
    side: THREE.DoubleSide,
  });

  const goldVerts: number[] = [];
  const goldIndices: number[] = [];
  const purpleVerts: number[] = [];
  const purpleUVs: number[] = [];
  const purpleIndices: number[] = [];
  const faceDataForRolling: DieFaceMetadata[] = [];

  polyData.faces.forEach((face) => {
    const v = face.vertices;
    const k = v.length;
    if (k < 3) return;

    const center = new THREE.Vector3();
    v.forEach((pt) => center.add(pt));
    center.divideScalar(k);

    const edge0 = v[1].clone().sub(v[0]);
    const edge1 = v[2].clone().sub(v[0]);
    const normal = new THREE.Vector3().crossVectors(edge0, edge1).normalize();

    if (normal.dot(center) < 0) {
      normal.negate();
    }

    const tempAxis = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const uAxis = new THREE.Vector3().crossVectors(normal, tempAxis).normalize();
    const vAxis = new THREE.Vector3().crossVectors(normal, uAxis).normalize();
    const faceR = Math.max(0.6, polyData.radius * 0.55);

    const insetVerts: THREE.Vector3[] = [];
    const raisedOuterVerts: THREE.Vector3[] = [];

    for (let i = 0; i < k; i++) {
      const vertNormal = v[i].clone().normalize();
      const raisedOuter = v[i].clone().addScaledVector(vertNormal, insetDepth * 0.25);
      raisedOuterVerts.push(raisedOuter);

      const toCenter = center.clone().sub(v[i]);
      const innerPt = v[i].clone()
        .addScaledVector(toCenter, frameWidthRatio)
        .addScaledVector(normal, -insetDepth);
      insetVerts.push(innerPt);
    }

    // Gold Frame Bevel Quads
    for (let i = 0; i < k; i++) {
      const iNext = (i + 1) % k;
      const ro0 = raisedOuterVerts[i];
      const ro1 = raisedOuterVerts[iNext];
      const in1 = insetVerts[iNext];
      const in0 = insetVerts[i];

      const baseIdx = goldVerts.length / 3;
      goldVerts.push(
        ro0.x, ro0.y, ro0.z,
        ro1.x, ro1.y, ro1.z,
        in1.x, in1.y, in1.z,
        in0.x, in0.y, in0.z
      );
      goldIndices.push(
        baseIdx, baseIdx + 1, baseIdx + 2,
        baseIdx, baseIdx + 2, baseIdx + 3
      );
    }

    // Recessed Purple Panel with organic UV offsets per face
    const innerCenter = center.clone().addScaledVector(normal, -insetDepth);
    const centerIdx = purpleVerts.length / 3;
    purpleVerts.push(innerCenter.x, innerCenter.y, innerCenter.z);

    // Give each face an organic offset in UV space so each face reveals unique marble patterns
    const uOffset = ((face.value * 0.173) % 1.0) * 0.5;
    const vOffset = ((face.value * 0.317) % 1.0) * 0.5;
    purpleUVs.push(0.5 * 0.4 + uOffset, 0.5 * 0.4 + vOffset);

    const insetBaseIdx = purpleVerts.length / 3;
    for (let i = 0; i < k; i++) {
      const pt = insetVerts[i];
      purpleVerts.push(pt.x, pt.y, pt.z);

      const du = pt.clone().sub(innerCenter).dot(uAxis) / (faceR * 2) + 0.5;
      const dv = pt.clone().sub(innerCenter).dot(vAxis) / (faceR * 2) + 0.5;
      purpleUVs.push(
        Math.max(0, Math.min(1, du * 0.4 + uOffset)),
        Math.max(0, Math.min(1, dv * 0.4 + vOffset))
      );
    }

    for (let i = 0; i < k; i++) {
      const iNext = (i + 1) % k;
      purpleIndices.push(centerIdx, insetBaseIdx + i, insetBaseIdx + iNext);
    }

    const faceSize = Math.max(0.6, polyData.radius * 0.45);
    faceDataForRolling.push({
      value: face.value,
      center: innerCenter.clone().addScaledVector(normal, 0.03),
      normal: normal,
      size: faceSize,
    });
  });

  // Special Prism caps
  if (polyData.specialType === 'Prism' && polyData.topApex && polyData.botApex && polyData.topRim && polyData.botRim && polyData.nSides) {
    const { topApex, botApex, topRim, botRim, nSides } = polyData;
    for (let i = 0; i < nSides; i++) {
      const iNext = (i + 1) % nSides;
      const t0 = topRim[i], t1 = topRim[iNext];
      const b0 = botRim[i], b1 = botRim[iNext];

      const bTop = goldVerts.length / 3;
      goldVerts.push(topApex.x, topApex.y, topApex.z, t0.x, t0.y, t0.z, t1.x, t1.y, t1.z);
      goldIndices.push(bTop, bTop + 1, bTop + 2);

      const bBot = goldVerts.length / 3;
      goldVerts.push(botApex.x, botApex.y, botApex.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
      goldIndices.push(bBot, bBot + 1, bBot + 2);
    }
  } else if (polyData.specialType === 'D1') {
    const sphereGeom = new THREE.SphereGeometry(polyData.radius, 32, 24);
    const pos = sphereGeom.attributes.position;
    const cutoff = polyData.cutoff ?? polyData.radius * 0.75;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > cutoff) {
        pos.setY(i, cutoff - insetDepth);
      }
    }
    sphereGeom.computeVertexNormals();
    const sphereMesh = new THREE.Mesh(sphereGeom, purpleMaterial);
    group.add(sphereMesh);
  } else if (polyData.specialType === 'D2') {
    const rimGeom = new THREE.CylinderGeometry(polyData.radius, polyData.radius, polyData.thickness ?? 0.8, 36, 1, true);
    rimGeom.computeVertexNormals();
    const rimMesh = new THREE.Mesh(rimGeom, goldMaterial);
    group.add(rimMesh);
  }

  // Gold Line Frame Mesh
  const goldGeom = new THREE.BufferGeometry();
  goldGeom.setAttribute('position', new THREE.Float32BufferAttribute(goldVerts, 3));
  goldGeom.setIndex(goldIndices);
  goldGeom.computeVertexNormals();

  const goldFrameMesh = new THREE.Mesh(goldGeom, goldMaterial);
  goldFrameMesh.name = `${dieId}_GoldFrame`;
  goldFrameMesh.castShadow = true;
  goldFrameMesh.receiveShadow = true;
  group.add(goldFrameMesh);

  // Recessed Purple Panels Mesh
  const purpleGeom = new THREE.BufferGeometry();
  purpleGeom.setAttribute('position', new THREE.Float32BufferAttribute(purpleVerts, 3));
  purpleGeom.setAttribute('uv', new THREE.Float32BufferAttribute(purpleUVs, 2));
  purpleGeom.setIndex(purpleIndices);
  purpleGeom.computeVertexNormals();

  const purplePanelsMesh = new THREE.Mesh(purpleGeom, purpleMaterial);
  purplePanelsMesh.name = `${dieId}_PurplePanels`;
  purplePanelsMesh.castShadow = true;
  purplePanelsMesh.receiveShadow = true;
  group.add(purplePanelsMesh);

  // Gilded Numerals Group
  const numeralsGroup = new THREE.Group();
  numeralsGroup.name = `${dieId}_NumeralsGroup`;
  group.add(numeralsGroup);

  faceDataForRolling.forEach((face) => {
    const isTopFace = face.value === metadata.faces;
    const tex = createGildedNumeralTexture(face.value, isTopFace && dieId === 'D20', isD100);
    if (!tex) return;

    const planeSize = isD100 ? face.size * 1.55 : face.size * 1.35;
    const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);

    // Gilded Numerals with physical metallic response and warm radiant readability
    const numMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      metalness: 0.15,
      roughness: 0.30,
      color: new THREE.Color('#ffffff'),
      emissive: new THREE.Color('#543906'),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.FrontSide,
    });

    const numMesh = new THREE.Mesh(planeGeom, numMat);
    numMesh.position.copy(face.center);

    const norm = face.normal.clone().normalize();
    numMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
    numMesh.lookAt(face.center.clone().add(norm));

    numeralsGroup.add(numMesh);
  });

  group.userData = {
    dieId,
    metadata,
    radius: polyData.radius,
    faceData: faceDataForRolling,
    goldFrameMesh,
    purplePanelsMesh,
    numeralsGroup,
    goldMaterial,
    purpleMaterial,
  };

  return group;
}
