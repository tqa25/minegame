import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import BlockSelector from "./block-selector.js";

function makeWorld(options = {}) {
  const meshes = options.meshes ?? [];
  const livePositions = new Set();
  for (const m of meshes) {
    if (m?.userData) {
      livePositions.add(`${m.userData.x},${m.userData.y},${m.userData.z}`);
    }
  }
  return {
    getAllMeshes: () => meshes,
    topHeight: options.topHeight ?? ((x, z) => 0),
    getBlock: (x, y, z) =>
      livePositions.has(`${x},${y},${z}`) ? "stone" : null,
  };
}

function makeBlockMesh(x, y, z, type = "stone") {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.userData = { x, y, z, type };
  return mesh;
}

function setupCamera(cam, px, py, pz, tx, ty, tz) {
  cam.position.set(px, py, pz);
  cam.lookAt(tx, ty, tz);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
}

describe("BlockSelector", () => {
  let scene;
  let camera;
  let character;
  let world;
  let heightLabel;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    character = { position: new THREE.Vector3(0, 1, 0) };
    world = makeWorld();
    heightLabel = document.createElement("span");
    window.innerWidth = 800;
    window.innerHeight = 600;
  });

  it("constructor creates selector mesh and adds to scene", () => {
    const bs = new BlockSelector(world, camera, character, scene, heightLabel);
    expect(bs.constructor.name).toBe("BlockSelector");
    const found = scene.children.find(
      (c) =>
        c.isMesh &&
        c.geometry.type === "BoxGeometry" &&
        c.geometry.parameters.width === 1.04,
    );
    expect(found).toBeTruthy();
    expect(found.visible).toBe(false);
  });

  it("pick() with no blocks returns null", () => {
    const bs = new BlockSelector(world, camera, character, scene, heightLabel);
    const result = bs.pick(0, 0);
    expect(result).toBeNull();
  });

  it("clear() hides selector and resets selected cell", () => {
    const bs = new BlockSelector(world, camera, character, scene, heightLabel);
    bs.clear();
    expect(bs.getSelectedCell()).toBeNull();
    const selectorMesh = scene.children.find(
      (c) =>
        c.isMesh &&
        c.geometry.type === "BoxGeometry" &&
        c.geometry.parameters.width === 1.04,
    );
    expect(selectorMesh.visible).toBe(false);
  });

  it("getSelectedCell() returns null after clear", () => {
    const bs = new BlockSelector(world, camera, character, scene, heightLabel);
    expect(bs.getSelectedCell()).toBeNull();
    bs.clear();
    expect(bs.getSelectedCell()).toBeNull();
  });

  it("pick returns null for far block outside reach", () => {
    const farMesh = makeBlockMesh(50, 0, 0);
    scene.add(farMesh);
    scene.updateMatrixWorld();
    const worldWithMeshes = makeWorld({
      meshes: [farMesh],
      topHeight: (x, z) => 0,
    });
    const bs = new BlockSelector(
      worldWithMeshes,
      camera,
      character,
      scene,
      heightLabel,
    );
    setupCamera(camera, 10, 10, 10, 0, 0, 0);
    const result = bs.pick(0, 0);
    expect(result).toBeNull();
  });

  it("pick at screen center hits block at origin", () => {
    const mesh = makeBlockMesh(0, 0, 0);
    scene.add(mesh);
    scene.updateMatrixWorld();
    const worldWithMesh = makeWorld({
      meshes: [mesh],
      topHeight: (x, z) => 2,
    });
    const bs = new BlockSelector(
      worldWithMesh,
      camera,
      character,
      scene,
      heightLabel,
    );
    setupCamera(camera, 3, 3, 3, 0, 0, 0);
    const result = bs.pick(400, 300);
    expect(result).not.toBeNull();
    expect(result.object).toBe(mesh);
  });

  it("pick updates heightLabel and selector position on hit", () => {
    const mesh = makeBlockMesh(0, 0, 0);
    scene.add(mesh);
    scene.updateMatrixWorld();
    const worldWithMesh = makeWorld({
      meshes: [mesh],
      topHeight: () => 2,
    });
    const bs = new BlockSelector(
      worldWithMesh,
      camera,
      character,
      scene,
      heightLabel,
    );
    setupCamera(camera, 3, 3, 3, 0, 0, 0);
    bs.pick(400, 300);
    expect(heightLabel.textContent).toBe("H: 3");
    const selectorMesh = scene.children.find(
      (c) =>
        c.isMesh &&
        c.geometry.type === "BoxGeometry" &&
        c.geometry.parameters.width === 1.04,
    );
    expect(selectorMesh.position.x).toBe(0);
    expect(selectorMesh.position.y).toBe(0.54);
    expect(selectorMesh.position.z).toBe(0);
    expect(selectorMesh.visible).toBe(true);
  });

  it("pick returns null for block out of reach", () => {
    const mesh = makeBlockMesh(3, 0, 0);
    scene.add(mesh);
    scene.updateMatrixWorld();
    const worldWithMesh = makeWorld({
      meshes: [mesh],
      topHeight: (x, z) => 0,
    });
    const charFar = { position: new THREE.Vector3(20, 1, 0) };
    const bs = new BlockSelector(
      worldWithMesh,
      camera,
      charFar,
      scene,
      heightLabel,
    );
    setupCamera(camera, 5, 5, 5, 3, 0, 0);
    const result = bs.pick(400, 300);
    expect(result).toBeNull();
  });

  it("pick selects block within reach", () => {
    const mesh = makeBlockMesh(3, 0, 0);
    scene.add(mesh);
    scene.updateMatrixWorld();
    const worldWithMesh = makeWorld({
      meshes: [mesh],
      topHeight: (x, z) => 0,
    });
    const bs = new BlockSelector(
      worldWithMesh,
      camera,
      character,
      scene,
      heightLabel,
    );
    setupCamera(camera, 5, 5, 5, 3, 0, 0);
    const result = bs.pick(400, 300);
    expect(result).not.toBeNull();
    expect(result.object).toBe(mesh);
    expect(bs.getSelectedCell()).toBe(result);
  });
});
