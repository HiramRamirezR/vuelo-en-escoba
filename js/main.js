import { createScene } from './scene.js';
import { createBroomstickTip, TIP_FORWARD_QUAT } from './broomstick.js';
import { initControls, getControls } from './controls.js';
import { World } from './world.js';
import { Game } from './game.js';
import { ParticleSystem } from './particles.js';

const { scene, camera, renderer } = createScene();

const broomTip = createBroomstickTip();
scene.add(broomTip);

const _broomOffset = new THREE.Vector3();
const _broomWorldPos = new THREE.Vector3();
const _broomWorldQuat = new THREE.Quaternion();
const _broomSideQuat = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

const world = new World(scene);
const game = new Game();
const particles = new ParticleSystem(scene);

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
  rotation: 0,
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
    player.speed = Math.max(player.speed - SPEED.deceleration * dt, 0);
  }

  const displaySpeed = Math.round((player.speed / SPEED.max) * 100);
  if (speedFill) speedFill.style.width = `${displaySpeed}%`;
  if (speedValue) speedValue.textContent = displaySpeed;
}

function updatePosition(controls, dt) {
  const side = controls.side;

  if (Math.abs(side) > 5) {
    player.rotation -= side * 0.025 * dt;
  }

  player.x -= Math.sin(player.rotation) * player.speed * dt;
  player.z -= Math.cos(player.rotation) * player.speed * dt;
}

function updateCamera() {
  camera.position.x = player.x;
  camera.position.z = player.z;
  camera.position.y = 1.8;
  camera.rotation.y = player.rotation;
}

function animateBroomTip(controls) {
  _broomOffset.set(0, -0.9, -0.8);
  _broomOffset.applyQuaternion(camera.quaternion);
  _broomWorldPos.copy(camera.position).add(_broomOffset);
  broomTip.position.copy(_broomWorldPos);

  _broomWorldQuat.copy(camera.quaternion);
  _broomWorldQuat.multiply(TIP_FORWARD_QUAT);

  _broomSideQuat.setFromAxisAngle(_zAxis, -controls.side * 0.003);
  _broomWorldQuat.multiply(_broomSideQuat);

  broomTip.quaternion.copy(_broomWorldQuat);
}

function checkCollisions() {
  const allObjects = [];
  for (const [, objects] of world.chunks) {
    allObjects.push(...objects);
  }

  game.checkObstacleCollision({ x: player.x, z: player.z }, allObjects, () => {
    player.speed *= 0.3;
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

  game.update({ x: player.x, z: player.z }, dt, world);

  if (player.speed > 1) {
    const backX = Math.sin(player.rotation);
    const backZ = Math.cos(player.rotation);
    const origin = new THREE.Vector3(
      broomTip.position.x + backX * 0.3 + (Math.random() - 0.5) * 0.2,
      broomTip.position.y + (Math.random() - 0.5) * 0.2,
      broomTip.position.z + backZ * 0.3 + (Math.random() - 0.5) * 0.2
    );
    const emissionRate = Math.floor(player.speed * 2);
    particles.emit(origin, Math.min(emissionRate, 4), { x: 0.1, y: 0.1, z: 0.1 }, player.speed, backX, backZ);
  }

  particles.update(dt);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(0);
