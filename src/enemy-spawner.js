import * as THREE from "three";
import Enemy from "./enemy.js";
import { ENEMY_SPAWNER } from "./game-config.js";

export default class EnemySpawner {
  constructor(world, scene, combatSystem) {
    this.world = world;
    this.scene = scene;
    this.combatSystem = combatSystem;
    this.enemies = [];
    this._spawnTimer = 0;
    this._onPlayerHit = null;
  }

  onPlayerHit(callback) {
    this._onPlayerHit = callback;
  }

  reset() {
    for (const enemy of this.enemies) {
      enemy.mesh.removeFromParent();
    }
    this.enemies = [];
    this._spawnTimer = 0;
  }

  update(dt, player) {
    this._spawnTimer += dt;

    for (const enemy of this.enemies) {
      const attack = enemy.update(dt, player);
      if (attack) {
        const died = this.combatSystem.resolveEnemyAttack(attack, player);
        if (this._onPlayerHit) {
          this._onPlayerHit(attack.damage, player.position, died);
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.shouldDespawn()) return true;
      enemy.mesh.removeFromParent();
      return false;
    });

    if (
      player.isAlive()
      && this.enemies.length < ENEMY_SPAWNER.maxAlive
      && this._spawnTimer >= ENEMY_SPAWNER.spawnInterval
    ) {
      this._spawnTimer = 0;
      this.spawnNear(player.position, player.level);
    }
  }

  spawnNear(playerPosition, level = 1) {
    const spawn = this.world.findSpawnPoint(
      playerPosition,
      ENEMY_SPAWNER.minSpawnDistance,
      ENEMY_SPAWNER.maxSpawnDistance,
    );
    if (!spawn) return null;

    const isPassive = Math.random() < ENEMY_SPAWNER.passiveChance;
    const enemy = new Enemy(this.world, Math.max(1, level), isPassive);
    enemy.placeAt(new THREE.Vector3(spawn.x, spawn.y, spawn.z));
    this.enemies.push(enemy);
    this.scene.add(enemy.mesh);
    return enemy;
  }

  aliveCount() {
    return this.enemies.filter((enemy) => enemy.isAlive()).length;
  }
}
