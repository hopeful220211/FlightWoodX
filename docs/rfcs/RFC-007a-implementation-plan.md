# RFC-007a: AR Flight Test — Implementation Plan

**Author**: Claude Code
**Date**: 2026-04-26
**Status**: Draft — Awaiting human review

---

## 1. Current State Analysis

### 1.1 What exists and can be reused

| Asset | Location | Reuse |
|-------|----------|-------|
| Step 6 StepActions with Save + Export buttons | `pages/Design/components/StepActions.tsx` | Add AR button alongside |
| 3D assembled drone rendering | `pages/ExportPreview/HeroSection.tsx` → `AssembledModel` | Extract and reuse for AR flight |
| GLB part loading + scene assembly | `components/design/GLBPart.tsx`, `SceneContent.tsx` | Reuse part rendering |
| R3F Canvas + OrbitControls pattern | Multiple existing components | Reuse Canvas setup |
| Design store + localStorage | `stores/designStore.ts` | Read design data |
| Route structure | `App.tsx` with ProtectedRoute | Add new route |
| ScrollReveal, Button, Toast | Common components | Reuse |

### 1.2 New dependencies needed

**None.** The entire feature uses:
- `navigator.mediaDevices.getUserMedia` — browser native
- React Three Fiber + drei — already installed
- Touch events — browser native
- Fullscreen API — browser native

No physics engine (cannon-es / rapier) needed — self-implemented kinematics per RFC spec.

---

## 2. Per-PR File Change Plan

### PR 1: Step 6 AR Button + Route Shell (~0.5 day)

**Files to change:**
- `apps/web/src/pages/Design/components/StepActions.tsx` — add AR flight button
- `apps/web/src/pages/Design/GuidedDesignPage.tsx` — add handleArFlight handler
- `apps/web/src/App.tsx` — add `/design/ar-flight/:designId` route

**New files:**
- `apps/web/src/pages/ARFlight/ARFlightPage.tsx` — shell ("开发中" placeholder)

### PR 2: Camera + 3D Drone Rendering (~2-3 days)

**New files:**
- `apps/web/src/pages/ARFlight/ARFlightPage.tsx` — full implementation replacing shell
- `apps/web/src/pages/ARFlight/ARBackground.tsx` — camera init + video element + sky fallback
- `apps/web/src/pages/ARFlight/SkyBackground.tsx` — CSS gradient + cloud fallback
- `apps/web/src/pages/ARFlight/DroneScene.tsx` — R3F Canvas + assembled drone with idle hover

### PR 3: Virtual Joysticks (~2 days)

**New files:**
- `apps/web/src/pages/ARFlight/VirtualJoystick.tsx` — touch/mouse joystick component
- `apps/web/src/pages/ARFlight/JoystickOverlay.tsx` — left + right joystick layout

### PR 4: Physics + Flight Control (~2-3 days)

**New files:**
- `apps/web/src/pages/ARFlight/flightPhysics.ts` — DroneState, ControlInput, updatePhysics
- `apps/web/src/pages/ARFlight/FlightController.tsx` — useFrame loop connecting joystick input → physics → 3D position

### PR 5: HUD + Polish (~1-2 days)

**New files:**
- `apps/web/src/pages/ARFlight/HUD.tsx` — altitude indicator, exit button, control hint

**Files to change:**
- `apps/web/src/pages/ARFlight/ARFlightPage.tsx` — integrate HUD, landscape prompt, fullscreen, performance monitor

---

## 3. Decisions Needing Human Input

### Decision 1: Camera facing direction

RFC mentions "前置摄像头" in original brief but recommends "后置" for better pseudo-AR feel (seeing the room, not your face).

**Options:**
- A) `facingMode: 'environment'` — back camera (drone flies in front of you)
- B) `facingMode: 'user'` — front camera (drone overlaid on your face)

**My recommendation**: A — back camera. Drone "in the room" feels much more like AR. Front camera just shows the kid's face with a floating drone, which is confusing.

### Decision 2: Assembled drone rendering approach

For the AR 3D scene, I need to render the full assembled drone. Two approaches:

**Options:**
- A) Extract `AssembledModel` from ExportPreview HeroSection into a shared component, reuse in both places
- B) Copy-paste the rendering code into ARFlight (faster, isolated)

**My recommendation**: A — extract to a shared `components/design/AssembledDrone.tsx`. Used in ExportPreview and ARFlight. Keeps DRY.

### Decision 3: Physics parameter tuning

The RFC provides reference values for MAX_THRUST, LINEAR_DAMPING, etc. These will need hand-tuning.

**My plan**: Implement with the RFC's reference values, expose the 4 key constants at the top of `flightPhysics.ts` with clear comments. You can adjust by changing numbers and refreshing. No UI settings needed.

---

## 4. Risk Identification

| Risk | Severity | Mitigation |
|------|----------|-----------|
| iOS Safari camera permission flow requires HTTPS | High | localhost works in dev; production is Vercel (HTTPS by default) |
| Multi-touch on iOS Safari needs `passive: false` + `preventDefault` | High | Set touch-action: none on joystick container; test on real iPad |
| Video element z-index conflict with R3F Canvas | Medium | Video as HTML element behind Canvas (CSS z-index), Canvas with `alpha: true` transparent bg |
| Performance: rendering all GLB parts + camera video + physics loop | Medium | DPR capped at [1, 1.5]; parts already pre-loaded; frame budget ~16ms is feasible |
| Camera stream not cleaned up → battery drain + privacy | High | Strict useEffect cleanup; stream.getTracks().forEach(t => t.stop()) |
| Physics doesn't "feel right" first try | High | Expose tuning constants; plan for 2-3 iteration rounds |

---

**Ready for review. Once confirmed, I start PR 1.**
