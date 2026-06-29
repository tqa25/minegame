import * as THREE from "three";

const MAX_REACH = 8;

class BlockSelector {
  constructor(world, camera, player, scene, heightLabelEl) {
    this._world = world;
    this._camera = camera;
    this._player = player;
    this._heightLabelEl = heightLabelEl;

    this._raycaster = new THREE.Raycaster();
    this._selectedCell = null;

    this._selector = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.08, 1.04),
      new THREE.MeshBasicMaterial({
        color: 0xfff1a1,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this._selector.visible = false;
    scene.add(this._selector);
  }

  _isLiveBlock(mesh) {
    if (!mesh?.userData) return false;
    const { x, y, z } = mesh.userData;
    return this._world.getBlock(x, y, z) != null;
  }

  _isWithinReach(mesh) {
    const playerBaseY = this._player.position.y;
    const dx = mesh.position.x - this._player.position.x;
    const dy = mesh.position.y - playerBaseY;
    const dz = mesh.position.z - this._player.position.z;
    return Math.hypot(dx, dy, dz) <= MAX_REACH;
  }

  pick(clientX, clientY) {
    const pointer = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );

    this._raycaster.setFromCamera(pointer, this._camera);

    const allMeshes = this._world.getAllMeshes();
    const hits = this._raycaster
      .intersectObjects(allMeshes, false)
      .filter(
        (hit) =>
          this._isLiveBlock(hit.object) && this._isWithinReach(hit.object),
      );

    this._selectedCell = hits[0] ?? null;

    if (!this._selectedCell) {
      this._selector.visible = false;
      return null;
    }

    const { x, y, z } = this._selectedCell.object.userData;
    this._selector.position.set(x, y + 0.54, z);
    this._selector.visible = true;

    const top = this._world.topHeight(x, z);
    this._heightLabelEl.textContent = `H: ${top + 1}`;

    return this._selectedCell;
  }

  clear() {
    this._selectedCell = null;
    this._selector.visible = false;
  }

  getSelectedCell() {
    return this._selectedCell;
  }
}

export default BlockSelector;
