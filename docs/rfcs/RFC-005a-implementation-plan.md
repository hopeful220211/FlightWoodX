# RFC-005a: Homepage Redesign Implementation Plan

**Author**: Claude Code
**Date**: 2026-04-22
**Status**: Draft — Awaiting human review

---

## 1. Current State Analysis

### 1.1 Existing files (8 files, 613 lines total)

| File | Lines | Reuse assessment |
|------|-------|-----------------|
| `HomePage.tsx` | 21 | **Keep** — section composition, just swap children |
| `HeroSection.tsx` | 138 | **Heavy rewrite** — keep dual-column structure, replace content/animations |
| `AwardsSection.tsx` | 36 | **Rewrite** — current is logo strip, RFC wants full-page with large badges |
| `STEAMSection.tsx` | 104 | **Replace** → becomes "Why Us" (§4.4), different layout (3-col vs alternating) |
| `UIShowcaseSection.tsx` | 91 | **Replace** → becomes "Product Demo" (§4.5), different layout (left-right vs carousel) |
| `StudentShowcaseSection.tsx` | 45 | **Adapt** — similar concept, refine card size/styling |
| `CurriculumSection.tsx` | 64 | **Rewrite** — current is vertical timeline, RFC wants horizontal 4-stage |
| `FinalCTASection.tsx` | 93 | **Split** — extract Footer to own component, restyle CTA |

### 1.2 Reusable infrastructure

| Asset | Status |
|-------|--------|
| Framer Motion | Already installed, used in STEAM + Curriculum sections |
| `react-intersection-observer` | Already in dependencies but unused — RFC wants custom hook |
| `Card` component | Keep for internal pages, homepage sections are custom |
| `Button` component | Already exists with primary/outline/ghost variants |
| Tailwind wood/tech colors | Keep, extend with ink/paper/accent |
| Award images | Exist at `/resource/picture/awards/` (Red Dot + iF at minimum) |
| Product images | Exist at `/resource/picture/flight_png/` |
| Student works data | `data/featuredWorks.ts` exists |

### 1.3 What's missing

- `ink-*` / `paper-*` / `accent-*` color tokens
- `useScrollReveal` hook (RFC §5.1)
- Inter font (already in font-family stack but not explicitly loaded)
- Navbar scroll behavior (currently static)
- Footer as standalone component
- Several new sections: Why Us, Product Demo, For Who, Loved By

---

## 2. Per-PR File Change Plan

### PR 1: Infrastructure + Design Tokens (~0.5 day)

**Files to change:**
- `tailwind.config.js` — add ink/paper/accent colors
- `apps/web/src/hooks/useScrollReveal.ts` — **NEW**: IntersectionObserver hook
- `apps/web/src/components/common/ScrollReveal.tsx` — **NEW**: wrapper component
- `apps/web/src/index.css` — add `.scroll-reveal` CSS classes + `prefers-reduced-motion`
- `apps/web/index.html` — verify Inter font link (already in Tailwind font stack)

**Not changing:** Any section components. Existing pages look the same.

### PR 2: Hero Upgrade (~1 day)

**Files to change:**
- `sections/HeroSection.tsx` — **Rewrite**: 3D drone, award capsule, new copy, staggered entry animations
- `components/layout/AppLayout.tsx` — hide help bubble on `/` too
- `components/layout/Navbar.tsx` — add scroll-triggered glass effect

**New files:**
- `sections/hero/HeroDrone3D.tsx` — React Three Fiber 3D drone viewer
- `sections/hero/AwardCapsule.tsx` — small gold-bordered pill component

**Assets needed:**
- Hero drone GLB: fallback to `public/models/core_hub_01.glb`
- Static fallback image: use existing `/resource/picture/flight_png/untitled.297.png`

### PR 3: Mid-sections (Awards + Why Us + Product Demo) (~1.5 days)

**Files to change:**
- `sections/AwardsSection.tsx` — **Rewrite**: full-page with large badges
- `sections/STEAMSection.tsx` → **Rename/Replace** → `sections/WhyUsSection.tsx`
- `sections/UIShowcaseSection.tsx` → **Rename/Replace** → `sections/ProductDemoSection.tsx`
- `HomePage.tsx` — update imports

**Assets needed:**
- Award badge images: check if `/resource/picture/awards/red-dot-logo.*.png` and `if.png` exist; if too small, use CSS placeholder badges
- Why Us photos: fallback to existing `/resource/picture/` photos
- Workbench screenshot: use CSS placeholder until user provides

### PR 4: Gallery + Curriculum + For Who (~1.5 days)

**Files to change:**
- `sections/StudentShowcaseSection.tsx` → `sections/StudentGallerySection.tsx` — adapt
- `sections/CurriculumSection.tsx` — **Rewrite**: horizontal timeline, 4 stages
- `sections/ForWhoSection.tsx` — **NEW**
- `HomePage.tsx` — update section order

### PR 5: Loved By + Final CTA + Footer + Polish (~1-1.5 days)

**Files to change:**
- `sections/LovedBySection.tsx` — **NEW** (honest placeholder)
- `sections/FinalCTASection.tsx` — **Rewrite**: dark bg, split CTA
- `components/layout/Footer.tsx` — **NEW**: extracted from FinalCTA
- `HomePage.tsx` — final section order
- Performance: lazy-load below-fold sections, verify Lighthouse

---

## 3. Decisions Needing Human Input

### Decision 1: Hero data metrics — real or placeholder?

Current hero shows `500+ 学生` / `50+ 课程` / `98% 满意度`.

RFC says if fabricated, replace with real achievements:
```
🏆 2 项国际设计奖    👥 6 人跨学科团队    📐 77 个标准化零件
```

**My recommendation**: Use the real achievements version. The current numbers look inflated for an early-stage product and undermine credibility.

**Need your confirmation**: Are those numbers real or should I replace them?

### Decision 2: Award badges — IDEA and G-Mark real?

Current AwardsSection shows 4 awards: iF, Red Dot, IDEA, G-Mark.
RFC and CLAUDE.md only mention Red Dot Best of the Best 2024 + iF Design Award 2026.

**Options**:
- A) Keep all 4 if all are real
- B) Only show Red Dot + iF (confirmed real), remove IDEA + G-Mark
- C) Show all 4 but with different prominence (Red Dot + iF large, others smaller)

**My recommendation**: B — only show confirmed awards. Showing unconfirmed awards is worse than showing fewer.

### Decision 3: Student Gallery data source

RFC offers:
- A) Backend API `/api/designs/public?featured=true` (needs new endpoint)
- B) Static placeholder data (existing `featuredWorks.ts`)

**My recommendation**: B for now. Adding a backend endpoint is scope creep for a homepage redesign. The existing `featuredWorks.ts` data is sufficient, and we can upgrade to API-driven in a future PR.

---

## 4. Risk Identification

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Hero 3D drone adds ~500KB to first paint | High | Lazy-load R3F canvas; show static image until canvas ready; `hardwareConcurrency` check |
| Award badge images too low-res | Medium | CSS placeholder badges ready as fallback (gold border + Trophy icon) |
| Framer Motion bundle size (~30KB) | Low | Already installed; tree-shakeable |
| 11 sections = long page, mobile scroll perf | Medium | `useScrollReveal` with `once: true`; no continuous animations |
| Navbar scroll listener perf | Low | `passive: true` event listener; throttle to rAF |
| `prefers-reduced-motion` compliance | Medium | All animations behind media query check from day 1 |

---

## 5. Section mapping (old → new)

```
OLD                          NEW (RFC §3)
─────────────────────────    ─────────────────────────
1. Navbar                →   1. Navigation (upgrade scroll behavior)
2. HeroSection           →   2. Hero (upgrade: 3D, award capsule, new copy)
3. AwardsSection         →   3. Awards (rewrite: full-page, large badges)
4. STEAMSection          →   4. Why Us (replace: 3-column cards)
5. UIShowcaseSection     →   5. Product Demo (replace: left-right layout)
6. StudentShowcaseSection →  6. Student Gallery (adapt: refine cards)
7. CurriculumSection     →   7. Curriculum (rewrite: horizontal 4-stage)
   (not present)         →   8. For Who (NEW: 3 identity cards)
   (not present)         →   9. Loved By (NEW: honest placeholder)
8. FinalCTASection       →  10. Final CTA (rewrite: dark bg)
   (embedded in CTA)     →  11. Footer (extract + upgrade)
```

---

## 6. Asset fallback plan

| Asset | Primary source | Fallback |
|-------|---------------|----------|
| Hero 3D drone | `public/homepage/hero-drone.glb` | `public/models/core_hub_01.glb` |
| Hero static image | `public/homepage/hero/drone-static.png` | `/resource/picture/flight_png/untitled.297.png` |
| Red Dot badge | `public/homepage/awards/red-dot-badge.png` | CSS gold circle + Trophy icon + text |
| iF badge | `public/homepage/awards/if-badge.png` | CSS gold circle + Trophy icon + text |
| Why Us photos | `public/homepage/why-us/*.jpg` | Existing `/resource/picture/` photos |
| Workbench screenshot | `public/homepage/product-demo/workbench.png` | CSS placeholder with grid pattern |
| For Who photos | `public/homepage/for-who/*.jpg` | CSS abstract gradient blocks |
| Student works | Existing `data/featuredWorks.ts` thumbnails | Works as-is |

All fallbacks will look intentionally designed (per RFC §7.3), not grey broken-image boxes.

---

**Ready for your review. Once confirmed, I start PR 1 (Infrastructure + Design Tokens).**
