import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import CombatSystem from "./combat-system.js";
import Player from "./player.js";

function makeEnemy(position) {
  return {
    position: position.clone(),
    experienceReward: 10,
    _alive: true,
    _hits: 0,
    isAlive() {
      return this._alive;
    },
    takeDamage() {
      this._hits += 1;
      this._alive = false;
      return true;
    },
  };
}

describe("CombatSystem", () => {
  let combatSystem;
  let player;

  beforeEach(() => {
    const world = { topHeight: () => 0 };
    player = new Player(world);
    player.initPosition(1);
    player.position.set(0, 1, 0);
    combatSystem = new CombatSystem();
  });

  it("basicAttack hits an enemy in front of the Player", () => {
    const attack = player.basicAttack();
    const enemy = makeEnemy(new THREE.Vector3(0, 1, -1.1));

    const result = combatSystem.resolvePlayerAttack(player, [enemy], attack);

    expect(result.hits).toBe(1);
    expect(enemy._hits).toBe(1);
  });

  it("basicAttack does not hit an enemy behind the Player", () => {
    const attack = player.basicAttack();
    const enemy = makeEnemy(new THREE.Vector3(0, 1, 1.1));

    const result = combatSystem.resolvePlayerAttack(player, [enemy], attack);

    expect(result.hits).toBe(0);
    expect(enemy._hits).toBe(0);
  });

  it("dashSlash does not hit an enemy behind the Player near dash start", () => {
    const attack = player.useDashSlash();
    const enemyBehind = makeEnemy(new THREE.Vector3(0, 1, 0.6));
    const enemyAhead = makeEnemy(new THREE.Vector3(0, 1, -1.8));

    const result = combatSystem.resolvePlayerAttack(
      player,
      [enemyBehind, enemyAhead],
      attack,
    );

    expect(result.hits).toBe(1);
    expect(enemyBehind._hits).toBe(0);
    expect(enemyAhead._hits).toBe(1);
  });
});
