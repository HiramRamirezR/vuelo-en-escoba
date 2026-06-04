const MAX_PARTICLES = 200;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = [];
    this.lifetimes = new Float32Array(MAX_PARTICLES);
    this.ages = new Float32Array(MAX_PARTICLES);
    this.active = new Uint8Array(MAX_PARTICLES);
    this.nextIndex = 0;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.velocities.push(new THREE.Vector3());
      this.lifetimes[i] = 1;
      this.ages[i] = 0;
      this.active[i] = 0;
    }
  }

  emit(origin, count, spread, speed, dirX, dirZ) {
    for (let i = 0; i < count; i++) {
      const idx = this.nextIndex;
      this.nextIndex = (this.nextIndex + 1) % MAX_PARTICLES;

      const i3 = idx * 3;
      this.positions[i3] = origin.x + (Math.random() - 0.5) * spread.x;
      this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * spread.y;
      this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * spread.z;

      this.velocities[idx].set(
        dirX * speed * 0.6 + (Math.random() - 0.5) * speed * 0.2,
        (Math.random() - 0.5) * speed * 0.2,
        dirZ * speed * 0.6 + (Math.random() - 0.5) * speed * 0.2
      );

      this.lifetimes[idx] = 0.5 + Math.random() * 0.5;
      this.ages[idx] = 0;
      this.active[idx] = 1;
    }
  }

  update(deltaTime) {
    const posAttr = this.points.geometry.attributes.position;
    let needsUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!this.active[i]) continue;

      this.ages[i] += deltaTime;
      if (this.ages[i] >= this.lifetimes[i]) {
        this.active[i] = 0;
        needsUpdate = true;
        continue;
      }

      const i3 = i * 3;
      this.positions[i3] += this.velocities[i].x * deltaTime;
      this.positions[i3 + 1] += this.velocities[i].y * deltaTime;
      this.positions[i3 + 2] += this.velocities[i].z * deltaTime;

      this.velocities[i].y += deltaTime * 0.5;
      needsUpdate = true;
    }

    if (needsUpdate) {
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
