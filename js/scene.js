
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
