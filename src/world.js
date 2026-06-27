import * as THREE from "three";

const worldSize = 22;
const maxHeight = 5;
const half = Math.floor(worldSize / 2);

const blockTypes = {
  grass: { color: 0x5ca95a, roughness: 0.88 },
  dirt: { color: 0x8b5f37, roughness: 0.94 },
  stone: { color: 0x81847e, roughness: 0.96 },
  wood: { color: 0x9a6b3f, roughness: 0.9 },
  water: { color: 0x4c98b8, roughness: 0.42 },
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const materials = Object.fromEntries(
  Object.entries(blockTypes).map(([key, value]) => [
    key,
    new THREE.MeshStandardMaterial({ color: value.color, roughness: value.roughness }),
  ]),
);

function key(x, z, y) {
  return `${x},${z},${y}`;
}

function terrainHeight(x, z) {
  const ridge = Math.sin(x * 0.55) + Math.cos(z * 0.48) + Math.sin((x + z) * 0.24);
  const island = 1 - Math.hypot(x, z) / (half * 1.35);
  return Math.max(1, Math.min(maxHeight, Math.floor(2 + ridge * 0.8 + island * 2)));
}

class World {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.blockMeshes = [];
  }

  getBlock(x, y, z) {
    const mesh = this.blocks.get(key(x, z, y));
    return mesh ? mesh.userData.type : null;
  }

  setBlock(x, y, z, type) {
    const blockKey = key(x, z, y);
    if (this.blocks.has(blockKey)) return;
    const mesh = new THREE.Mesh(blockGeometry, materials[type]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { x, y, z, type };
    this.blocks.set(blockKey, mesh);
    this.blockMeshes.push(mesh);
    this.scene.add(mesh);
  }

  removeBlockAt(x, y, z) {
    const blockKey = key(x, z, y);
    const mesh = this.blocks.get(blockKey);
    if (!mesh) return;
    this.blocks.delete(blockKey);
    const index = this.blockMeshes.indexOf(mesh);
    if (index !== -1) this.blockMeshes.splice(index, 1);
    mesh.removeFromParent();
  }

  heightAt(x, z) {
    return terrainHeight(x, z);
  }

  topHeight(x, z) {
    let top = -1;
    for (let y = 0; y < 10; y += 1) {
      if (this.blocks.has(key(x, z, y))) top = y;
    }
    return top;
  }

  topBlockType(x, z) {
    const top = this.topHeight(x, z);
    return top >= 0 ? this.getBlock(x, top, z) : null;
  }

  isSurfaceWalkable(x, z) {
    const top = this.topHeight(x, z);
    if (top < 0) return false;
    return this.topBlockType(x, z) !== "water";
  }

  findSpawnPoint(origin, minDistance = 5, maxDistance = 10, attempts = 24) {
    for (let i = 0; i < attempts; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const x = Math.round(origin.x + Math.cos(angle) * distance);
      const z = Math.round(origin.z + Math.sin(angle) * distance);

      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (!this.isSurfaceWalkable(x, z)) continue;

      return { x, y: this.topHeight(x, z) + 1, z };
    }

    return null;
  }

  generate() {
    for (let x = -half; x <= half; x += 1) {
      for (let z = -half; z <= half; z += 1) {
        const distance = Math.hypot(x, z);
        if (distance > half + 0.6) continue;
        const height = terrainHeight(x, z);
        for (let y = 0; y < height; y += 1) {
          const type = y === height - 1 ? "grass" : y < height - 2 ? "stone" : "dirt";
          this.setBlock(x, y, z, type);
        }
        if (height <= 2 && distance < half - 1) this.setBlock(x, height, z, "water");
        if ((x * 13 + z * 7) % 41 === 0 && height > 2) {
          this.setBlock(x, height, z, "wood");
          this.setBlock(x, height + 1, z, "wood");
        }
      }
    }
  }

  getAllMeshes() {
    return this.blockMeshes;
  }

  forEachBlock(callback) {
    for (const mesh of this.blocks.values()) {
      const { x, y, z, type } = mesh.userData;
      callback(x, y, z, type);
    }
  }
}

export default World;
