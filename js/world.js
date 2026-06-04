import { createGround, createTree, createObstacle, createRing } from './scene.js';

const CHUNK_SIZE = 80;
const VIEW_RADIUS = 3;
const TREE_DENSITY = 0.15;
const OBSTACLE_DENSITY = 0.04;
const RING_DENSITY = 0.02;

function hash(x, z) {
  return x * 374761393 + z * 668265263;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 9301 + 49297;
  return x - Math.floor(x);
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.grounds = new Map();
    this.lastCenterX = null;
    this.lastCenterZ = null;
    this.rings = [];
  }

  update(playerX, playerZ) {
    const cx = Math.round(playerX / CHUNK_SIZE);
    const cz = Math.round(playerZ / CHUNK_SIZE);

    if (cx === this.lastCenterX && cz === this.lastCenterZ) return;
    this.lastCenterX = cx;
    this.lastCenterZ = cz;

    const needed = new Set();

    for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
      for (let dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        needed.add(key);

        if (!this.chunks.has(key)) {
          this.generateChunk(cx + dx, cz + dz);
        }
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!needed.has(key)) {
        this.removeChunk(chunk);
        this.chunks.delete(key);
      }
    }

    this.updateGround(playerX, playerZ);
  }

  generateChunk(cx, cz) {
    const objects = [];
    const seed = hash(cx, cz);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    const treeCount = Math.floor(CHUNK_SIZE * CHUNK_SIZE * TREE_DENSITY / 100);
    for (let i = 0; i < treeCount; i++) {
      const r1 = seededRandom(seed + i * 3);
      const r2 = seededRandom(seed + i * 3 + 1);
      const x = baseX + (r1 - 0.5) * (CHUNK_SIZE - 10);
      const z = baseZ + (r2 - 0.5) * (CHUNK_SIZE - 10);
      const tree = createTree(x, z);
      this.scene.add(tree);
      objects.push(tree);
    }

    const obsCount = Math.floor(CHUNK_SIZE * CHUNK_SIZE * OBSTACLE_DENSITY / 100);
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xff8a5c, 0x6c5ce7];
    for (let i = 0; i < obsCount; i++) {
      const r1 = seededRandom(seed + i * 7 + 100);
      const r2 = seededRandom(seed + i * 7 + 101);
      const r3 = seededRandom(seed + i * 7 + 102);
      const x = baseX + (r1 - 0.5) * (CHUNK_SIZE - 8);
      const z = baseZ + (r2 - 0.5) * (CHUNK_SIZE - 8);
      const y = -1 + r3 * 3;
      const color = colors[Math.floor(seededRandom(seed + i * 7 + 103) * colors.length)];
      const obs = createObstacle(x, y, z, color);
      this.scene.add(obs);
      objects.push(obs);
    }

    const ringCount = Math.floor(CHUNK_SIZE * CHUNK_SIZE * RING_DENSITY / 100);
    for (let i = 0; i < ringCount; i++) {
      const r1 = seededRandom(seed + i * 11 + 200);
      const r2 = seededRandom(seed + i * 11 + 201);
      const r3 = seededRandom(seed + i * 11 + 202);
      const x = baseX + (r1 - 0.5) * (CHUNK_SIZE - 10);
      const z = baseZ + (r2 - 0.5) * (CHUNK_SIZE - 10);
      const y = -0.5 + r3 * 5;
      const ring = createRing(x, y, z);
      this.scene.add(ring);
      objects.push(ring);
      this.rings.push(ring);
    }

    this.chunks.set(`${cx},${cz}`, objects);
  }

  removeChunk(objects) {
    for (const obj of objects) {
      if (obj.userData.isRing) {
        const idx = this.rings.indexOf(obj);
        if (idx !== -1) this.rings.splice(idx, 1);
      }
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  updateGround(playerX, playerZ) {
    const gx = Math.floor(playerX / 200);
    const gz = Math.floor(playerZ / 200);

    for (const [key, ground] of this.grounds) {
      const [kx, kz] = key.split(',').map(Number);
      if (Math.abs(kx - gx) > 1 || Math.abs(kz - gz) > 1) {
        this.scene.remove(ground);
        ground.geometry.dispose();
        ground.material.dispose();
        this.grounds.delete(key);
      }
    }

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${gx + dx},${gz + dz}`;
        if (!this.grounds.has(key)) {
          const ground = createGround();
          ground.position.set((gx + dx) * 200, -2, (gz + dz) * 200);
          this.scene.add(ground);
          this.grounds.set(key, ground);
        }
      }
    }
  }

  getActiveRings() {
    return this.rings.filter(r => !r.userData.collected);
  }

  collectRing(ring) {
    ring.userData.collected = true;
    this.scene.remove(ring);
    const idx = this.rings.indexOf(ring);
    if (idx !== -1) this.rings.splice(idx, 1);
  }
}
