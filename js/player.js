const TRAIL_MAX = 120;
const TRAIL_SPAWN_INTERVAL = 0.02;
const TRAIL_LIFE = 1.2;

const _limbMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });

function limb(parent, x, y, z, rx, ry, rz, h, r) {
  const g = new THREE.CylinderGeometry(r, r, h, 6);
  const m = new THREE.Mesh(g, _limbMat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
}

export function createPlayerModel(bodyColor) {
  const group = new THREE.Group();

  const handleGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.7, 6);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.08, -0.05);
  handle.castShadow = true;
  group.add(handle);

  const briGeo = new THREE.ConeGeometry(0.08, 0.18, 6);
  const briMat = new THREE.MeshStandardMaterial({ color: 0x5C3A1E, roughness: 0.9 });
  const bristles = new THREE.Mesh(briGeo, briMat);
  bristles.rotation.x = -Math.PI / 2;
  bristles.position.set(0, 0.08, 0.32);
  bristles.castShadow = true;
  group.add(bristles);

  const bodyGeo = new THREE.BoxGeometry(0.26, 0.30, 0.16);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor ?? 0x1a1a1a, roughness: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.30, 0.02);
  body.castShadow = true;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.13, 10, 10);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.4 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0.62, 0.02);
  head.castShadow = true;
  group.add(head);

  limb(group, -0.15, 0.34, -0.08, 0.3, 0, 0.15, 0.28, 0.025);
  limb(group, 0.15, 0.34, -0.08, 0.3, 0, -0.15, 0.28, 0.025);
  limb(group, -0.08, 0.06, 0.02, 0, 0, 0, 0.20, 0.025);
  limb(group, 0.08, 0.06, 0.02, 0, 0, 0, 0.20, 0.025);

  return group;
}

export class MagicTrail {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.spawnTimer = 0;

    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(TRAIL_MAX * 3);
    this.colArr = new Float32Array(TRAIL_MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(geo, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  spawn(worldPos) {
    if (this.particles.length >= TRAIL_MAX) {
      this.particles.shift();
    }
    this.particles.push({
      x: worldPos.x + (Math.random() - 0.5) * 0.04,
      y: worldPos.y + (Math.random() - 0.5) * 0.04,
      z: worldPos.z + (Math.random() - 0.5) * 0.04,
      life: 0,
      maxLife: TRAIL_LIFE * (0.7 + Math.random() * 0.3)
    });
  }

  update(dt, broomRear) {
    this.spawnTimer += dt;
    while (this.spawnTimer >= TRAIL_SPAWN_INTERVAL) {
      this.spawnTimer -= TRAIL_SPAWN_INTERVAL;
      this.spawn(broomRear);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.y -= dt * 0.3;
    }

    const pos = this.posArr;
    const col = this.colArr;
    for (let i = 0; i < TRAIL_MAX; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const t = p.life / p.maxLife;
        const fade = 1 - t;
        pos[i * 3] = p.x;
        pos[i * 3 + 1] = p.y;
        pos[i * 3 + 2] = p.z;
        col[i * 3] = 0.25 * fade;
        col[i * 3 + 1] = 0.55 * fade;
        col[i * 3 + 2] = 1.0 * fade;
      } else {
        pos[i * 3 + 1] = -999;
      }
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
