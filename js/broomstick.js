export const TIP_FORWARD_QUAT = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0.4, -1).normalize()
);

export function createBroomstickTip() {
  const geometry = new THREE.CylinderGeometry(0.005, 0.07, 0.5, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.05,
    emissive: 0x3d1f00,
    emissiveIntensity: 0.1
  });

  return new THREE.Mesh(geometry, material);
}
