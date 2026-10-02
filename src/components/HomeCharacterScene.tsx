import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { HomeCharacterSceneProps } from './HomeCharacter'
import { eyePose } from './characterGeometry'

function CharacterModel({ theme, active, onReady, onFailure }: HomeCharacterSceneProps) {
  const { gl, invalidate } = useThree()
  const firstFrame = useRef(true)
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => { canvas.removeEventListener('webglcontextlost', lost) }
  }, [gl, onFailure])
  useEffect(() => { if (active) invalidate() }, [active, theme, invalidate])

  // Priority 1 owns rendering, so readiness follows a successful actual draw.
  // No clock, animation, continuous RAF, textures, transmission or extra pass.
  useFrame(({ gl, scene, camera }) => {
    if (!active || document.hidden) return
    try {
      gl.render(scene, camera)
      if (firstFrame.current) { firstFrame.current = false; queueMicrotask(onReady) }
    } catch { onFailure() }
  }, 1)

  return <>
    <hemisphereLight args={['#fff0da', '#b59f87', 1.5]} />
    <directionalLight position={[-3, 5, 3]} color="#ffe6bd" intensity={2} />
    <directionalLight position={[3, 1, 3]} color="#e8d9c7" intensity={theme === 'dark' ? .65 : .5} />
    <pointLight position={[2.4, .5, -1.2]} color="#d89c53" intensity={3} distance={8} decay={2} />
    <mesh>
      <sphereGeometry args={[1, 48, 32]} />
      <meshPhysicalMaterial color="#e8d9c7" metalness={.03} roughness={.55} specularIntensity={.35} clearcoat={.2} clearcoatRoughness={.55} />
    </mesh>
    {[-.23, .23].map(x => {
      const pose = eyePose(x, .18)
      return <mesh key={x} position={pose.position} quaternion={pose.quaternion}>
        <capsuleGeometry args={[.076, .204, 6, 12]} />
        <meshBasicMaterial color="#302b26" />
      </mesh>
    })}
  </>
}

export function HomeCharacterScene(props: HomeCharacterSceneProps) {
  return <Canvas orthographic camera={{ position: [0, 0, 5], zoom: 108, near: .1, far: 12 }}
    dpr={[1, 1.5]} frameloop={props.active ? 'demand' : 'never'} fallback={null}
    resize={{ debounce: 80 }}
    gl={{ alpha: true, antialias: true, powerPreference: 'low-power', toneMapping: THREE.ACESFilmicToneMapping }}>
    <CharacterModel {...props} />
  </Canvas>
}
