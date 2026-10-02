/** Welcome-only adaptation of React Bits FluidGlass (David Haz, 2026).
 * Retains its separate scene -> FBO -> MeshTransmissionMaterial technique.
 * A procedural capsule replaces the downloadable GLB; no demo photos, fonts,
 * scrolling, navigation, full-screen canvas, or permanent animation loop.
 * Upstream notice: public/licenses/react-bits.txt.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei/core/MeshTransmissionMaterial'
import { useFBO } from '@react-three/drei/core/Fbo'
import type { WelcomeGlassSceneProps } from './WelcomeGlass'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const fragmentShader = `
  varying vec2 vUv;
  uniform float shift;
  uniform vec3 brown;
  uniform vec3 sand;
  void main() {
    vec2 uv = vUv + vec2(shift * 0.018, 0.0);
    float glow = exp(-pow((uv.x + uv.y * 0.38 - 0.38) * 2.8, 2.0));
    float light = glow * (0.09 + pow(uv.y, 3.0) * 0.14);
    gl_FragColor = vec4(mix(brown, sand, light), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function capsuleGeometry(width: number, height: number) {
  const geometry = new THREE.CapsuleGeometry(height / 2, Math.max(0, width - height), 12, 32)
  geometry.rotateZ(Math.PI / 2)
  // A shallow convex lens catches light across its face, not a stroked rim.
  geometry.scale(1, 1, .55)
  return geometry
}

function GlassScene({ active, onReady, onFailure }: WelcomeGlassSceneProps) {
  const { gl, viewport, invalidate } = useThree()
  const buffer = useFBO(384, Math.max(64, Math.round(384 * viewport.height / viewport.width)), {
    depthBuffer: false, type: THREE.UnsignedByteType,
  })
  const backdrop = useMemo(() => new THREE.Scene(), [])
  // Match the HTML capsule exactly: an inset lens exposed the fallback as a
  // second lower rim. The button clips its canvas and owns the silhouette.
  const geometry = useMemo(() => capsuleGeometry(viewport.width, viewport.height), [viewport.width, viewport.height])
  const uniforms = useMemo(() => ({
    shift: { value: 0 }, brown: { value: new THREE.Color('#302923') }, sand: { value: new THREE.Color('#c6ab8d') },
  }), [])
  const firstFrame = useRef(true)

  useEffect(() => () => { geometry.dispose() }, [geometry])

  useEffect(() => {
    const canvas = gl.domElement
    const button = canvas.closest('button')
    const lost = (event: Event) => { event.preventDefault(); onFailure() }
    const moved = (event: PointerEvent) => {
      if (!active || document.hidden || !button) return
      const box = button.getBoundingClientRect()
      uniforms.shift.value = (event.clientX - box.left) / Math.max(1, box.width) * 2 - 1
      // Coalesced by Fiber; no RAF loop while the button sits idle.
      invalidate()
    }
    const reset = () => { uniforms.shift.value = 0; if (active) invalidate() }
    canvas.addEventListener('webglcontextlost', lost)
    button?.addEventListener('pointermove', moved)
    button?.addEventListener('pointerdown', moved)
    button?.addEventListener('pointerleave', reset)
    button?.addEventListener('pointerup', reset)
    button?.addEventListener('pointercancel', reset)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      button?.removeEventListener('pointermove', moved)
      button?.removeEventListener('pointerdown', moved)
      button?.removeEventListener('pointerleave', reset)
      button?.removeEventListener('pointerup', reset)
      button?.removeEventListener('pointercancel', reset)
    }
  }, [active, gl, invalidate, onFailure, uniforms])

  useFrame(({ camera }) => {
    if (!active || document.hidden) return
    // The same external-buffer technique as the supplied FluidGlass, bounded
    // to this CTA. An explicit buffer avoids a full-size transmission pass.
    const target = gl.getRenderTarget()
    try {
      gl.setRenderTarget(buffer)
      gl.render(backdrop, camera)
    } catch {
      onFailure()
      return
    } finally { gl.setRenderTarget(target) }
    if (firstFrame.current) {
      firstFrame.current = false
      queueMicrotask(onReady)
    }
  }, -1)

  return (
    <>
      {createPortal(
        <mesh position={[0, 0, -1]} scale={[viewport.width * 2, viewport.height * 2, 1]}>
          <planeGeometry />
          <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthTest={false} />
        </mesh>, backdrop,
      )}
      <ambientLight intensity={.4} />
      <mesh geometry={geometry}>
        {/* Keep refraction/depth, not the studio light's long reflected bar.
            The approved top glint and external bloom are authored in CSS. */}
        <MeshTransmissionMaterial buffer={buffer.texture} samples={2} resolution={64}
          transmission={1} thickness={.32} ior={1.18} roughness={.07}
          chromaticAberration={.002} anisotropicBlur={0} distortion={0} temporalDistortion={0}
          color="#f2e7d9" attenuationColor="#c6ab8d" attenuationDistance={4}
          envMapIntensity={0} specularIntensity={0} clearcoat={0} />
      </mesh>
    </>
  )
}

export function FluidGlassButton(props: WelcomeGlassSceneProps) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 5], zoom: 100, near: .1, far: 20 }}
      dpr={[1, 1.5]} frameloop={props.active ? 'demand' : 'never'} fallback={null}
      gl={{ alpha: true, antialias: false, powerPreference: 'low-power', toneMapping: THREE.NoToneMapping }}>
      <GlassScene {...props} />
    </Canvas>
  )
}
