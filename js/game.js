const RING_SCORE = 100;

export class Game {
  constructor() {
    this.score = 0;
    this.distance = 0;
    this.maxDistance = 0;
    this.gameOver = false;
    this.lastPos = { x: 0, z: 0 };
    this.hitCooldown = 0;
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.maxDistance = 0;
    this.gameOver = false;
    this.hitCooldown = 0;
  }

  update(playerPos, deltaTime, world) {
    if (this.gameOver) return;

    const dx = playerPos.x - this.lastPos.x;
    const dz = playerPos.z - this.lastPos.z;
    this.distance += Math.sqrt(dx * dx + dz * dz);
    this.maxDistance = Math.max(this.maxDistance, this.distance);
    this.lastPos.x = playerPos.x;
    this.lastPos.z = playerPos.z;

    if (this.hitCooldown > 0) {
      this.hitCooldown -= deltaTime;
    }

    this.checkRingCollisions(playerPos, world);
    this.updateHUD(playerPos.y);
  }

  checkRingCollisions(playerPos, world) {
    const rings = world.getActiveRings();
    for (const ring of rings) {
      const dx = playerPos.x - ring.position.x;
      const dy = (playerPos.y || 1.8) - ring.position.y;
      const dz = playerPos.z - ring.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < ring.userData.radius) {
        world.collectRing(ring);
        this.score += RING_SCORE;
        this.flashScore(RING_SCORE);
      }
    }
  }

  checkObstacleCollision(playerPos, objects, onHit) {
    if (this.hitCooldown > 0 || this.gameOver) return false;

    for (const obj of objects) {
      if (!obj.userData.isCollidable) continue;

      const minY = obj.userData.collisionMinY ?? -Infinity;
      const maxY = obj.userData.collisionMaxY ?? Infinity;
      const py = playerPos.y ?? 1.8;
      if (py < minY || py > maxY) continue;

      const dx = playerPos.x - obj.position.x;
      const dz = playerPos.z - obj.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < obj.userData.radius + 0.5) {
        this.hitCooldown = 0.5;
        onHit(obj);
        return true;
      }
    }
    return false;
  }

  flashScore(points) {
    const el = document.getElementById('score-value');
    if (!el) return;
    el.textContent = this.score;
    el.style.color = '#ffd700';
    el.style.transition = 'none';
    setTimeout(() => {
      el.style.transition = 'color 0.5s';
      el.style.color = 'white';
    }, 100);
  }

  updateHUD(altitude) {
    const scoreEl = document.getElementById('score-value');
    const altEl = document.getElementById('altitude-value');
    if (scoreEl) scoreEl.textContent = this.score;
    if (altEl) altEl.textContent = Math.round(altitude);
  }
}
