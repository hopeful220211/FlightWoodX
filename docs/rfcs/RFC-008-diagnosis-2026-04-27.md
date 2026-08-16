# RFC-008 Diagnosis Report — 2026-04-27

## Diagnosis 1: Rollback Cleanliness

### SocketHighlights.tsx — CLEAN ✅
- No `nearby`, `snapped`, `hidden`, `available`, `SnapState` strings
- No `accent-sky`, `accent-gold`, `accent-leaf` colors
- Uses 2-state system: `isHighlighted` (wood-500) vs normal (wood-400 pulse)
- Has rotating ring animation on highlighted state (line 152: `ringRef.current.rotation.z = time * 2`)
- **Pulse animation on non-highlighted sockets** (line 160): `sin(time * 3)` oscillates emissive intensity 0.3–0.9 and opacity 0.4–0.6

**About the "flickering"**: This is NOT a PR 5 residual. It's the pulse animation from PR 2's `SocketIndicator` (line 160). The `sin(time * 3)` makes non-highlighted sockets blink at ~3Hz. This is by design — it was intended as "gentle pulse" but may be perceived as flickering.

### ThreeCanvas.tsx — CLEAN ✅
- Single threshold: `SOCKET_HIGHLIGHT_THRESHOLD = 50` (line 114)
- Zero matches for: `snapped`, `nearby`, `proximity`, `SNAP_PIXEL`, `NEARBY_PIXEL`
- `require()` calls removed, replaced with top-level `import { checkBeforeAdd }`

### designStore.ts — CLEAN ✅
- `highlightedSocket: { instanceId: string; socketId: string; plugId: string } | null`
- No `proximity` field

### MirrorSuggestion — CLEAN ✅
- File deleted
- Zero references to `fwx-part-placed` or `MirrorSuggestion` in codebase

**Verdict: Rollback is 100% clean. No PR 5 residual.**

---

## Diagnosis 2: Drag Preview Card Background

### Current implementation (StepPartPanel.tsx lines 79-95)
```tsx
onDragStart={(e) => {
  e.dataTransfer.setData('text/plain', part.id)
  e.dataTransfer.effectAllowed = 'move'
  if (part.thumbnailUrl) {
    const ghost = document.createElement('img')
    ghost.src = part.thumbnailUrl          // e.g. "/thumbnails/core_hub_01.png"
    ghost.style.width = '64px'
    ghost.style.height = '64px'
    ghost.style.position = 'fixed'
    ghost.style.top = '-200px'
    ghost.style.left = '-200px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 32, 32)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }
  onPartDragStart(part.id)
}}
```

### Why it might still show card background

The `setDragImage` API has a known browser quirk: **the image element must be fully loaded before `setDragImage` is called**. The offscreen `ghost` img is created with `ghost.src = url` but `setDragImage` is called synchronously — if the browser hasn't loaded/decoded the image by that point, some browsers fall back to the default drag image (the entire dragged element = the card div with white background, border, padding).

The thumbnail PNGs are already loaded in the page (they're visible in the parts grid). But the **new offscreen ghost element** is a fresh `<img>` that hasn't loaded yet.

### Root cause
**Race condition**: `setDragImage(ghost)` is called before `ghost` has loaded its image data. Browser falls back to default (card snapshot).

### Fix options

**Option A: Pre-load ghost images on component mount**
- On mount, create an offscreen img for each part and keep in a Map
- On dragStart, use the pre-loaded img
- Pro: simple, reliable
- Con: 94 offscreen img elements on mount (memory cost negligible)

**Option B: Use the already-rendered `<img>` but detach from card context**
- Clone the existing img element, position offscreen, use as drag image
- Pro: image already loaded
- Con: still may capture parent styling

**Option C (RFC §6.1.3 方案 B): Custom drag overlay (no HTML5 drag API)**
- Replace HTML5 drag with onPointerDown/Move/Up
- Show a floating `<div>` following cursor with the thumbnail
- Pro: full control, guaranteed no card chrome
- Con: ~50 lines of code, need to handle drop target detection manually
- Estimated work: 0.5 day

**Recommendation: Option A** (pre-load). Simplest fix, addresses the exact root cause.

---

## Diagnosis 3: Step 1-6 Flow

I cannot interact with a browser from CLI. However, based on code analysis:

### Step 1 (HUB → mainboard)
- **Parts shown**: 16 mainboard parts ✅
- **Click to add**: Goes through `handlePartClick` → `checkBeforeAdd` → `addPartSmart` ✅
- **Drag to add**: Goes through ThreeCanvas `handleDrop` → `checkBeforeAdd` (now proper import) → snap logic ✅
- **Potential issue**: First mainboard placed at origin (no snap needed). Second mainboard requires snap to existing part.

### Step 2 (ARM → landing)
- **Parts shown**: 39 landing parts ✅
- **Connection rule**: `isConnectionAllowed('landing', 'mainboard') = true` ✅
- **Socket highlights**: Only mainboard sockets light up ✅
- **Potential issue**: Socket pulse animation (sin wave) may look like flickering

### Step 3 (GUARD → guard)
- **Parts shown**: 28 guard parts ✅ (sub-type selector removed)
- **Connection rule**: `isConnectionAllowed('guard', 'landing') = true` ✅
- **canAdvanceStep**: Requires count ∈ {1, 2, 4} ✅

### Step 4 (DECO → joint, optional)
- **Parts shown**: 11 joint parts ✅
- **Connection rule**: `isConnectionAllowed('joint', 'mainboard') = true` ✅
- **canAdvanceStep**: Always true (optional) ✅

### Step 5 (REVIEW)
- **Parts shown**: None (check step) ✅
- **canAdvanceStep**: Always true ✅

### Step 6 (MOTOR — auto-install)
- **MotorInstallStep animation**: 4-phase sequence ✅
- **Potential issue**: After REVIEW → MOTOR transition, does `advanceStep()` work? Need to verify `getNextStep('REVIEW')` returns `'MOTOR'`.

### Known code-level issue
`getNextStep` in compatibility.ts:
```ts
export function getNextStep(currentStep: BuildStep): BuildStep | null {
  const idx = BUILD_STEPS.indexOf(currentStep)
  if (idx === -1 || idx >= BUILD_STEPS.length - 1) return null
  return (BUILD_STEPS[idx + 1] as BuildStep | undefined) ?? null
}
```
BUILD_STEPS = `['HUB', 'ARM', 'GUARD', 'DECO', 'REVIEW', 'MOTOR']`
- getNextStep('REVIEW') → 'MOTOR' ✅
- getNextStep('MOTOR') → null (end) ✅

---

## Summary: Prioritized Issue List

| # | Issue | Severity | Root cause | Fix effort |
|---|-------|----------|-----------|-----------|
| 1 | ~~Drop not working~~ | ~~P0~~ | ~~`require()` in ESM~~ | ~~Fixed (import)~~ |
| 2 | Drag preview shows card background | P1 | `setDragImage` race: offscreen img not loaded yet | 0.5h (pre-load approach) |
| 3 | Socket points "flicker" | P2 | By-design pulse animation `sin(time*3)`, NOT a PR 5 residual | 10min (reduce or remove pulse) |
| 4 | Commit not pushed yet | P0 | require→import fix + offscreen ghost fix still uncommitted | 1min |

**Recommended fix order**: #4 (push) → #2 (pre-load ghost) → #3 (calm pulse)
