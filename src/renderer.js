import * as THREE from "three";

const blockTypes = {
  grass: { color: 0x5ca95a, roughness: 0.88 },
  dirt: { color: 0x8b5f37, roughness: 0.94 },
  stone: { color: 0x81847e, roughness: 0.96 },
  wood: { color: 0x9a6b3f, roughness: 0.9 },
  water: { color: 0x4c98b8, roughness: 0.42 },
};

class Renderer {
  constructor(canvas) {
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x87b6bd);
    this._scene.fog = new THREE.Fog(0x87b6bd, 24, 64);

    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.HemisphereLight(0xdcebcf, 0x314b52, 1.7);
    this._scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xffe6a3, 2.6);
    this.sun.position.set(12, 22, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -24;
    this.sun.shadow.camera.right = 24;
    this.sun.shadow.camera.top = 24;
    this.sun.shadow.camera.bottom = -24;
    this._scene.add(this.sun);

    this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = Object.fromEntries(
      Object.entries(blockTypes).map(([key, value]) => [
        key,
        new THREE.MeshStandardMaterial({
          color: value.color,
          roughness: value.roughness,
        }),
      ]),
    );

    this.selector = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.08, 1.04),
      new THREE.MeshBasicMaterial({
        color: 0xfff1a1,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this.selector.visible = false;
    this._scene.add(this.selector);

    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.51;
    this.groundPlane.receiveShadow = true;
    this._scene.add(this.groundPlane);
  }

  get scene() {
    return this._scene;
  }

  get renderer() {
    return this._renderer;
  }

  render(camera) {
    this._renderer.render(this._scene, camera);
  }

  resize(width, height) {
    this._renderer.setSize(width, height);
  }

  updateSun(time) {
    this.sun.position.set(
      Math.sin(time * 0.08) * 18,
      22,
      Math.cos(time * 0.08) * 18,
    );
  }

  addToScene(object) {
    this._scene.add(object);
  }

  removeFromScene(object) {
    this._scene.remove(object);
  }
}

export default Renderer;
