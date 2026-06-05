import { createScene } from './scene.js';
import { createPlayerModel, MagicTrail } from './player.js';
import { initControls, getControls } from './controls.js';
import { World } from './world.js';
import { Game } from './game.js';

const { scene, camera, renderer } = createScene();
camera.rotation.order = 'YXZ';

const playerModel = createPlayerModel();
scene.add(playerModel);

const world = new World(scene);
const game = new Game();

initControls();

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'd') orbitKeys[k] = true;
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'd') orbitKeys[k] = false;
});

const SPEED = {
  max: 16,
  maxReverse: 8,
  acceleration: 12,
  deceleration: 6
};

const DEAD_ZONE_FWD = 15;
const DEAD_ZONE_SIDE = 20;
const CLIMB_SPEED = 5;
const TURN_RATE = 1.8;
const BANK_STRENGTH = 0.018;

const CAM_DIST = 2.5;
const CAM_HEIGHT = 1.5;
const CAM_SMOOTH = 5;
const CAM_ORBIT_SPEED = 2.5;

let cameraOrbitAngle = 0;
const orbitKeys = { a: false, d: false };

const player = {
  x: 0,
  z: 0,
  y: 0.3,
  rotation: 0,
  pitch: 0,
  bank: 0,
  speed: 0
};

const _camPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _trailPos = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const trail = new MagicTrail(scene);

const speedFill = document.getElementById('speed-fill');
const speedValue = document.getElementById('speed-value');
const instructionsEl = document.getElementById('instructions');

setTimeout(() => {
  if (instructionsEl) instructionsEl.classList.add('fade-out');
}, 5000);

function updateSpeed(controls, dt) {
  const fwd = controls.forward;

  if (fwd > DEAD_ZONE_FWD) {
    const factor = Math.min((fwd - DEAD_ZONE_FWD) / 30, 1);
    player.speed = Math.min(player.speed + SPEED.acceleration * factor * dt, SPEED.max);
  } else if (fwd < -DEAD_ZONE_FWD) {
    const factor = Math.min((-fwd - DEAD_ZONE_FWD) / 30, 1);
    player.speed = Math.max(player.speed - SPEED.acceleration * factor * dt, -SPEED.maxReverse);
  } else {
    if (Math.abs(player.speed) > 0.2) {
      player.speed -= Math.sign(player.speed) * SPEED.deceleration * dt;
    } else {
      player.speed = 0;
    }
  }

  const displaySpeed = Math.round(Math.abs(player.speed) / SPEED.max * 100);
  if (speedFill) speedFill.style.width = `${displaySpeed}%`;
  if (speedValue) speedValue.textContent = displaySpeed;
}

function updatePosition(controls, dt) {
  const side = controls.side;

  const targetBank = -side * BANK_STRENGTH;
  player.bank += (targetBank - player.bank) * 4 * dt;

  if (Math.abs(side) > DEAD_ZONE_SIDE && Math.abs(player.speed) > 2) {
    player.rotation -= side * TURN_RATE * dt * 0.01;
  }

  player.x -= Math.sin(player.rotation) * player.speed * dt;
  player.z -= Math.cos(player.rotation) * player.speed * dt;

  const targetPitch = -controls.vertical * 0.25;
  player.pitch += (targetPitch - player.pitch) * 3 * dt;

  player.y += controls.vertical * CLIMB_SPEED * dt;
  player.y = Math.max(0.3, Math.min(50, player.y));
}

function updateCamera(dt) {
  if (orbitKeys.a) cameraOrbitAngle += CAM_ORBIT_SPEED * dt;
  if (orbitKeys.d) cameraOrbitAngle -= CAM_ORBIT_SPEED * dt;

  const angle = player.rotation + cameraOrbitAngle;
  _camPos.set(
    player.x + Math.sin(angle) * CAM_DIST,
    player.y + CAM_HEIGHT,
    player.z + Math.cos(angle) * CAM_DIST
  );

  camera.position.lerp(_camPos, CAM_SMOOTH * dt);

  _lookTarget.set(player.x, player.y + 0.4, player.z);
  camera.lookAt(_lookTarget);
}

function updatePlayerModel() {
  playerModel.position.set(player.x, player.y, player.z);
  playerModel.rotation.y = player.rotation;
  playerModel.rotation.x = -player.pitch;
  playerModel.rotation.z = player.bank;
}

function updateTrail(dt) {
  _v3.set(0, 0.08, 0.6);
  _v3.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation);
  _v3.applyAxisAngle(new THREE.Vector3(1, 0, 0), player.pitch);
  _v3.applyAxisAngle(new THREE.Vector3(0, 0, 1), player.bank);
  _trailPos.set(player.x + _v3.x, player.y + _v3.y, player.z + _v3.z);
  trail.update(dt, _trailPos);
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

  game.checkObstacleCollision({ x: player.x, y: player.y, z: player.z }, allObjects, (obstacle) => {
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
  updatePlayerModel();
  updateCamera(dt);
  updateTrail(dt);
  world.update(player.x, player.z);
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
