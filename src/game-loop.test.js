import * as THREE from "three";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockRender = vi.fn();
const mockSetSize = vi.fn();
const mockSetPixelRatio = vi.fn();

vi.mock("three", async () => {
  const THREE = await vi.importActual("three");
  class MockWebGLRenderer {
    constructor(opts) {
      this.domElement = opts?.canvas || document.createElement("canvas");
      this.setPixelRatio = mockSetPixelRatio;
      this.setSize = mockSetSize;
      this.render = mockRender;
      this.shadowMap = { enabled: true, type: THREE.PCFSoftShadowMap };
      this.type = "WebGLRenderer";
    }
  }
  return { ...THREE, WebGLRenderer: MockWebGLRenderer };
});

import GameLoop from "./game-loop.js";

describe("GameLoop", () => {
  let canvas;
  let domElements;
  let gl;

  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="game" width="800" height="600"></canvas>
      <span id="blockLabel">Grass</span>
      <span id="heightLabel">H: 0</span>
      <span id="zoomLabel">6.4</span>
      <span id="classLabel">Class: Warrior</span>
      <span id="weaponLabel">Weapon: Iron Sword</span>
      <span id="levelLabel">Lv 1</span>
      <span id="experienceLabel">XP 0/30</span>
      <span id="healthLabel">HP 100/100</span>
      <span id="enemyLabel">Enemy 0</span>
      <span id="attackCooldownLabel">Attack Ready</span>
      <span id="skillCooldownLabel">Dash Ready</span>
      <button class="tool active" data-block="grass">Grass</button>
      <button class="tool" data-block="dirt">Dirt</button>
      <button class="tool" data-block="stone">Stone</button>
      <button class="tool" data-block="wood">Wood</button>
      <button id="buildBtn">Build</button>
      <button id="digBtn">Dig</button>
      <button id="jumpBtn">Jump</button>
      <button id="attackBtn">Attack</button>
      <button id="skillBtn">Dash Slash</button>
      <button id="zoomOutBtn">-</button>
      <button id="zoomInBtn">+</button>
      <button id="autoBtn">Auto</button>
      <button id="autoFilterBtn">All</button>
      <button id="autoRadiusDownBtn">R-</button>
      <button id="autoRadiusUpBtn">R+</button>
      <div id="joystick"><div id="stick"></div></div>
    `;

    canvas = document.getElementById("game");
    domElements = {
      blockLabel: document.getElementById("blockLabel"),
      heightLabel: document.getElementById("heightLabel"),
      toolButtons: [...document.querySelectorAll(".tool")],
      zoomLabel: document.getElementById("zoomLabel"),
      classLabel: document.getElementById("classLabel"),
      weaponLabel: document.getElementById("weaponLabel"),
      levelLabel: document.getElementById("levelLabel"),
      experienceLabel: document.getElementById("experienceLabel"),
      healthLabel: document.getElementById("healthLabel"),
      enemyLabel: document.getElementById("enemyLabel"),
      attackCooldownLabel: document.getElementById("attackCooldownLabel"),
      skillCooldownLabel: document.getElementById("skillCooldownLabel"),
      buildBtn: document.getElementById("buildBtn"),
      digBtn: document.getElementById("digBtn"),
      jumpBtn: document.getElementById("jumpBtn"),
      attackBtn: document.getElementById("attackBtn"),
      skillBtn: document.getElementById("skillBtn"),
      autoBtn: document.getElementById("autoBtn"),
      autoFilterBtn: document.getElementById("autoFilterBtn"),
      autoRadiusDownBtn: document.getElementById("autoRadiusDownBtn"),
      autoRadiusUpBtn: document.getElementById("autoRadiusUpBtn"),
      zoomInBtn: document.getElementById("zoomInBtn"),
      zoomOutBtn: document.getElementById("zoomOutBtn"),
    };

    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    gl = new GameLoop(canvas, domElements);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("creates all modules", () => {
      expect(gl.world).toBeDefined();
      expect(gl.player).toBeDefined();
      expect(gl.camera).toBeDefined();
      expect(gl.renderer).toBeDefined();
      expect(gl.input).toBeDefined();
      expect(gl.blockSelector).toBeDefined();
      expect(gl.enemySpawner).toBeDefined();
      expect(gl.combatSystem).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    it("start() begins animation loop", () => {
      gl.start();
      expect(window.requestAnimationFrame).toHaveBeenCalledOnce();
    });

    it("stop() cancels animation loop", () => {
      gl.start();
      gl.stop();
      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    });
  });

  describe("animate frame", () => {
    it("calls player.update with moveVector from input", () => {
      const updateSpy = vi.spyOn(gl.player, "update");
      gl.start();
      const animateFn = window.requestAnimationFrame.mock.calls[0][0];
      animateFn(1000);
      expect(updateSpy).toHaveBeenCalledOnce();
      const [dt, mv] = updateSpy.mock.calls[0];
      expect(typeof dt).toBe("number");
      expect(mv).toEqual({ x: 0, y: 0 });
    });

    it("calls camera.follow with player position", () => {
      const followSpy = vi.spyOn(gl.camera, "follow");
      gl.start();
      const animateFn = window.requestAnimationFrame.mock.calls[0][0];
      animateFn(1000);
      expect(followSpy).toHaveBeenCalledWith(gl.player.position);
    });

    it("calls renderer.render with camera", () => {
      const renderSpy = vi.spyOn(gl.renderer, "render");
      gl.start();
      const animateFn = window.requestAnimationFrame.mock.calls[0][0];
      animateFn(1000);
      expect(renderSpy).toHaveBeenCalledWith(gl.camera.camera);
    });
  });

  describe("actions", () => {
    it("buildSelected triggers player.attack, world.setBlock, re-picks", () => {
      const fakeHit = {
        object: { userData: { x: 0, y: 1, z: 0, type: "stone" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.player, "basicAttack");
      const setBlockSpy = vi.spyOn(gl.world, "setBlock");

      gl.buildSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(setBlockSpy).toHaveBeenCalledWith(0, 2, 0, "grass");
    });

    it("digSelected triggers player.attack, world.removeBlockAt, blockSelector.clear", () => {
      const fakeHit = {
        object: { userData: { x: 0, y: 1, z: 0, type: "stone" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.player, "basicAttack");
      const removeSpy = vi.spyOn(gl.world, "removeBlockAt");
      const clearSpy = vi.spyOn(gl.blockSelector, "clear");

      gl.digSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(removeSpy).toHaveBeenCalledWith(0, 1, 0);
      expect(clearSpy).toHaveBeenCalledOnce();
    });

    it("digSelected falls back to getSelectedCell when pick returns null", () => {
      const fakeHit = {
        object: { userData: { x: 2, y: 3, z: 4, type: "dirt" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(null);
      vi.spyOn(gl.blockSelector, "getSelectedCell").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.player, "basicAttack");
      const removeSpy = vi.spyOn(gl.world, "removeBlockAt");

      gl.digSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(removeSpy).toHaveBeenCalledWith(2, 3, 4);
    });

    it("buildSelected falls back to getSelectedCell when pick returns null", () => {
      const fakeHit = {
        object: { userData: { x: 1, y: 2, z: 3, type: "stone" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(null);
      vi.spyOn(gl.blockSelector, "getSelectedCell").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.player, "basicAttack");
      const setBlockSpy = vi.spyOn(gl.world, "setBlock");

      gl.buildSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(setBlockSpy).toHaveBeenCalledWith(1, 3, 3, "grass");
    });

    it("attackEnemies resolves a basic attack against live enemies", () => {
      const resolveSpy = vi.spyOn(gl.combatSystem, "resolvePlayerAttack");
      gl.attackEnemies();
      expect(resolveSpy).toHaveBeenCalledOnce();
    });

    it("useDashSlash resolves the skill attack against live enemies", () => {
      const resolveSpy = vi.spyOn(gl.combatSystem, "resolvePlayerAttack");
      gl.useDashSlash();
      expect(resolveSpy).toHaveBeenCalledOnce();
    });
  });

  describe("tool selection", () => {
    it("clicking a tool button updates selectedBlock and blockLabel", () => {
      const dirtBtn = domElements.toolButtons.find(
        (b) => b.dataset.block === "dirt",
      );
      dirtBtn.click();
      expect(gl.selectedBlock).toBe("dirt");
      expect(domElements.blockLabel.textContent).toBe("Dirt");
    });
  });

  describe("auto attack", () => {
    it("starts disabled", () => {
      expect(gl._autoAttack).toBe(false);
    });

    it("toggle toggles _autoAttack and button text", () => {
      gl._toggleAutoAttack();
      expect(gl._autoAttack).toBe(true);
      expect(domElements.autoBtn.classList.contains("active")).toBe(true);
      expect(domElements.autoBtn.textContent).toMatch(/Auto All R15/);

      gl._toggleAutoAttack();
      expect(gl._autoAttack).toBe(false);
      expect(domElements.autoBtn.classList.contains("active")).toBe(false);
      expect(domElements.autoBtn.textContent).toBe("Auto");
    });

    it("cycleAutoFilter cycles filter index and updates button", () => {
      expect(gl._autoFilterIndex).toBe(0);
      expect(domElements.autoFilterBtn.textContent).toBe("All");

      gl._cycleAutoFilter();
      expect(gl._autoFilterIndex).toBe(1);
      expect(domElements.autoFilterBtn.textContent).toBe("Aggro");

      gl._cycleAutoFilter();
      expect(gl._autoFilterIndex).toBe(2);
      expect(domElements.autoFilterBtn.textContent).toBe("Passive");

      gl._cycleAutoFilter();
      expect(gl._autoFilterIndex).toBe(0);
    });

    it("adjustAutoRadius clamps within bounds", () => {
      expect(gl._autoRadius).toBe(15);
      gl._adjustAutoRadius(3);
      expect(gl._autoRadius).toBe(18);
      gl._adjustAutoRadius(-30);
      expect(gl._autoRadius).toBe(6);
      gl._adjustAutoRadius(99);
      expect(gl._autoRadius).toBe(30);
    });

    it("findAutoTarget returns null when no enemies nearby", () => {
      gl.enemySpawner.reset();
      expect(gl._findAutoTarget()).toBeNull();
    });
  });

  describe("damage numbers", () => {
    let origGetContext;

    beforeEach(() => {
      origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = () => ({
        font: "",
        textAlign: "",
        textBaseline: "",
        shadowColor: "",
        shadowBlur: 0,
        fillText: vi.fn(),
        clearRect: vi.fn(),
        measureText: () => ({ width: 10 }),
      });
    });

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = origGetContext;
    });

    it("creates damageNumbers module", () => {
      expect(gl.damageNumbers).toBeDefined();
    });

    it("showDamage and showText do not throw", () => {
      const pos = new THREE.Vector3(0, 0, 0);
      expect(() => gl.damageNumbers.showDamage(pos, 15)).not.toThrow();
      expect(() => gl.damageNumbers.showText(pos, "Test")).not.toThrow();
    });
  });
});
