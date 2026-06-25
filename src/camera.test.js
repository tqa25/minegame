import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import Camera from "./camera.js";

describe("Camera", () => {
  let canvas;
  let label;
  let camera;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    label = document.createElement("span");
    camera = new Camera(canvas, label);
  });

  it("constructor creates a THREE.OrthographicCamera", () => {
    expect(camera.camera).toBeInstanceOf(THREE.OrthographicCamera);
  });

  it("initial zoom is set correctly (6.4 for small viewport)", () => {
    const orig = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 600, configurable: true });
    const smallCam = new Camera(canvas, label);
    expect(smallCam.getZoom()).toBe(6.4);
    Object.defineProperty(window, "innerWidth", { value: orig, configurable: true });
  });

  it("initial zoom is 8.8 for desktop viewport", () => {
    expect(camera.getZoom()).toBe(8.8);
  });

  it("setZoom(8) changes frustum", () => {
    camera.setZoom(8);
    expect(camera.getZoom()).toBe(8);
    const aspect = canvas.width / canvas.height;
    expect(camera.camera.left).toBe(-8 * aspect);
    expect(camera.camera.right).toBe(8 * aspect);
    expect(camera.camera.top).toBe(8);
    expect(camera.camera.bottom).toBe(-8);
  });

  it("setZoom(1) is clamped to min (5.2)", () => {
    camera.setZoom(1);
    expect(camera.getZoom()).toBe(5.2);
  });

  it("setZoom(100) is clamped to max (13)", () => {
    camera.setZoom(100);
    expect(camera.getZoom()).toBe(13);
  });

  it("getZoom() returns current zoom", () => {
    expect(camera.getZoom()).toBe(8.8);
    camera.setZoom(7);
    expect(camera.getZoom()).toBe(7);
  });

  it("follow(position) changes camera position", () => {
    const pos = new THREE.Vector3(2, 3, 4);
    camera.follow(pos);
    const initialPos = new THREE.Vector3(14, 16, 14);
    const targetPos = new THREE.Vector3(2 + 14, 3 + 14, 4 + 14);
    const expected = initialPos.lerp(targetPos, 0.08);
    expect(camera.camera.position.x).toBeCloseTo(expected.x, 5);
    expect(camera.camera.position.y).toBeCloseTo(expected.y, 5);
    expect(camera.camera.position.z).toBeCloseTo(expected.z, 5);
  });

  it("follow(position) calls lookAt", () => {
    const spy = vi.spyOn(camera.camera, "lookAt");
    const pos = new THREE.Vector3(2, 3, 4);
    camera.follow(pos);
    expect(spy).toHaveBeenCalledWith(2, 3, 4);
  });

  it("resize(800, 600) updates aspect ratio", () => {
    camera.setZoom(10);
    camera.resize(400, 300);
    const aspect = 400 / 300;
    expect(camera.camera.left).toBeCloseTo(-10 * aspect, 5);
    expect(camera.camera.right).toBeCloseTo(10 * aspect, 5);
  });

  it("zoom label DOM element is updated on setZoom", () => {
    camera.setZoom(7.5);
    expect(label.textContent).toBe("7.5");
  });

  it("zoom label uses toFixed(1) format", () => {
    camera.setZoom(5.2);
    expect(label.textContent).toBe("5.2");
    camera.setZoom(13);
    expect(label.textContent).toBe("13.0");
  });

  it("camera follow lerps toward target over multiple calls", () => {
    const pos = new THREE.Vector3(10, 10, 10);
    camera.follow(pos);
    const firstPos = camera.camera.position.clone();
    camera.follow(pos);
    const secondPos = camera.camera.position.clone();
    const targetPos = new THREE.Vector3(24, 24, 24);
    const dist1 = firstPos.distanceTo(targetPos);
    const dist2 = secondPos.distanceTo(targetPos);
    expect(dist2).toBeLessThan(dist1);
  });
});
