import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { HomeCharacterSceneProps } from './HomeCharacter'
import { eyePose, addHappyEyeMorph } from './characterGeometry'
import { createIdleEyes, type EyeState } from './characterAnimation'

function CharacterModel({ theme, active, reducedMotion, onReady, onFailure, gazeInput, eyeSession }: HomeCharacterSceneProps) {
  const { gl, invalidate } = useThree()
  const firstFrame = useRef(true)
  const eyes = useRef<(THREE.Mesh | null)[]>([])
  const animation = useRef<ReturnType<typeof createIdleEyes> | null>(null)
  const ownSession = useRef({ lastReactionAt: -Infinity })
  useEffect(() => {
    const apply = ({ x, y, openness, smile = 0 }: EyeState) => {
      eyes.current.forEach((eye, index) => {
        if (!eye) return
        const pose = eyePose((index ? .23 : -.23) + x, .18 + y)
        eye.position.fromArray(pose.position)
        eye.quaternion.fromArray(pose.quaternion)
        eye.scale.set(1, openness, 1)
        if (!eye.morphTargetInfluences) eye.updateMorphTargets()
        if (eye.morphTargetInfluences?.length) eye.morphTargetInfluences[0] = smile
      })
    }
    apply({ x: 0, y: 0, openness: 1 })
    if (!active || reducedMotion || document.hidden) return
    const controller = createIdleEyes({ now: () => performance.now(), random: Math.random,
      setTimer: (callback, delay) => window.setTimeout(callback, delay),
      clearTimer: id => window.clearTimeout(id), requestDraw: invalidate, apply }, { personality: true, session: eyeSession ?? ownSession.current })
    animation.current = controller
    controller.start()
    const unsubscribe = gazeInput?.subscribe(target => {
      if (target) controller.follow(target.x, target.y)
      else controller.release()
    })
    const stopReactions = gazeInput?.subscribeReaction?.(controller.react)
    const stopActivity = gazeInput?.subscribeActivity?.(controller.activity)
    // Cancel immediately on hiding, before the wrapper's React update arrives.
    const hidden = () => { if (document.hidden) controller.stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      unsubscribe?.()
      stopReactions?.(); stopActivity?.()
      controller.stop()
      if (animation.current === controller) animation.current = null
    }
  }, [active, reducedMotion, invalidate, gazeInput, eyeSession])
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); animation.current?.stop(); onFailure() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => { canvas.removeEventListener('webglcontextlost', lost) }
  }, [gl, onFailure])
  useEffect(() => { if (active) invalidate() }, [active, theme, reducedMotion, invalidate])

  // Priority 1 owns rendering, so readiness follows a successful actual draw.
  // Only finite eye transitions invalidate subsequent frames; settled poses idle.
  useFrame(({ gl, scene, camera }) => {
    if (!active || document.hidden) return
    try {
      animation.current?.frame()
      gl.render(scene, camera)
      if (firstFrame.current) { firstFrame.current = false; queueMicrotask(onReady) }
    } catch { animation.current?.stop(); onFailure() }
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
    {[-.23, .23].map((x, index) => {
      const pose = eyePose(x, .18)
      return <mesh key={x} ref={eye => { eyes.current[index] = eye }} position={pose.position} quaternion={pose.quaternion}>
        <capsuleGeometry args={[.076, .204, 6, 12]} onUpdate={addHappyEyeMorph} />
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
