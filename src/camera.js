import * as THREE from "three";

const MIN_ZOOM = 5.2;
const MAX_ZOOM = 13;

class Camera {
  constructor(canvas, zoomLabelEl) {
    this.canvas = canvas;
    this.zoomLabelEl = zoomLabelEl;

    const initialZoom = window.innerWidth < 720 ? 6.4 : 8.8;
    this._zoom = initialZoom;

    const aspect = canvas.width / canvas.height;
    this._camera = new THREE.OrthographicCamera(
      -initialZoom * aspect, initialZoom * aspect,
      initialZoom, -initialZoom,
      0.1, 120,
    );
    this._camera.position.set(14, 16, 14);
    this._camera.rotation.order = "YXZ";
    this._camera.lookAt(0, 0, 0);

    this._updateZoomLabel();
  }

  get camera() {
    return this._camera;
  }

  getZoom() {
    return this._zoom;
  }

  setZoom(level) {
    this._zoom = THREE.MathUtils.clamp(level, MIN_ZOOM, MAX_ZOOM);
    this._applyZoom();
  }

  follow(targetPosition) {
    const target = targetPosition.clone();
    this._camera.position.lerp(
      new THREE.Vector3(target.x + 14, target.y + 14, target.z + 14),
      0.08,
    );
    this._camera.lookAt(target.x, target.y, target.z);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this._applyZoom();
  }

  _applyZoom() {
    const aspect = this.canvas.width / this.canvas.height;
    this._camera.left = -this._zoom * aspect;
    this._camera.right = this._zoom * aspect;
    this._camera.top = this._zoom;
    this._camera.bottom = -this._zoom;
    this._camera.updateProjectionMatrix();
    this._updateZoomLabel();
  }

  _updateZoomLabel() {
    if (this.zoomLabelEl) {
      this.zoomLabelEl.textContent = this._zoom.toFixed(1);
    }
  }
}

export default Camera;
