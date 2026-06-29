export default class Input {
  constructor(element = document, joystickEl = null) {
    this.element = element;
    this.joystickEl = joystickEl;
    this.moveVector = { x: 0, y: 0 };
    this.run = false;
    this.actionHandlers = {
      build: [],
      dig: [],
      jump: [],
      attack: [],
      skill: [],
    };
    this.pointerMoveHandlers = [];
    this.pointerDownHandlers = [];
    this.selectBlockHandlers = [];

    this._heldKeys = new Set();
    this._directionStack = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onJoyDown = this._onJoyDown.bind(this);
    this._onJoyMove = this._onJoyMove.bind(this);
    this._onJoyEnd = this._onJoyEnd.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerdown", this._onPointerDown);

    if (this.joystickEl) {
      this.joystickEl.addEventListener("pointerdown", this._onJoyDown);
      this.joystickEl.addEventListener("pointermove", this._onJoyMove);
      this.joystickEl.addEventListener("pointerup", this._onJoyEnd);
      this.joystickEl.addEventListener("pointercancel", this._onJoyEnd);
    }
  }

  _onKeyDown(event) {
    if (!this._heldKeys.has(event.key)) {
      if (this._isDirectionKey(event.key)) {
        this._directionStack.push(event.key);
      }
      this._heldKeys.add(event.key);
    }

    if (event.key === "Shift") {
      this.run = true;
    } else if (this._isDirectionKey(event.key)) {
      this._updateMoveVector();
    }

    if (event.key === " ") this._fireAction("jump");
    if (event.key === "e") this._fireAction("build");
    if (event.key === "q") this._fireAction("dig");
    if (event.key === "f") this._fireAction("attack");
    if (event.key === "r") this._fireAction("skill");
  }

  _isDirectionKey(key) {
    return ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);
  }

  _updateMoveVector() {
    this.moveVector.x = 0;
    this.moveVector.y = 0;

    for (let i = this._directionStack.length - 1; i >= 0; i--) {
      const key = this._directionStack[i];
      if (this.moveVector.x === 0 && (key === "a" || key === "ArrowLeft")) this.moveVector.x = -1;
      if (this.moveVector.x === 0 && (key === "d" || key === "ArrowRight")) this.moveVector.x = 1;
      if (this.moveVector.y === 0 && (key === "w" || key === "ArrowUp")) this.moveVector.y = 1;
      if (this.moveVector.y === 0 && (key === "s" || key === "ArrowDown")) this.moveVector.y = -1;
    }
  }

  _onKeyUp(event) {
    this._heldKeys.delete(event.key);

    if (event.key === "Shift") {
      this.run = false;
    } else if (this._isDirectionKey(event.key)) {
      const idx = this._directionStack.indexOf(event.key);
      if (idx !== -1) this._directionStack.splice(idx, 1);
      this._updateMoveVector();
    }
  }

  _onPointerMove(event) {
    const el = event.target;
    if (el?.closest && (el.closest("button") || el.closest("#joystick"))) return;
    for (const cb of this.pointerMoveHandlers) {
      cb(event.clientX, event.clientY);
    }
  }

  _onPointerDown(event) {
    const el = event.target;
    if (el?.closest && (el.closest("button") || el.closest("#joystick"))) return;
    for (const cb of this.pointerDownHandlers) {
      cb(event.clientX, event.clientY);
    }
  }

  _onJoyDown(event) {
    this._joyActive = event.pointerId;
    this.joystickEl.setPointerCapture(this._joyActive);
    const rect = this.joystickEl.getBoundingClientRect();
    this._joyCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  _onJoyMove(event) {
    if (event.pointerId !== this._joyActive) return;
    const dx = event.clientX - this._joyCenter.x;
    const dy = event.clientY - this._joyCenter.y;
    const radius = this.joystickEl.clientWidth * 0.34;
    const distance = Math.min(radius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * distance;
    const sy = Math.sin(angle) * distance;
    const stick = this.joystickEl.querySelector("#stick");
    if (stick) stick.style.transform = `translate(${sx}px, ${sy}px)`;
    this.moveVector.x = sx / radius;
    this.moveVector.y = -sy / radius;
  }

  _onJoyEnd(event) {
    if (event.pointerId !== this._joyActive) return;
    this._joyActive = null;
    const stick = this.joystickEl.querySelector("#stick");
    if (stick) stick.style.transform = "translate(0, 0)";
    this.moveVector.x = 0;
    this.moveVector.y = 0;
  }

  _fireAction(name) {
    const handlers = this.actionHandlers[name];
    if (handlers) {
      for (const cb of handlers) cb();
    }
  }

  getMoveVector() {
    return { x: this.moveVector.x, y: this.moveVector.y };
  }

  isRunning() {
    return this.run;
  }

  onAction(name, callback) {
    if (!this.actionHandlers[name]) {
      this.actionHandlers[name] = [];
    }
    this.actionHandlers[name].push(callback);
  }

  onPointerMove(callback) {
    this.pointerMoveHandlers.push(callback);
  }

  onPointerDown(callback) {
    this.pointerDownHandlers.push(callback);
  }

  onSelectBlock(callback) {
    this.selectBlockHandlers.push(callback);
    const handler = (event) => {
      const btn = event.target.closest("[data-block]");
      if (btn) callback(btn.dataset.block);
    };
    this._selectBlockHandler = handler;
    this.element.addEventListener("click", handler);
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerdown", this._onPointerDown);
    if (this.joystickEl) {
      this.joystickEl.removeEventListener("pointerdown", this._onJoyDown);
      this.joystickEl.removeEventListener("pointermove", this._onJoyMove);
      this.joystickEl.removeEventListener("pointerup", this._onJoyEnd);
      this.joystickEl.removeEventListener("pointercancel", this._onJoyEnd);
    }
    if (this._selectBlockHandler) {
      this.element.removeEventListener("click", this._selectBlockHandler);
      this._selectBlockHandler = null;
    }
    this.pointerMoveHandlers = [];
    this.pointerDownHandlers = [];
    this.selectBlockHandlers = [];
    this._heldKeys.clear();
    this.actionHandlers = {
      build: [],
      dig: [],
      jump: [],
      attack: [],
      skill: [],
    };
  }
}
