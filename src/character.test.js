import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import Character from "./character.js";

const mockWorld = {
  topHeight: () => 0,
  heightAt: () => 1,
};

describe("Character", () => {
  let character;

  beforeEach(() => {
    character = new Character(mockWorld);
  });

  it("constructor creates character rig with correct parts", () => {
    const mesh = character.mesh;
    expect(mesh).toBeInstanceOf(THREE.Group);
    expect(mesh.userData.parts).toBeDefined();
    expect(mesh.userData.parts.head).toBeInstanceOf(THREE.Group);
    expect(mesh.userData.parts.torso).toBeInstanceOf(THREE.Mesh);
    expect(mesh.userData.parts.leftArm).toBeInstanceOf(THREE.Group);
    expect(mesh.userData.parts.rightArm).toBeInstanceOf(THREE.Group);
    expect(mesh.userData.parts.leftLeg).toBeInstanceOf(THREE.Group);
    expect(mesh.userData.parts.rightLeg).toBeInstanceOf(THREE.Group);
  });

  it("position getter returns a THREE.Vector3", () => {
    expect(character.position).toBeInstanceOf(THREE.Vector3);
  });

  it("state returns initial idle", () => {
    expect(character.state).toBe("idle");
  });

  it("after update with movement input, position changes", () => {
    const px = character.position.x;
    const pz = character.position.z;
    character.update(0.016, { x: 0, y: 1 });
    expect(character.position.x).not.toBe(px);
    expect(character.position.z).not.toBe(pz);
  });

  it("after update with no input, state is idle", () => {
    character.update(0.016, { x: 0, y: 0 });
    expect(character.state).toBe("idle");
  });

  it("jump() sets state to jumping", () => {
    character.update(0.016, { x: 0, y: 0 });
    character.jump();
    expect(character.state).toBe("jumping");
  });

  it("falling when no ground below", () => {
    const holeWorld = {
      topHeight: (x, z) => {
        const rx = Math.round(x);
        const rz = Math.round(z);
        if (rx === 0 && rz === 0) return 0;
        return -1;
      },
      heightAt: () => 1,
    };
    const c = new Character(holeWorld);
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    c.update(0.2, { x: 1, y: 0 });
    expect(c.state).toBe("falling");
  });

  it("attack() triggers attacking overlay", () => {
    character.attack();
    expect(character.overlayState).toBe("attacking");
  });

  it("hit() triggers hit overlay", () => {
    character.hit();
    expect(character.overlayState).toBe("hit");
  });

  it("die() triggers dead overlay", () => {
    character.die();
    expect(character.overlayState).toBe("dead");
  });

  it("walking with strong input transitions to running", () => {
    character.update(0.016, { x: 0, y: 0 });
    character.update(0.016, { x: 0, y: 0.5 });
    expect(character.state).toBe("walking");
    character.update(0.016, { x: 0, y: 1.0 });
    expect(character.state).toBe("running");
  });

  it("state machine: idle to walking to running to idle", () => {
    expect(character.state).toBe("idle");
    character.update(0.016, { x: 0, y: 0 });
    character.update(0.016, { x: 0, y: 0.5 });
    expect(character.state).toBe("walking");
    character.update(0.016, { x: 0, y: 1.0 });
    expect(character.state).toBe("running");
    character.update(0.016, { x: 0, y: 0 });
    expect(character.state).toBe("idle");
  });

  it("character mesh can be added to a THREE.Scene", () => {
    const scene = new THREE.Scene();
    scene.add(character.mesh);
    expect(scene.children).toContain(character.mesh);
  });

  it("initPosition sets physics state and prevents initial fall at correct height", () => {
    const c = new Character(mockWorld);
    const h = mockWorld.topHeight(0, 0);
    const expectedY = h + 1;
    c.position.set(0, expectedY, 0);
    c.initPosition(expectedY);
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    expect(c.position.y).toBeCloseTo(expectedY, 1);
  });

  it("initPosition keeps character grounded on first frame", () => {
    const h = 5;
    const tallWorld = { topHeight: () => h, heightAt: () => h + 1 };
    const c = new Character(tallWorld);
    c.position.set(0, h + 1, 0);
    c.initPosition(h + 1);
    expect(c.state).toBe("idle");
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    expect(c.position.y).toBeGreaterThan(h);
  });
});
