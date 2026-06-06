import { createScene, createCastle, createEnemy } from './scene.js';
import { createPlayerModel, MagicTrail } from './player.js';
import { initControls, getControls } from './controls.js';
import { World } from './world.js';
import { Game } from './game.js';
import { connect, on, sendUpdate, sendRingCollect, isConnected } from './network.js';

const { scene, camera, renderer } = createScene();
camera.rotation.order = 'YXZ';

const playerModel = createPlayerModel();
scene.add(playerModel);

const world = new World(scene);
const game = new Game();

const S = 5;
const castleData = createCastle();
castleData.group.position.set(60, -2, 60);
castleData.group.scale.set(S, S, S);
scene.add(castleData.group);

const castleColliders = [];
for (const def of castleData.colliderDefs) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(def.w, def.h, def.d),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  mesh.position.set(
    60 + def.x * S,
    -2 + def.y * S,
    60 + def.z * S
  );
  const r = Math.max(def.w, def.d) / 2 * S;
  const halfH = def.h / 2 * S;
  mesh.userData.isCollidable = true;
  mesh.userData.radius = r;
  mesh.userData.collisionMinY = -2 + (def.y - def.h / 2) * S;
  mesh.userData.collisionMaxY = -2 + (def.y + def.h / 2) * S;
  scene.add(mesh);
  castleColliders.push(mesh);
}

// --- Enemies ---
const ENEMY_SPAWN_INTERVAL = 3;
const MAX_ENEMIES = 8;
const ENEMY_KILL_SCORE = 100;
const TREE_KILL_SCORE = 10;
const enemies = [];
let enemySpawnTimer = 0;

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 80 || e.y < -5) {
      scene.remove(e.model);
      enemies.splice(i, 1);
      continue;
    }

    const speed = e.speed * dt;
    if (dist > 0.3) {
      e.x += (dx / dist) * speed;
      e.z += (dz / dist) * speed;
    }

    const targetY = player.y + (Math.sin(e.phase + performance.now() * 0.004) * 0.5);
    e.y += (targetY - e.y) * 3 * dt;

    e.model.position.set(e.x, e.y, e.z);
    e.model.lookAt(player.x, player.y, player.z);
  }

  enemySpawnTimer += dt;
  if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL && enemies.length < MAX_ENEMIES) {
    enemySpawnTimer = 0;
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 15;
    const ex = player.x + Math.cos(angle) * dist;
    const ez = player.z + Math.sin(angle) * dist;
    const ey = 2 + Math.random() * 7;

    const model = createEnemy();
    model.position.set(ex, ey, ez);
    scene.add(model);

    enemies.push({ model, x: ex, y: ey, z: ez, speed: 2 + Math.random() * 3, phase: Math.random() * Math.PI * 2 });
  }
}

function checkEnemyCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dy = (player.y || 1.8) - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.9) {
      if (!game.takeDamage(1)) return;
      player.x += (dx / dist) * 0.4;
      player.z += (dz / dist) * 0.4;
      player.speed *= -0.4;
      flashHit();
      scene.remove(e.model);
      enemies.splice(i, 1);
      if (game.gameOver) showGameOver();
    }
  }
}

initControls();

// --- Remote players ---
const remotePlayers = {};

function addRemotePlayer(id, color, state) {
  const model = createPlayerModel(color);
  model.position.set(state.x, state.y, state.z);
  model.rotation.y = state.rotation;
  model.rotation.x = -state.pitch;
  model.rotation.z = state.bank;
  scene.add(model);
  remotePlayers[id] = { model, x: state.x, y: state.y, z: state.z, rotation: state.rotation, pitch: state.pitch, bank: state.bank, speed: state.speed };
}

function removeRemotePlayer(id) {
  const rp = remotePlayers[id];
  if (rp) {
    scene.remove(rp.model);
    delete remotePlayers[id];
  }
}

// --- Connection UI ---
const connectBtn = document.getElementById('connect-btn');
const serverIpInput = document.getElementById('server-ip');
const connectionStatus = document.getElementById('connection-status');

serverIpInput.value = window.location.host;

connectBtn.addEventListener('click', () => {
  const ip = serverIpInput.value.trim() || 'localhost:3000';
  connectionStatus.textContent = 'Conectando...';
  connectionStatus.style.color = '#ffaa00';
  connect(ip);
});

on('connect', () => {
  connectionStatus.textContent = 'Conectado';
  connectionStatus.style.color = '#44ff44';
});

on('disconnect', () => {
  connectionStatus.textContent = 'Desconectado';
  connectionStatus.style.color = '#ff6666';
  for (const id in remotePlayers) removeRemotePlayer(id);
});

on('init', (data) => {
  player.x = data.spawnX ?? 0;
  player.z = data.spawnZ ?? 0;
  for (const p of data.players) {
    addRemotePlayer(p.id, p.color, p);
  }
  for (const ringId of data.collectedRings) {
    world.collectRingById(ringId);
  }
});

on('player_join', (data) => {
  addRemotePlayer(data.id, data.color, { x: 0, y: 0.3, z: 0, rotation: 0, pitch: 0, bank: 0, speed: 0 });
});

on('player_leave', (data) => {
  removeRemotePlayer(data.id);
});

on('player_update', (data) => {
  const rp = remotePlayers[data.id];
  if (rp) {
    rp.x = data.x; rp.y = data.y; rp.z = data.z;
    rp.rotation = data.rotation; rp.pitch = data.pitch;
    rp.bank = data.bank; rp.speed = data.speed;
  }
});

on('ring_collected', (data) => {
  world.collectRingById(data.ringId);
});

on('error', (msg) => {
  connectionStatus.textContent = msg;
  connectionStatus.style.color = '#ff6666';
});

// --- Auto-connect and connection UX ---
const connectSection = document.getElementById('connect-section');
const multiplayerBadge = document.getElementById('multiplayer-badge');
const singleplayerNote = document.getElementById('singleplayer-note');

connect(window.location.host);

setTimeout(() => {
  if (isConnected()) {
    connectSection.style.display = 'none';
    multiplayerBadge.style.display = 'block';
  } else {
    connectSection.style.display = 'none';
    singleplayerNote.style.display = 'block';
  }
}, 2000);

// --- Game logic ---

const SPEED = { max: 16, maxReverse: 8, acceleration: 12, deceleration: 6 };

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

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'd') orbitKeys[k] = true;
  if (e.key === ' ') { e.preventDefault(); castSpell(); }
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'd') orbitKeys[k] = false;
});

const player = {
  x: 0,
  z: 0,
  y: 0.3,
  rotation: 0,
  pitch: 0,
  bank: 0,
  speed: 0
};

// --- Spell system ---
const SPELL_SPEED = 22;
const SPELL_COOLDOWN = 800;
const SPELL_LIFETIME = 2;
const TRAIL_LENGTH = 50;
let lastSpellTime = 0;
const spells = [];
const effects = [];

function createSpellTrail() {
  const storage = new Float32Array(TRAIL_LENGTH * 3);
  const positions = new Float32Array(TRAIL_LENGTH * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    color: 0x00ff88,
    size: 0.07,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  return { geometry, material, points, storage, positions, count: 0, head: 0 };
}

function updateSpellTrail(trail, x, y, z) {
  trail.storage[trail.head * 3] = x;
  trail.storage[trail.head * 3 + 1] = y;
  trail.storage[trail.head * 3 + 2] = z;
  trail.head = (trail.head + 1) % TRAIL_LENGTH;
  trail.count = Math.min(trail.count + 1, TRAIL_LENGTH);

  const arr = trail.positions;
  for (let i = 0; i < trail.count; i++) {
    const src = ((trail.head - 1 - i + TRAIL_LENGTH) % TRAIL_LENGTH) * 3;
    const dst = i * 3;
    arr[dst] = trail.storage[src];
    arr[dst + 1] = trail.storage[src + 1];
    arr[dst + 2] = trail.storage[src + 2];
  }
  trail.geometry.attributes.position.needsUpdate = true;
  trail.geometry.setDrawRange(0, trail.count);
}

function castSpell() {
  const now = performance.now();
  if (now - lastSpellTime < SPELL_COOLDOWN) return;
  lastSpellTime = now;

  const fwdX = -Math.sin(player.rotation);
  const fwdZ = -Math.cos(player.rotation);

  const geo = new THREE.SphereGeometry(0.18, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 1.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    player.x + fwdX * 1.5,
    player.y + 0.4,
    player.z + fwdZ * 1.5
  );
  scene.add(mesh);

  const light = new THREE.PointLight(0x00ff88, 0.6, 4);
  mesh.add(light);

  const trail = createSpellTrail();
  scene.add(trail.points);

  spells.push({
    mesh, light, mat, geo,
    vx: fwdX * SPELL_SPEED,
    vz: fwdZ * SPELL_SPEED,
    life: 0,
    startY: player.y + 0.4,
    trail,
  });
}

function updateSpells(dt) {
  for (let i = spells.length - 1; i >= 0; i--) {
    const s = spells[i];
    s.life += dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.z += s.vz * dt;
    s.mesh.position.y = s.startY + Math.sin(s.life * 12) * 0.12;
    s.mesh.rotation.x += dt * 6;
    s.mesh.rotation.y += dt * 10;

    updateSpellTrail(s.trail, s.mesh.position.x, s.mesh.position.y, s.mesh.position.z);

    const t = s.life / SPELL_LIFETIME;
    s.trail.material.opacity = 0.6 * (1 - t * 0.5);
    s.trail.material.size = 0.07 * (1 - t * 0.3);
    if (t > 0.7) {
      const fade = 1 - (t - 0.7) / 0.3;
      s.mesh.scale.setScalar(fade);
      s.light.intensity = 0.6 * fade;
    }

    if (spellHitObstacle(s)) continue;

    if (s.life >= SPELL_LIFETIME) {
      removeSpell(i);
    }
  }
}

function spellHitObstacle(spell) {
  const pos = spell.mesh.position;
  for (const objects of world.chunks.values()) {
    for (const obj of objects) {
      if (!obj.userData.isCollidable) continue;
      const dx = pos.x - obj.position.x;
      const dz = pos.z - obj.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
        createImpactEffect(obj.position.x, obj.position.y + 1.2, obj.position.z);
        game.addScore(TREE_KILL_SCORE);
        scene.remove(obj);
        obj.userData.isCollidable = false;
        world.removeObject(obj);
        removeSpell(spells.indexOf(spell));
        return true;
      }
    }
  }
  for (const obj of castleColliders) {
    if (!obj.userData.isCollidable) continue;
    const dx = pos.x - obj.position.x;
    const dz = pos.z - obj.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
      createImpactEffect(obj.position.x, obj.position.y + 1.2, obj.position.z);
      scene.remove(obj);
      obj.userData.isCollidable = false;
      removeSpell(spells.indexOf(spell));
      return true;
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = pos.x - e.x;
    const dz = pos.z - e.z;
    if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
      createImpactEffect(e.x, e.y, e.z);
      scene.remove(e.model);
      enemies.splice(i, 1);
      game.addScore(ENEMY_KILL_SCORE);
      removeSpell(spells.indexOf(spell));
      return true;
    }
  }
  return false;
}

function removeSpell(index) {
  if (index === -1) return;
  const s = spells[index];
  scene.remove(s.mesh);
  scene.remove(s.trail.points);
  s.trail.geometry.dispose();
  s.trail.material.dispose();
  s.light.dispose();
  s.mat.dispose();
  s.geo.dispose();
  spells.splice(index, 1);
}

function createImpactEffect(x, y, z) {
  const colors = [0x00ff88, 0x44ffaa, 0x88ffcc];
  for (let i = 0; i < 10; i++) {
    const size = 0.04 + Math.random() * 0.06;
    const pGeo = new THREE.SphereGeometry(size, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 1,
    });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.set(x, y, z);
    scene.add(pMesh);
    effects.push({
      mesh: pMesh, mat: pMat, geo: pGeo,
      vx: (Math.random() - 0.5) * 4,
      vy: 1 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      life: 0,
    });
  }
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const p = effects[i];
    p.life += dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.vy -= 3 * dt;
    p.mat.opacity = Math.max(0, 1 - p.life * 2.5);
    if (p.life > 0.4 || p.mat.opacity <= 0) {
      scene.remove(p.mesh);
      p.mat.dispose();
      p.geo.dispose();
      effects.splice(i, 1);
    }
  }
}

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
  if (Math.abs(side) > DEAD_ZONE_SIDE) {
    const dir = Math.sign(player.speed) || 1;
    player.rotation -= side * dir * TURN_RATE * dt * 0.01;
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
  const idleBob = Math.abs(player.speed) < 1 ? Math.sin(performance.now() * 0.003) * 0.05 : 0;
  playerModel.position.set(player.x, player.y + idleBob, player.z);
  playerModel.rotation.y = player.rotation;
  playerModel.rotation.x = -player.pitch;
  playerModel.rotation.z = player.bank;
}

function updateRemotePlayers() {
  for (const id in remotePlayers) {
    const rp = remotePlayers[id];
    rp.model.position.set(rp.x, rp.y, rp.z);
    rp.model.rotation.y = rp.rotation;
    rp.model.rotation.x = -rp.pitch;
    rp.model.rotation.z = rp.bank;
  }
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

function createRingExplosion(ring) {
  const colors = [0xffd700, 0xffaa00, 0xffdd44];
  for (let i = 0; i < 12; i++) {
    const size = 0.04 + Math.random() * 0.06;
    const pGeo = new THREE.SphereGeometry(size, 4, 4);
    const pMat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 1 });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.position.copy(ring.position);
    scene.add(pMesh);
    effects.push({
      mesh: pMesh, mat: pMat, geo: pGeo,
      vx: (Math.random() - 0.5) * 5,
      vy: 1 + Math.random() * 4,
      vz: (Math.random() - 0.5) * 5,
      life: 0,
    });
  }
}

function showGameOver() {
  document.getElementById('final-score').textContent = game.score;
  document.getElementById('game-over').style.display = 'flex';
}

document.getElementById('restart-btn').addEventListener('click', () => {
  location.reload();
});

function checkCollisions() {
  const allObjects = [];
  for (const objects of world.chunks.values()) {
    allObjects.push(...objects);
  }
  allObjects.push(...castleColliders);
  checkEnemyCollisions();
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
let networkSendTimer = 0;
const NETWORK_SEND_INTERVAL = 1 / 15;

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

  game.update({ x: player.x, y: player.y, z: player.z }, dt, world, (ring) => {
    sendRingCollect(ring.userData.ringId);
    createRingExplosion(ring);
  });

  updateSpells(dt);
  updateEffects(dt);
  updateEnemies(dt);
  updateRemotePlayers();

  if (isConnected()) {
    networkSendTimer += dt;
    if (networkSendTimer >= NETWORK_SEND_INTERVAL) {
      networkSendTimer = 0;
      sendUpdate({
        x: player.x, y: player.y, z: player.z,
        rotation: player.rotation, pitch: player.pitch,
        bank: player.bank, speed: player.speed
      });
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(0);
