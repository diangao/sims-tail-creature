import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Segment = {
  pivot: THREE.Group;
  mesh?: THREE.Mesh;
  baseLength: number;
  baseHeight: number;
  phase: number;
  amplitude: number;
};

type TailGene = {
  length: number;
  height: number;
  amplitude: number;
  phase: number;
};

type Genotype = {
  id: string;
  generation: number;
  bodyLength: number;
  bodyHeight: number;
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

function mutateValue(value: number, amount: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value + randomBetween(-amount, amount)));
}

function stableGenotype(): Genotype {
  return {
    id: "Tail swimmer A-001",
    generation: 0,
    bodyLength: 1.35,
    bodyHeight: 0.55,
    headScale: 1,
    finScale: 1,
    tailSpeed: 2.7,
    drift: 0.3,
    lift: 0.035,
    wobble: 0.045,
    tail: Array.from({ length: 6 }, (_, index) => ({
      length: Math.max(0.32, 0.62 - index * 0.045),
      height: Math.max(0.18, 0.32 - index * 0.024),
      amplitude: 0.24 + index * 0.032,
      phase: index * 0.58,
    })),
  };
}

function crawlerGenotype(): Genotype {
  return {
    id: "Block crawler B-014",
    generation: 14,
    bodyLength: 1.2,
    bodyHeight: 0.72,
    headScale: 0.88,
    finScale: 0.68,
    tailSpeed: 2.05,
    drift: 0.18,
    lift: 0.022,
    wobble: 0.07,
    tail: Array.from({ length: 6 }, (_, index) => ({
      length: Math.max(0.34, 0.54 - index * 0.025),
      height: Math.max(0.2, 0.38 - index * 0.018),
      amplitude: 0.16 + index * 0.024,
      phase: index * 0.42,
    })),
  };
}

function mutateGenotype(source: Genotype): Genotype {
  const generation = source.generation + 1;

  return {
    id: `Tail variant G-${generation.toString().padStart(3, "0")}`,
    generation,
    bodyLength: mutateValue(source.bodyLength, 0.16, 0.9, 1.68),
    bodyHeight: mutateValue(source.bodyHeight, 0.12, 0.36, 0.78),
    headScale: mutateValue(source.headScale, 0.16, 0.72, 1.28),
    finScale: mutateValue(source.finScale, 0.22, 0.46, 1.38),
    tailSpeed: mutateValue(source.tailSpeed, 0.36, 1.65, 3.35),
    drift: mutateValue(source.drift, 0.1, 0.08, 0.5),
    lift: mutateValue(source.lift, 0.018, 0.008, 0.068),
    wobble: mutateValue(source.wobble, 0.024, 0.018, 0.09),
    tail: source.tail.map((gene, index) => ({
      length: mutateValue(gene.length, 0.12, 0.28, 0.78),
      height: mutateValue(gene.height, 0.08, 0.12, 0.44),
      amplitude: mutateValue(gene.amplitude, 0.075, 0.11, 0.52),
      phase: mutateValue(gene.phase, 0.18, index * 0.28, index * 0.76 + 0.2),
    })),
  };
}

function bindControls(apply: (genotype: Genotype) => void, getCurrent: () => Genotype): void {
  stableBtn?.addEventListener("click", () => apply(stableGenotype()));
  crawlerBtn?.addEventListener("click", () => apply(crawlerGenotype()));
  mutateBtn?.addEventListener("click", () => apply(mutateGenotype(getCurrent())));
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
    currentGenotype.tail.forEach((gene, i) => {
      const swing = Math.sin(time * currentGenotype.tailSpeed - gene.phase) * gene.amplitude;
      fallbackCtx.rotate(swing);
      block(-28, 0, gene.length * 105, gene.height * 102, i < 2 ? "#6ac4d6" : "#80d6de");
      fallbackCtx.translate(-gene.length * 82, 0);
    });
    fallbackCtx.restore();

    fallbackCtx.save();
    fallbackCtx.rotate(-0.08);
    block(0, 0, currentGenotype.bodyLength * 112, currentGenotype.bodyHeight * 112, "#f2f1d8");
    block(106, -2, 66 * currentGenotype.headScale, 52 * currentGenotype.headScale, "#f2f1d8");
    block(12, -46, 74 * currentGenotype.finScale, 22, "#6ac4d6");
    block(2, 38, 78 * currentGenotype.finScale, 20, "#6ac4d6");
    block(70, 36, 54 * currentGenotype.finScale, 18, "#80d6de");
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

  for (let i = 0; i < 6; i += 1) {
    const pivot = new THREE.Group();
    pivot.position.x = i === 0 ? 0 : -0.5;
    parent.add(pivot);

    const length = Math.max(0.32, 0.62 - i * 0.045);
    const height = Math.max(0.18, 0.32 - i * 0.024);
    const mesh = makeBox(new THREE.Vector3(length, height, 0.34), i < 2 ? jointMaterial : tailMaterial);
    mesh.position.x = -length * 0.5;
    mesh.rotation.z = 0.04;
    pivot.add(mesh);

    segments.push({
      pivot,
      mesh,
      baseLength: length,
      baseHeight: height,
      phase: i * 0.58,
      amplitude: 0.24 + i * 0.032,
    });

    parent = pivot;
  }

  function applyGenotype(next: Genotype): void {
    currentGenotype = next;
    torso.scale.set(currentGenotype.bodyLength / 1.35, currentGenotype.bodyHeight / 0.55, 1);
    head.scale.setScalar(currentGenotype.headScale);
    dorsal.scale.set(currentGenotype.bodyLength / 1.35, 1, 1);
    leftFin.scale.setScalar(currentGenotype.finScale);
    rightFin.scale.setScalar(currentGenotype.finScale);
    tailRoot.position.x = -0.72 * (currentGenotype.bodyLength / 1.35);

    segments.forEach((segment, index) => {
      const gene = currentGenotype.tail[index];

      if (!gene || !segment.mesh) {
        return;
      }

      segment.phase = gene.phase;
      segment.amplitude = gene.amplitude;
      segment.mesh.scale.set(gene.length / segment.baseLength, gene.height / segment.baseHeight, 1);
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
