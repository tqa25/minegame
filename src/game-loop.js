import World from "./world.js";
import Player from "./player.js";
import Camera from "./camera.js";
import Renderer from "./renderer.js";
import Input from "./input.js";
import BlockSelector from "./block-selector.js";
import Hud from "./hud.js";
import EnemySpawner from "./enemy-spawner.js";
import CombatSystem from "./combat-system.js";
import FramePipeline from "./frame-pipeline.js";
import { PLAYER_RESPAWN_SECONDS } from "./game-config.js";

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
    this._respawnTimer = 0;

    this._createModules();
    this._bindEvents();
    this._initWorld();
  }

  _createModules() {
    this.renderer = new Renderer(this.canvas);
    this.world = new World(this.renderer.scene);
    this.player = new Player(this.world);
    this.renderer.addToScene(this.player.mesh);
    this.camera = new Camera(this.canvas, this.domElements.zoomLabel);
    this.input = new Input(document, document.querySelector("#joystick"));
    this.hud = new Hud(this.domElements);
    this.combatSystem = new CombatSystem();
    this.enemySpawner = new EnemySpawner(this.world, this.renderer.scene, this.combatSystem);
    this.blockSelector = new BlockSelector(
      this.world,
      this.camera.camera,
      this.player,
      this.renderer.scene,
      this.domElements.heightLabel,
    );

    this._pipeline = new FramePipeline({
      input: this.input,
      player: this.player,
      enemySpawner: this.enemySpawner,
      camera: this.camera,
      renderer: this.renderer,
    });
  }

  _bindEvents() {
    this.input.onAction("build", () => this.buildSelected());
    this.input.onAction("dig", () => this.digSelected());
    this.input.onAction("jump", () => this.player.jump());
    this.input.onAction("attack", () => this.attackEnemies());
    this.input.onAction("skill", () => this.useDashSlash());

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

    this.domElements.buildBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.buildSelected();
    });
    this.domElements.digBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.digSelected();
    });
    this.domElements.jumpBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.player.jump();
    });
    this.domElements.attackBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.attackEnemies();
    });
    this.domElements.skillBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.useDashSlash();
    });
    this.domElements.zoomOutBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.camera.setZoom(this.camera.getZoom() + 0.8);
    });
    this.domElements.zoomInBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.camera.setZoom(this.camera.getZoom() - 0.8);
    });
  }

  _updateBlockUI() {
    this.hud.updateBlockSelection(
      BLOCK_LABELS[this.selectedBlock] || this.selectedBlock,
    );
    for (const btn of this.domElements.toolButtons) {
      btn.classList.toggle("active", btn.dataset.block === this.selectedBlock);
    }
  }

  _initWorld() {
    this.world.generate();
    this._resize();
    const h = this.world.topHeight(0, 0);
    this.player.position.set(0, h + 1, 0);
    this.player.initPosition(h + 1);
    for (let i = 0; i < 3; i += 1) {
      this.enemySpawner.spawnNear(this.player.position, this.player.level);
    }
    this.blockSelector.pick(
      window.innerWidth / 2,
      window.innerHeight / 2,
    );
    this.hud.updatePlayer(this.player, this.enemySpawner.aliveCount());
  }

  _resize() {
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  buildSelected() {
    const hit = this.blockSelector.pick(
      this.lastPointerX,
      this.lastPointerY,
    ) || this.blockSelector.getSelectedCell();
    if (!hit) return;
    this.player.basicAttack();
    const { x, y, z } = hit.object.userData;
    this.world.setBlock(x, Math.min(9, y + 1), z, this.selectedBlock);
    this.blockSelector.pick(this.lastPointerX, this.lastPointerY);
  }

  digSelected() {
    const hit = this.blockSelector.pick(
      this.lastPointerX,
      this.lastPointerY,
    ) || this.blockSelector.getSelectedCell();
    if (!hit) return;
    const { x, y, z, type } = hit.object.userData;
    if (type === "water") return;
    this.player.basicAttack();
    this.world.removeBlockAt(x, y, z);
    this.blockSelector.clear();
    this.blockSelector.pick(this.lastPointerX, this.lastPointerY);
  }

  attackEnemies() {
    const attack = this.player.basicAttack();
    const result = this.combatSystem.resolvePlayerAttack(
      this.player,
      this.enemySpawner.enemies,
      attack,
    );
    if (result.xpAwarded > 0) {
      this.player.gainExperience(result.xpAwarded);
    }
  }

  useDashSlash() {
    const attack = this.player.useDashSlash();
    const result = this.combatSystem.resolvePlayerAttack(
      this.player,
      this.enemySpawner.enemies,
      attack,
    );
    if (result.xpAwarded > 0) {
      this.player.gainExperience(result.xpAwarded);
    }
  }

  _respawnPlayer() {
    const spawnY = this.world.topHeight(0, 0) + 1;
    this.player.respawn({ x: 0, y: spawnY, z: 0 });
    this.enemySpawner.reset();
    for (let i = 0; i < 3; i += 1) {
      this.enemySpawner.spawnNear(this.player.position, this.player.level);
    }
  }

  _animate(time) {
    const delta = this._lastTime
      ? Math.min((time - this._lastTime) / 1000, 0.04)
      : 0.016;
    this._lastTime = time;
    this._elapsedTime += delta;

    this._pipeline.process(delta, this._elapsedTime);

    if (!this.player.isAlive()) {
      this._respawnTimer += delta;
      if (this._respawnTimer >= PLAYER_RESPAWN_SECONDS) {
        this._respawnTimer = 0;
        this._respawnPlayer();
      }
    } else {
      this._respawnTimer = 0;
    }

    this.hud.updatePlayer(this.player, this.enemySpawner.aliveCount());

    this._rafId = window.requestAnimationFrame((t) => this._animate(t));
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._rafId = window.requestAnimationFrame((t) => this._animate(t));
  }

  stop() {
    this._running = false;
    this.input.destroy();
    if (this._rafId != null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
