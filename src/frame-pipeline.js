export default class FramePipeline {
  constructor(modules) {
    this._input = modules.input;
    this._player = modules.player;
    this._enemySpawner = modules.enemySpawner;
    this._camera = modules.camera;
    this._renderer = modules.renderer;
  }

  process(dt, elapsedTime) {
    const moveVector = this._input.getMoveVector();
    this._player.update(dt, moveVector);
    this._enemySpawner.update(dt, this._player);
    this._camera.follow(this._player.position);
    this._renderer.updateSun(elapsedTime);
    this._renderer.render(this._camera.camera);
  }
}
