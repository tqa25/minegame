import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSetSize = vi.fn();
const mockRender = vi.fn();
const mockSetPixelRatio = vi.fn();

vi.mock("three", async () => {
  const THREE = await vi.importActual("three");

  class MockWebGLRenderer {
    constructor(opts) {
      this.domElement = opts?.canvas || document.createElement("canvas");
      this.setPixelRatio = mockSetPixelRatio;
      this.setSize = mockSetSize;
      this.render = mockRender;
      this.shadowMap = { enabled: true, type: THREE.PCFSoftShadowMap };
      this.type = "WebGLRenderer";
    }
  }

  return {
    ...THREE,
    WebGLRenderer: MockWebGLRenderer,
  };
});

import * as THREE from "three";
import Renderer from "./renderer.js";

describe("Renderer", () => {
  let canvas;
  let renderer;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    renderer = new Renderer(canvas);
  });

  it("constructor creates a THREE.Scene", () => {
    expect(renderer.scene).toBeInstanceOf(THREE.Scene);
  });

  it("constructor creates a THREE.WebGLRenderer", () => {
    expect(renderer.renderer).toBeInstanceOf(THREE.WebGLRenderer);
  });

  it("scene has fog set", () => {
    expect(renderer.scene.fog).toBeInstanceOf(THREE.Fog);
  });

  it("scene has background color", () => {
    expect(renderer.scene.background).toBeInstanceOf(THREE.Color);
  });

  it("renderer has shadow map enabled", () => {
    expect(renderer.renderer.shadowMap.enabled).toBe(true);
  });

  it("renderer uses PCFSoftShadowMap", () => {
    expect(renderer.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
  });

  it("scene has hemisphere light", () => {
    const hemi = renderer.scene.children.find(
      (c) => c instanceof THREE.HemisphereLight,
    );
    expect(hemi).toBeTruthy();
  });

  it("scene has directional light (sun)", () => {
    const sun = renderer.scene.children.find(
      (c) => c instanceof THREE.DirectionalLight,
    );
    expect(sun).toBeTruthy();
    expect(sun.castShadow).toBe(true);
  });

  it("scene has ground plane", () => {
    const plane = renderer.scene.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry,
    );
    expect(plane).toBeTruthy();
    expect(plane.receiveShadow).toBe(true);
  });

  it("blockGeometry is a BoxGeometry(1,1,1)", () => {
    expect(renderer.blockGeometry).toBeInstanceOf(THREE.BoxGeometry);
    const box = new THREE.BoxGeometry(1, 1, 1);
    expect(renderer.blockGeometry.parameters.width).toBe(box.parameters.width);
    expect(renderer.blockGeometry.parameters.height).toBe(box.parameters.height);
    expect(renderer.blockGeometry.parameters.depth).toBe(box.parameters.depth);
  });

  it("materials contains all block types", () => {
    expect(renderer.materials).toHaveProperty("grass");
    expect(renderer.materials).toHaveProperty("dirt");
    expect(renderer.materials).toHaveProperty("stone");
    expect(renderer.materials).toHaveProperty("wood");
    expect(renderer.materials).toHaveProperty("water");
    for (const key of ["grass", "dirt", "stone", "wood", "water"]) {
      expect(renderer.materials[key]).toBeInstanceOf(THREE.MeshStandardMaterial);
    }
  });

  it("get scene() returns the scene", () => {
    expect(renderer.scene).toBeDefined();
    expect(renderer.scene.type).toBe("Scene");
  });

  it("get renderer() returns the renderer", () => {
    expect(renderer.renderer).toBeDefined();
    expect(renderer.renderer.type).toBe("WebGLRenderer");
  });

  it("addToScene adds object to scene", () => {
    const obj = new THREE.Object3D();
    renderer.addToScene(obj);
    expect(renderer.scene.children).toContain(obj);
  });

  it("removeFromScene removes object from scene", () => {
    const obj = new THREE.Object3D();
    renderer.addToScene(obj);
    renderer.removeFromScene(obj);
    expect(renderer.scene.children).not.toContain(obj);
  });

  it("render calls renderer.render with scene and camera", () => {
    const camera = new THREE.Camera();
    renderer.render(camera);
    expect(mockRender).toHaveBeenCalledWith(renderer.scene, camera);
  });

  it("resize updates renderer size", () => {
    renderer.resize(400, 300);
    expect(mockSetSize).toHaveBeenCalledWith(400, 300);
  });

  it("updateSun changes sun position based on time", () => {
    const sun = renderer.scene.children.find(
      (c) => c instanceof THREE.DirectionalLight,
    );
    renderer.updateSun(0);
    const pos0 = sun.position.clone();
    renderer.updateSun(5);
    expect(sun.position.x).not.toBe(pos0.x);
    renderer.updateSun(0);
    expect(sun.position.x).toBe(pos0.x);
    expect(sun.position.z).toBe(pos0.z);
  });

  it("sun position follows expected formula", () => {
    const t = 1.5;
    renderer.updateSun(t);
    const sun = renderer.scene.children.find(
      (c) => c instanceof THREE.DirectionalLight,
    );
    expect(sun.position.x).toBeCloseTo(Math.sin(t * 0.08) * 18, 5);
    expect(sun.position.y).toBe(22);
    expect(sun.position.z).toBeCloseTo(Math.cos(t * 0.08) * 18, 5);
  });

  it("exposes sun property", () => {
    expect(renderer.sun).toBeInstanceOf(THREE.DirectionalLight);
  });

});
