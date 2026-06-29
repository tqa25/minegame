import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import Enemy from "./enemy.js";

const mockWorld = {
  topHeight: () => 0,
};

const mockPlayer = {
  position: new THREE.Vector3(5, 0, 5),
  isAlive: () => true,
};

describe("Enemy", () => {
  it("creates a rig with parts", () => {
    const e = new Enemy(mockWorld, 1);
    expect(e.mesh).toBeInstanceOf(THREE.Group);
    expect(e.parts.body).toBeDefined();
    expect(e.isAlive()).toBe(true);
  });

  it("aggressive enemy chases player within aggro range", () => {
    const e = new Enemy(mockWorld, 1, false);
    const startX = e.position.x;
    e.update(0.1, mockPlayer);
    expect(e.state).toBe("chasing");
    expect(e.position.x).not.toBe(startX);
  });

  it("passive enemy stays idle when player is within aggro range", () => {
    const e = new Enemy(mockWorld, 1, true);
    e.update(0.1, mockPlayer);
    expect(e.state).toBe("idle");
  });

  it("passive enemy becomes aggressive after taking damage", () => {
    const e = new Enemy(mockWorld, 1, true);
    e.update(0.1, mockPlayer);
    expect(e.state).toBe("idle");

    e.takeDamage(5);
    expect(e.aggroTimer).toBeGreaterThan(3);

    e.update(0.1, mockPlayer);
    expect(e.state).toBe("chasing");
  });

  it("passive enemy de-aggros after timer expires", () => {
    const e = new Enemy(mockWorld, 1, true);
    e.takeDamage(5);
    e.update(0.1, mockPlayer);
    expect(e.state).toBe("chasing");

    // advance past deaggro time
    for (let i = 0; i < 40; i++) {
      e.update(0.1, mockPlayer);
    }
    expect(e.state).toBe("idle");
  });

  it("aggressive enemy attacks when close enough", () => {
    const closePlayer = {
      position: new THREE.Vector3(0, 0, 0.5),
      isAlive: () => true,
    };
    const e = new Enemy(mockWorld, 1, false);
    e.position.set(0, 0, 0);
    const attack = e.update(0.1, closePlayer);
    expect(attack).toBeTruthy();
    expect(attack.damage).toBeGreaterThan(0);
  });

  it("dies when health reaches zero", () => {
    const e = new Enemy(mockWorld, 1);
    e.takeDamage(999);
    expect(e.isAlive()).toBe(false);
    expect(e.state).toBe("dead");
  });

  it("shouldDespawn returns true after death timeout", () => {
    const e = new Enemy(mockWorld, 1);
    e.takeDamage(999);
    for (let i = 0; i < 10; i++) {
      e.update(0.1, mockPlayer);
    }
    expect(e.shouldDespawn()).toBe(true);
  });
});
