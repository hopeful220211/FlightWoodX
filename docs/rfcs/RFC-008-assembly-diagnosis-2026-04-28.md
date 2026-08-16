# RFC-008 Assembly Diagnosis Report

## 1. Connector Audit Summary

See full table in `connector-audit-2026-04-28.md`. Key findings:

### Connector Type Distribution

| Category | Total parts | Only sockets | Only plugs | Both | Neither |
|----------|------------|-------------|-----------|------|---------|
| mainboards | 16 | 15 | 1 (hub_16) | 0 | 0 |
| landings | 39 | 0 | 39 | 0 | 0 |
| guards | 28 | 9 | 19 | 0 | 0 |
| joints | 11 | 0 | 11 | 0 | 0 |

**Critical finding**: The snap system connects plug→socket. But:
- **Mainboards have ONLY sockets** (15/16). They accept children via their sockets.
- **Landings have ONLY plugs** (39/39). They connect TO mainboard sockets.
- **Guards are SPLIT**: 9 have only sockets, 19 have only plugs. This split maps to old vs new GLBs.
- **Joints have ONLY plugs** (11/11).

### Connection Chain

```
mainboard (sockets) ← landing (plugs)    ✅ Works: landing plugs into mainboard socket
mainboard (sockets) ← joint (plugs)      ✅ Works: joint plugs into mainboard socket
landing (plugs only) ← guard (plugs)     ❌ BROKEN: both sides are plugs, no socket to connect to!
```

**THIS IS THE ROOT CAUSE OF "歪零件":**
- Landing parts have 0 sockets and 1-4 plugs
- Guards with plugs (19/28) try to connect plug-to-plug
- The code's `addPartSmart` finds the first available connector but plug-to-plug matching uses wrong math
- The `computeSnapTransform` aligns plug quaternion to socket quaternion, but when both are plugs, the inversion produces incorrect rotation

### Z-Rotation Variance

All connectors have X rotation = 90° (consistent). But Z rotation varies wildly:
- 180°, 0°, ±90°, ±135°, ±45°, and non-standard values (103°, -49°, -114°, -136°, 137°)

The extra rotation `rotX180 * rotZ90` applied after `computeSnapTransform` was calibrated for the original 9 hub models (X=90°, Z varies). It works when a plug connects to a socket (the math inverts correctly). But for plug-to-plug, the math produces garbage.

## 2. "Switch Connector" Button Disabled Logic

**File**: `ActionMenu.tsx` lines 94-145

The button is disabled when:
1. Part has no `attachedTo` (not snapped to anything)
2. Part has zero plug connectors
3. No selection

**Why it's disabled for "歪零件"**: 
- A part attached via plug-to-plug creates an `attachedTo` record, so condition 1 passes
- The part does have plugs, so condition 2 passes
- The real issue: `handleSwitchConnector` cycles through plugs and tries to re-snap, but with only 1 plug available, there's nothing to switch to → function returns early at line 116: `if (currentPlugIdx === -1 || plugs.length <= 1) return`

## 3. Assembly Position Calculation Chain

### The chain:
1. `usePartConnectors` extracts connectors via `getWorldPosition()` / `getWorldQuaternion()` from GLB scene graph
2. `addPartSmart` finds first available connector pair (plug on child, socket on parent)
3. `computeSnapTransform` aligns plug to socket via quaternion math
4. **Extra rotation applied**: `rotX180 * rotZ90` (180° around X, then 90° around Z)
5. Position recalculated with rotated plug offset

### The extra rotation problem:

```javascript
const rotX180 = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI)
const rotZ90 = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
const extraRotation = rotX180.clone().multiply(rotZ90)
const newQuaternion = baseQuaternion.clone().multiply(extraRotation)
```

This was written to correct a specific connector convention (plug -Y axis = insertion direction). It works when:
- Parent has socket, child has plug → `computeSnapTransform` inverts correctly
- Both share the same convention (X=90° rotation)

It BREAKS when:
- Both are plugs (plug-to-plug) → the inversion in `computeSnapTransform` (line 19: `plugLocalQuaternion.clone().invert()`) produces a quaternion that, combined with `rotX180 * rotZ90`, results in an unpredictable orientation

## 4. Comparison: Working vs Broken Parts

### Working: mainboard + landing (plug → socket)

**core_hub_01**: 8 sockets, X=90° each, Z varies by position
**arm_01**: 2 plugs, X=90° each

When arm_01 plug connects to core_hub_01 socket:
- `computeSnapTransform`: socket_quat × plug_quat.inverse() → correct base alignment
- `rotX180 * rotZ90` → adjusts for connector convention
- Result: arm snaps flush to mainboard edge ✅

### Broken: landing + guard (plug → plug)

**arm_01**: 0 sockets, 2 plugs
**joint_01**: 0 sockets, 2 plugs

The connection code in `SocketHighlights.tsx` line 78-84:
```typescript
if (draggingConnector.type === 'plug') {
  return c.type === 'socket' || c.type === 'plug'  // allows plug-to-plug!
}
```

When joint_01 plug connects to arm_01 plug:
- `computeSnapTransform`: plug_quat × plug_quat.inverse() → produces identity-ish quaternion
- `rotX180 * rotZ90` → applies full extra rotation to an already-aligned part
- Result: guard is rotated 180°+90° from correct position = "歪" ❌

## 5. Root Cause Ranking

1. **🔴 Root cause (95% confidence): Plug-to-plug connections produce wrong rotation.**
   Landing parts have 0 sockets → guards can only connect plug-to-plug → the `computeSnapTransform` + extra rotation formula was designed for socket-to-plug only.

2. **🟡 Contributing factor: Extra rotation is a hardcoded hack.**
   `rotX180 * rotZ90` was calibrated for the original 9 hub models. The new 94-model set has different Z rotations that may not align with this fixed correction.

3. **🟢 Minor: Z rotation variance across models.**
   Different models have connectors at different Z angles (0°, 90°, 135°, etc.). A single extra rotation can't correct all of them.

## 6. Fix Recommendations (Priority Order)

### Fix A: Eliminate plug-to-plug connections (Highest priority, lowest risk)

The GLB models' connector topology makes it clear:
- Mainboards are **parents** (sockets only) — they ACCEPT landings and joints
- Landings/guards/joints are **children** (plugs only) — they ATTACH TO parents

But landings have no sockets for guards to plug into. This means **guards should also connect to mainboard sockets**, not to landing plugs.

**Action**: Update `connectionRules.ts`:
```
mainboard → accepts: landing, guard, joint
landing → accepts: nothing (child-only)
guard → accepts: nothing (child-only)  
joint → accepts: nothing (child-only)
```

This makes ALL non-mainboard parts plug directly into the mainboard. No plug-to-plug ever happens.

**Risk**: Changes the assembly hierarchy. Guards would attach to mainboard, not to landings. This may not match the physical reality of the drone.

**Effort**: 1 line change in `connectionRules.ts`

### Fix B: Remove the extra rotation hack (Medium priority)

Remove `rotX180 * rotZ90` entirely. Let `computeSnapTransform` do the pure alignment.

If parts still appear rotated, the issue is in the GLB connector orientations themselves, which should be fixed at the Blender/Rhino export stage.

**Risk**: May break currently-working mainboard+landing connections.

**Effort**: Delete 4 lines in 4 files, test extensively.

### Fix C: Per-connector-pair rotation correction (Low priority, high effort)

Instead of a global `rotX180 * rotZ90`, compute the correction per connector pair based on their actual orientations.

**Effort**: 2-3 days of quaternion math + testing all 94 parts.
