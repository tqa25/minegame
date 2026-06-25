import World from "./world.js";
import Character from "./character.js";
import Camera from "./camera.js";
import Renderer from "./renderer.js";
import Input from "./input.js";
import BlockSelector from "./block-selector.js";

const BLOCK_LABELS = {
  grass: "Grass",
  dirt: "Dirt",
  stone: "Stone",
  wood: "Wood",
  water: "Water",
};

export default class GameLoop {
  constructor(canvas, domElements) {
    this.canvas = canvas;
    this.domElements = domElements;
    this.selectedBlock = "grass";
    this.lastPointerX = window.innerWidth / 2;
    this.lastPointerY = window.innerHeight / 2;
    this._rafId = null;
    this._running = false;
    this._lastTime = 0;
    this._elapsedTime = 0;

    this._createModules();
    this._bindEvents();
    this._initWorld();
  }

  _createModules() {
    this.renderer = new Renderer(this.canvas);
    this.world = new World(this.renderer.scene);
    this.character = new Character(this.world);
    this.renderer.addToScene(this.character.mesh);
    this.camera = new Camera(this.canvas, this.domElements.zoomLabel);
    this.input = new Input();
    this.blockSelector = new BlockSelector(
      this.world,
      this.camera.camera,
      this.character,
      this.renderer.scene,
      this.domElements.heightLabel,
    );
  }

  _bindEvents() {
    this.input.onAction("build", () => this.buildSelected());
    this.input.onAction("dig", () => this.digSelected());
    this.input.onAction("jump", () => this.character.jump());

    this.input.onPointerMove((x, y) => {
      this.lastPointerX = x;
      this.lastPointerY = y;
      this.blockSelector.pick(x, y);
    });

    this.input.onPointerDown((x, y) => {
      this.lastPointerX = x;
      this.lastPointerY = y;
      this.blockSelector.pick(x, y);
    });

    this.input.onSelectBlock((type) => {
      this.selectedBlock = type;
      this._updateBlockUI();
    });

    window.addEventListener("resize", () => this._resize());

    this.domElements.buildBtn.addEventListener("click", () =>
      this.buildSelected(),
    );
    this.domElements.digBtn.addEventListener("click", () =>
      this.digSelected(),
    );
    this.domElements.jumpBtn.addEventListener("click", () =>
      this.character.jump(),
    );
    this.domElements.zoomOutBtn.addEventListener("click", () => {
      this.camera.setZoom(this.camera.getZoom() + 0.8);
    });
    this.domElements.zoomInBtn.addEventListener("click", () => {
      this.camera.setZoom(this.camera.getZoom() - 0.8);
    });
  }

  _updateBlockUI() {
    this.domElements.blockLabel.textContent =
      BLOCK_LABELS[this.selectedBlock] || this.selectedBlock;
    for (const btn of this.domElements.toolButtons) {
      btn.classList.toggle("active", btn.dataset.block === this.selectedBlock);
    }
  }

  _initWorld() {
    this.world.generate();
    this._resize();
    const h = this.world.topHeight(0, 0);
    this.character.position.set(0, h + 1, 0);
    this.blockSelector.pick(
      window.innerWidth / 2,
      window.innerHeight / 2,
    );
  }

  _resize() {
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  buildSelected() {
    const hit = this.blockSelector.pick(
      this.lastPointerX,
      this.lastPointerY,
    );
    if (!hit) return;
    this.character.attack();
    const { x, y, z } = hit.object.userData;
    this.world.setBlock(x, Math.min(9, y + 1), z, this.selectedBlock);
    this.blockSelector.pick(this.lastPointerX, this.lastPointerY);
  }

  digSelected() {
    const hit = this.blockSelector.pick(
      this.lastPointerX,
      this.lastPointerY,
    );
    if (!hit) return;
    const { x, y, z, type } = hit.object.userData;
    if (type === "water") return;
    this.character.attack();
    this.world.removeBlockAt(x, y, z);
    this.blockSelector.clear();
    this.blockSelector.pick(this.lastPointerX, this.lastPointerY);
  }

  _animate(time) {
    const delta = this._lastTime
      ? Math.min((time - this._lastTime) / 1000, 0.04)
      : 0.016;
    this._lastTime = time;
    this._elapsedTime += delta;

    const moveVector = this.input.getMoveVector();
    this.character.update(delta, moveVector);

    this.camera.follow(this.character.position);

    const t = this._elapsedTime;
    this.renderer.updateSun(t);
    this.renderer.selector.material.opacity = 0.52 + Math.sin(t * 7) * 0.12;

    this.renderer.render(this.camera.camera);

    this._rafId = window.requestAnimationFrame((t) => this._animate(t));
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._rafId = window.requestAnimationFrame((t) => this._animate(t));
  }

  stop() {
    this._running = false;
    if (this._rafId != null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
