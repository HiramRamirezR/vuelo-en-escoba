import { createScene } from './scene.js';
import { createBroomstickTip, TIP_FORWARD_QUAT } from './broomstick.js';
import { initControls, getControls } from './controls.js';
import { World } from './world.js';
import { Game } from './game.js';

const { scene, camera, renderer } = createScene();

const broomTip = createBroomstickTip();
scene.add(broomTip);

const _broomOffset = new THREE.Vector3();
const _broomWorldPos = new THREE.Vector3();
const _broomWorldQuat = new THREE.Quaternion();
const _broomSideQuat = new THREE.Quaternion();
const _broomPitchQuat = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _xAxis = new THREE.Vector3(1, 0, 0);

const world = new World(scene);
const game = new Game();

initControls();

const SPEED = {
  max: 18,
  acceleration: 12,
  deceleration: 8,
  braking: 20,
  turnSpeed: 2.5
};

const player = {
  x: 0,
  z: 0,
  y: 2,
  rotation: 0,
  pitch: 0,
  speed: 0
};

const speedFill = document.getElementById('speed-fill');
const speedValue = document.getElementById('speed-value');
const instructionsEl = document.getElementById('instructions');

setTimeout(() => {
  if (instructionsEl) instructionsEl.classList.add('fade-out');
}, 5000);

function updateSpeed(controls, dt) {
  const fwd = controls.forward;

  if (fwd > 15) {
    const factor = Math.min((fwd - 15) / 30, 1);
    player.speed = Math.min(player.speed + SPEED.acceleration * factor * dt, SPEED.max);
  } else if (fwd < -10) {
    player.speed = Math.max(player.speed - SPEED.braking * dt, 0);
  } else {
    if (player.speed > 0) {
      player.speed = Math.max(player.speed - SPEED.deceleration * dt, 0);
    } else if (player.speed < 0) {
      player.speed = Math.min(player.speed + SPEED.deceleration * dt, 0);
    }
  }

  const displaySpeed = Math.round(Math.abs(player.speed) / SPEED.max * 100);
  if (speedFill) speedFill.style.width = `${displaySpeed}%`;
  if (speedValue) speedValue.textContent = displaySpeed;
}

function updatePosition(controls, dt) {
  const side = controls.side;
  const targetPitch = controls.pitch || 0;

  player.pitch += (targetPitch - player.pitch) * 5 * dt;
  player.pitch = Math.max(-0.5, Math.min(0.5, player.pitch));

  if (Math.abs(side) > 5) {
    player.rotation -= side * 0.025 * dt;
  }

  const horizontalSpeed = player.speed * Math.cos(player.pitch);
  player.x -= Math.sin(player.rotation) * horizontalSpeed * dt;
  player.z -= Math.cos(player.rotation) * horizontalSpeed * dt;
  player.y -= Math.sin(player.pitch) * player.speed * dt;

  player.y = Math.max(0.5, Math.min(50, player.y));
}

function updateCamera() {
  camera.position.x = player.x;
  camera.position.z = player.z;
  camera.position.y = player.y + 0.5;
  camera.rotation.y = player.rotation;
  camera.rotation.x = -player.pitch;
}

function animateBroomTip(controls) {
  _broomOffset.set(0, -0.9, -0.8);
  _broomOffset.applyQuaternion(camera.quaternion);
  _broomWorldPos.copy(camera.position).add(_broomOffset);
  broomTip.position.copy(_broomWorldPos);

  _broomWorldQuat.copy(camera.quaternion);
  _broomWorldQuat.multiply(TIP_FORWARD_QUAT);

  _broomPitchQuat.setFromAxisAngle(_xAxis, -player.pitch);
  _broomWorldQuat.multiply(_broomPitchQuat);

  _broomSideQuat.setFromAxisAngle(_zAxis, -controls.side * 0.003);
  _broomWorldQuat.multiply(_broomSideQuat);

  broomTip.quaternion.copy(_broomWorldQuat);
}

const hitFlash = document.createElement('div');
hitFlash.id = 'hit-flash';
document.body.appendChild(hitFlash);

function flashHit() {
  hitFlash.style.opacity = '0.4';
  setTimeout(() => { hitFlash.style.opacity = '0'; }, 150);
}

function checkCollisions() {
  const allObjects = [];
  for (const [, objects] of world.chunks) {
    allObjects.push(...objects);
  }

  game.checkObstacleCollision({ x: player.x, z: player.z }, allObjects, (obstacle) => {
    const dx = player.x - obstacle.position.x;
    const dz = player.z - obstacle.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0) {
      const nx = dx / dist;
      const nz = dz / dist;
      player.x += nx * 0.5;
      player.z += nz * 0.5;
      player.speed *= -0.4;
    }

    flashHit();
  });
}

let lastTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  const controls = getControls();
  updateSpeed(controls, dt);
  updatePosition(controls, dt);
  world.update(player.x, player.z);
  updateCamera();
  animateBroomTip(controls);
  checkCollisions();

  game.update({ x: player.x, y: player.y, z: player.z }, dt, world);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(0);
