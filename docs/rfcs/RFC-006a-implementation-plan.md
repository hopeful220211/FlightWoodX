# RFC-006a: Export Preview Page — Implementation Plan

**Author**: Claude Code
**Date**: 2026-04-26
**Status**: Draft — Awaiting human review

---

## 1. Current State Analysis

### 1.1 Step 6 (REVIEW) — what exists

| Component | Current | Gap |
|-----------|---------|-----|
| `StepPartPanel.tsx` | Static text "检查你的无人机设计，确认后保存" | No review metrics |
| `StepActions.tsx` | Single green "完成并保存" button | Needs split into Save + Save & Export |
| `GuidedDesignPage.tsx` | Calls `advanceStep()` on REVIEW which returns null | No save/export logic |
| `designStore.ts` | No save/export methods; localStorage only via Zustand persist | Needs save action |
| `Design` type | No `exportedAt`, no `status` field | Needs extension |
| Routes | Only `/design` | Needs `/design/export-preview/:designId` |
| API | Design CRUD exists (`GET/POST/PATCH/DELETE /designs`) but designs aren't actually saved to backend from guided flow | Need to wire up |

### 1.2 Reusable pieces

- **3D viewer**: `HeroDrone3D.tsx` from homepage has auto-rotate + OrbitControls + performance fallback — can adapt for export preview hero
- **ScrollReveal**: already built, reuse for section entry animations
- **Button component**: fixed in previous PRs, supports `rightIcon`, `whitespace-nowrap`
- **Design tokens**: ink/paper/accent/wood colors + DingTalk JinBuTi font all ready
- **Parts registry**: `@fwx/parts-schema` has `PART_REGISTRY` with weight, category, names
- **Existing thumbnails**: `public/thumbnails/*.png` for all 77 parts

### 1.3 Backend reality check

Currently designs live **only in localStorage**. The backend has no `designs` collection or model. The API functions in `api.ts` (`getUserDesigns`, `createDesign`, etc.) exist but the **backend routes don't** — they were written speculatively.

For PR 1-2, "save" means localStorage (already happens via Zustand persist). For PR 3, the ZIP generation can work from the design data passed in the request body rather than reading from a DB.

---

## 2. Per-PR File Change Plan

### PR 1: Step 6 Button Split + Route Shell (~0.5 day)

**Files to change:**
- `apps/web/src/pages/Design/components/StepActions.tsx` — split REVIEW button into Save + Save & Export
- `apps/web/src/pages/Design/GuidedDesignPage.tsx` — add save/export handlers
- `apps/web/src/types/design.ts` — add `exportedAt?: string` to Design interface
- `apps/web/src/App.tsx` — add `/design/export-preview/:designId` route

**New files:**
- `apps/web/src/pages/ExportPreview/ExportPreviewPage.tsx` — shell page ("开发中" placeholder)

**Not changing:** designStore, backend, other pages.

### PR 2: Export Preview Page UI (~2 days)

**New files:**
- `apps/web/src/pages/ExportPreview/ExportPreviewPage.tsx` — full implementation replacing shell
- `apps/web/src/pages/ExportPreview/HeroSection.tsx` — 3D preview + title
- `apps/web/src/pages/ExportPreview/FlightCheckReport.tsx` — 9-check report with scoring
- `apps/web/src/pages/ExportPreview/FlightStats.tsx` — 4-card parameter grid
- `apps/web/src/pages/ExportPreview/PartsList.tsx` — grouped parts with thumbnails
- `apps/web/src/pages/ExportPreview/MaterialPreparation.tsx` — CAD file list + material estimate
- `apps/web/src/pages/ExportPreview/ExportActions.tsx` — bottom CTA with blocking logic
- `apps/web/src/utils/exportChecks.ts` — 9 check functions
- `apps/web/src/utils/designStats.ts` — weight/thrust/symmetry/flight-time calculations
- `apps/web/src/utils/materialEstimate.ts` — cut length/board/time estimates

**Files to change:**
- `apps/web/tailwind.config.js` — add error red `#E04545`

### PR 3: Backend ZIP Generation + Frontend Integration (~1-1.5 days)

**New files:**
- `apps/api/src/routes/designs.js` — POST /:designId/export-cad endpoint
- `apps/api/src/utils/generateReadme.js` — README.txt template
- `apps/web/public/cad/parts/` — directory for .dxf files (initially empty, user provides)

**Files to change:**
- `apps/api/src/server.js` — mount designs routes
- `apps/api/package.json` — add `archiver` dependency
- `apps/web/src/pages/ExportPreview/ExportActions.tsx` — wire real API call + download
- `apps/web/src/utils/api.ts` — add `exportDesignCad()` function

---

## 3. Decisions Needing Human Input

### Decision 1: Design persistence for export preview

Designs currently live in localStorage only. The export preview page reads design by `designId` from URL params.

**Options:**
- A) Read from designStore (localStorage) — works but URL sharing/refresh only works on same browser
- B) Save to backend first, then read from API — requires building the designs API backend (scope creep)
- C) Hybrid: read from localStorage, fall back to API if available

**My recommendation**: A for PR 1-2. The guided flow already persists to localStorage with the design ID. Sharing via URL is a future feature. For PR 3's ZIP export, pass the full design data in the POST body.

### Decision 2: "Save to cloud" behavior

The current "保存" button implies cloud save, but there's no backend for designs. 

**Options:**
- A) "Save" just triggers localStorage persist (already happening) + show toast "已保存"
- B) Wire up the existing `createDesign`/`updateDesign` API functions to actually save to MongoDB

**My recommendation**: A for now. The backend designs collection doesn't exist yet. Toast says "已保存" which is technically true (localStorage). Adding backend persistence is Week 7-8 per the audit plan.

### Decision 3: CAD file availability

The RFC references `.dxf` files at `public/cad/parts/`. These don't exist yet.

**Options:**
- A) PR 3 creates the directory structure + handles missing files gracefully (skip + warn)
- B) Wait for user to provide .dxf files before implementing PR 3

**My recommendation**: A — implement the full ZIP flow with graceful handling of missing .dxf files. The README will list which files were missing. User provides .dxf files whenever ready.

---

## 4. Risk Identification

| Risk | Severity | Mitigation |
|------|----------|-----------|
| No backend designs collection — can't truly "save to cloud" | Medium | PR 1-2 use localStorage; PR 3 ZIP receives design in request body |
| No .dxf files available for testing | High | Graceful skip + warning in ZIP; README lists missing parts |
| Export preview 3D rendering performance with many parts | Medium | Reuse HeroDrone3D pattern; single Canvas with all parts |
| Design data in localStorage lost if user clears browser | Low | Known limitation; backend persistence planned for Q3 |
| `archiver` package adds ~200KB to backend | Low | Backend-only, doesn't affect frontend bundle |

---

**Ready for review. Once confirmed, I start PR 1.**
