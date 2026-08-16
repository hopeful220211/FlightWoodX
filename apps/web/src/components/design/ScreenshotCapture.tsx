import { useCallback, useEffect } from 'react'
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

  const captureScreenshot = useCallback((captureCamera: THREE.Camera = camera): string => {
    if (!gl) return ''
    gl.render(scene, captureCamera)
    return gl.domElement.toDataURL('image/png')
  }, [camera, gl, scene])

  const captureView = useCallback((position: THREE.Vector3, target: THREE.Vector3): string => {
    if (!gl || !(camera instanceof THREE.PerspectiveCamera)) return captureScreenshot()

    const captureCamera = camera.clone()
    captureCamera.position.copy(position.clone().multiplyScalar(0.35))
    captureCamera.fov = 38
    captureCamera.updateProjectionMatrix()
    captureCamera.lookAt(target)
    return captureScreenshot(captureCamera)
  }, [camera, captureScreenshot, gl])

  const captureAllViews = useCallback((): { main: string; top: string; side: string } => {
    let main = ''
    if (gl && camera instanceof THREE.PerspectiveCamera) {
      const captureCamera = camera.clone()
      const dir = new THREE.Vector3()
      captureCamera.getWorldDirection(dir)
      captureCamera.position.sub(dir.multiplyScalar(1.6))
      captureCamera.fov = 20
      captureCamera.updateProjectionMatrix()
      main = captureScreenshot(captureCamera)
    } else {
      main = captureScreenshot()
    }

    const top = captureView(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 0, 0))
    const side = captureView(new THREE.Vector3(2, 0, 0), new THREE.Vector3(0, 0, 0))

    return { main, top, side }
  }, [camera, captureScreenshot, captureView, gl])

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).captureScreenshots = captureAllViews
    return () => {
      delete (window as unknown as Record<string, unknown>).captureScreenshots
    }
  }, [captureAllViews])

  return null
}
