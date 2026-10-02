import { Quaternion, Vector3 } from 'three'

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
