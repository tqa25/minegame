import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import FramePipeline from "./frame-pipeline.js";

describe("FramePipeline", () => {
  let modules;
  let input;
  let player;
  let enemySpawner;
  let camera;
  let renderer;

  beforeEach(() => {
    input = {
      getMoveVector: vi.fn(() => ({ x: 0, y: 0 })),
    };

    player = {
      update: vi.fn(),
      position: new THREE.Vector3(0, 1, 0),
    };

    enemySpawner = {
      update: vi.fn(),
    };

    camera = {
      follow: vi.fn(),
      camera: new THREE.Camera(),
    };

    renderer = {
      updateSun: vi.fn(),
      render: vi.fn(),
    };

    modules = { input, player, enemySpawner, camera, renderer };
  });

  it("calls all subsystems in correct order", () => {
    const pipeline = new FramePipeline(modules);
    pipeline.process(0.016, 1.0);

    expect(input.getMoveVector).toHaveBeenCalledOnce();
    expect(player.update).toHaveBeenCalledWith(0.016, { x: 0, y: 0 });
    expect(enemySpawner.update).toHaveBeenCalledWith(0.016, player);
    expect(camera.follow).toHaveBeenCalledWith(player.position);
    expect(renderer.updateSun).toHaveBeenCalledWith(1.0);
    expect(renderer.render).toHaveBeenCalledWith(camera.camera);
  });

  it("passes moveVector from input to player.update", () => {
    input.getMoveVector.mockReturnValue({ x: 0.5, y: -0.3 });
    const pipeline = new FramePipeline(modules);
    pipeline.process(0.033, 2.0);

    expect(player.update).toHaveBeenCalledWith(0.033, { x: 0.5, y: -0.3 });
  });

  it("processes a full frame with no errors", () => {
    const pipeline = new FramePipeline(modules);
    expect(() => pipeline.process(0.016, 42)).not.toThrow();
  });
});
