import * as THREE from "three";

function makeTextSprite(text, color = "#ffffff", size = 48) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 96;
  ctx.font = `bold ${size}px "Inter", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.75, 1);
  return sprite;
}

export default class DamageNumbers {
  constructor(scene) {
    this._scene = scene;
    this._entries = [];
  }

  showDamage(position, amount, color = "#ff6666") {
    const pos = position.clone();
    pos.y += 1.5;
    const sprite = makeTextSprite(String(amount), color);
    sprite.position.copy(pos);
    this._scene.add(sprite);
    this._entries.push({ sprite, elapsed: 0, startY: pos.y, offset: Math.random() * 2 - 1 });
  }

  showText(position, text, color = "#ffcc00") {
    const pos = position.clone();
    pos.y += 1;
    const sprite = makeTextSprite(text, color, 40);
    sprite.position.copy(pos);
    this._scene.add(sprite);
    this._entries.push({ sprite, elapsed: 0, startY: pos.y, offset: 0, isText: true });
  }

  update(dt) {
    for (let i = this._entries.length - 1; i >= 0; i--) {
      const e = this._entries[i];
      e.elapsed += dt;
      const progress = Math.min(1, e.elapsed / 1);
      e.sprite.position.y = e.startY + progress * 1.2 + (e.offset || 0) * 0.3;
      e.sprite.material.opacity = 1 - progress;
      e.sprite.scale.setScalar(1 + progress * 0.2);
      if (progress >= 1) {
        this._scene.remove(e.sprite);
        e.sprite.material.map?.dispose();
        e.sprite.material.dispose();
        this._entries.splice(i, 1);
      }
    }
  }

  destroy() {
    for (const e of this._entries) {
      this._scene.remove(e.sprite);
      e.sprite.material.map?.dispose();
      e.sprite.material.dispose();
    }
    this._entries = [];
  }
}
