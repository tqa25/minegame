import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#game");
const blockLabel = document.querySelector("#blockLabel");
const heightLabel = document.querySelector("#heightLabel");
const joystick = document.querySelector("#joystick");
const stick = document.querySelector("#stick");
const buildBtn = document.querySelector("#buildBtn");
const digBtn = document.querySelector("#digBtn");
const jumpBtn = document.querySelector("#jumpBtn");
const toolButtons = [...document.querySelectorAll(".tool")];

const worldSize = 22;
const maxHeight = 5;
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
let hopVelocity = 0;

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

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.25, 0.46, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x355c7d, roughness: 0.65 }),
);
body.castShadow = true;
body.position.y = 0.52;
const hat = new THREE.Mesh(
  new THREE.BoxGeometry(0.62, 0.18, 0.62),
  new THREE.MeshStandardMaterial({ color: 0xf0c95a, roughness: 0.7 }),
);
hat.castShadow = true;
hat.position.y = 1.03;
player.add(body, hat);
scene.add(player);

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
  blockMeshes.splice(blockMeshes.indexOf(mesh), 1);
  mesh.removeFromParent();
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

function updateSelection(clientX = window.innerWidth / 2, clientY = window.innerHeight / 2) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(blockMeshes, false);
  selectedCell = hits[0] ?? null;
  selector.visible = Boolean(selectedCell);
  if (!selectedCell) return;
  const { x, y, z } = selectedCell.object.userData;
  selector.position.set(x, y + 0.54, z);
  heightLabel.textContent = `H: ${topHeight(x, z) + 1}`;
}

function buildSelected() {
  if (!selectedCell) updateSelection();
  if (!selectedCell) return;
  const { x, y, z } = selectedCell.object.userData;
  const placeY = Math.min(9, y + 1);
  addBlock(x, placeY, z, selectedBlock);
  updateSelection();
}

function digSelected() {
  if (!selectedCell) updateSelection();
  if (!selectedCell) return;
  const mesh = selectedCell.object;
  if (mesh.userData.type === "water") return;
  removeBlock(mesh);
  updateSelection();
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const zoom = width < 720 ? 6.4 : 8.8;
  camera.left = -zoom * aspect;
  camera.right = zoom * aspect;
  camera.top = zoom;
  camera.bottom = -zoom;
  camera.updateProjectionMatrix();
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(-1, 0, -1).normalize();
  const right = new THREE.Vector3(1, 0, -1).normalize();
  const movement = new THREE.Vector3()
    .addScaledVector(forward, moveVector.y)
    .addScaledVector(right, moveVector.x);

  if (movement.lengthSq() > 0.001) {
    movement.normalize().multiplyScalar(delta * 4.2);
    player.position.add(movement);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -half + 1, half - 1);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -half + 1, half - 1);
    player.rotation.y = Math.atan2(movement.x, movement.z);
  }

  const px = Math.round(player.position.x);
  const pz = Math.round(player.position.z);
  const targetY = topHeight(px, pz) + 1;
  hopVelocity -= delta * 10;
  player.position.y += hopVelocity * delta;
  if (player.position.y < targetY) {
    player.position.y = targetY;
    hopVelocity = 0;
  }

  const target = player.position.clone();
  camera.position.lerp(new THREE.Vector3(target.x + 14, target.y + 14, target.z + 14), 0.08);
  camera.lookAt(target.x, target.y, target.z);
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
  if (event.key === " ") hopVelocity = 5;
  if (event.key === "e") buildSelected();
  if (event.key === "q") digSelected();
});

window.addEventListener("keyup", (event) => {
  if (["w", "s", "ArrowUp", "ArrowDown"].includes(event.key)) moveVector.y = 0;
  if (["a", "d", "ArrowLeft", "ArrowRight"].includes(event.key)) moveVector.x = 0;
});

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedBlock(button.dataset.block));
});
buildBtn.addEventListener("click", buildSelected);
digBtn.addEventListener("click", digSelected);
jumpBtn.addEventListener("click", () => {
  if (hopVelocity === 0) hopVelocity = 5;
});

generateWorld();
resize();
bindJoystick();
setSelectedBlock("grass");
player.position.set(0, topHeight(0, 0) + 1, 0);
updateSelection();
animate();
