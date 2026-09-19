import * as THREE from 'three';

export interface DieFace {
  vertices: THREE.Vector3[];
  value: number;
  isRollingFace: boolean;
}

export interface DiePolygonData {
  faces: DieFace[];
  radius: number;
  specialType?: string;
  cutoff?: number;
  thickness?: number;
  halfHeight?: number;
  nSides?: number;
  topApex?: THREE.Vector3;
  botApex?: THREE.Vector3;
  topRim?: THREE.Vector3[];
  botRim?: THREE.Vector3[];
}

export interface DieDefinition {
  name: string;
  type: string;
  faces: number;
  description: string;
}

export const DICE_DEFINITIONS: Record<string, DieDefinition> = {
  D1: {
    name: 'D1 (Orb of Singularity)',
    type: 'Sphere with Inset Facet',
    faces: 1,
    description: 'A polished deep purple sphere with a raised gold beveled frame encircling the recessed flat face with the solitary number 1.',
  },
  D2: {
    name: 'D2 (Fate Token)',
    type: 'Gilded Fantasy Coin',
    faces: 2,
    description: 'Thick fantasy coin with raised gold reeded rim frame, recessed purple resin medallions, and embossed gold numerals 1 and 2.',
  },
  D3: {
    name: 'D3 (Trigonal Roller)',
    type: '3-Sided Framed Prism',
    faces: 3,
    description: 'Equilateral 3-sided rolling prism with raised gold edge frames around each recessed rectangular purple panel and steep gold caps.',
  },
  D4: {
    name: 'D4 (Tetrahedron)',
    type: 'Regular Tetrahedron',
    faces: 4,
    description: '4-sided pyramid with raised gold lines along all 6 edges and 4 recessed triangular purple panels.',
  },
  D5: {
    name: 'D5 (Pentagonal Roller)',
    type: '5-Sided Framed Prism',
    faces: 5,
    description: '5-sided fair rolling prism with raised gold edge frames around each recessed rectangular purple panel.',
  },
  D6: {
    name: 'D6 (Hexahedron)',
    type: 'Regular Hexahedron (Cube)',
    faces: 6,
    description: 'Classic 6-sided die with raised gold frame lines along all 12 edges and 6 recessed square purple panels.',
  },
  D7: {
    name: 'D7 (Heptagonal Roller)',
    type: '7-Sided Framed Prism',
    faces: 7,
    description: '7-sided fair rolling prism with raised gold frames on all 7 recessed rolling panels.',
  },
  D8: {
    name: 'D8 (Octahedron)',
    type: 'Regular Octahedron',
    faces: 8,
    description: 'Classic 8-sided die with raised gold frame lines along all 12 edges and 8 recessed triangular purple panels.',
  },
  D9: {
    name: 'D9 (Enneagonal Roller)',
    type: '9-Sided Framed Prism',
    faces: 9,
    description: '9-sided fair rolling prism with raised gold frames on all 9 recessed rolling panels.',
  },
  D10: {
    name: 'D10 (Decahedron)',
    type: 'Pentagonal Trapezohedron',
    faces: 10,
    description: 'Classic 10-sided Catalan die with raised gold lines along all 20 edges and 10 recessed kite-shaped purple panels.',
  },
  D11: {
    name: 'D11 (Hendecagonal Roller)',
    type: '11-Sided Framed Prism',
    faces: 11,
    description: '11-sided fair rolling prism with raised gold frames on all 11 recessed rolling panels.',
  },
  D12: {
    name: 'D12 (Dodecahedron)',
    type: 'Regular Dodecahedron',
    faces: 12,
    description: '12-sided die with raised gold lines along all 30 edges framing 12 recessed pentagonal purple panels.',
  },
  D13: {
    name: 'D13 (Triskaidecahedron)',
    type: '13-Sided Framed Prism',
    faces: 13,
    description: '13-sided fair rolling prism with raised gold frames on all 13 recessed rolling panels.',
  },
  D14: {
    name: 'D14 (Tetradecahedron)',
    type: 'Heptagonal Trapezohedron',
    faces: 14,
    description: 'Fair 14-sided Catalan die with raised gold lines along all 28 edges framing 14 recessed kite-shaped purple panels.',
  },
  D15: {
    name: 'D15 (Pentadecagonal Roller)',
    type: '15-Sided Framed Prism',
    faces: 15,
    description: '15-sided fair rolling prism with raised gold frames on all 15 recessed rolling panels.',
  },
  D16: {
    name: 'D16 (Hexadecahedron)',
    type: 'Octagonal Trapezohedron',
    faces: 16,
    description: 'Fair 16-sided Catalan die with raised gold lines along all 32 edges framing 16 recessed kite-shaped purple panels.',
  },
  D17: {
    name: 'D17 (Heptadecagonal Roller)',
    type: '17-Sided Framed Prism',
    faces: 17,
    description: '17-sided fair rolling prism with raised gold frames on all 17 recessed rolling panels.',
  },
  D18: {
    name: 'D18 (Octadecahedron)',
    type: 'Enneagonal Trapezohedron',
    faces: 18,
    description: 'Fair 18-sided Catalan die with raised gold lines along all 36 edges framing 18 recessed kite-shaped purple panels.',
  },
  D19: {
    name: 'D19 (Enneadecagonal Roller)',
    type: '19-Sided Framed Prism',
    faces: 19,
    description: '19-sided fair rolling prism with raised gold frames on all 19 recessed rolling panels.',
  },
  D20: {
    name: 'D20 (Icosahedron)',
    type: 'Regular Icosahedron',
    faces: 20,
    description: 'The iconic 20-sided D&D crown jewel with raised gold lines along all 30 edges, framing 20 recessed triangular purple panels and 3D gold numerals.',
  },
  D100: {
    name: 'D100 (Zocchihedron)',
    type: 'Faceted Geodesic Sphere',
    faces: 100,
    description: '100-facet spherical polyhedron with a raised gold geodesic line lattice framing 100 recessed purple panels.',
  },
};

export function normalizeDieId(raw: string | number): string {
  const str = String(raw).trim().toUpperCase();
  if (str.startsWith('D')) return str;
  return `D${str}`;
}

// ----------------- Polyhedron Polygon Face Generators -----------------

export function getD1Faces(radius = 2.2): DiePolygonData {
  const cutoff = radius * 0.75;
  const segments = 24;
  const flatRadius = Math.sqrt(radius * radius - cutoff * cutoff);
  const ring: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const ang = (i * Math.PI * 2) / segments;
    ring.push(new THREE.Vector3(Math.cos(ang) * flatRadius, cutoff, Math.sin(ang) * flatRadius));
  }
  return {
    faces: [
      { vertices: ring, value: 1, isRollingFace: true }
    ],
    radius,
    specialType: 'D1',
    cutoff
  };
}

export function getD2Faces(radius = 2.4, thickness = 0.8): DiePolygonData {
  const segments = 24;
  const topRing: THREE.Vector3[] = [];
  const botRing: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const ang = (i * Math.PI * 2) / segments;
    topRing.push(new THREE.Vector3(Math.cos(ang) * radius, thickness / 2, Math.sin(ang) * radius));
    botRing.push(new THREE.Vector3(Math.cos(-ang) * radius, -thickness / 2, Math.sin(-ang) * radius));
  }
  return {
    faces: [
      { vertices: topRing, value: 1, isRollingFace: true },
      { vertices: botRing, value: 2, isRollingFace: true }
    ],
    radius,
    specialType: 'D2',
    thickness
  };
}

export function getPrismFaces(nSides: number, radius = 2.2, halfHeight = 1.9): DiePolygonData {
  const topRim: THREE.Vector3[] = [];
  const botRim: THREE.Vector3[] = [];
  for (let i = 0; i < nSides; i++) {
    const ang = (i * Math.PI * 2) / nSides;
    topRim.push(new THREE.Vector3(Math.sin(ang) * radius, halfHeight, Math.cos(ang) * radius));
    botRim.push(new THREE.Vector3(Math.sin(ang) * radius, -halfHeight, Math.cos(ang) * radius));
  }

  const faces: DieFace[] = [];
  for (let i = 0; i < nSides; i++) {
    const iNext = (i + 1) % nSides;
    faces.push({
      vertices: [
        topRim[i].clone(),
        topRim[iNext].clone(),
        botRim[iNext].clone(),
        botRim[i].clone()
      ],
      value: i + 1,
      isRollingFace: true
    });
  }

  return {
    faces,
    radius,
    specialType: 'Prism',
    halfHeight,
    nSides,
    topApex: new THREE.Vector3(0, halfHeight + radius * 0.8, 0),
    botApex: new THREE.Vector3(0, -(halfHeight + radius * 0.8), 0),
    topRim,
    botRim
  };
}

export function getD4Faces(radius = 2.4): DiePolygonData {
  const a = radius / Math.sqrt(3);
  const pts = [
    new THREE.Vector3(a, a, a),
    new THREE.Vector3(a, -a, -a),
    new THREE.Vector3(-a, a, -a),
    new THREE.Vector3(-a, -a, a)
  ];

  const faceIndices = [
    [0, 2, 1],
    [0, 3, 2],
    [0, 1, 3],
    [1, 2, 3]
  ];

  const faces: DieFace[] = faceIndices.map((indices, idx) => ({
    vertices: indices.map(i => pts[i].clone()),
    value: idx + 1,
    isRollingFace: true
  }));

  return { faces, radius };
}

export function getD6Faces(size = 3.6): DiePolygonData {
  const h = size / 2;
  const p = [
    new THREE.Vector3(-h, -h, -h), // 0
    new THREE.Vector3(h, -h, -h),  // 1
    new THREE.Vector3(h, h, -h),   // 2
    new THREE.Vector3(-h, h, -h),  // 3
    new THREE.Vector3(-h, -h, h),  // 4
    new THREE.Vector3(h, -h, h),   // 5
    new THREE.Vector3(h, h, h),    // 6
    new THREE.Vector3(-h, h, h)    // 7
  ];

  const faceDefs = [
    { indices: [7, 6, 5, 4], value: 1 }, // +Z
    { indices: [0, 1, 2, 3], value: 6 }, // -Z
    { indices: [2, 6, 7, 3], value: 2 }, // +Y
    { indices: [4, 5, 1, 0], value: 5 }, // -Y
    { indices: [1, 5, 6, 2], value: 3 }, // +X
    { indices: [3, 7, 4, 0], value: 4 }  // -X
  ];

  const faces: DieFace[] = faceDefs.map(def => ({
    vertices: def.indices.map(i => p[i].clone()),
    value: def.value,
    isRollingFace: true
  }));

  return { faces, radius: h * 1.4 };
}

export function getD8Faces(radius = 2.5): DiePolygonData {
  const p = [
    new THREE.Vector3(0, radius, 0),  // 0 (+Y)
    new THREE.Vector3(radius, 0, 0),  // 1 (+X)
    new THREE.Vector3(0, 0, radius),  // 2 (+Z)
    new THREE.Vector3(-radius, 0, 0), // 3 (-X)
    new THREE.Vector3(0, 0, -radius), // 4 (-Z)
    new THREE.Vector3(0, -radius, 0)  // 5 (-Y)
  ];

  const faceIndices = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
    [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]
  ];

  const faces: DieFace[] = faceIndices.map((indices, idx) => ({
    vertices: indices.map(i => p[i].clone()),
    value: idx + 1,
    isRollingFace: true
  }));

  return { faces, radius };
}

export function getTrapezohedronFaces(nPairs: number, radius = 2.2, hPole = 2.6, hEq = 0.65): DiePolygonData {
  const topPole = new THREE.Vector3(0, hPole, 0);
  const botPole = new THREE.Vector3(0, -hPole, 0);

  const upperRing: THREE.Vector3[] = [];
  const lowerRing: THREE.Vector3[] = [];
  const dTheta = (2 * Math.PI) / nPairs;

  for (let i = 0; i < nPairs; i++) {
    const angU = i * dTheta;
    upperRing.push(new THREE.Vector3(Math.cos(angU) * radius, hEq, Math.sin(angU) * radius));

    const angL = (i + 0.5) * dTheta;
    lowerRing.push(new THREE.Vector3(Math.cos(angL) * radius, -hEq, Math.sin(angL) * radius));
  }

  const faces: DieFace[] = [];
  let faceCounter = 1;

  for (let i = 0; i < nPairs; i++) {
    const iNext = (i + 1) % nPairs;
    const u0 = upperRing[i];
    const l0 = lowerRing[i];
    const u1 = upperRing[iNext];
    const l1 = lowerRing[iNext];

    // Upper kite face (topPole, u0, l0, u1)
    faces.push({
      vertices: [topPole.clone(), u0.clone(), l0.clone(), u1.clone()],
      value: faceCounter++,
      isRollingFace: true
    });

    // Lower kite face (botPole, l1, u1, l0)
    faces.push({
      vertices: [botPole.clone(), l1.clone(), u1.clone(), l0.clone()],
      value: faceCounter++,
      isRollingFace: true
    });
  }

  return { faces, radius: Math.max(radius, hPole) };
}

export function getD12Faces(radius = 2.4): DiePolygonData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const s = radius / Math.sqrt(3);

  const pts: THREE.Vector3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        pts.push(new THREE.Vector3(x * s, y * s, z * s));
      }
    }
  }
  for (const y of [-invPhi, invPhi]) {
    for (const z of [-phi, phi]) {
      pts.push(new THREE.Vector3(0, y * s, z * s));
    }
  }
  for (const x of [-invPhi, invPhi]) {
    for (const y of [-phi, phi]) {
      pts.push(new THREE.Vector3(x * s, y * s, 0));
    }
  }
  for (const x of [-phi, phi]) {
    for (const z of [-invPhi, invPhi]) {
      pts.push(new THREE.Vector3(x * s, 0, z * s));
    }
  }

  const normals = [
    new THREE.Vector3(0, phi, 1).normalize(),
    new THREE.Vector3(0, -phi, 1).normalize(),
    new THREE.Vector3(0, phi, -1).normalize(),
    new THREE.Vector3(0, -phi, -1).normalize(),
    new THREE.Vector3(1, 0, phi).normalize(),
    new THREE.Vector3(-1, 0, phi).normalize(),
    new THREE.Vector3(1, 0, -phi).normalize(),
    new THREE.Vector3(-1, 0, -phi).normalize(),
    new THREE.Vector3(phi, 1, 0).normalize(),
    new THREE.Vector3(-phi, 1, 0).normalize(),
    new THREE.Vector3(phi, -1, 0).normalize(),
    new THREE.Vector3(-phi, -1, 0).normalize()
  ];

  const faces: DieFace[] = normals.map((norm, valIdx) => {
    const sorted = pts
      .map((p, idx) => ({ p, dot: p.dot(norm), idx }))
      .sort((a, b) => b.dot - a.dot)
      .slice(0, 5);

    const center = new THREE.Vector3();
    sorted.forEach(item => center.add(item.p));
    center.divideScalar(5);

    const ref = sorted[0].p.clone().sub(center).normalize();
    const perp = new THREE.Vector3().crossVectors(norm, ref).normalize();

    sorted.sort((a, b) => {
      const va = a.p.clone().sub(center);
      const vb = b.p.clone().sub(center);
      const angA = Math.atan2(va.dot(perp), va.dot(ref));
      const angB = Math.atan2(vb.dot(perp), vb.dot(ref));
      return angA - angB;
    });

    const v0 = sorted[0].p;
    const v1 = sorted[1].p;
    const v2 = sorted[2].p;
    const polyNorm = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
    if (polyNorm.dot(norm) < 0) {
      sorted.reverse();
    }

    return {
      vertices: sorted.map(item => item.p.clone()),
      value: valIdx + 1,
      isRollingFace: true
    };
  });

  return { faces, radius };
}

export function getD20Faces(radius = 2.5): DiePolygonData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const rawPts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];

  const pts = rawPts.map(coord => new THREE.Vector3(coord[0], coord[1], coord[2]).normalize().multiplyScalar(radius));

  const faceIndices = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  const d20NumberLayout = [
    20, 14, 2, 18, 8,
    4, 12, 16, 6, 10,
    1, 7, 19, 3, 13,
    17, 9, 5, 15, 11
  ];

  const faces: DieFace[] = faceIndices.map((indices, idx) => ({
    vertices: indices.map(i => pts[i].clone()),
    value: d20NumberLayout[idx] || (idx + 1),
    isRollingFace: true
  }));

  return { faces, radius };
}

export function getD100Faces(radius = 3.2): DiePolygonData {
  const pNorth = new THREE.Vector3(0, radius, 0);
  const pSouth = new THREE.Vector3(0, -radius, 0);

  const ringConfigs = [
    { deg: 62, offset: 0.0 },
    { deg: 31, offset: 0.5 },
    { deg: 0,  offset: 0.0 },
    { deg: -31, offset: 0.5 },
    { deg: -62, offset: 0.0 },
  ];

  const rings = ringConfigs.map((cfg) => {
    const rad = (cfg.deg * Math.PI) / 180;
    const y = radius * Math.sin(rad);
    const rRing = radius * Math.cos(rad);
    const ringVerts: THREE.Vector3[] = [];
    for (let k = 0; k < 10; k++) {
      const theta = ((k + cfg.offset) * 2 * Math.PI) / 10;
      ringVerts.push(new THREE.Vector3(rRing * Math.sin(theta), y, rRing * Math.cos(theta)));
    }
    return ringVerts;
  });

  const rawFaces: THREE.Vector3[][] = [];

  // North Cap
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([pNorth.clone(), rings[0][k].clone(), rings[0][kNext].clone()]);
  }

  // Band 0
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([rings[0][k].clone(), rings[1][k].clone(), rings[0][kNext].clone()]);
    rawFaces.push([rings[1][k].clone(), rings[1][kNext].clone(), rings[0][kNext].clone()]);
  }

  // Band 1
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([rings[1][k].clone(), rings[2][kNext].clone(), rings[1][kNext].clone()]);
    rawFaces.push([rings[1][k].clone(), rings[2][k].clone(), rings[2][kNext].clone()]);
  }

  // Band 2
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([rings[2][k].clone(), rings[3][k].clone(), rings[2][kNext].clone()]);
    rawFaces.push([rings[3][k].clone(), rings[3][kNext].clone(), rings[2][kNext].clone()]);
  }

  // Band 3
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([rings[3][k].clone(), rings[4][kNext].clone(), rings[3][kNext].clone()]);
    rawFaces.push([rings[3][k].clone(), rings[4][k].clone(), rings[4][kNext].clone()]);
  }

  // South Cap
  for (let k = 0; k < 10; k++) {
    const kNext = (k + 1) % 10;
    rawFaces.push([pSouth.clone(), rings[4][kNext].clone(), rings[4][k].clone()]);
  }

  const faces: DieFace[] = rawFaces.map((vertices, index) => ({
    vertices,
    value: index + 1,
    isRollingFace: true
  }));

  return { faces, radius };
}

export function getDiePolygonData(dieId: string): DiePolygonData {
  const normalized = normalizeDieId(dieId);
  switch (normalized) {
    case 'D1': return getD1Faces();
    case 'D2': return getD2Faces();
    case 'D3': return getPrismFaces(3, 2.2, 1.8);
    case 'D4': return getD4Faces();
    case 'D5': return getPrismFaces(5, 2.2, 1.9);
    case 'D6': return getD6Faces();
    case 'D7': return getPrismFaces(7, 2.2, 1.9);
    case 'D8': return getD8Faces();
    case 'D9': return getPrismFaces(9, 2.2, 1.9);
    case 'D10': return getTrapezohedronFaces(5, 2.2, 2.6, 0.65);
    case 'D11': return getPrismFaces(11, 2.2, 1.9);
    case 'D12': return getD12Faces();
    case 'D13': return getPrismFaces(13, 2.2, 1.9);
    case 'D14': return getTrapezohedronFaces(7, 2.2, 2.6, 0.6);
    case 'D15': return getPrismFaces(15, 2.2, 1.9);
    case 'D16': return getTrapezohedronFaces(8, 2.2, 2.6, 0.55);
    case 'D17': return getPrismFaces(17, 2.2, 1.9);
    case 'D18': return getTrapezohedronFaces(9, 2.2, 2.6, 0.5);
    case 'D19': return getPrismFaces(19, 2.2, 1.9);
    case 'D20': return getD20Faces();
    case 'D100': return getD100Faces();
    default:
      return getD20Faces();
  }
}
