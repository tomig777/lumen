import { Float32BufferAttribute, LatheGeometry, Path, Quaternion, Vector2, Vector3, type BufferGeometry } from 'three'

/** Preserve the capsule silhouette with a few extra straight-cylinder rings,
 * so its one precomputed morph can bend into a smooth smiling arch.
 * No extra meshes, textures or per-frame geometry allocation. R3F owns disposal. */
export function addHappyEyeMorph(geometry: BufferGeometry) {
  if (geometry.morphAttributes.position?.length) return
  const path = new Path()
  path.absarc(0, -.102, .076, Math.PI * 1.5, 0)
  path.absarc(0, .102, .076, 0, Math.PI * .5)
  const profile = path.getPoints(6), points: Vector2[] = []
  profile.forEach((point, index) => {
    points.push(point)
    if (point.y <= -.102 && profile[index + 1]?.y >= .102) {
      for (let step = 1; step < 8; step++) points.push(new Vector2(.076, -.102 + .204 * step / 8))
    }
  })
  const subdivided = new LatheGeometry(points, 12)
  geometry.copy(subdivided)
  subdivided.dispose()
  const positions = geometry.getAttribute('position')
  const target = new Float32Array(positions.count * 3)
  for (let i = 0; i < positions.count; i++) {
    const angle = positions.getY(i) / .178 * 1.15
    const radius = .13 + positions.getX(i) * .3
    target[i * 3] = Math.sin(angle) * radius
    target[i * 3 + 1] = Math.cos(angle) * radius - .0975
    target[i * 3 + 2] = positions.getZ(i) * .35
  }
  geometry.morphAttributes.position = [new Float32BufferAttribute(target, 3)]
  geometry.computeBoundingSphere()
}

/** Eyes sit just proud of the sphere and orient to its surface normal. */
export function eyePose(x: number, y: number) {
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y))
  const normal = new Vector3(x, y, z).normalize()
  const center = normal.clone().multiplyScalar(1.04)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal)
  return {
    position: center.toArray() as [number, number, number],
    quaternion: rotation.toArray() as [number, number, number, number],
  }
}
