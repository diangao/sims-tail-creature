import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Segment = {
  pivot: THREE.Group;
  phase: number;
  amplitude: number;
};

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const phaseValue = document.querySelector<HTMLSpanElement>("#phaseValue");

if (!canvas) {
  throw new Error("missing #scene canvas");
}

function setPhase(time: number): void {
  if (phaseValue) {
    phaseValue.textContent = (time % (Math.PI * 2)).toFixed(2);
  }
}

function runCanvasFallback(target: HTMLCanvasElement): void {
  const ctx = target.getContext("2d");

  if (!ctx) {
    return;
  }

  const fallbackCtx = ctx;
  const state = { width: 0, height: 0, ratio: 1 };

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
    for (let i = 0; i < 6; i += 1) {
      const swing = Math.sin(time * 2.7 - i * 0.58) * (0.16 + i * 0.024);
      fallbackCtx.rotate(swing);
      block(-28, 0, Math.max(38, 72 - i * 6), Math.max(22, 38 - i * 3), i < 2 ? "#6ac4d6" : "#80d6de");
      fallbackCtx.translate(-54, 0);
    }
    fallbackCtx.restore();

    fallbackCtx.save();
    fallbackCtx.rotate(-0.08);
    block(0, 0, 150, 62, "#f2f1d8");
    block(106, -2, 66, 52, "#f2f1d8");
    block(12, -46, 74, 22, "#6ac4d6");
    block(2, 38, 78, 20, "#6ac4d6");
    block(70, 36, 54, 18, "#80d6de");
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
      phase: i * 0.58,
      amplitude: 0.24 + i * 0.032,
    });

    parent = pivot;
  }

  const clock = new THREE.Clock();

  function animateCreature(time: number): void {
    creature.position.set(Math.sin(time * 0.45) * 0.3, 0.05 + Math.sin(time * 1.4) * 0.035, 0);
    creature.rotation.y = Math.sin(time * 0.42) * 0.18;
    creature.rotation.z = Math.sin(time * 1.1) * 0.045;

    torso.rotation.y = Math.sin(time * 1.8) * 0.035;
    head.rotation.y = Math.sin(time * 1.8 + 0.35) * 0.08;

    leftFin.rotation.z = -0.18 + Math.sin(time * 2.4) * 0.28;
    rightFin.rotation.z = 0.18 + Math.sin(time * 2.4 + Math.PI) * 0.28;
    leftFin.rotation.y = Math.sin(time * 1.7 + 0.6) * 0.18;
    rightFin.rotation.y = Math.sin(time * 1.7 + Math.PI + 0.6) * 0.18;

    for (const segment of segments) {
      segment.pivot.rotation.y = Math.sin(time * 2.7 - segment.phase) * segment.amplitude;
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

try {
  runWebGL(canvas);
} catch (error) {
  console.warn("WebGL unavailable; using Canvas2D fallback.", error);
  runCanvasFallback(canvas);
}
