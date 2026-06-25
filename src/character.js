import * as THREE from "three";

const gravity = 18;
const jumpImpulse = 7.4;
const half = 11;

function makeCharacterMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
}

function makeBoxPart(width, height, depth, color, yOffset = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeCharacterMaterial(color),
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

class Character {
  constructor(world) {
    this.world = world;
    this.rig = new THREE.Group();
    this.parts = {};
    this._state = "idle";
    this._overlayState = null;
    this._verticalVelocity = 0;
    this._isGrounded = false;
    this._time = 0;
    this._physicsY = 0;
    this._attackTimer = 0;
    this._buildRig();
  }

  _buildRig() {
    const torso = makeBoxPart(0.58, 0.78, 0.3, 0x2f69b1, 1.05);
    const head = new THREE.Group();
    const headBlock = makeBoxPart(0.5, 0.5, 0.5, 0xd6a06f);
    const hair = makeBoxPart(0.54, 0.14, 0.54, 0x3b2518, 0.32);
    const face = makeBoxPart(0.34, 0.12, 0.02, 0x2b1d17, 0.03);
    head.position.y = 1.72;
    face.position.z = -0.261;
    head.add(headBlock, hair, face);

    const leftArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
    const rightArm = makePivotedLimb(0.22, 0.72, 0.24, 0xd6a06f, 1.39);
    const leftLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);
    const rightLeg = makePivotedLimb(0.24, 0.76, 0.24, 0x3156a4, 0.68);

    leftArm.position.x = -0.44;
    rightArm.position.x = 0.44;
    leftLeg.position.x = -0.17;
    rightLeg.position.x = 0.17;

    const shirtBand = makeBoxPart(0.62, 0.08, 0.32, 0xf0c95a, 1.25);

    this.rig.add(torso, head, shirtBand, leftArm, rightArm, leftLeg, rightLeg);
    this.rig.scale.setScalar(0.72);

    this.parts = { head, torso, leftArm, rightArm, leftLeg, rightLeg };
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

  update(dt, moveVector) {
    this._time += dt;

    const forward = new THREE.Vector3(-1, 0, -1).normalize();
    const right = new THREE.Vector3(1, 0, -1).normalize();

    const moveLen = Math.sqrt(
      moveVector.x * moveVector.x + moveVector.y * moveVector.y,
    );
    const inputStrength = Math.min(1, moveLen);
    const isRunning = inputStrength > 0.78;
    const moving = moveLen > 0.001;

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveVector.y)
      .addScaledVector(right, moveVector.x);

    if (moving) {
      const speed = isRunning ? 6.1 : 3.9;
      moveDir.normalize();
      const yaw = Math.atan2(moveDir.x, -moveDir.z);
      this.rig.rotation.y = yaw;

      const displacement = moveDir
        .clone()
        .multiplyScalar(dt * speed * Math.max(inputStrength, 0.45));
      this.rig.position.add(displacement);
      this.rig.position.x = THREE.MathUtils.clamp(
        this.rig.position.x,
        -half + 1,
        half - 1,
      );
      this.rig.position.z = THREE.MathUtils.clamp(
        this.rig.position.z,
        -half + 1,
        half - 1,
      );
    }

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
      this._state = moving ? (isRunning ? "running" : "walking") : "idle";
    } else {
      this._state =
        this._verticalVelocity > 0 ? "jumping" : "falling";
    }

    this._animate(dt, inputStrength, isRunning);

    if (this._attackTimer > 0) {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        this._attackTimer = 0;
        this._overlayState = null;
      }
    }
  }

  _animate(dt, movementStrength, isRunning) {
    const t = this._time;
    const moving = movementStrength > 0.05;
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

    this.parts.head.rotation.y =
      Math.sin(t * 2.7) * (moving ? 0.07 : 0.12);
    this.parts.head.rotation.x = moving
      ? Math.sin(t * cycleSpeed) * 0.035
      : Math.sin(t * 1.9) * 0.04;
    this.parts.torso.rotation.x = moving
      ? Math.sin(t * cycleSpeed) * 0.025
      : 0;

    if (this._attackTimer > 0) {
      const progress = 1 - this._attackTimer / 0.34;
      const strike = Math.sin(progress * Math.PI);
      this.parts.rightArm.rotation.x = -1.95 * strike - 0.45;
      this.parts.rightArm.rotation.z = -0.35 * strike;
      this.parts.torso.rotation.y = -0.22 * strike;
      this.parts.head.rotation.y = -0.12 * strike;
    } else {
      this.parts.torso.rotation.y *= 0.75;
    }
  }

  jump() {
    if (!this._isGrounded) return;
    this._verticalVelocity = jumpImpulse;
    this._isGrounded = false;
    this._state = "jumping";
  }

  attack() {
    this._attackTimer = 0.34;
    this._overlayState = "attacking";
  }

  hit() {
    this._overlayState = "hit";
  }

  die() {
    this._overlayState = "dead";
  }
}

export default Character;
