import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#game");
const blockLabel = document.querySelector("#blockLabel");
const heightLabel = document.querySelector("#heightLabel");
const joystick = document.querySelector("#joystick");
const stick = document.querySelector("#stick");
const buildBtn = document.querySelector("#buildBtn");
const digBtn = document.querySelector("#digBtn");
const jumpBtn = document.querySelector("#jumpBtn");
const zoomOutBtn = document.querySelector("#zoomOutBtn");
const zoomInBtn = document.querySelector("#zoomInBtn");
const zoomLabel = document.querySelector("#zoomLabel");
const toolButtons = [...document.querySelectorAll(".tool")];

const worldSize = 22;
const maxHeight = 5;
const minCameraZoom = 5.2;
const maxCameraZoom = 13;
const zoomStep = 0.8;
const maxReach = 8;
const gravity = 18;
const jumpImpulse = 7.4;
const half = Math.floor(worldSize / 2);
const moveVector = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const blocks = new Map();
const blockMeshes = [];

const blockTypes = {
  grass: { label: "Grass", color: 0x5ca95a, roughness: 0.88 },
  dirt: { label: "Dirt", color: 0x8b5f37, roughness: 0.94 },
  stone: { label: "Stone", color: 0x81847e, roughness: 0.96 },
  wood: { label: "Wood", color: 0x9a6b3f, roughness: 0.9 },
  water: { label: "Water", color: 0x4c98b8, roughness: 0.42 },
};

let selectedBlock = "grass";
let selectedCell = null;
let verticalVelocity = 0;
let isGrounded = false;
let attackTimer = 0;
let keyboardRun = false;
let cameraZoom = window.innerWidth < 720 ? 6.4 : 8.8;
const lastAimPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b6bd);
scene.fog = new THREE.Fog(0x87b6bd, 24, 64);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 120);
camera.position.set(14, 16, 14);
camera.rotation.order = "YXZ";
camera.lookAt(0, 0, 0);

const ambient = new THREE.HemisphereLight(0xdcebcf, 0x314b52, 1.7);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe6a3, 2.6);
sun.position.set(12, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
scene.add(sun);

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const materials = Object.fromEntries(
  Object.entries(blockTypes).map(([key, value]) => [
    key,
    new THREE.MeshStandardMaterial({ color: value.color, roughness: value.roughness }),
  ]),
);

const selector = new THREE.Mesh(
  new THREE.BoxGeometry(1.04, 0.08, 1.04),
  new THREE.MeshBasicMaterial({ color: 0xfff1a1, transparent: true, opacity: 0.72 }),
);
selector.visible = false;
scene.add(selector);

const player = createBlockCharacter();
scene.add(player);

function makeCharacterMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
}

function makeBoxPart(width, height, depth, color, yOffset = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeCharacterMaterial(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = yOffset;
  return mesh;
}

function makePivotedLimb(width, height, depth, color, anchorY) {
  const pivot = new THREE.Group();
  pivot.position.y = anchorY;
  const limb = makeBoxPart(width, height, depth, color, -height / 2);
  pivot.add(limb);
  return pivot;
}

function createBlockCharacter() {
  const rig = new THREE.Group();
  rig.userData.parts = {};

  const torso = makeBoxPart(0.58, 0.78, 0.3, 0x2f69b1, 1.05);
  const head = new THREE.Group();
  const headBlock = makeBoxPart(0.5, 0.5, 0.5, 0xd6a06f);
  const hair = makeBoxPart(0.54, 0.14, 0.54, 0x3b2518, 0.32);
  const face = makeBoxPart(0.34, 0.12, 0.02, 0x2b1d17, 0.03);
  head.position.y = 1.72;
  face.position.z = -0.261;
  head.add(headBlock, hair, face);
  const leftArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
  const rightArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
  const leftLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);
  const rightLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);

  leftArm.position.x = -0.44;
  rightArm.position.x = 0.44;
  leftLeg.position.x = -0.17;
  rightLeg.position.x = 0.17;

  const shirtBand = makeBoxPart(0.62, 0.08, 0.32, 0xf0c95a, 1.25);

  rig.add(torso, head, shirtBand, leftArm, rightArm, leftLeg, rightLeg);
  rig.scale.setScalar(0.72);
  rig.userData.parts = { head, torso, leftArm, rightArm, leftLeg, rightLeg };
  return rig;
}

function triggerAttack() {
  attackTimer = 0.34;
}

function jump() {
  if (!isGrounded) return;
  verticalVelocity = jumpImpulse;
  isGrounded = false;
}

function animateCharacter(delta, baseY, movementStrength, isRunning) {
  const parts = player.userData.parts;
  if (!parts) return;

  attackTimer = Math.max(0, attackTimer - delta);
  const t = clock.elapsedTime;
  const moving = movementStrength > 0.05;
  const cycleSpeed = moving ? (isRunning ? 13.5 : 8.5) : 2.2;
  const swing = Math.sin(t * cycleSpeed) * (moving ? (isRunning ? 0.92 : 0.58) : 0.08);
  const bob = moving ? Math.abs(Math.sin(t * cycleSpeed)) * (isRunning ? 0.08 : 0.04) : Math.sin(t * 2.2) * 0.015;

  player.position.y = baseY + bob;
  parts.leftArm.rotation.x = swing;
  parts.rightArm.rotation.x = -swing;
  parts.leftLeg.rotation.x = -swing;
  parts.rightLeg.rotation.x = swing;
  parts.leftArm.rotation.z = 0.05;
  parts.rightArm.rotation.z = -0.05;
  parts.head.rotation.y = Math.sin(t * 2.7) * (moving ? 0.07 : 0.12);
  parts.head.rotation.x = moving ? Math.sin(t * cycleSpeed) * 0.035 : Math.sin(t * 1.9) * 0.04;
  parts.torso.rotation.x = moving ? Math.sin(t * cycleSpeed) * 0.025 : 0;

  if (attackTimer > 0) {
    const progress = 1 - attackTimer / 0.34;
    const strike = Math.sin(progress * Math.PI);
    parts.rightArm.rotation.x = -1.95 * strike - 0.45;
    parts.rightArm.rotation.z = -0.35 * strike;
    parts.torso.rotation.y = -0.22 * strike;
    parts.head.rotation.y = -0.12 * strike;
  } else {
    parts.torso.rotation.y *= 0.75;
  }
}

const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.ShadowMaterial({ opacity: 0.18 }),
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.51;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

function key(x, z, y) {
  return `${x},${z},${y}`;
}

function terrainHeight(x, z) {
  const ridge = Math.sin(x * 0.55) + Math.cos(z * 0.48) + Math.sin((x + z) * 0.24);
  const island = 1 - Math.hypot(x, z) / (half * 1.35);
  return Math.max(1, Math.min(maxHeight, Math.floor(2 + ridge * 0.8 + island * 2)));
}

function topHeight(x, z) {
  let top = -1;
  for (let y = 0; y < 10; y += 1) {
    if (blocks.has(key(x, z, y))) top = y;
  }
  return top;
}

function addBlock(x, y, z, type) {
  const blockKey = key(x, z, y);
  if (blocks.has(blockKey)) return;
  const mesh = new THREE.Mesh(blockGeometry, materials[type]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { x, y, z, type };
  blocks.set(blockKey, mesh);
  blockMeshes.push(mesh);
  scene.add(mesh);
}

function removeBlock(mesh) {
  const { x, y, z } = mesh.userData;
  blocks.delete(key(x, z, y));
  const index = blockMeshes.indexOf(mesh);
  if (index !== -1) blockMeshes.splice(index, 1);
  mesh.removeFromParent();
}

function isLiveBlock(mesh) {
  if (!mesh?.userData) return false;
  const { x, y, z } = mesh.userData;
  return blocks.get(key(x, z, y)) === mesh;
}

function isWithinReach(mesh) {
  const playerBaseY = player.userData.physicsY ?? player.position.y;
  const dx = mesh.position.x - player.position.x;
  const dy = mesh.position.y - playerBaseY;
  const dz = mesh.position.z - player.position.z;
  return Math.hypot(dx, dy, dz) <= maxReach;
}

function clearSelection() {
  selectedCell = null;
  selector.visible = false;
}

function faceWorldPoint(target) {
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  if (Math.hypot(dx, dz) < 0.001) return;
  player.rotation.y = Math.atan2(-dx, -dz);
}

function refreshSelectionFromScreenPoint(clientX = lastAimPoint.x, clientY = lastAimPoint.y) {
  lastAimPoint.x = clientX;
  lastAimPoint.y = clientY;
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster
    .intersectObjects(blockMeshes, false)
    .filter((hit) => isLiveBlock(hit.object) && isWithinReach(hit.object));

  selectedCell = hits[0] ?? null;
  selector.visible = Boolean(selectedCell);
  if (!selectedCell) return null;

  const { x, y, z } = selectedCell.object.userData;
  selector.position.set(x, y + 0.54, z);
  heightLabel.textContent = `H: ${topHeight(x, z) + 1}`;
  faceWorldPoint(selectedCell.object.position);
  return selectedCell;
}

function generateWorld() {
  for (let x = -half; x <= half; x += 1) {
    for (let z = -half; z <= half; z += 1) {
      const distance = Math.hypot(x, z);
      if (distance > half + 0.6) continue;
      const height = terrainHeight(x, z);
      for (let y = 0; y < height; y += 1) {
        const type = y === height - 1 ? "grass" : y < height - 2 ? "stone" : "dirt";
        addBlock(x, y, z, type);
      }
      if (height <= 2 && distance < half - 1) addBlock(x, height, z, "water");
      if ((x * 13 + z * 7) % 41 === 0 && height > 2) {
        addBlock(x, height, z, "wood");
        addBlock(x, height + 1, z, "wood");
      }
    }
  }
}

function setSelectedBlock(type) {
  selectedBlock = type;
  blockLabel.textContent = blockTypes[type].label;
  toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.block === type));
}

function updateSelection(clientX = lastAimPoint.x, clientY = lastAimPoint.y) {
  return refreshSelectionFromScreenPoint(clientX, clientY);
}

function buildSelected() {
  const hit = refreshSelectionFromScreenPoint();
  if (!hit) return;
  triggerAttack();
  const { x, y, z } = hit.object.userData;
  const placeY = Math.min(9, y + 1);
  addBlock(x, placeY, z, selectedBlock);
  updateSelection(lastAimPoint.x, lastAimPoint.y);
}

function digSelected() {
  const hit = refreshSelectionFromScreenPoint();
  if (!hit) return;
  const mesh = hit.object;
  if (mesh.userData.type === "water") return;
  triggerAttack();
  removeBlock(mesh);
  clearSelection();
  updateSelection(lastAimPoint.x, lastAimPoint.y);
}

function updateZoomLabel() {
  zoomLabel.textContent = cameraZoom.toFixed(1);
}

function applyCameraZoom() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  camera.left = -cameraZoom * aspect;
  camera.right = cameraZoom * aspect;
  camera.top = cameraZoom;
  camera.bottom = -cameraZoom;
  camera.updateProjectionMatrix();
  updateZoomLabel();
}

function changeZoom(delta) {
  cameraZoom = THREE.MathUtils.clamp(cameraZoom + delta, minCameraZoom, maxCameraZoom);
  applyCameraZoom();
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  applyCameraZoom();
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(-1, 0, -1).normalize();
  const right = new THREE.Vector3(1, 0, -1).normalize();
  const inputStrength = Math.min(1, moveVector.length());
  const isRunning = keyboardRun || inputStrength > 0.78;
  const movement = new THREE.Vector3()
    .addScaledVector(forward, moveVector.y)
    .addScaledVector(right, moveVector.x);

  if (movement.lengthSq() > 0.001) {
    const speed = isRunning ? 6.1 : 3.9;
    movement.normalize().multiplyScalar(delta * speed * Math.max(inputStrength, 0.45));
    player.position.add(movement);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -half + 1, half - 1);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -half + 1, half - 1);
    if (!selectedCell) faceWorldPoint(player.position.clone().add(movement));
  }

  const px = Math.round(player.position.x);
  const pz = Math.round(player.position.z);
  const targetY = topHeight(px, pz) + 1;
  let physicsY = player.userData.physicsY ?? player.position.y;
  if (isGrounded && physicsY < targetY) physicsY = targetY;
  verticalVelocity -= gravity * delta;
  physicsY += verticalVelocity * delta;
  if (physicsY <= targetY) {
    physicsY = targetY;
    verticalVelocity = 0;
    isGrounded = true;
  } else {
    isGrounded = false;
  }
  player.userData.physicsY = physicsY;
  animateCharacter(delta, physicsY, inputStrength, isRunning);

  const target = player.position.clone();
  camera.position.lerp(new THREE.Vector3(target.x + 14, target.y + 14, target.z + 14), 0.08);
  camera.lookAt(target.x, target.y, target.z);
  if (selectedCell) refreshSelectionFromScreenPoint();
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);
  updatePlayer(delta);
  const t = clock.elapsedTime;
  sun.position.set(Math.sin(t * 0.08) * 18, 22, Math.cos(t * 0.08) * 18);
  selector.material.opacity = 0.52 + Math.sin(t * 7) * 0.12;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function bindJoystick() {
  let activePointer = null;
  const center = new THREE.Vector2();

  joystick.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    joystick.setPointerCapture(activePointer);
    const rect = joystick.getBoundingClientRect();
    center.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;
    const radius = joystick.clientWidth * 0.34;
    const distance = Math.min(radius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * distance;
    const sy = Math.sin(angle) * distance;
    stick.style.transform = `translate(${sx}px, ${sy}px)`;
    moveVector.set(sx / radius, -sy / radius);
  });

  const end = (event) => {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    stick.style.transform = "translate(0, 0)";
    moveVector.set(0, 0);
  };
  joystick.addEventListener("pointerup", end);
  joystick.addEventListener("pointercancel", end);
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button") || event.target.closest("#joystick")) return;
  updateSelection(event.clientX, event.clientY);
});
window.addEventListener("pointermove", (event) => {
  if (event.target.closest("button") || event.target.closest("#joystick")) return;
  updateSelection(event.clientX, event.clientY);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "w" || event.key === "ArrowUp") moveVector.y = 1;
  if (event.key === "s" || event.key === "ArrowDown") moveVector.y = -1;
  if (event.key === "a" || event.key === "ArrowLeft") moveVector.x = -1;
  if (event.key === "d" || event.key === "ArrowRight") moveVector.x = 1;
  if (event.key === "Shift") keyboardRun = true;
  if (event.key === " ") jump();
  if (event.key === "e") buildSelected();
  if (event.key === "q") digSelected();
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") keyboardRun = false;
  if (["w", "s", "ArrowUp", "ArrowDown"].includes(event.key)) moveVector.y = 0;
  if (["a", "d", "ArrowLeft", "ArrowRight"].includes(event.key)) moveVector.x = 0;
});

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedBlock(button.dataset.block));
});
buildBtn.addEventListener("click", buildSelected);
digBtn.addEventListener("click", digSelected);
jumpBtn.addEventListener("click", () => {
  jump();
});
zoomOutBtn.addEventListener("click", () => changeZoom(zoomStep));
zoomInBtn.addEventListener("click", () => changeZoom(-zoomStep));

generateWorld();
resize();
bindJoystick();
setSelectedBlock("grass");
player.position.set(0, topHeight(0, 0) + 1, 0);
player.userData.physicsY = player.position.y;
isGrounded = true;
updateSelection();
animate();
