import * as THREE from "three";
import {
  BASIC_ATTACK,
  DASH_SLASH,
  EXPERIENCE_STEP_PER_LEVEL,
  INITIAL_EXPERIENCE_TO_LEVEL,
  PLAYER_CLASS,
} from "./game-config.js";

const gravity = 18;
const half = 11;

function makePlayerMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
}

function makeBoxPart(width, height, depth, color, yOffset = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makePlayerMaterial(color),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = yOffset;
  return mesh;
}

function makePivotedLimb(width, height, depth, color, anchorY) {
  const pivot = new THREE.Group();
  pivot.position.y = anchorY;
  const limb = makeBoxPart(width, height, depth, color, -height / 2);
  pivot.add(limb);
  return pivot;
}

export default class Player {
  constructor(world) {
    this.world = world;
    this.className = PLAYER_CLASS.name;
    this.weaponName = PLAYER_CLASS.weaponName;

    this.level = 1;
    this.experience = 0;
    this.experienceToNextLevel = INITIAL_EXPERIENCE_TO_LEVEL;
    this.maxHealth = PLAYER_CLASS.baseMaxHealth;
    this.health = this.maxHealth;
    this.attackPower = PLAYER_CLASS.baseAttackPower;

    this.rig = new THREE.Group();
    this.parts = {};
    this._state = "idle";
    this._overlayState = null;
    this._verticalVelocity = 0;
    this._isGrounded = false;
    this._time = 0;
    this._physicsY = 0;
    this._attackTimer = 0;
    this._skillTimer = 0;
    this._dashTimer = 0;
    this._dashDirection = new THREE.Vector3(0, 0, -1);
    this._cooldowns = {
      basicAttack: 0,
      dashSlash: 0,
    };

    this._buildRig();
  }

  _buildRig() {
    const torso = makeBoxPart(0.58, 0.78, 0.3, 0x2f69b1, 1.05);
    const head = new THREE.Group();
    const headBlock = makeBoxPart(0.5, 0.5, 0.5, 0xd6a06f);
    const hair = makeBoxPart(0.54, 0.14, 0.54, 0x3b2518, 0.32);
    const face = makeBoxPart(0.34, 0.12, 0.02, 0x2b1d17, 0.03);
    const leftEye = makeBoxPart(0.06, 0.06, 0.02, 0xf4f1e8, 0.07);
    const rightEye = makeBoxPart(0.06, 0.06, 0.02, 0xf4f1e8, 0.07);
    head.position.y = 1.72;
    face.position.z = -0.261;
    leftEye.position.set(-0.09, 0.02, -0.262);
    rightEye.position.set(0.09, 0.02, -0.262);
    head.add(headBlock, hair, face, leftEye, rightEye);

    const leftArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
    const rightArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
    const leftLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);
    const rightLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);

    leftArm.position.x = -0.44;
    rightArm.position.x = 0.44;
    leftLeg.position.x = -0.17;
    rightLeg.position.x = 0.17;

    const shirtBand = makeBoxPart(0.62, 0.08, 0.32, 0xf0c95a, 1.25);
    const swordGrip = makeBoxPart(0.08, 0.3, 0.08, 0x5d412f, -0.18);
    const swordBlade = makeBoxPart(0.12, 0.7, 0.08, 0xc5d0da, -0.62);
    const swordCross = makeBoxPart(0.28, 0.06, 0.08, 0xd3a44a, -0.34);
    const sword = new THREE.Group();
    sword.position.set(0, -0.3, -0.08);
    sword.rotation.z = -0.18;
    sword.add(swordGrip, swordBlade, swordCross);
    rightArm.add(sword);

    this.rig.add(torso, head, shirtBand, leftArm, rightArm, leftLeg, rightLeg);
    this.rig.scale.setScalar(0.72);

    this.parts = { head, torso, leftArm, rightArm, leftLeg, rightLeg, sword };
    this.rig.userData.parts = this.parts;
  }

  get position() {
    return this.rig.position;
  }

  get rotation() {
    return this.rig.rotation;
  }

  get state() {
    return this._state;
  }

  get overlayState() {
    return this._overlayState;
  }

  get mesh() {
    return this.rig;
  }

  get cooldowns() {
    return { ...this._cooldowns };
  }

  isAlive() {
    return this.health > 0;
  }

  getFacingVector() {
    return new THREE.Vector3(
      -Math.sin(this.rig.rotation.y),
      0,
      -Math.cos(this.rig.rotation.y),
    ).normalize();
  }

  getStats() {
    return {
      className: this.className,
      weaponName: this.weaponName,
      level: this.level,
      experience: this.experience,
      experienceToNextLevel: this.experienceToNextLevel,
      health: this.health,
      maxHealth: this.maxHealth,
      attackPower: this.attackPower,
      cooldowns: this.cooldowns,
      state: this.state,
      overlayState: this.overlayState,
    };
  }

  update(dt, moveVector) {
    this._time += dt;
    this._tickCooldowns(dt);

    if (!this.isAlive()) {
      this._state = "dead";
      this._animate(dt, 0, false);
      return;
    }

    const forward = new THREE.Vector3(-1, 0, -1).normalize();
    const right = new THREE.Vector3(1, 0, -1).normalize();
    const moveLen = Math.hypot(moveVector.x, moveVector.y);
    const inputStrength = Math.min(1, moveLen);
    const isRunning = inputStrength > 0.78;
    const moving = moveLen > 0.001;

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveVector.y)
      .addScaledVector(right, moveVector.x);

    if (moving) {
      moveDir.normalize();
      this._dashDirection.copy(moveDir);
      const yaw = Math.atan2(-moveDir.x, -moveDir.z);
      this.rig.rotation.y = yaw;
    }

    if (this._dashTimer > 0) {
      const dashSpeed = DASH_SLASH.dashDistance / DASH_SLASH.dashDuration;
      this.rig.position.addScaledVector(this._dashDirection, dashSpeed * dt);
      this._dashTimer = Math.max(0, this._dashTimer - dt);
    } else if (moving) {
      const speed = isRunning ? PLAYER_CLASS.runSpeed : PLAYER_CLASS.walkSpeed;
      this.rig.position.addScaledVector(
        moveDir,
        dt * speed * Math.max(inputStrength, 0.45),
      );
    }

    this.rig.position.x = THREE.MathUtils.clamp(this.rig.position.x, -half + 1, half - 1);
    this.rig.position.z = THREE.MathUtils.clamp(this.rig.position.z, -half + 1, half - 1);

    const px = Math.round(this.rig.position.x);
    const pz = Math.round(this.rig.position.z);
    const targetY = this.world.topHeight(px, pz) + 1;

    if (this._isGrounded && this._physicsY < targetY) {
      this._physicsY = targetY;
    }

    this._verticalVelocity -= gravity * dt;
    this._physicsY += this._verticalVelocity * dt;

    if (this._physicsY <= targetY) {
      this._physicsY = targetY;
      this._verticalVelocity = 0;
      this._isGrounded = true;
    } else {
      this._isGrounded = false;
    }

    if (this._isGrounded) {
      this._state = moving
        ? isRunning || this._dashTimer > 0
          ? "running"
          : "walking"
        : "idle";
    } else {
      this._state = this._verticalVelocity > 0 ? "jumping" : "falling";
    }

    this._animate(dt, inputStrength, isRunning || this._dashTimer > 0);
  }

  _tickCooldowns(dt) {
    for (const key of Object.keys(this._cooldowns)) {
      this._cooldowns[key] = Math.max(0, this._cooldowns[key] - dt);
    }

    this._attackTimer = Math.max(0, this._attackTimer - dt);
    this._skillTimer = Math.max(0, this._skillTimer - dt);

    if (this._attackTimer === 0 && this._skillTimer === 0 && this._overlayState !== "dead") {
      this._overlayState = null;
    }
  }

  _animate(_dt, movementStrength, isRunning) {
    const t = this._time;
    const moving = movementStrength > 0.05 || this._dashTimer > 0;
    const cycleSpeed = moving ? (isRunning ? 13.5 : 8.5) : 2.2;
    const swing =
      Math.sin(t * cycleSpeed) *
      (moving ? (isRunning ? 0.92 : 0.58) : 0.08);
    const bob = moving
      ? Math.abs(Math.sin(t * cycleSpeed)) * (isRunning ? 0.08 : 0.04)
      : Math.sin(t * 2.2) * 0.015;

    this.rig.position.y = this._physicsY + bob;

    this.parts.leftArm.rotation.x = swing;
    this.parts.rightArm.rotation.x = -swing;
    this.parts.leftLeg.rotation.x = -swing;
    this.parts.rightLeg.rotation.x = swing;

    this.parts.leftArm.rotation.z = 0.05;
    this.parts.rightArm.rotation.z = -0.05;
    this.parts.sword.rotation.x = 0;

    this.parts.head.rotation.y = Math.sin(t * 2.7) * (moving ? 0.07 : 0.12);
    this.parts.head.rotation.x = moving
      ? Math.sin(t * cycleSpeed) * 0.035
      : Math.sin(t * 1.9) * 0.04;
    this.parts.torso.rotation.x = moving ? Math.sin(t * cycleSpeed) * 0.025 : 0;

    if (this._attackTimer > 0) {
      const progress = 1 - this._attackTimer / BASIC_ATTACK.animationDuration;
      const strike = Math.sin(progress * Math.PI);
      this.parts.rightArm.rotation.x = 1.95 * strike - 0.45;
      this.parts.rightArm.rotation.z = 0.35 * strike;
      this.parts.torso.rotation.y = 0.22 * strike;
      this.parts.head.rotation.y = 0.12 * strike;
      this.parts.sword.rotation.x = -0.35 * strike;
    } else if (this._skillTimer > 0) {
      const progress = 1 - this._skillTimer / DASH_SLASH.animationDuration;
      const strike = Math.sin(progress * Math.PI);
      this.parts.rightArm.rotation.x = 2.2 * strike - 0.6;
      this.parts.leftArm.rotation.x = -0.6 * strike;
      this.parts.torso.rotation.y = 0.45 * strike;
      this.parts.torso.rotation.x = 0.18 * strike;
      this.parts.head.rotation.y = 0.2 * strike;
      this.parts.sword.rotation.x = -0.85 * strike;
    } else {
      this.parts.torso.rotation.y *= 0.75;
    }

    if (!this.isAlive()) {
      this.parts.leftLeg.rotation.x = 0;
      this.parts.rightLeg.rotation.x = 0;
      this.rig.rotation.z = Math.PI / 2.6;
    } else {
      this.rig.rotation.z = 0;
    }
  }

  jump() {
    if (!this._isGrounded || !this.isAlive()) return;
    this._verticalVelocity = 7.4;
    this._isGrounded = false;
    this._state = "jumping";
  }

  basicAttack() {
    if (!this.isAlive() || this._cooldowns.basicAttack > 0) return null;
    this._attackTimer = BASIC_ATTACK.animationDuration;
    this._overlayState = "attacking";
    this._cooldowns.basicAttack = BASIC_ATTACK.cooldown;
    return this._makeAttack(BASIC_ATTACK, "basicAttack");
  }

  attack() {
    return this.basicAttack();
  }

  useDashSlash() {
    if (!this.isAlive() || this._cooldowns.dashSlash > 0) return null;
    this._skillTimer = DASH_SLASH.animationDuration;
    this._overlayState = "skill";
    this._cooldowns.dashSlash =
      DASH_SLASH.cooldown * Math.pow(PLAYER_CLASS.skillCooldownFactor, this.level - 1);
    this._dashTimer = DASH_SLASH.dashDuration;
    return this._makeAttack(DASH_SLASH, "dashSlash");
  }

  _makeAttack(definition, kind) {
    return {
      kind,
      damage: Math.round(this.attackPower * definition.damageMultiplier),
      range: definition.range,
      radius: definition.radius,
      origin: this.position.clone(),
      facing: this.getFacingVector(),
      dashDistance: definition.dashDistance || 0,
    };
  }

  takeDamage(amount) {
    if (!this.isAlive()) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this._overlayState = "dead";
      this._state = "dead";
      return true;
    }
    this._overlayState = "hit";
    return false;
  }

  hit() {
    this._overlayState = "hit";
  }

  die() {
    this.health = 0;
    this._overlayState = "dead";
    this._state = "dead";
  }

  gainExperience(amount) {
    this.experience += amount;
    let leveledUp = false;
    while (this.experience >= this.experienceToNextLevel) {
      this.experience -= this.experienceToNextLevel;
      this.level += 1;
      this.experienceToNextLevel += EXPERIENCE_STEP_PER_LEVEL;
      this.maxHealth += PLAYER_CLASS.levelHealthGain;
      this.attackPower += PLAYER_CLASS.levelAttackGain;
      leveledUp = true;
    }
    if (leveledUp) {
      this.health = this.maxHealth;
    }
    return leveledUp;
  }

  respawn(position) {
    this.health = this.maxHealth;
    this._state = "idle";
    this._overlayState = null;
    this._verticalVelocity = 0;
    this._isGrounded = true;
    this._attackTimer = 0;
    this._skillTimer = 0;
    this._dashTimer = 0;
    this._cooldowns.basicAttack = 0;
    this._cooldowns.dashSlash = 0;
    this.rig.rotation.z = 0;
    this.position.set(position.x, position.y, position.z);
    this.initPosition(position.y);
  }

  initPosition(y) {
    this._physicsY = y;
    this._isGrounded = true;
    this._verticalVelocity = 0;
  }
}
