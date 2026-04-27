import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Non-rendering R3F component that exposes multi-view screenshot capture
 * via window.captureScreenshots. Place inside a <Canvas>.
 *
 * From collaborator (diagnosis ZIP). Not integrated into any UI yet —
 * will be used in export preview (RFC-006) or diagnosis report (PR 6+).
 */
export function ScreenshotCapture() {
  const { gl, camera, scene } = useThree()

  const captureScreenshot = (): string => {
    if (!gl) return ''
    gl.render(scene, camera)
    return gl.domElement.toDataURL('image/png')
  }

  const captureView = (position: THREE.Vector3, target: THREE.Vector3): string => {
    if (!gl || !(camera instanceof THREE.PerspectiveCamera)) return captureScreenshot()

    const origPos = camera.position.clone()
    const origQuat = camera.quaternion.clone()
    const origFov = camera.fov

    camera.position.copy(position.clone().multiplyScalar(0.35))
    camera.fov = 38
    camera.updateProjectionMatrix()
    camera.lookAt(target)

    const dataUrl = captureScreenshot()

    camera.position.copy(origPos)
    camera.quaternion.copy(origQuat)
    camera.fov = origFov
    camera.updateProjectionMatrix()

    return dataUrl
  }

  const captureAllViews = (): { main: string; top: string; side: string } => {
    let main = ''
    if (gl && camera instanceof THREE.PerspectiveCamera) {
      const origPos = camera.position.clone()
      const origQuat = camera.quaternion.clone()
      const origFov = camera.fov

      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      camera.position.sub(dir.multiplyScalar(1.6))
      camera.fov = 20
      camera.updateProjectionMatrix()
      main = captureScreenshot()

      camera.position.copy(origPos)
      camera.quaternion.copy(origQuat)
      camera.fov = origFov
      camera.updateProjectionMatrix()
    } else {
      main = captureScreenshot()
    }

    const top = captureView(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 0))
    const side = captureView(new THREE.Vector3(2, 0, 0), new THREE.Vector3(0, 0, 0))

    return { main, top, side }
  }

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).captureScreenshots = captureAllViews
    return () => {
      delete (window as unknown as Record<string, unknown>).captureScreenshots
    }
  })

  return null
}
