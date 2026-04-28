#!/bin/bash
# Scale all GLB models so thickness (Y axis) becomes 2.0mm.
# Uses uniform scaling (等比缩放) to preserve proportions.
# arm_36 and arm_37 are already 2mm — skip them.

MODELS_DIR="$(dirname "$0")/../public/models"
TARGET_MM=2.0
SKIPPED=0
SCALED=0

for category in mainboards landings guards joints; do
  dir="$MODELS_DIR/$category"
  [ -d "$dir" ] || continue

  for glb in "$dir"/*.glb; do
    filename=$(basename "$glb")

    # Skip already-correct files
    if [[ "$filename" == "arm_36.glb" || "$filename" == "arm_37.glb" ]]; then
      echo "SKIP $category/$filename (already 2mm)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Get current Y size using node
    current_y=$(node -e "
      const fs = require('fs');
      const path = require('path');
      (async () => {
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        const buf = fs.readFileSync('$glb');
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const gltf = await new Promise((r,e) => loader.parse(ab,'',r,e));
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        process.stdout.write(size.y.toFixed(6));
      })();
    " 2>/dev/null)

    if [ -z "$current_y" ] || [ "$current_y" = "0.000000" ]; then
      echo "ERROR $category/$filename — could not read Y size"
      continue
    fi

    # Calculate uniform scale factor: target / current
    scale=$(node -e "console.log(($TARGET_MM / 1000 / $current_y).toFixed(6))")

    if [ "$scale" = "1.000000" ]; then
      echo "SKIP $category/$filename (already ${TARGET_MM}mm)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    echo "SCALE $category/$filename: Y=${current_y}m → ${TARGET_MM}mm (factor=$scale)"

    # Apply uniform scale using gltf-transform
    npx @gltf-transform/cli transform "$glb" "$glb" --scale "$scale,$scale,$scale" 2>/dev/null

    if [ $? -eq 0 ]; then
      SCALED=$((SCALED + 1))
    else
      echo "  ERROR: gltf-transform failed for $filename"
    fi
  done
done

echo ""
echo "Done: $SCALED scaled, $SKIPPED skipped"
