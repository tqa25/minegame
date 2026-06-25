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
      <button class="tool active" data-block="grass">Grass</button>
      <button class="tool" data-block="dirt">Dirt</button>
      <button class="tool" data-block="stone">Stone</button>
      <button class="tool" data-block="wood">Wood</button>
      <button id="buildBtn">Build</button>
      <button id="digBtn">Dig</button>
      <button id="jumpBtn">Jump</button>
      <button id="zoomOutBtn">-</button>
      <button id="zoomInBtn">+</button>
      <div id="joystick"><div id="stick"></div></div>
    `;

    canvas = document.getElementById("game");
    domElements = {
      blockLabel: document.getElementById("blockLabel"),
      heightLabel: document.getElementById("heightLabel"),
      toolButtons: [...document.querySelectorAll(".tool")],
      zoomLabel: document.getElementById("zoomLabel"),
      buildBtn: document.getElementById("buildBtn"),
      digBtn: document.getElementById("digBtn"),
      jumpBtn: document.getElementById("jumpBtn"),
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
      expect(gl.character).toBeDefined();
      expect(gl.camera).toBeDefined();
      expect(gl.renderer).toBeDefined();
      expect(gl.input).toBeDefined();
      expect(gl.blockSelector).toBeDefined();
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
    it("calls character.update with moveVector from input", () => {
      const updateSpy = vi.spyOn(gl.character, "update");
      gl.start();
      const animateFn = window.requestAnimationFrame.mock.calls[0][0];
      animateFn(1000);
      expect(updateSpy).toHaveBeenCalledOnce();
      const [dt, mv] = updateSpy.mock.calls[0];
      expect(typeof dt).toBe("number");
      expect(mv).toEqual({ x: 0, y: 0 });
    });

    it("calls camera.follow with character position", () => {
      const followSpy = vi.spyOn(gl.camera, "follow");
      gl.start();
      const animateFn = window.requestAnimationFrame.mock.calls[0][0];
      animateFn(1000);
      expect(followSpy).toHaveBeenCalledWith(gl.character.position);
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
    it("buildSelected triggers character.attack, world.setBlock, re-picks", () => {
      const fakeHit = {
        object: { userData: { x: 0, y: 1, z: 0, type: "stone" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.character, "attack");
      const setBlockSpy = vi.spyOn(gl.world, "setBlock");

      gl.buildSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(setBlockSpy).toHaveBeenCalledWith(0, 2, 0, "grass");
    });

    it("digSelected triggers character.attack, world.removeBlockAt, blockSelector.clear", () => {
      const fakeHit = {
        object: { userData: { x: 0, y: 1, z: 0, type: "stone" } },
      };
      vi.spyOn(gl.blockSelector, "pick").mockReturnValue(fakeHit);
      const attackSpy = vi.spyOn(gl.character, "attack");
      const removeSpy = vi.spyOn(gl.world, "removeBlockAt");
      const clearSpy = vi.spyOn(gl.blockSelector, "clear");

      gl.digSelected();

      expect(attackSpy).toHaveBeenCalledOnce();
      expect(removeSpy).toHaveBeenCalledWith(0, 1, 0);
      expect(clearSpy).toHaveBeenCalledOnce();
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
});
