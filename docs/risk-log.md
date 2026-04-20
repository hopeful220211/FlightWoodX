# Risk Log

Known issues tracked but not yet resolved.

---

## 2026-04-21: Step 3 motor selection deferred

**Status**: Deferred to Phase 6 (flight simulation)

Step 3 (MOTOR) motor type selection (7mm/8.5mm/10mm) and propeller color
(black/white/red) UI is present as a disabled "advanced options" section.
Currently the step auto-installs motors and is always advanceable.

Full motor parameter logic (affecting thrust calculation, weight,
flight characteristics) will be implemented when the flight simulation
engine is built in Phase 6.

**Impact**: Low — students get the educational narrative of "motors go
on arm tips" without needing to make a confusing choice.

---

## 2026-04-21: ActionMenu flip/switch-connector not validated for all 77 parts

**Status**: Known, deferred to Phase 5

The "flip" and "switch connector" actions in the part ActionMenu depend
on each part model having a consistent canonical orientation. The current
code assumes a standard orientation but has NOT been verified against all
77 GLB models. Some parts may behave unexpectedly when flipped.

**Mitigation**: In guided build mode, parts auto-snap to the correct
orientation. Users rarely need manual flip. The issue primarily affects
free mode.

**Fix plan**: During Phase 5 (safety check engine), do a per-model
orientation audit and normalize connector directions.
Estimated effort: 1-2 days.
