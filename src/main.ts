import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Segment = {
  pivot: THREE.Group;
  mesh?: THREE.Mesh;
  baseLength: number;
  baseHeight: number;
  baseDepth: number;
  phase: number;
  amplitude: number;
};

type TailGene = {
  length: number;
  height: number;
  depth: number;
  amplitude: number;
  phase: number;
};

type Palette = {
  name: string;
  body: number;
  joint: number;
  tail: number;
};

type Genotype = {
  id: string;
  generation: number;
  paletteIndex: number;
  bodyLength: number;
  bodyHeight: number;
  bodyDepth: number;
  headScale: number;
  finScale: number;
  tailSpeed: number;
  drift: number;
  lift: number;
  wobble: number;
  tail: TailGene[];
};

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const phaseValue = document.querySelector<HTMLSpanElement>("#phaseValue");
const generationValue = document.querySelector<HTMLSpanElement>("#generationValue");
const stabilityValue = document.querySelector<HTMLSpanElement>("#stabilityValue");
const creatureName = document.querySelector<HTMLHeadingElement>("#creatureName");
const stableBtn = document.querySelector<HTMLButtonElement>("#stableBtn");
const mutateBtn = document.querySelector<HTMLButtonElement>("#mutateBtn");
const crawlerBtn = document.querySelector<HTMLButtonElement>("#crawlerBtn");
const offspringGrid = document.querySelector<HTMLDivElement>("#offspringGrid");
const broodLine = document.querySelector<HTMLParagraphElement>("#broodLine");

const maxTailSegments = 8;
const broodSize = 6;
const broodLabels = ["A", "B", "C", "D", "E", "F"];
const palettes: Palette[] = [
  { name: "pale swimmer", body: 0xf2f1d8, joint: 0x6ac4d6, tail: 0x80d6de },
  { name: "kelp runner", body: 0xe6d8af, joint: 0x77d18d, tail: 0x42b883 },
  { name: "coral fin", body: 0xf4c7a6, joint: 0xf18f78, tail: 0xe85f6f },
  { name: "violet eel", body: 0xd8cff7, joint: 0x9b91ff, tail: 0x6bb7f0 },
  { name: "amber crawler", body: 0xf0d28b, joint: 0xe1a84d, tail: 0xbf7a44 },
  { name: "silver reef", body: 0xd8ebe5, joint: 0xb9d9ff, tail: 0x9dc7d2 },
];

if (!canvas) {
  throw new Error("missing #scene canvas");
}

function setPhase(time: number): void {
  if (phaseValue) {
    phaseValue.textContent = (time % (Math.PI * 2)).toFixed(2);
  }
}

function updateHud(genotype: Genotype): void {
  const stability = estimateStability(genotype);

  if (creatureName) {
    creatureName.textContent = genotype.id;
  }

  if (generationValue) {
    generationValue.textContent = String(genotype.generation);
  }

  if (stabilityValue) {
    stabilityValue.textContent = stability.toFixed(2);
  }
}

function estimateStability(genotype: Genotype): number {
  const tailMean = genotype.tail.reduce((sum, gene) => sum + gene.amplitude, 0) / genotype.tail.length;
  const centerPenalty = Math.abs(genotype.bodyLength - 1.35) * 0.18 + Math.abs(genotype.bodyHeight - 0.56) * 0.22;
  const speedPenalty = Math.abs(genotype.tailSpeed - 2.7) * 0.06;
  const gaitScore = 1 - Math.abs(tailMean - 0.36) * 0.92 - centerPenalty - speedPenalty;
  return Math.max(0.12, Math.min(0.98, gaitScore));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function colorHex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function mutateValue(value: number, amount: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value + randomBetween(-amount, amount)));
}

function makeTail(
  count: number,
  seed: Partial<TailGene> = {},
  steps: Partial<{
    length: number;
    height: number;
    depth: number;
    amplitude: number;
    phase: number;
  }> = {},
): TailGene[] {
  return Array.from({ length: count }, (_, index) => ({
    length: Math.max(0.28, (seed.length ?? 0.62) - index * (steps.length ?? 0.045)),
    height: Math.max(0.14, (seed.height ?? 0.32) - index * (steps.height ?? 0.024)),
    depth: Math.max(0.18, (seed.depth ?? 0.34) - index * (steps.depth ?? 0.012)),
    amplitude: (seed.amplitude ?? 0.24) + index * (steps.amplitude ?? 0.032),
    phase: index * (steps.phase ?? 0.58),
  }));
}

function stableGenotype(): Genotype {
  return {
    id: "Tail swimmer A-001",
    generation: 0,
    paletteIndex: 0,
    bodyLength: 1.35,
    bodyHeight: 0.55,
    bodyDepth: 0.75,
    headScale: 1,
    finScale: 1,
    tailSpeed: 2.7,
    drift: 0.3,
    lift: 0.035,
    wobble: 0.045,
    tail: makeTail(6, { length: 0.62, height: 0.32, depth: 0.34, amplitude: 0.24 }),
  };
}

function crawlerGenotype(): Genotype {
  return {
    id: "Block crawler B-014",
    generation: 14,
    paletteIndex: 4,
    bodyLength: 1.2,
    bodyHeight: 0.72,
    bodyDepth: 0.92,
    headScale: 0.88,
    finScale: 0.68,
    tailSpeed: 2.05,
    drift: 0.18,
    lift: 0.022,
    wobble: 0.07,
    tail: makeTail(5, { length: 0.54, height: 0.38, depth: 0.4, amplitude: 0.16 }, { length: 0.025, height: 0.018, phase: 0.42 }),
  };
}

function mutateGenotype(source: Genotype, label = ""): Genotype {
  const generation = source.generation + 1;
  const structuralChange = Math.random() > 0.66;
  const paletteDrift = Math.random() > 0.82;
  const paletteIndex = paletteDrift
    ? (source.paletteIndex + randomInt(1, palettes.length - 1)) % palettes.length
    : source.paletteIndex;
  const nextTailCount = Math.max(
    4,
    Math.min(maxTailSegments, structuralChange ? source.tail.length + randomInt(-1, 1) : source.tail.length),
  );
  const sourceTail = source.tail.length ? source.tail : stableGenotype().tail;
  const tail = Array.from({ length: nextTailCount }, (_, index) => {
    const basis = sourceTail[Math.min(index, sourceTail.length - 1)];
    const inheritedPhase = index < sourceTail.length ? basis.phase : sourceTail[sourceTail.length - 1].phase + 0.52;

    return {
      length: mutateValue(basis.length, structuralChange ? 0.1 : 0.055, 0.26, 0.86),
      height: mutateValue(basis.height, structuralChange ? 0.075 : 0.04, 0.11, 0.5),
      depth: mutateValue(basis.depth, structuralChange ? 0.07 : 0.035, 0.16, 0.56),
      amplitude: mutateValue(basis.amplitude, structuralChange ? 0.09 : 0.05, 0.08, 0.68),
      phase: inheritedPhase + randomBetween(-0.12, 0.12),
    };
  }).map((gene) => ({
    length: Math.max(0.24, gene.length),
    height: Math.max(0.1, gene.height),
    depth: Math.max(0.14, gene.depth),
    amplitude: gene.amplitude,
    phase: gene.phase,
  }));

  return {
    id: `${palettes[paletteIndex].name} ${label ? `${label}-` : ""}G-${generation.toString().padStart(3, "0")}`,
    generation,
    paletteIndex,
    bodyLength: mutateValue(source.bodyLength, structuralChange ? 0.12 : 0.06, 0.82, 1.86),
    bodyHeight: mutateValue(source.bodyHeight, structuralChange ? 0.1 : 0.05, 0.34, 0.9),
    bodyDepth: mutateValue(source.bodyDepth, structuralChange ? 0.11 : 0.05, 0.48, 1.12),
    headScale: mutateValue(source.headScale, 0.08, 0.62, 1.42),
    finScale: mutateValue(source.finScale, structuralChange ? 0.16 : 0.08, 0.34, 1.72),
    tailSpeed: mutateValue(source.tailSpeed, 0.18, 1.25, 4.3),
    drift: mutateValue(source.drift, 0.055, 0.06, 0.72),
    lift: mutateValue(source.lift, 0.012, 0.006, 0.11),
    wobble: mutateValue(source.wobble, 0.018, 0.012, 0.16),
    tail,
  };
}

function createBrood(parent: Genotype): Genotype[] {
  return Array.from({ length: broodSize }, (_, index) => mutateGenotype(parent, broodLabels[index] ?? String(index + 1)));
}

function miniCreatureSvg(genotype: Genotype): string {
  const palette = palettes[genotype.paletteIndex] ?? palettes[0];
  const centerY = 38;
  const bodyWidth = Math.round(42 * genotype.bodyLength);
  const bodyHeight = Math.round(34 * genotype.bodyHeight);
  const bodyDepth = Math.round(10 * genotype.bodyDepth);
  const bodyX = 72 - bodyWidth * 0.35;
  const bodyY = centerY - bodyHeight / 2;
  const headSize = Math.round(18 * genotype.headScale);
  const finWidth = Math.round(28 * genotype.finScale);
  let tailX = bodyX - 2;

  const tail = genotype.tail
    .slice(0, maxTailSegments)
    .map((gene, index) => {
      const width = Math.max(11, Math.round(gene.length * 34));
      const height = Math.max(8, Math.round(gene.height * 32));
      const y = centerY - height / 2 + Math.sin(index * 0.78 + gene.phase) * gene.amplitude * 7;
      tailX -= width * 0.68;
      return `<rect x="${tailX.toFixed(1)}" y="${y.toFixed(1)}" width="${width}" height="${height}" rx="2" fill="${colorHex(
        index < 2 ? palette.joint : palette.tail,
      )}" />`;
    })
    .join("");

  return `<svg class="mini-creature" viewBox="0 0 140 76" role="img" aria-label="${genotype.id}">
    <ellipse cx="70" cy="63" rx="48" ry="5" fill="rgba(0,0,0,0.22)" />
    ${tail}
    <rect x="${(bodyX + 4).toFixed(1)}" y="${(bodyY + bodyDepth).toFixed(1)}" width="${bodyWidth}" height="${bodyHeight}" rx="3" fill="rgba(0,0,0,0.2)" />
    <rect x="${bodyX.toFixed(1)}" y="${bodyY.toFixed(1)}" width="${bodyWidth}" height="${bodyHeight}" rx="3" fill="${colorHex(palette.body)}" />
    <rect x="${(bodyX + bodyWidth * 0.12).toFixed(1)}" y="${(bodyY - 7).toFixed(1)}" width="${finWidth}" height="7" rx="2" fill="${colorHex(
      palette.joint,
    )}" />
    <rect x="${(bodyX + bodyWidth * 0.2).toFixed(1)}" y="${(bodyY + bodyHeight - 2).toFixed(1)}" width="${finWidth}" height="6" rx="2" fill="${colorHex(
      palette.tail,
    )}" />
    <rect x="${(bodyX + bodyWidth - 3).toFixed(1)}" y="${(centerY - headSize / 2).toFixed(1)}" width="${headSize}" height="${Math.max(
      12,
      headSize * 0.8,
    ).toFixed(1)}" rx="3" fill="${colorHex(palette.body)}" />
  </svg>`;
}

function renderOffspringGrid(parent: Genotype, brood: Genotype[], onSelect: (candidate: Genotype) => void): void {
  if (!offspringGrid) {
    return;
  }

  offspringGrid.replaceChildren();

  if (broodLine) {
    broodLine.textContent = `${parent.id} -> gen ${parent.generation + 1}`;
  }

  brood.forEach((candidate, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "offspring-card";
    card.setAttribute("aria-label", `keep ${candidate.id}`);
    card.innerHTML = `
      ${miniCreatureSvg(candidate)}
      <span class="offspring-name">${candidate.id}</span>
      <span class="offspring-stats">blocks ${candidate.tail.length + 2} | motor ${candidate.tailSpeed.toFixed(1)}</span>
      <span class="offspring-stats">stability ${estimateStability(candidate).toFixed(2)}</span>
      <span class="keep-label">keep / breed ${broodLabels[index] ?? index + 1}</span>
    `;
    card.addEventListener("click", () => onSelect(candidate));
    offspringGrid.append(card);
  });
}

function bindControls(apply: (genotype: Genotype) => void, getCurrent: () => Genotype): void {
  function renderBrood(parent: Genotype): void {
    const brood = createBrood(parent);
    renderOffspringGrid(parent, brood, (candidate) => {
      apply(candidate);
      renderBrood(candidate);
    });
  }

  function applyBase(genotype: Genotype): void {
    apply(genotype);
    renderBrood(genotype);
  }

  stableBtn?.addEventListener("click", () => applyBase(stableGenotype()));
  crawlerBtn?.addEventListener("click", () => applyBase(crawlerGenotype()));
  mutateBtn?.addEventListener("click", () => renderBrood(getCurrent()));
  renderBrood(getCurrent());
}

function runCanvasFallback(target: HTMLCanvasElement): void {
  const ctx = target.getContext("2d");

  if (!ctx) {
    return;
  }

  const fallbackCtx = ctx;
  const state = { width: 0, height: 0, ratio: 1 };
  let currentGenotype = stableGenotype();

  function applyGenotype(next: Genotype): void {
    currentGenotype = next;
    updateHud(currentGenotype);
  }

  bindControls(applyGenotype, () => currentGenotype);
  updateHud(currentGenotype);

  function resize(): void {
    state.ratio = Math.min(window.devicePixelRatio, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    target.width = Math.floor(state.width * state.ratio);
    target.height = Math.floor(state.height * state.ratio);
    fallbackCtx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
  }

  function block(x: number, y: number, width: number, height: number, color: string): void {
    fallbackCtx.fillStyle = color;
    fallbackCtx.strokeStyle = "rgba(8, 16, 23, 0.42)";
    fallbackCtx.lineWidth = 2;
    fallbackCtx.fillRect(x - width / 2, y - height / 2, width, height);
    fallbackCtx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  function drawGrid(): void {
    const horizon = state.height * 0.32;
    fallbackCtx.strokeStyle = "rgba(88, 112, 100, 0.18)";
    fallbackCtx.lineWidth = 1;

    for (let i = 0; i < 18; i += 1) {
      const y = horizon + i * 28;
      fallbackCtx.beginPath();
      fallbackCtx.moveTo(0, y);
      fallbackCtx.lineTo(state.width, y + i * 9);
      fallbackCtx.stroke();
    }

    for (let i = -8; i <= 8; i += 1) {
      const x = state.width * 0.5 + i * 70;
      fallbackCtx.beginPath();
      fallbackCtx.moveTo(x, horizon);
      fallbackCtx.lineTo(x + i * 48, state.height);
      fallbackCtx.stroke();
    }
  }

  function drawCreature(time: number): void {
    const scale = Math.min(state.width / 560, state.height / 520, 1.15);
    const centerX = state.width * 0.52 + Math.sin(time * 0.45) * 16;
    const centerY = state.height * 0.56 + Math.sin(time * 1.4) * 6;

    fallbackCtx.save();
    fallbackCtx.translate(centerX, centerY);
    fallbackCtx.scale(scale, scale);
    fallbackCtx.rotate(Math.sin(time * 1.1) * 0.035);

    fallbackCtx.save();
    fallbackCtx.translate(-118, 7);
    const palette = palettes[currentGenotype.paletteIndex] ?? palettes[0];
    currentGenotype.tail.forEach((gene, i) => {
      const swing = Math.sin(time * currentGenotype.tailSpeed - gene.phase) * gene.amplitude;
      fallbackCtx.rotate(swing);
      block(-28, 0, gene.length * 105, gene.height * 102, colorHex(i < 2 ? palette.joint : palette.tail));
      fallbackCtx.translate(-gene.length * 82, 0);
    });
    fallbackCtx.restore();

    fallbackCtx.save();
    fallbackCtx.rotate(-0.08);
    block(0, 0, currentGenotype.bodyLength * 112, currentGenotype.bodyHeight * 112, colorHex(palette.body));
    block(106, -2, 66 * currentGenotype.headScale, 52 * currentGenotype.headScale, colorHex(palette.body));
    block(12, -46, 74 * currentGenotype.finScale, 22, colorHex(palette.joint));
    block(2, 38, 78 * currentGenotype.finScale, 20, colorHex(palette.joint));
    block(70, 36, 54 * currentGenotype.finScale, 18, colorHex(palette.tail));
    fallbackCtx.restore();

    fallbackCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    fallbackCtx.beginPath();
    fallbackCtx.ellipse(20, 82, 210, 26, -0.02, 0, Math.PI * 2);
    fallbackCtx.fill();

    fallbackCtx.restore();
  }

  function draw(now: number): void {
    const time = now * 0.001;
    setPhase(time);

    const gradient = fallbackCtx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#081017");
    gradient.addColorStop(0.44, "#0b171b");
    gradient.addColorStop(1, "#293a31");
    fallbackCtx.fillStyle = gradient;
    fallbackCtx.fillRect(0, 0, state.width, state.height);

    drawGrid();
    drawCreature(time);
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
}

function runWebGL(target: HTMLCanvasElement): void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081017);
  scene.fog = new THREE.Fog(0x081017, 8, 26);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(5.4, 3.6, 7.2);

  const renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  const cameraTarget = new THREE.Vector3(0, 0.7, 0);
  controls.target.copy(cameraTarget);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 4;
  controls.maxDistance = 16;

  function frameCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.fov = aspect < 0.72 ? 62 : 45;
    camera.position.set(aspect < 0.72 ? 7.4 : 5.4, aspect < 0.72 ? 4.6 : 3.6, aspect < 0.72 ? 11.4 : 7.2);
    camera.updateProjectionMatrix();
    controls.target.copy(cameraTarget);
  }

  const hemi = new THREE.HemisphereLight(0xb7e8ff, 0x24301f, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d2, 3.5);
  sun.position.set(-4, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x26342e, roughness: 0.86, metalness: 0.02 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(40, 40, 0x587064, 0x2b3b34);
  grid.position.y = 0.004;
  scene.add(grid);

  const creature = new THREE.Group();
  scene.add(creature);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f1d8,
    roughness: 0.68,
    metalness: 0.02,
  });

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ac4d6,
    roughness: 0.74,
    metalness: 0.01,
  });

  const tailMaterial = new THREE.MeshStandardMaterial({
    color: 0x80d6de,
    roughness: 0.78,
  });

  function makeBox(size: THREE.Vector3, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const torso = makeBox(new THREE.Vector3(1.35, 0.55, 0.75), bodyMaterial);
  torso.position.set(0, 0.95, 0);
  torso.rotation.z = -0.1;
  creature.add(torso);

  const head = makeBox(new THREE.Vector3(0.58, 0.46, 0.52), bodyMaterial);
  head.position.set(0.95, 1.05, 0);
  head.rotation.z = 0.18;
  creature.add(head);

  const dorsal = makeBox(new THREE.Vector3(0.42, 0.12, 0.9), jointMaterial);
  dorsal.position.set(0.08, 1.35, 0);
  dorsal.rotation.x = 0.12;
  creature.add(dorsal);

  function makeFin(x: number, z: number, side: number): THREE.Group {
    const fin = new THREE.Group();
    fin.position.set(x, 0.88, z);

    const upper = makeBox(new THREE.Vector3(0.68, 0.18, 0.24), jointMaterial);
    upper.position.x = side * 0.28;
    upper.rotation.y = side * 0.34;
    upper.rotation.z = side * -0.24;
    fin.add(upper);

    const lower = makeBox(new THREE.Vector3(0.46, 0.14, 0.2), tailMaterial);
    lower.position.set(side * 0.76, -0.04, side * 0.1);
    lower.rotation.y = side * 0.54;
    lower.rotation.z = side * -0.42;
    fin.add(lower);

    return fin;
  }

  const leftFin = makeFin(-0.06, 0.58, 1);
  const rightFin = makeFin(-0.06, -0.58, -1);
  creature.add(leftFin, rightFin);

  const tailRoot = new THREE.Group();
  tailRoot.position.set(-0.76, 0.98, 0);
  creature.add(tailRoot);

  const segments: Segment[] = [];
  let currentGenotype = stableGenotype();
  let parent = tailRoot;

  for (let i = 0; i < maxTailSegments; i += 1) {
    const pivot = new THREE.Group();
    pivot.position.x = i === 0 ? 0 : -0.5;
    parent.add(pivot);

    const length = Math.max(0.32, 0.62 - i * 0.045);
    const height = Math.max(0.18, 0.32 - i * 0.024);
    const depth = Math.max(0.2, 0.34 - i * 0.012);
    const mesh = makeBox(new THREE.Vector3(length, height, depth), i < 2 ? jointMaterial : tailMaterial);
    mesh.position.x = -length * 0.5;
    mesh.rotation.z = 0.04;
    pivot.add(mesh);

    segments.push({
      pivot,
      mesh,
      baseLength: length,
      baseHeight: height,
      baseDepth: depth,
      phase: i * 0.58,
      amplitude: 0.24 + i * 0.032,
    });

    parent = pivot;
  }

  function applyGenotype(next: Genotype): void {
    currentGenotype = next;
    const palette = palettes[currentGenotype.paletteIndex] ?? palettes[0];
    bodyMaterial.color.setHex(palette.body);
    jointMaterial.color.setHex(palette.joint);
    tailMaterial.color.setHex(palette.tail);

    torso.scale.set(currentGenotype.bodyLength / 1.35, currentGenotype.bodyHeight / 0.55, currentGenotype.bodyDepth / 0.75);
    head.scale.set(
      currentGenotype.headScale,
      currentGenotype.headScale,
      (currentGenotype.headScale * currentGenotype.bodyDepth) / 0.75,
    );
    dorsal.scale.set(currentGenotype.bodyLength / 1.35, 1, currentGenotype.bodyDepth / 0.75);
    leftFin.scale.setScalar(currentGenotype.finScale);
    rightFin.scale.setScalar(currentGenotype.finScale);
    leftFin.position.z = currentGenotype.bodyDepth * 0.78;
    rightFin.position.z = -currentGenotype.bodyDepth * 0.78;
    tailRoot.position.x = -0.72 * (currentGenotype.bodyLength / 1.35);

    segments.forEach((segment, index) => {
      const gene = currentGenotype.tail[index];

      if (!gene || !segment.mesh) {
        segment.pivot.visible = false;
        return;
      }

      segment.pivot.visible = true;
      segment.phase = gene.phase;
      segment.amplitude = gene.amplitude;
      segment.mesh.scale.set(gene.length / segment.baseLength, gene.height / segment.baseHeight, gene.depth / segment.baseDepth);
      segment.mesh.position.x = -gene.length * 0.5;
      segment.pivot.position.x = index === 0 ? 0 : -currentGenotype.tail[index - 1].length * 0.86;
    });

    updateHud(currentGenotype);
  }

  bindControls(applyGenotype, () => currentGenotype);
  applyGenotype(currentGenotype);

  const clock = new THREE.Clock();

  function animateCreature(time: number): void {
    creature.position.set(
      Math.sin(time * 0.45) * currentGenotype.drift,
      0.05 + Math.sin(time * 1.4) * currentGenotype.lift,
      0,
    );
    creature.rotation.y = Math.sin(time * 0.42) * 0.18;
    creature.rotation.z = Math.sin(time * 1.1) * currentGenotype.wobble;

    torso.rotation.y = Math.sin(time * 1.8) * 0.035;
    head.rotation.y = Math.sin(time * 1.8 + 0.35) * 0.08;

    leftFin.rotation.z = -0.18 + Math.sin(time * 2.4) * 0.28 * currentGenotype.finScale;
    rightFin.rotation.z = 0.18 + Math.sin(time * 2.4 + Math.PI) * 0.28 * currentGenotype.finScale;
    leftFin.rotation.y = Math.sin(time * 1.7 + 0.6) * 0.18;
    rightFin.rotation.y = Math.sin(time * 1.7 + Math.PI + 0.6) * 0.18;

    for (const segment of segments) {
      segment.pivot.rotation.y = Math.sin(time * currentGenotype.tailSpeed - segment.phase) * segment.amplitude;
      segment.pivot.rotation.z = Math.cos(time * 2.1 - segment.phase) * segment.amplitude * 0.18;
    }

    camera.lookAt(cameraTarget);
  }

  function render(): void {
    const elapsed = clock.getElapsedTime();
    animateCreature(elapsed);
    setPhase(elapsed);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight);
    frameCamera();
  }

  window.addEventListener("resize", resize);
  frameCamera();
  render();
}

function canCreateWebGLContext(): boolean {
  const probe = document.createElement("canvas");
  return Boolean(window.WebGLRenderingContext && (probe.getContext("webgl2") || probe.getContext("webgl")));
}

try {
  if (canCreateWebGLContext()) {
    runWebGL(canvas);
  } else {
    runCanvasFallback(canvas);
  }
} catch (error) {
  console.warn("WebGL unavailable; using Canvas2D fallback.", error);
  runCanvasFallback(canvas);
}
