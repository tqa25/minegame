import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Input from "./input.js";

describe("Input", () => {
  let input;

  beforeEach(() => {
    input = new Input();
  });

  afterEach(() => {
    input.destroy();
  });

  describe("getMoveVector", () => {
    it("returns zero vector by default", () => {
      expect(input.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("returns y=1 on w keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: 1 });
    });

    it("returns y=1 on ArrowUp keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: 1 });
    });

    it("returns y=-1 on s keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: -1 });
    });

    it("returns y=-1 on ArrowDown keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: -1 });
    });

    it("returns x=-1 on a keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      expect(input.getMoveVector()).toEqual({ x: -1, y: 0 });
    });

    it("returns x=-1 on ArrowLeft keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
      expect(input.getMoveVector()).toEqual({ x: -1, y: 0 });
    });

    it("returns x=1 on d keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
      expect(input.getMoveVector()).toEqual({ x: 1, y: 0 });
    });

    it("returns x=1 on ArrowRight keydown", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(input.getMoveVector()).toEqual({ x: 1, y: 0 });
    });

    it("resets y to 0 on w keyup", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: 1 });
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("resets x to 0 on d keyup", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
      expect(input.getMoveVector()).toEqual({ x: 1, y: 0 });
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "d" }));
      expect(input.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("supports simultaneous x and y movement", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
      expect(input.getMoveVector()).toEqual({ x: 1, y: 1 });
    });

    it("supports negative x and y simultaneously", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
      expect(input.getMoveVector()).toEqual({ x: -1, y: -1 });
    });
  });

  describe("isRunning", () => {
    it("returns false by default", () => {
      expect(input.isRunning()).toBe(false);
    });

    it("returns true while shift is held", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
      expect(input.isRunning()).toBe(true);
    });

    it("returns false after shift is released", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
      expect(input.isRunning()).toBe(true);
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
      expect(input.isRunning()).toBe(false);
    });
  });

  describe("onAction", () => {
    it("fires jump callback on space keydown", () => {
      const jump = vi.fn();
      input.onAction("jump", jump);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      expect(jump).toHaveBeenCalledOnce();
    });

    it("fires build callback on e keydown", () => {
      const build = vi.fn();
      input.onAction("build", build);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
      expect(build).toHaveBeenCalledOnce();
    });

    it("fires dig callback on q keydown", () => {
      const dig = vi.fn();
      input.onAction("dig", dig);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }));
      expect(dig).toHaveBeenCalledOnce();
    });

    it("supports multiple callbacks per action", () => {
      const a = vi.fn();
      const b = vi.fn();
      input.onAction("jump", a);
      input.onAction("jump", b);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });
  });

  describe("onPointerMove", () => {
    it("fires with clientX and clientY on pointermove", () => {
      const cb = vi.fn();
      input.onPointerMove(cb);
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 200 }));
      expect(cb).toHaveBeenCalledWith(100, 200);
    });
  });

  describe("onPointerDown", () => {
    it("fires with clientX and clientY on pointerdown", () => {
      const cb = vi.fn();
      input.onPointerDown(cb);
      window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 50, clientY: 75 }));
      expect(cb).toHaveBeenCalledWith(50, 75);
    });
  });

  describe("onSelectBlock", () => {
    it("fires with block type when a tool button is clicked", () => {
      const container = document.createElement("div");
      const local = new Input(container);
      const cb = vi.fn();
      const btn = document.createElement("button");
      btn.dataset.block = "stone";
      container.appendChild(btn);
      local.onSelectBlock(cb);
      btn.click();
      expect(cb).toHaveBeenCalledWith("stone");
      local.destroy();
    });
  });

  describe("destroy", () => {
    it("unbinds keydown events", () => {
      const jump = vi.fn();
      input.onAction("jump", jump);
      input.destroy();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      expect(jump).not.toHaveBeenCalled();
    });

    it("unbinds keyup events", () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
      expect(input.isRunning()).toBe(true);
      input.destroy();
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
    });

    it("unbinds pointermove events", () => {
      const cb = vi.fn();
      input.onPointerMove(cb);
      input.destroy();
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, clientY: 200 }));
      expect(cb).not.toHaveBeenCalled();
    });

    it("unbinds pointerdown events", () => {
      const cb = vi.fn();
      input.onPointerDown(cb);
      input.destroy();
      window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 100, clientY: 200 }));
      expect(cb).not.toHaveBeenCalled();
    });

    it("unbinds click events on tool buttons", () => {
      const container = document.createElement("div");
      const local = new Input(container);
      const cb = vi.fn();
      local.onSelectBlock(cb);
      const btn = document.createElement("button");
      btn.dataset.block = "dirt";
      container.appendChild(btn);
      btn.click();
      expect(cb).toHaveBeenCalledWith("dirt");
      local.destroy();
      btn.click();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("custom element", () => {
    it("uses element for onSelectBlock delegation", () => {
      const el = document.createElement("div");
      const custom = new Input(el);
      const cb = vi.fn();
      custom.onSelectBlock(cb);
      const btn = document.createElement("button");
      btn.dataset.block = "stone";
      el.appendChild(btn);
      btn.click();
      expect(cb).toHaveBeenCalledWith("stone");
      custom.destroy();
    });

    it("does not listen on element for pointer events (uses window)", () => {
      const el = document.createElement("div");
      const custom = new Input(el);
      const cb = vi.fn();
      custom.onPointerMove(cb);
      el.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 20 }));
      expect(cb).not.toHaveBeenCalled();
      custom.destroy();
    });
  });

  describe("joystick", () => {
    let joyEl;
    let stick;
    let joyInput;

    beforeEach(() => {
      joyEl = document.createElement("div");
      joyEl.id = "joystick";
      joyEl.style.width = "120px";
      joyEl.style.height = "120px";
      stick = document.createElement("div");
      stick.id = "stick";
      joyEl.appendChild(stick);
      document.body.appendChild(joyEl);
      vi.spyOn(joyEl, "getBoundingClientRect").mockReturnValue({
        left: 10,
        top: 10,
        width: 120,
        height: 120,
        right: 130,
        bottom: 130,
      });
      Object.defineProperty(joyEl, "clientWidth", { value: 120 });
      joyEl.setPointerCapture = vi.fn();
      joyInput = new Input(document, joyEl);
    });

    afterEach(() => {
      joyInput.destroy();
      document.body.removeChild(joyEl);
    });

    it("captures pointer on pointerdown", () => {
      const evt = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 50,
        clientY: 50,
      });
      joyEl.dispatchEvent(evt);
      expect(joyEl.setPointerCapture).toHaveBeenCalledWith(7);
    });

    it("updates moveVector on pointermove after capture", () => {
      const down = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 70,
        clientY: 70,
      });
      joyEl.dispatchEvent(down);
      const move = new PointerEvent("pointermove", {
        pointerId: 7,
        clientX: 70,
        clientY: 40,
      });
      joyEl.dispatchEvent(move);
      const mv = joyInput.getMoveVector();
      expect(mv.y).toBeGreaterThan(0);
    });

    it("resets moveVector on pointerup", () => {
      const down = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 70,
        clientY: 70,
      });
      joyEl.dispatchEvent(down);
      const move = new PointerEvent("pointermove", {
        pointerId: 7,
        clientX: 70,
        clientY: 40,
      });
      joyEl.dispatchEvent(move);
      expect(joyInput.getMoveVector().y).not.toBe(0);
      const up = new PointerEvent("pointerup", { pointerId: 7 });
      joyEl.dispatchEvent(up);
      expect(joyInput.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("resets moveVector on pointercancel", () => {
      const down = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 70,
        clientY: 70,
      });
      joyEl.dispatchEvent(down);
      const move = new PointerEvent("pointermove", {
        pointerId: 7,
        clientX: 70,
        clientY: 40,
      });
      joyEl.dispatchEvent(move);
      expect(joyInput.getMoveVector().y).not.toBe(0);
      const cancel = new PointerEvent("pointercancel", { pointerId: 7 });
      joyEl.dispatchEvent(cancel);
      expect(joyInput.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("resets stick style transform on pointerup", () => {
      const down = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 70,
        clientY: 70,
      });
      joyEl.dispatchEvent(down);
      const up = new PointerEvent("pointerup", { pointerId: 7 });
      joyEl.dispatchEvent(up);
      expect(stick.style.transform).toBe("translate(0, 0)");
    });

    it("ignores pointermove from different pointerId", () => {
      const down = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 70,
        clientY: 70,
      });
      joyEl.dispatchEvent(down);
      const move = new PointerEvent("pointermove", {
        pointerId: 99,
        clientX: 70,
        clientY: 40,
      });
      joyEl.dispatchEvent(move);
      expect(joyInput.getMoveVector()).toEqual({ x: 0, y: 0 });
    });

    it("destroy unbinds joystick events", () => {
      const cb = vi.fn();
      joyInput.destroy();
      const evt = new PointerEvent("pointerdown", {
        pointerId: 7,
        clientX: 50,
        clientY: 50,
      });
      joyEl.dispatchEvent(evt);
      expect(joyEl.setPointerCapture).not.toHaveBeenCalled();
    });
  });
});
