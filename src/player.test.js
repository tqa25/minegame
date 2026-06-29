import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import Player from "./player.js";
import { BASIC_ATTACK } from "./game-config.js";

const mockWorld = {
  topHeight: () => 0,
  heightAt: () => 1,
};

describe("Player", () => {
  let player;

  beforeEach(() => {
    player = new Player(mockWorld);
  });

  it("invisible wall bug: player clamped to old world size (half=11)", () => {
    const moveVec = { x: 0, y: 1 };
    // try to move far along z axis past the old boundary
    for (let i = 0; i < 300; i++) {
      player.update(0.016, moveVec);
    }
    // should reach past the old wall at -10, all the way to -16
    expect(player.position.z).toBeLessThan(-15);
  });

  it("constructor creates player rig with correct parts", () => {
    const mesh = player.mesh;
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
    expect(player.position).toBeInstanceOf(THREE.Vector3);
  });

  it("state returns initial idle", () => {
    expect(player.state).toBe("idle");
  });

  it("after update with movement input, position changes", () => {
    const px = player.position.x;
    const pz = player.position.z;
    player.update(0.016, { x: 0, y: 1 });
    expect(player.position.x).not.toBe(px);
    expect(player.position.z).not.toBe(pz);
  });

  it("after update with no input, state is idle", () => {
    player.update(0.016, { x: 0, y: 0 });
    expect(player.state).toBe("idle");
  });

  it("jump() sets state to jumping", () => {
    player.update(0.016, { x: 0, y: 0 });
    player.jump();
    expect(player.state).toBe("jumping");
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
    const c = new Player(holeWorld);
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    c.update(0.2, { x: 1, y: 0 });
    expect(c.state).toBe("falling");
  });

  it("attack() triggers attacking overlay", () => {
    player.attack();
    expect(player.overlayState).toBe("attacking");
  });

  it("hit() triggers hit overlay", () => {
    player.hit();
    expect(player.overlayState).toBe("hit");
  });

  it("die() triggers dead overlay", () => {
    player.die();
    expect(player.overlayState).toBe("dead");
  });

  it("walking with strong input transitions to running", () => {
    player.update(0.016, { x: 0, y: 0 });
    player.update(0.016, { x: 0, y: 0.5 });
    expect(player.state).toBe("walking");
    player.update(0.016, { x: 0, y: 1.0 });
    expect(player.state).toBe("running");
  });

  it("state machine: idle to walking to running to idle", () => {
    expect(player.state).toBe("idle");
    player.update(0.016, { x: 0, y: 0 });
    player.update(0.016, { x: 0, y: 0.5 });
    expect(player.state).toBe("walking");
    player.update(0.016, { x: 0, y: 1.0 });
    expect(player.state).toBe("running");
    player.update(0.016, { x: 0, y: 0 });
    expect(player.state).toBe("idle");
  });

  it("player mesh can be added to a THREE.Scene", () => {
    const scene = new THREE.Scene();
    scene.add(player.mesh);
    expect(scene.children).toContain(player.mesh);
  });

  it("initPosition sets physics state and prevents initial fall at correct height", () => {
    const c = new Player(mockWorld);
    const h = mockWorld.topHeight(0, 0);
    const expectedY = h + 1;
    c.position.set(0, expectedY, 0);
    c.initPosition(expectedY);
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    expect(c.position.y).toBeCloseTo(expectedY, 1);
  });

  it("initPosition keeps player grounded on first frame", () => {
    const h = 5;
    const tallWorld = { topHeight: () => h, heightAt: () => h + 1 };
    const c = new Player(tallWorld);
    c.position.set(0, h + 1, 0);
    c.initPosition(h + 1);
    expect(c.state).toBe("idle");
    c.update(0.016, { x: 0, y: 0 });
    expect(c.state).toBe("idle");
    expect(c.position.y).toBeGreaterThan(h);
  });

  it("jump while running maintains forward momentum", () => {
    player.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    player.update(0.016, moveVec);
    player.update(0.016, moveVec);
    player.update(0.016, moveVec);
    expect(player.state).toBe("running");
    const posBefore = { x: player.position.x, z: player.position.z };
    player.jump();
    expect(player.state).toBe("jumping");
    player.update(0.016, moveVec);
    expect(["jumping", "falling"]).toContain(player.state);
    expect(player.position.x).not.toBe(posBefore.x);
    expect(player.position.z).not.toBe(posBefore.z);
  });

  it("attack overlay while running sets attacking state", () => {
    player.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    player.update(0.016, moveVec);
    player.update(0.016, moveVec);
    expect(player.state).toBe("running");
    player.attack();
    expect(player.overlayState).toBe("attacking");
    player.update(0.016, moveVec);
    expect(player.state).toBe("running");
    expect(player.overlayState).toBe("attacking");
  });

  it("attack timer clears overlay back to running", () => {
    player.initPosition(0);
    const moveVec = { x: 0, y: 1 };
    player.update(0.016, moveVec);
    player.update(0.016, moveVec);
    player.attack();
    for (let i = 0; i < 25; i++) {
      player.update(0.016, moveVec);
    }
    expect(player.overlayState).toBeNull();
    expect(player.state).toBe("running");
  });

  it("attack pose swings the right arm forward at mid-strike", () => {
    player.initPosition(0);
    player.attack();
    player.update(BASIC_ATTACK.animationDuration / 2, { x: 0, y: 0 });
    expect(player.mesh.userData.parts.rightArm.rotation.x).toBeGreaterThan(0);
    expect(player.mesh.userData.parts.torso.rotation.y).toBeGreaterThan(0);
    expect(player.mesh.userData.parts.head.rotation.y).toBeGreaterThan(0);
  });

  it("faces forward direction when moving with moveVector.y = 1", () => {
    player.initPosition(0);
    player.update(0.016, { x: 0, y: 1 });
    const expectedYaw = Math.atan2(
      -(new THREE.Vector3(-1, 0, -1).normalize().x),
      -(new THREE.Vector3(-1, 0, -1).normalize().z),
    );
    expect(player.rotation.y).toBeCloseTo(expectedYaw, 5);
  });

  it("faces right direction when moving with moveVector.x = 1", () => {
    player.initPosition(0);
    player.update(0.016, { x: 1, y: 0 });
    const expectedYaw = Math.atan2(
      -(new THREE.Vector3(1, 0, -1).normalize().x),
      -(new THREE.Vector3(1, 0, -1).normalize().z),
    );
    expect(player.rotation.y).toBeCloseTo(expectedYaw, 5);
  });

  it("basic progression increases level, max health, and attack power", () => {
    const baseStats = player.getStats();
    const leveled = player.gainExperience(30);
    expect(leveled).toBe(true);
    const nextStats = player.getStats();
    expect(nextStats.level).toBe(2);
    expect(nextStats.maxHealth).toBeGreaterThan(baseStats.maxHealth);
    expect(nextStats.attackPower).toBeGreaterThan(baseStats.attackPower);
    expect(nextStats.health).toBe(nextStats.maxHealth);
  });

  it("useDashSlash applies skill overlay and cooldown", () => {
    const attack = player.useDashSlash();
    expect(attack.kind).toBe("dashSlash");
    expect(player.overlayState).toBe("skill");
    expect(player.cooldowns.dashSlash).toBeGreaterThan(0);
  });

  it("takeDamage can kill the player", () => {
    const died = player.takeDamage(999);
    expect(died).toBe(true);
    expect(player.state).toBe("dead");
    expect(player.overlayState).toBe("dead");
  });
});

describe("H1: Action overlay layering", () => {
  let player;

  const moveWorld = {
    topHeight: () => 0,
    heightAt: () => 1,
  };

  beforeEach(() => {
    player = new Player(moveWorld);
    player.initPosition(0);
  });

  it("player moves while attacking — position changes, overlay persists", () => {
    const px = player.position.x;
    const pz = player.position.z;
    player.basicAttack();
    player.update(0.016, { x: 0, y: 1 });

    expect(player.overlayState).toBe("attacking");
    expect(player.position.x).not.toBe(px);
    expect(player.position.z).not.toBe(pz);
  });

  it("player jumps while attacking — both states coexist", () => {
    // need one update frame for grounded check to snap _physicsY to ground level
    player.update(0.016, { x: 0, y: 0 });
    player.basicAttack();
    player.jump();

    expect(player.overlayState).toBe("attacking");
    expect(player.state).toBe("jumping");

    // simulate a few frames to verify both persist
    for (let i = 0; i < 5; i++) {
      player.update(0.016, { x: 0, y: 0 });
    }
    // player should still be alive with attack overlay
    expect(player.overlayState).toBe("attacking");
    expect(["jumping", "falling"]).toContain(player.state);
  });

  it("player moves + jumps while attacking — full overlay", () => {
    player.update(0.016, { x: 0, y: 0 }); // snap to ground
    player.basicAttack();
    player.jump();

    for (let i = 0; i < 10; i++) {
      player.update(0.016, { x: 0, y: 1 });
    }

    expect(player.overlayState).toBe("attacking");
    expect(player.position.z).toBeLessThan(0); // moved forward
  });

  it("walk animation legs still swing during attack (not frozen)", () => {
    player.update(0.016, { x: 0, y: 1 }); // start walking
    player.basicAttack(); // now attacking

    const leftLegBefore = player.parts.leftLeg.rotation.x;
    player.update(0.016, { x: 0, y: 1 }); // another frame

    // left leg rotation should change (walk animation continues)
    expect(player.parts.leftLeg.rotation.x).not.toBe(leftLegBefore);
  });

  it("attack timer counts down while moving — attack is temporary", () => {
    player.basicAttack();
    expect(player.overlayState).toBe("attacking");

    for (let i = 0; i < 30; i++) {
      player.update(0.016, { x: 0, y: 1 });
    }

    // after ~0.48s (30 frames * 0.016s), attack should have cleared
    expect(player.overlayState).toBeNull();
    expect(player.position.z).not.toBe(0); // but player moved
  });

  it("consecutive attacks: move → attack → move → attack (no blocking)", () => {
    player.update(0.016, { x: 0, y: 1 }); // move

    const a1 = player.basicAttack();
    expect(a1).not.toBeNull();

    for (let i = 0; i < 10; i++) {
      player.update(0.016, { x: 0, y: 1 }); // keep moving
    }

    // cooldown hasn't expired yet
    const a2 = player.basicAttack();
    expect(a2).toBeNull();

    // wait for cooldown (0.45s total, we've done 0.16s so far)
    for (let i = 0; i < 20; i++) {
      player.update(0.016, { x: 0, y: 1 });
    }

    // cooldown expired
    const a3 = player.basicAttack();
    expect(a3).not.toBeNull();
  });
});
