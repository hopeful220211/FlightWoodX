# RFC-001: Guided Build Flow Implementation

**Author**: Claude Code
**Date**: 2026-04-21
**Status**: Draft — Awaiting human review

---

## 1. Summary

Refactor the Design Workspace from free-form drag-and-drop to a 6-step guided build flow, per `docs/02-guided-build-flow.md`. This RFC covers the technical architecture, key decisions, and implementation plan.

---

## 2. Current State Analysis

### What we have (reusable)

| Component | Location | Reuse level |
|-----------|----------|-------------|
| ThreeCanvas | `components/design/ThreeCanvas.tsx` | Keep as-is, single shared Canvas |
| GLBPart | `components/design/GLBPart.tsx` | Keep, renders placed parts |
| snap.ts | `components/design/snap.ts` | Keep, compute snap transforms |
| usePartConnectors | `hooks/usePartConnectors.ts` | Keep, extract connectors from GLB |
| SocketHighlights | `components/design/SocketHighlights.tsx` | Adapt for step-aware highlighting |
| SceneContent | `components/design/SceneContent.tsx` | Adapt for step-aware part rendering |
| Static thumbnails | `public/thumbnails/` | Keep for part cards |
| designStore (partial) | `stores/designStore.ts` | Keep CRUD methods, replace flow logic |

### What must be rewritten

| Component | Reason |
|-----------|--------|
| DesignPage left panel | Needs step-aware part filtering + step UI |
| DesignPage right panel | Needs step guide + real-time checks |
| designStore flow logic | `addPartSmart()` needs step validation; add state machine |
| `data/parts.ts` categories | Must migrate from old 7-category to new 6-category system |
| `types/design.ts` | Add `buildMode`, `stepReached`, new `PartInstance` fields |

---

## 3. Architecture Decisions

### 3.1 State Machine: Zustand + plain reducer (no XState)

**Decision**: Use a step-based reducer inside the existing Zustand designStore, instead of introducing XState.

**Rationale**:
- The flow is strictly linear (6 steps, forward/back), not a complex graph.
- XState adds ~15 KB and a new paradigm the codebase doesn't use.
- Zustand is already proven in this codebase.
- Step transitions are simple: validate condition → advance `currentStep`.

**Implementation**:
```ts
// Inside designStore
interface GuidedBuildState {
  buildMode: 'guided' | 'free'
  currentStep: BuildStep  // 'HUB' | 'ARM' | 'MOTOR' | 'GUARD' | 'DECO' | 'REVIEW'
  stepReached: number     // 0-6, tracks highest step reached
  canAdvance: () => boolean
  advance: () => void
  goBack: () => void
}
```

### 3.2 Parts data: Migrate to registry-based approach

**Decision**: Create a `PART_REGISTRY` in `@fwx/parts-schema` that maps `FW-XXX-NNN` IDs to GLB files and metadata, replacing the hardcoded `partsData` array.

**Why**: 
- Single source of truth for both frontend and backend.
- Aligns with `docs/03-parts-system.md` spec.
- Enables type-safe category filtering per step.

**Shape**:
```ts
// packages/parts-schema/src/registry.ts
export interface PartEntry {
  partNumber: string           // 'FW-HUB-001'
  category: PartCategory       // 'HUB'
  name: { zh: string; en: string }
  glbFile: string              // 'core_hub_01.glb'
  thumbnailFile: string        // 'core_hub_01.png'
  weight: number               // grams
  layer?: 'single' | 'double' // HUB only
  snapPointCount: number       // how many connections it offers
  tags: string[]
}
```

### 3.3 Step ↔ Category mapping

```ts
const STEP_CATEGORIES: Record<BuildStep, PartCategory[]> = {
  HUB:   ['HUB'],
  ARM:   ['ARM'],
  MOTOR: ['MOTOR', 'PROP'],
  GUARD: ['PLATE', 'JOINT', 'LAND'],
  DECO:  ['DECO'],
  REVIEW: [],
}
```

### 3.4 Symmetric arm installation

**Decision**: When a user selects an ARM model, the system auto-installs it on all unoccupied snap points that share a `mirrorOf` relationship.

**Implementation**:
1. User picks ARM model from catalog.
2. System finds all available `arm-mount` snap points on the HUB.
3. Snap points are grouped by mirror pairs.
4. User clicks one snap point → ARM placed on that point AND its mirror partner simultaneously.
5. If odd number of snap points (e.g., 3-arm hub), each click places one ARM.

### 3.5 Guard selection (Step 4): Three sub-types

Step 4 first shows 3 type-cards (PLATE / JOINT / LAND), then expands to show specific models within the chosen type. This is a two-level selection within a single step.

### 3.6 DECO step auto-skip

If the selected HUB has `layer: 'single'`, the DECO step is automatically skipped and `currentStep` advances directly from GUARD to REVIEW.

### 3.7 Free mode unlock

Track `completedBuilds` on the user model. When `completedBuilds >= 1`, show a toggle in the Design page header: "Guided / Free". Free mode unlocks all categories simultaneously and removes step constraints.

---

## 4. Data Model Changes

### 4.1 Frontend `Design` type (apps/web/src/types/design.ts)

```ts
export interface Design {
  id: string
  name: string
  thumbnail?: string
  updatedAt: string
  buildMode: 'guided' | 'free'
  stepReached: number            // 0-6
  parts: PartInstance[]
  safetyCheck?: SafetyCheck
}

export interface PartInstance {
  instanceId: string
  partId: string                 // Now uses FW-XXX-NNN format
  category: PartCategory
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
  attachedTo?: {
    parentInstanceId: string
    parentConnectorId: string
  } | null
}

export interface SafetyCheck {
  totalWeightG: number
  centerOfMassOffset: number     // mm deviation from geometric center
  thrustToWeightRatio: number
  symmetryScore: number          // 0-1
  level: 'green' | 'yellow' | 'red'
}
```

### 4.2 Backend: No immediate DB changes needed

The guided build flow is entirely frontend logic for now. Parts are stored in localStorage via designStore persist. Backend persistence (projects collection) is a separate follow-up task (Week 7-8 per audit plan).

---

## 5. Component Architecture

```
pages/Design/
├── DesignPage.tsx                    # Orchestrator, mode switch
├── GuidedDesignPage.tsx              # New: guided mode layout
├── FreeDesignPage.tsx                # Existing logic, wrapped
└── components/
    ├── StepProgressBar.tsx           # Top progress indicator
    ├── StepPanel.tsx                 # Left panel, step-aware parts
    ├── StepGuide.tsx                 # Right panel, instructions + checks
    ├── StepActions.tsx               # Bottom bar (back/reset/next)
    ├── steps/
    │   ├── HubStep.tsx              # Step 1 specific UI
    │   ├── ArmStep.tsx              # Step 2 with symmetric logic
    │   ├── MotorStep.tsx            # Step 3 (visual-only electronics)
    │   ├── GuardStep.tsx            # Step 4 with sub-type selection
    │   ├── DecoStep.tsx             # Step 5 (skippable)
    │   └── ReviewStep.tsx           # Step 6 with safety check
    └── shared/
        ├── PartCard.tsx             # Thumbnail card (img, not Canvas)
        ├── PartDetailModal.tsx      # 3D preview on click
        └── CompatibilityEngine.ts   # Rule checker
```

---

## 6. Implementation Plan (ordered by dependency)

### Phase 1: Data Foundation (2 days)

1. **Parts registry**: Create `packages/parts-schema/src/registry.ts` mapping all 76 GLB files to FW-XXX-NNN IDs with categories.
2. **Migrate `data/parts.ts`**: Replace old categories with new ones; use registry as source.
3. **Update types**: Extend `Design` and `PartInstance` with guided-mode fields.

### Phase 2: State Machine + Store (2 days)

4. **Add guided state to designStore**: `buildMode`, `currentStep`, `stepReached`, `canAdvance()`, `advance()`, `goBack()`.
5. **Step validation rules**: `canAdvance()` checks completion conditions per step.
6. **Compatibility engine**: `packages/parts-schema/src/compatibility.ts`.

### Phase 3: UI Components (3-4 days)

7. **StepProgressBar**: Visual step indicator.
8. **GuidedDesignPage** layout: Three-column with step-aware panels.
9. **Step-specific panels** (HubStep through ReviewStep): Part filtering, guides, actions.
10. **PartCard + PartDetailModal**: Thumbnail-based cards with modal 3D preview.

### Phase 4: 3D Integration (2-3 days)

11. **Symmetric arm placement**: Auto-mirror logic using snap point `mirrorOf` data.
12. **Step-aware SocketHighlights**: Only highlight snap points relevant to current step.
13. **Guard animation**: Fly-in animation when placing guard (nice-to-have).

### Phase 5: Review & Polish (2 days)

14. **Safety check engine** (Step 6): Weight, CoM, thrust/weight, symmetry calculations.
15. **Free mode toggle** + routing (`/design/guided` vs `/design/free`).
16. **Tests**: Unit tests for compatibility engine + state transitions.

**Total estimated**: ~2-3 weeks (aligns with CLAUDE.md timeline).

---

## 7. Questions & Decisions Needing Human Input

### Q1: Snap point metadata source

Currently, snap points are extracted from GLB model object names at runtime (naming convention: `SOCKET_*`, `PLUG_*`). The spec calls for `.meta.json` files alongside each GLB.

**Options**:
- A) Keep runtime extraction from GLB (already works, no extra files needed)
- B) Create `.meta.json` for each GLB with snap points, weight, layer info (more explicit, enables backend validation)
- C) Hybrid: runtime extraction for positions + static `.meta.json` for weight/layer/mirrorOf

**My recommendation**: C — runtime extraction is proven for positions; add a lightweight registry JSON for metadata that can't be derived from the model (weight, layer, mirror relationships).

### Q2: Mirror relationships for symmetric arm placement

Current GLB models don't encode which snap points are mirrors of each other. We need this data for auto-symmetric placement.

**Options**:
- A) Infer from geometry: snap points at mirrored positions (relative to center) are mirrors
- B) Manually define in registry/meta.json
- C) Both: infer by default, allow manual override

**My recommendation**: A — since HUBs are symmetric by design, geometric inference (position mirrored across center) should work for all 9 hub models.

### Q3: MOTOR/PROP step — visual representation

The spec says motors/props are NOT GLB models. How should they appear in the 3D scene?

**Options**:
- A) Simple Three.js cylinder (motor) + flat disc (prop) with color
- B) Low-poly embedded mesh (a single reusable GLB for motor+prop)
- C) 2D icon overlay on the arm tip (not 3D, just screen-space annotation)

**My recommendation**: A — simple primitives are lightweight, visually clear, and communicate "this isn't a wood piece" to students.

### Q4: Progressive rollout

Should existing users see the new guided mode immediately, or phase in?

**Options**:
- A) All new designs default to guided; old designs stay in free mode
- B) Feature flag: admin can toggle globally
- C) Based on `completedBuilds`: 0 → forced guided, >=1 → choice

**My recommendation**: A for launch, then add C later. Simplest to ship.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Mirror inference fails for asymmetric hubs | Arms placed incorrectly | Add manual override in registry; validate all 9 hubs at dev time |
| Step validation too strict for edge cases | Kids get stuck | Every step has a "skip" escape hatch (disabled in classroom mode) |
| Performance with 35 ARM thumbnails | Slow step 2 rendering | Already solved: static PNG thumbnails, no WebGL |
| Data migration breaks existing designs | Users lose saved work | Old designs keep `buildMode: 'free'`; migration is additive only |

---

## 9. Out of Scope (for this RFC)

- Backend persistence of projects (separate task, Week 7-8)
- BOM generation (follow-up RFC)
- Mobile/tablet layout
- Teacher classroom controls
- Animation/VFX polish beyond basic fly-in

---

## 10. Success Criteria

1. A new user can complete a full 6-step build in < 10 minutes without teacher intervention.
2. Zero WebGL context warnings during the entire flow.
3. All 76 parts correctly categorized and filterable by step.
4. Symmetric arm placement works for all 9 hub models.
5. Safety check produces meaningful scores for all valid configurations.
6. Existing free-mode designs remain accessible and editable.
