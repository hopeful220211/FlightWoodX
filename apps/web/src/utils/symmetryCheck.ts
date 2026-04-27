/**
 * Symmetry detection algorithm.
 * Adapted from collaborator's DiagnosisReportPage.tsx.
 *
 * Checks X-axis mirror symmetry: for each part not on the center plane,
 * there should be a matching part of the same type at the mirrored X position.
 */

interface PartPosition {
  partId: string
  position: [number, number, number]
}

const EPS_X = 0.02
const EPS_YZ = 0.02

/**
 * Check if a set of part instances are symmetric about the X-axis center plane.
 * The center plane is calculated from the mean X position of all parts.
 */
export function checkSymmetry(parts: PartPosition[], centerX?: number): {
  isSymmetric: boolean
  asymmetricCount: number
  score: number
} {
  if (parts.length <= 1) return { isSymmetric: true, asymmetricCount: 0, score: 100 }

  const planeX = centerX ?? parts.reduce((sum, p) => sum + p.position[0], 0) / parts.length
  const used = new Array(parts.length).fill(false)
  let asymmetricCount = 0

  for (let i = 0; i < parts.length; i++) {
    if (used[i]) continue
    const [x, y, z] = parts[i].position

    // Part on center plane — symmetric by definition
    if (Math.abs(x - planeX) <= EPS_X) {
      used[i] = true
      continue
    }

    // Look for mirror partner
    const targetX = 2 * planeX - x
    let match = -1
    for (let j = i + 1; j < parts.length; j++) {
      if (used[j]) continue
      if (parts[j].partId !== parts[i].partId) continue // same part type required
      const [x2, y2, z2] = parts[j].position
      if (Math.abs(x2 - targetX) <= EPS_X && Math.abs(y2 - y) <= EPS_YZ && Math.abs(z2 - z) <= EPS_YZ) {
        match = j
        break
      }
    }

    if (match === -1) {
      asymmetricCount++
    } else {
      used[i] = true
      used[match] = true
    }
  }

  const score = parts.length > 0
    ? Math.max(0, Math.round((1 - asymmetricCount / parts.length) * 100))
    : 100

  return { isSymmetric: asymmetricCount === 0, asymmetricCount, score }
}

/**
 * Check symmetry for a specific category of parts.
 * Uses X=0 as center plane (origin-centered designs).
 */
export function checkCategorySymmetry(
  parts: PartPosition[],
): boolean {
  return checkSymmetry(parts, 0).isSymmetric
}
