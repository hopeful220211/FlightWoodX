# RFC-008: Code Merge Report

**Author**: Claude Code
**Date**: 2026-04-27
**Status**: Draft — Awaiting human review

---

## 1. ZIP Contents Summary

### ZIP 1: 预览页面 (Preview)
- **14 source files** (1,929 lines total)
- **94 GLB models** in 4 Chinese-named folders (主板件/起落架/保护板/连接件)
- **94 PNG thumbnails**
- **Core page**: `PreviewPage.tsx` (303 lines) — flight simulation with dual joysticks, telemetry, battery

### ZIP 2: 飞机模型诊断报告 (Diagnosis)
- **11 source files** (1,546 lines total)
- **94 GLB models** (identical set to Preview)
- **94 PNG thumbnails** (identical set to Preview)
- **Core page**: `DiagnosisReportPage.tsx` (370 lines) — design validation, symmetry checking, multi-view screenshots

### New Part Count: 94 (was 77)
- 主板件 (mainboards): 16 (was 9)
- 起落架 (landings/arms): 39 (was 35)
- 保护板 (guards/joints): 28 (was 12)
- 连接件 (decos): 11 (was 9)

---

## 2. Per-File Comparison

### 2.1 parts.ts — Parts Data

| Dimension | Collaborator | Current | Recommendation |
|---|---|---|---|
| Part count | 94 parts, 4 categories | 77 parts, 6 categories | **Use collaborator** |
| Categories | core/arm/joint/deco | HUB/ARM/PLATE/JOINT/LAND/DECO | **Remap to RFC-008 4-category scheme** |
| Weights | 1-5g (realistic) | 3-15g (inflated) | **Use collaborator** (matches 35g limit) |
| Model paths | `/models/{中文folder}/{id}.glb` | `/models/{id}.glb` (flat) | **Adopt structure, rename folders to English** |
| Thumbnails | 94 PNGs | 77 PNGs | **Use collaborator** (more complete) |
| Format | Array of Part objects | Registry-derived via @fwx/parts-schema | **Merge: use collaborator data, feed into our registry** |

### 2.2 PreviewPage.tsx — Flight Preview (vs our ARFlightPage)

| Dimension | Collaborator | Current (RFC-007) | Recommendation |
|---|---|---|---|
| Joystick | JoystickPad (pointer capture, circular clamp) | VirtualJoystick (touch identifier, similar) | **Merge**: our multi-touch is better, their pointer capture is cleaner |
| Physics | DesignFlightPreview3D (acceleration, velocity decay) | flightPhysics.ts (acceleration + damping + visual tilt) | **Keep ours**: more complete (height clamp, speed cap, tilt) |
| Camera | Video background toggle | Camera background with sky fallback | **Keep ours**: graceful fallback is better |
| Telemetry | Altitude (cm), speed (%), battery (%) | Altitude (m) only | **Adopt collaborator's battery + speed** |
| UI | Dark gradient, glass-morphism joysticks | Similar dark + HUD overlay | **Merge**: take their telemetry display, keep our HUD structure |

### 2.3 DiagnosisReportPage.tsx — Diagnosis (vs our ExportPreviewPage)

| Dimension | Collaborator | Current (RFC-006) | Recommendation |
|---|---|---|---|
| Validation rules | 4 rules (core count, arm count/symmetry, joint count/symmetry) | 9 checks (export-focused) | **Adopt collaborator** for assembly rules, **keep ours** for export checks |
| Symmetry checking | Custom algorithm with x-axis mirror + tolerance | Basic center-of-mass offset | **Adopt collaborator**: proper mirror-pair detection |
| Screenshots | Multi-view capture (main, top, side) via window global | None | **Adopt collaborator**: useful for export/diagnosis |
| UI | Dark theme, modal with screenshot grid | Light theme, scrollable page with 6 sections | **Keep ours for export page**, adopt screenshot capture as diagnostic tool |
| Export | JSON download | ZIP with .dxf files | **Keep ours**: more complete export pipeline |

### 2.4 designStore.ts — State Management

| Dimension | Collaborator | Current | Recommendation |
|---|---|---|---|
| Part categories | core/arm/joint/deco | HUB/ARM/PLATE/JOINT/LAND/DECO | **Align to RFC-008 4-category scheme** |
| Connection rules | isConnectionAllowed: joint→arm only | All connections allowed | **Adopt collaborator**: category-based restrictions |
| addPartSmart | Complex socket finding + snap transform | Similar but less restrictive | **Merge**: use collaborator's category restrictions, keep our snap logic |
| Persistence migration | Maps old part IDs to new | No migration | **Adopt collaborator**: needed for asset restructure |
| Guided flow fields | Not present (buildMode, currentStep, stepReached) | Present | **Keep ours**: guided flow is established |

### 2.5 types/design.ts

| Dimension | Collaborator | Current | Recommendation |
|---|---|---|---|
| Design interface | Basic (id, name, updatedAt, parts) | Extended (buildMode, currentStep, stepReached, safetyCheck, exportedAt) | **Keep ours**: superset |
| Part interface | Basic (no partNumber, no layer, no tags) | Extended (partNumber, category as PartCategory, layer, tags) | **Keep ours**: superset |
| PartInstance | Same core fields | Same + category field | **Keep ours** |

### 2.6 New Components (not in current codebase)

| Component | Source | Recommendation | Reason |
|---|---|---|---|
| `JoystickPad.tsx` | Preview | **Skip** | Our VirtualJoystick already covers this with multi-touch |
| `DesignFlightPreview3D.tsx` | Preview | **Extract battery/telemetry logic** into our FlightController | Physics is simpler than ours |
| `DesignCapturePreview3D.tsx` | Diagnosis | **Adopt** | Screenshot capture is new functionality |
| `ScreenshotCapture.tsx` | Diagnosis | **Adopt** | Multi-view screenshots useful for diagnosis |
| `Modal.tsx` (collaborator) | Diagnosis | **Skip** | We already have Modal.tsx |
| `window.d.ts` | Diagnosis | **Adopt** | TypeScript declarations for screenshot capture |
| `snap.ts` (collaborator) | Preview | **Compare with ours** | Same core function, may have fixes |

### 2.7 GLB Assets

| Dimension | Collaborator | Current | Recommendation |
|---|---|---|---|
| Count | 94 models | 77 models (+ some overlap) | **Use collaborator set** |
| Folder structure | 4 Chinese folders | Flat | **Adopt structure, rename to English** |
| File naming | Same convention (core_hub_XX, arm_XX, etc.) | Same | Compatible |
| New models | core_hub_10-16, arm_36-39, joint_25-41, deco_10-11 | Not present | **Add all new models** |

---

## 3. Final Decision Table

### Completely adopt collaborator code
- [x] `parts.ts` data (94 parts, realistic weights) — remap into our registry
- [x] `ScreenshotCapture.tsx` + `DesignCapturePreview3D.tsx` — new diagnostic capability
- [x] `window.d.ts` — TypeScript declarations for screenshots
- [x] All 94 GLB models + 94 PNG thumbnails — more complete asset set
- [x] Symmetry checking algorithm from DiagnosisReportPage — proper mirror detection
- [x] Category-based connection rules from designStore — `isConnectionAllowed()`

### Completely keep current code
- [x] `types/design.ts` — our version is a superset
- [x] `designStore.ts` — our version has guided flow, clearAll, etc.
- [x] `ARFlightPage` + `flightPhysics.ts` + `VirtualJoystick` — our AR flight is more complete
- [x] `ExportPreviewPage` + all 6 sections — our export pipeline is more complete
- [x] `Button.tsx`, `Modal.tsx`, `EmptyState.tsx` — our versions already work
- [x] `usePartConnectors.ts` — same logic, ours is deployed and tested
- [x] All homepage sections (RFC-005) — not touched by collaborator

### Need fusion
- [x] **Parts registry** (`@fwx/parts-schema`): adopt collaborator's 94-part data + weights, feed into our existing registry/schema system, use English folder names
- [x] **Connection rules**: adopt collaborator's `isConnectionAllowed()` category restrictions, integrate into our designStore's `addPartSmart()`
- [x] **Validation rules**: merge collaborator's assembly rules (count, symmetry) into our `exportChecks.ts`, add as pre-flight checks too
- [x] **Telemetry**: extract collaborator's battery + speed display concept, add to our HUD.tsx in AR flight

---

## 4. Folder Rename Proposal

Per RFC-008 §3.2.1, Chinese folder names are a production risk. Proposed mapping:

| Current (collaborator) | Proposed (English) | Content |
|---|---|---|
| `主板件/` | `mainboards/` | core_hub_01 – core_hub_16 |
| `起落架/` | `landings/` | arm_01 – arm_39 |
| `保护板/` | `guards/` | joint_01 – joint_41 |
| `连接件/` | `joints/` | deco_01 – deco_11 |

**Note**: The collaborator uses "arm" for landings and "joint" for guards — this is a naming confusion that needs explicit mapping in the registry.

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Part ID collision during migration (old 77 → new 94) | High | Map old IDs to new, handle missing gracefully |
| Existing designs in localStorage reference old paths | High | Migration script in designStore persist middleware |
| Weight rescaling breaks existing export checks | Medium | Update all threshold constants after rescale |
| Chinese folder names if not renamed | Medium | Strongly recommend English names |
| 17 new models not tested in current snap system | Medium | Verify connectors extracted correctly for all 94 |

---

**Awaiting your review. Key questions:**

1. **Do you approve renaming folders to English?** (mainboards/landings/guards/joints)
2. **The collaborator calls "arm" files 起落架 (landings) and "joint" files 保护板 (guards)** — this remaps our old categories. Should I follow the collaborator's naming or keep our old category names?
3. **Should the screenshot capture feature go into the export preview page or remain a standalone diagnostic tool?**
