import * as THREE from "three";
import { ENEMY_BASE, EXPERIENCE_PER_ENEMY } from "./game-config.js";

function makeEnemyMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
}

function makeBox(width, height, depth, color, yOffset = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeEnemyMaterial(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = yOffset;
  return mesh;
}

export default class Enemy {
  constructor(world, level = 1) {
    this.world = world;
    this.level = level;
    this.rig = new THREE.Group();
    this.parts = {};
    this.state = "idle";
    this.health = ENEMY_BASE.maxHealth + (level - 1) * 5;
    this.maxHealth = this.health;
    this.attackDamage = ENEMY_BASE.attackDamage + (level - 1);
    this.moveSpeed = ENEMY_BASE.moveSpeed + Math.min(0.5, (level - 1) * 0.08);
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.experienceReward = EXPERIENCE_PER_ENEMY;
    this._buildRig();
  }

  _buildRig() {
    const body = makeBox(0.68, 0.82, 0.38, 0x7a2f3d, 1);
    const head = makeBox(0.54, 0.54, 0.54, 0x79b15f, 1.72);
    const leftArm = makeBox(0.18, 0.58, 0.18, 0x79b15f, 1.12);
    const rightArm = makeBox(0.18, 0.58, 0.18, 0x79b15f, 1.12);
    const leftLeg = makeBox(0.24, 0.62, 0.24, 0x4b252d, 0.42);
    const rightLeg = makeBox(0.24, 0.62, 0.24, 0x4b252d, 0.42);
    leftArm.position.x = -0.46;
    rightArm.position.x = 0.46;
    leftLeg.position.x = -0.16;
    rightLeg.position.x = 0.16;
    this.rig.scale.setScalar(0.72);
    this.rig.add(body, head, leftArm, rightArm, leftLeg, rightLeg);
    this.parts = { body, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  get mesh() {
    return this.rig;
  }

  get position() {
    return this.rig.position;
  }

  isAlive() {
    return this.health > 0;
  }

  placeAt(position) {
    this.position.copy(position);
  }

  update(dt, player) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.hitTimer = Math.max(0, this.hitTimer - dt);

    if (!this.isAlive()) {
      this.state = "dead";
      this.deathTimer += dt;
      this.rig.rotation.z = Math.min(Math.PI / 2.8, this.deathTimer * 2.8);
      return null;
    }

    const topY = this.world.topHeight(
      Math.round(this.position.x),
      Math.round(this.position.z),
    ) + 1;
    this.position.y = topY;

    if (!player.isAlive()) {
      this.state = "idle";
      this._animate(dt, 0);
      return null;
    }

    const toPlayer = player.position.clone().sub(this.position);
    const distance = Math.hypot(toPlayer.x, toPlayer.z);

    if (distance > ENEMY_BASE.despawnRange) {
      this.state = "idle";
      this._animate(dt, 0);
      return null;
    }

    if (distance <= ENEMY_BASE.attackRange) {
      this.state = "attacking";
      this.rig.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
      if (this.attackCooldown === 0) {
        this.attackCooldown = ENEMY_BASE.attackCooldown;
        this.attackTimer = 0.3;
        this._animate(dt, 0.4);
        return { damage: this.attackDamage };
      }
    } else if (distance <= ENEMY_BASE.aggroRange) {
      this.state = "chasing";
      toPlayer.y = 0;
      toPlayer.normalize();
      this.position.addScaledVector(toPlayer, this.moveSpeed * dt);
      this.rig.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
    } else {
      this.state = "idle";
    }

    this._animate(dt, this.state === "chasing" ? 1 : 0);
    return null;
  }

  _animate(dt, movementStrength) {
    const t = performance.now() * 0.001 + dt;
    const swing = Math.sin(t * 8) * movementStrength * 0.5;
    this.parts.leftArm.rotation.x = swing;
    this.parts.rightArm.rotation.x = -swing;
    this.parts.leftLeg.rotation.x = -swing;
    this.parts.rightLeg.rotation.x = swing;
    this.parts.body.rotation.y = this.hitTimer > 0 ? Math.sin(this.hitTimer * 60) * 0.12 : 0;

    if (this.attackTimer > 0) {
      const strike = Math.sin((1 - this.attackTimer / 0.3) * Math.PI);
      this.parts.rightArm.rotation.x = -1.6 * strike - 0.35;
      this.parts.body.rotation.x = 0.1 * strike;
    } else {
      this.parts.body.rotation.x *= 0.6;
    }
  }

  takeDamage(amount) {
    if (!this.isAlive()) return false;
    this.health = Math.max(0, this.health - amount);
    this.hitTimer = 0.18;
    if (this.health === 0) {
      this.state = "dead";
      return true;
    }
    return false;
  }

  shouldDespawn() {
    return !this.isAlive() && this.deathTimer > 0.45;
  }
}
