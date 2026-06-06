
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 30, 120);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 1.8, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  document.getElementById('game-container').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
  scene.add(ambientLight);

  const moonLight = new THREE.DirectionalLight(0x8888cc, 0.6);
  moonLight.position.set(-20, 40, -30);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  moonLight.shadow.camera.left = -50;
  moonLight.shadow.camera.right = 50;
  moonLight.shadow.camera.top = 50;
  moonLight.shadow.camera.bottom = -50;
  scene.add(moonLight);

  const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
  fillLight.position.set(20, 10, 20);
  scene.add(fillLight);

  return { scene, camera, renderer };
}

export function createGround() {
  const geometry = new THREE.PlaneGeometry(200, 200, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a3a2a,
    roughness: 0.9,
    metalness: 0
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  return ground;
}

export function createTree(x, z) {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  group.add(trunk);

  const leafGeo = new THREE.SphereGeometry(1.2 + Math.random() * 0.3, 6, 6);
  const shade = 0.2 + Math.random() * 0.15;
  const leafMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(shade * 0.8, shade * 1.2, shade * 0.6),
    roughness: 0.8
  });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.y = 2.8 + Math.random() * 0.3;
  leaves.castShadow = true;
  group.add(leaves);

  group.position.set(x, -2, z);
  group.userData.isCollidable = true;
  group.userData.radius = 1.5;
  group.userData.collisionMinY = -1;
  group.userData.collisionMaxY = 5;
  return group;
}

export function createObstacle(x, y, z, color) {
  const size = 0.6 + Math.random() * 0.8;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.4,
    metalness: 0.2,
    emissive: color,
    emissiveIntensity: 0.1
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(x, y, z);
  cube.castShadow = true;
  cube.receiveShadow = true;
  cube.userData.isObstacle = true;
  cube.userData.radius = size * 0.7;
  return cube;
}

export function createRing(x, y, z) {
  const geometry = new THREE.TorusGeometry(0.8, 0.12, 8, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffa500,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.8
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.set(x, y, z);
  ring.userData.isRing = true;
  ring.userData.radius = 1.0;
  ring.userData.collected = false;
  return ring;
}

export function createCastle() {
  const group = new THREE.Group();
  const colliderDefs = [];

  function col(x, y, z, w, h, d) {
    colliderDefs.push({ x, y, z, w, h, d });
  }

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.7, metalness: 0.1 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffdd66,
    emissive: 0xffaa33,
    emissiveIntensity: 0.8,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });

  // Main keep
  const keep = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 5), stoneMat);
  keep.position.set(0, 1.75, 0);
  keep.castShadow = true; keep.receiveShadow = true;
  group.add(keep);
  col(0, 1.75, 0, 8, 3.5, 5);

  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1.8, 4), roofMat);
  keepRoof.position.set(0, 4.4, 0);
  keepRoof.rotation.y = Math.PI / 4;
  keepRoof.castShadow = true;
  group.add(keepRoof);

  // Astronomy Tower (tallest, left)
  const at = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.3, 16, 8), stoneMat);
  at.position.set(-4, 8, -1);
  at.castShadow = true;
  group.add(at);
  col(-4, 8, -1, 2.6, 16, 2.6);

  const atRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.5, 8), roofMat);
  atRoof.position.set(-4, 17.25, -1);
  atRoof.castShadow = true;
  group.add(atRoof);

  // Observatory platform on astronomy tower
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.3, 8), darkStoneMat);
  platform.position.set(-4, 15.5, -1);
  platform.castShadow = true;
  group.add(platform);

  // Clock Tower (right)
  const ct = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 12, 8), stoneMat);
  ct.position.set(4, 6, -1);
  ct.castShadow = true;
  group.add(ct);
  col(4, 6, -1, 2.2, 12, 2.2);

  const ctRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 8), roofMat);
  ctRoof.position.set(4, 14, -1);
  ctRoof.castShadow = true;
  group.add(ctRoof);

  // Clock face
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
  clockFace.position.set(4, 8, -0.1);
  group.add(clockFace);

  // Front left tower
  const flt = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 8), stoneMat);
  flt.position.set(-2.2, 3.5, 2.8);
  flt.castShadow = true;
  group.add(flt);
  col(-2.2, 3.5, 2.8, 1.8, 7, 1.8);

  const fltRoof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 8), roofMat);
  fltRoof.position.set(-2.2, 8.1, 2.8);
  fltRoof.castShadow = true;
  group.add(fltRoof);

  // Front right tower
  const frt = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 7, 8), stoneMat);
  frt.position.set(2.2, 3.5, 2.8);
  frt.castShadow = true;
  group.add(frt);
  col(2.2, 3.5, 2.8, 1.8, 7, 1.8);

  const frtRoof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 8), roofMat);
  frtRoof.position.set(2.2, 8.1, 2.8);
  frtRoof.castShadow = true;
  group.add(frtRoof);

  // Back tower (center)
  const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 8, 8), stoneMat);
  bt.position.set(0, 4, -2.5);
  bt.castShadow = true;
  group.add(bt);
  col(0, 4, -2.5, 2, 8, 2);

  const btRoof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), roofMat);
  btRoof.position.set(0, 9.25, -2.5);
  btRoof.castShadow = true;
  group.add(btRoof);

  // Walls connecting towers
  const wallPositions = [
    { x: -1.5, z: -1, sx: 2, sz: 0.4 },
    { x: 1.5, z: -1, sx: 2, sz: 0.4 },
    { x: -3, z: 0.5, sx: 0.4, sz: 2 },
    { x: 3, z: 0.5, sx: 0.4, sz: 2 },
  ];
  for (const w of wallPositions) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, 3, w.sz), darkStoneMat);
    wall.position.set(w.x, 1.5, w.z);
    wall.castShadow = true;
    group.add(wall);
  }

  // Front wall with gate opening (two pieces)
  const gateLeft = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.4), darkStoneMat);
  gateLeft.position.set(-1.15, 1.25, 3.2);
  gateLeft.castShadow = true;
  group.add(gateLeft);

  const gateRight = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.4), darkStoneMat);
  gateRight.position.set(1.15, 1.25, 3.2);
  gateRight.castShadow = true;
  group.add(gateRight);

  const gateTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 0.4), darkStoneMat);
  gateTop.position.set(0, 3.2, 3.2);
  gateTop.castShadow = true;
  group.add(gateTop);

  // Wooden gate door
  const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.2), woodMat);
  gateDoor.position.set(0, 1.5, 3.4);
  group.add(gateDoor);

  // Windows (warm glow)
  const winPositions = [
    [-1.8, 2.2, 3.15], [1.8, 2.2, 3.15],
    [-1.2, 2.8, 3.15], [1.2, 2.8, 3.15],
    [-1, 2.5, -2.85], [1, 2.5, -2.85],
    [0, 3.5, -2.85],
    [-2.5, 5, -1], [2.5, 4, -1],
    [-0.8, 5.5, -2.85], [0.8, 5.5, -2.85],
  ];
  for (const [wx, wy, wz] of winPositions) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.05), windowMat);
    win.position.set(wx, wy, wz);
    group.add(win);
  }

  // Flag on astronomy tower
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), new THREE.MeshStandardMaterial({ color: 0x888888 }));
  flagPole.position.set(-4, 18.8, -1);
  group.add(flagPole);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: 0xcc3333 }));
  flag.position.set(-4, 19.2, -0.6);
  group.add(flag);

  // Torches / lanterns near gate
  const torchMat = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6600, emissiveIntensity: 0.5 });
  const torchPos = [[-2, 1.5, 3.3], [2, 1.5, 3.3]];
  for (const [tx, ty, tz] of torchPos) {
    const torch = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), torchMat);
    torch.position.set(tx, ty, tz);
    group.add(torch);
    const light = new THREE.PointLight(0xff8844, 0.3, 3);
    light.position.set(tx, ty, tz);
    group.add(light);
  }

  // Small wall extensions / buttresses
  const buttressPos = [{ x: -3.8, z: 2 }, { x: 3.8, z: 2 }, { x: -3.8, z: -1.5 }, { x: 3.8, z: -1.5 }];
  for (const b of buttressPos) {
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), stoneMat);
    butt.position.set(b.x, 0.75, b.z);
    butt.castShadow = true;
    group.add(butt);
  }

  return { group, colliderDefs };
}

export function createEnemy() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), bodyMat);
  body.castShadow = true;
  group.add(body);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.5 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  e1.position.set(-0.1, 0.05, 0.35);
  group.add(e1);
  const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  e2.position.set(0.1, 0.05, 0.35);
  group.add(e2);

  const wingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, roughness: 0.9, side: THREE.DoubleSide });
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), wingMat);
  lw.position.set(-0.3, 0, 0);
  lw.rotation.z = -0.3;
  lw.rotation.y = 0.4;
  group.add(lw);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), wingMat);
  rw.position.set(0.3, 0, 0);
  rw.rotation.z = 0.3;
  rw.rotation.y = -0.4;
  group.add(rw);

  const glow = new THREE.PointLight(0xff2200, 0.3, 3);
  glow.position.set(0, 0, 0.3);
  group.add(glow);

  group.userData.isEnemy = true;
  group.userData.radius = 0.6;

  return group;
}
