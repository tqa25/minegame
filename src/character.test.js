import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import Character from "./character.js";
import { BASIC_ATTACK } from "./game-config.js";

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

  it("jump while running maintains forward momentum", () => {
    character.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    character.update(0.016, moveVec);
    character.update(0.016, moveVec);
    character.update(0.016, moveVec);
    expect(character.state).toBe("running");
    const posBefore = { x: character.position.x, z: character.position.z };
    character.jump();
    expect(character.state).toBe("jumping");
    character.update(0.016, moveVec);
    expect(["jumping", "falling"]).toContain(character.state);
    expect(character.position.x).not.toBe(posBefore.x);
    expect(character.position.z).not.toBe(posBefore.z);
  });

  it("attack overlay while running sets attacking state", () => {
    character.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    character.update(0.016, moveVec);
    character.update(0.016, moveVec);
    expect(character.state).toBe("running");
    character.attack();
    expect(character.overlayState).toBe("attacking");
    character.update(0.016, moveVec);
    expect(character.state).toBe("running");
    expect(character.overlayState).toBe("attacking");
  });

  it("attack timer clears overlay back to running", () => {
    character.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    character.update(0.016, moveVec);
    character.update(0.016, moveVec);
    character.attack();
    for (let i = 0; i < 25; i++) {
      character.update(0.016, moveVec);
    }
    expect(character.overlayState).toBeNull();
    expect(character.state).toBe("running");
  });

  it("attack pose swings the right arm forward at mid-strike", () => {
    character.initPosition(0);
    character.attack();
    character.update(BASIC_ATTACK.animationDuration / 2, { x: 0, y: 0 });
    expect(character.mesh.userData.parts.rightArm.rotation.x).toBeGreaterThan(0);
    expect(character.mesh.userData.parts.torso.rotation.y).toBeGreaterThan(0);
    expect(character.mesh.userData.parts.head.rotation.y).toBeGreaterThan(0);
  });

  it("faces forward direction when moving with moveVector.y = 1", () => {
    character.initPosition(0);
    character.update(0.016, { x: 0, y: 1 });
    const expectedYaw = Math.atan2(
      -(new THREE.Vector3(-1, 0, -1).normalize().x),
      -(new THREE.Vector3(-1, 0, -1).normalize().z),
    );
    expect(character.rotation.y).toBeCloseTo(expectedYaw, 5);
  });

  it("faces right direction when moving with moveVector.x = 1", () => {
    character.initPosition(0);
    character.update(0.016, { x: 1, y: 0 });
    const expectedYaw = Math.atan2(
      -(new THREE.Vector3(1, 0, -1).normalize().x),
      -(new THREE.Vector3(1, 0, -1).normalize().z),
    );
    expect(character.rotation.y).toBeCloseTo(expectedYaw, 5);
  });

  it("basic progression increases level, max health, and attack power", () => {
    const baseStats = character.getStats();
    const leveled = character.gainExperience(30);
    expect(leveled).toBe(true);
    const nextStats = character.getStats();
    expect(nextStats.level).toBe(2);
    expect(nextStats.maxHealth).toBeGreaterThan(baseStats.maxHealth);
    expect(nextStats.attackPower).toBeGreaterThan(baseStats.attackPower);
    expect(nextStats.health).toBe(nextStats.maxHealth);
  });

  it("useDashSlash applies skill overlay and cooldown", () => {
    const attack = character.useDashSlash();
    expect(attack.kind).toBe("dashSlash");
    expect(character.overlayState).toBe("skill");
    expect(character.cooldowns.dashSlash).toBeGreaterThan(0);
  });

  it("takeDamage can kill the player", () => {
    const died = character.takeDamage(999);
    expect(died).toBe(true);
    expect(character.state).toBe("dead");
    expect(character.overlayState).toBe("dead");
  });
});
