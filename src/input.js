export default class Input {
  constructor(element = document) {
    this.element = element;
    this.moveVector = { x: 0, y: 0 };
    this.run = false;
    this.actionHandlers = { build: [], dig: [], jump: [] };
    this.pointerMoveHandlers = [];
    this.pointerDownHandlers = [];
    this.selectBlockHandlers = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerdown", this._onPointerDown);
  }

  _onKeyDown(event) {
    if (event.key === "w" || event.key === "ArrowUp") this.moveVector.y = 1;
    if (event.key === "s" || event.key === "ArrowDown") this.moveVector.y = -1;
    if (event.key === "a" || event.key === "ArrowLeft") this.moveVector.x = -1;
    if (event.key === "d" || event.key === "ArrowRight") this.moveVector.x = 1;
    if (event.key === "Shift") this.run = true;
    if (event.key === " ") this._fireAction("jump");
    if (event.key === "e") this._fireAction("build");
    if (event.key === "q") this._fireAction("dig");
  }

  _onKeyUp(event) {
    if (event.key === "Shift") this.run = false;
    if (["w", "s", "ArrowUp", "ArrowDown"].includes(event.key)) this.moveVector.y = 0;
    if (["a", "d", "ArrowLeft", "ArrowRight"].includes(event.key)) this.moveVector.x = 0;
  }

  _onPointerMove(event) {
    for (const cb of this.pointerMoveHandlers) {
      cb(event.clientX, event.clientY);
    }
  }

  _onPointerDown(event) {
    for (const cb of this.pointerDownHandlers) {
      cb(event.clientX, event.clientY);
    }
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
    if (this._selectBlockHandler) {
      this.element.removeEventListener("click", this._selectBlockHandler);
      this._selectBlockHandler = null;
    }
    this.pointerMoveHandlers = [];
    this.pointerDownHandlers = [];
    this.selectBlockHandlers = [];
    this.actionHandlers = { build: [], dig: [], jump: [] };
  }
}
