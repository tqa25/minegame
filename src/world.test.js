import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import World from "./world.js";

const worldSize = 22;
const maxHeight = 5;
const half = Math.floor(worldSize / 2);

function expectedHeight(x, z) {
  const ridge = Math.sin(x * 0.55) + Math.cos(z * 0.48) + Math.sin((x + z) * 0.24);
  const island = 1 - Math.hypot(x, z) / (half * 1.35);
  return Math.max(1, Math.min(maxHeight, Math.floor(2 + ridge * 0.8 + island * 2)));
}

describe("World", () => {
  let scene;
  let world;

  beforeEach(() => {
    scene = new THREE.Scene();
    world = new World(scene);
  });

  it("heightAt matches terrain formula", () => {
    const testCoords = [[0, 0], [1, 1], [3, 5], [-2, 4], [5, -3]];
    for (const [x, z] of testCoords) {
      expect(world.heightAt(x, z)).toBe(expectedHeight(x, z));
    }
  });

  it("heightAt returns value between 1 and maxHeight", () => {
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        const h = world.heightAt(x, z);
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(maxHeight);
      }
    }
  });

  it("setBlock then getBlock returns the type", () => {
    world.setBlock(0, 0, 0, "grass");
    expect(world.getBlock(0, 0, 0)).toBe("grass");
  });

  it("getBlock returns null for empty position", () => {
    expect(world.getBlock(99, 99, 99)).toBeNull();
  });

  it("removeBlockAt removes the block", () => {
    world.setBlock(1, 2, 3, "stone");
    expect(world.getBlock(1, 2, 3)).toBe("stone");
    world.removeBlockAt(1, 2, 3);
    expect(world.getBlock(1, 2, 3)).toBeNull();
  });

  it("setBlock at same position does not overwrite", () => {
    world.setBlock(0, 0, 0, "grass");
    world.setBlock(0, 0, 0, "dirt");
    expect(world.getBlock(0, 0, 0)).toBe("grass");
  });

  it("topHeight returns correct highest Y", () => {
    world.setBlock(5, 0, 5, "stone");
    world.setBlock(5, 1, 5, "dirt");
    world.setBlock(5, 2, 5, "grass");
    expect(world.topHeight(5, 5)).toBe(2);
  });

  it("topHeight returns -1 for empty column", () => {
    expect(world.topHeight(99, 99)).toBe(-1);
  });

  it("topHeight finds highest after mixed set and remove", () => {
    world.setBlock(3, 0, 3, "stone");
    world.setBlock(3, 1, 3, "dirt");
    world.setBlock(3, 2, 3, "grass");
    world.removeBlockAt(3, 2, 3);
    expect(world.topHeight(3, 3)).toBe(1);
  });

  it("generate populates the world with blocks", () => {
    world.generate();
    const meshes = world.getAllMeshes();
    expect(meshes.length).toBeGreaterThan(0);
  });

  it("generate creates terrain at center column", () => {
    world.generate();
    const top = world.topHeight(0, 0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(world.getBlock(0, 0, 0)).toBeTruthy();
  });

  it("generate does not create blocks outside world radius", () => {
    world.generate();
    expect(world.getBlock(half + 1, 0, 0)).toBeNull();
  });

  it("getAllMeshes returns array of meshes", () => {
    world.setBlock(0, 0, 0, "grass");
    world.setBlock(1, 0, 0, "dirt");
    const meshes = world.getAllMeshes();
    expect(meshes).toHaveLength(2);
    expect(meshes[0]).toBeInstanceOf(THREE.Mesh);
  });

  it("getAllMeshes returns empty array when no blocks", () => {
    expect(world.getAllMeshes()).toEqual([]);
  });

  it("forEachBlock iterates all blocks", () => {
    world.setBlock(0, 0, 0, "grass");
    world.setBlock(1, 2, 3, "dirt");
    const entries = [];
    world.forEachBlock((x, y, z, type) => {
      entries.push({ x, y, z, type });
    });
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({ x: 0, y: 0, z: 0, type: "grass" });
    expect(entries).toContainEqual({ x: 1, y: 2, z: 3, type: "dirt" });
  });

  it("removeBlockAt removes mesh from scene", () => {
    world.setBlock(0, 0, 0, "grass");
    world.removeBlockAt(0, 0, 0);
    expect(world.getAllMeshes()).toHaveLength(0);
  });

  it("meshes have correct userData", () => {
    world.setBlock(3, 5, 7, "wood");
    const mesh = world.getAllMeshes()[0];
    expect(mesh.userData).toEqual({ x: 3, y: 5, z: 7, type: "wood" });
  });

  it("topBlockType returns the highest block type in a column", () => {
    world.setBlock(2, 0, 2, "stone");
    world.setBlock(2, 1, 2, "grass");
    expect(world.topBlockType(2, 2)).toBe("grass");
  });

  it("isSurfaceWalkable rejects columns topped with water", () => {
    world.setBlock(1, 0, 1, "water");
    expect(world.isSurfaceWalkable(1, 1)).toBe(false);
  });

  it("findSpawnPoint returns a walkable surface near the origin", () => {
    world.generate();
    const spawn = world.findSpawnPoint({ x: 0, z: 0 }, 3, 6, 60);
    expect(spawn).toBeTruthy();
    expect(world.isSurfaceWalkable(spawn.x, spawn.z)).toBe(true);
    expect(spawn.y).toBe(world.topHeight(spawn.x, spawn.z) + 1);
  });
});
