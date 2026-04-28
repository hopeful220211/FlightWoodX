# Snap Consistency Audit

## 1. Connector -Y Direction Patterns

The -Y axis is the "insertion direction". All connectors of the same type should point consistently.

| -Y Direction | Count | Interpretation |
|---|---|---|
| (0,0,1) | 108 | |
| (0,0,-1) | 91 | |
| (1,0,0) | 53 | |
| (-1,0,0) | 51 | |
| (0.707,0,-0.707) | 11 | |
| (-0.707,0,-0.707) | 11 | |
| (-0.707,0,0.707) | 11 | |
| (0.707,0,0.707) | 10 | |
| (-0.751,0,-0.66) | 2 | |
| (-0.698,0,-0.716) | 2 | |
| (0.661,0,-0.75) | 2 | |
| (0.69,0,-0.724) | 2 | |
| (0.705,0,0.709) | 2 | |
| (0.711,0,0.703) | 2 | |
| (-0.687,0,0.727) | 2 | |
| (-0.742,0,0.67) | 2 | |
| (0.688,0,0.726) | 1 | |
| (-0.701,0,0.714) | 1 | |
| (-0.701,0,0.713) | 1 | |
| (-0.713,0,-0.701) | 1 | |
| (0.702,0,-0.712) | 1 | |
| (0.713,0,0.701) | 1 | |
| (0,-1,0) | 1 | |
| (-0.71,0,0.704) | 1 | |
| (-0.745,0,-0.667) | 1 | |
| (-0.691,0,0.723) | 1 | |
| (-0.706,0,-0.708) | 1 | |
| (0.974,0,0.227) | 1 | |
| (-0.236,0,-0.972) | 1 | |
| (0.964,0,-0.266) | 1 | |
| (0.194,0,-0.981) | 1 | |
| (-0.963,0,0.269) | 1 | |
| (-0.97,0,-0.242) | 1 | |
| (0.218,0,0.976) | 1 | |
| (-0.215,0,0.977) | 1 | |
| (0.574,0,0.819) | 1 | |
| (-0.91,0,0.414) | 1 | |
| (0.92,0,0.393) | 1 | |

## 2. Per-Category Connector Details

### mainboards

| File | Connectors | Types | -Y Directions | Inside BBox | Euler X |
|---|---|---|---|---|---|
| mainboards/core_hub_01.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| mainboards/core_hub_02.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0.707,0,0.707) (0.707,0,-0.707) (-0.707,0,-0.707) (-0.707,0,0.707) | ✅ | 90° |
| mainboards/core_hub_03.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-1,0,0) (0,0,-1) (1,0,0) (0,0,1) | ✅ | 90° |
| mainboards/core_hub_04.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0.688,0,0.726) (-0.701,0,0.714) (-0.701,0,0.713) (-0.707,0,-0.707) (-0.713,0,-0.701) (0.702,0,-0.712) (0.713,0,0.701) (0.707,0,-0.707) | ✅ | 90° |
| mainboards/core_hub_05.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| mainboards/core_hub_06.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (1,0,0) (0,0,-1) (-1,0,0) | ✅ | 90° |
| mainboards/core_hub_07.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-0.707,0,0.707) (0.707,0,0.707) (0.707,0,-0.707) (-0.707,0,-0.707) | ✅ | 90° |
| mainboards/core_hub_08.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-0.707,0,0.707) (0.707,0,0.707) (0.707,0,-0.707) (-0.707,0,-0.707) | ✅ | 90° |
| mainboards/core_hub_09.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| mainboards/core_hub_10.glb | 10 | socket,socket,socket,socket,socket,socket,socket,socket,socket,socket | (0,0,-1) (-1,0,0) (1,0,0) (0,0,1) (0,-1,0) | ✅ | 90,0° |
| mainboards/core_hub_11.glb | 12 | socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket | (0,0,-1) (0,0,1) (-1,0,0) (1,0,0) | ✅ | 90° |
| mainboards/core_hub_12.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-1,0,0) (0,0,-1) (1,0,0) (0,0,1) | ✅ | 90° |
| mainboards/core_hub_13.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (1,0,0) (0,0,-1) (-1,0,0) | ✅ | 90° |
| mainboards/core_hub_14.glb | 4 | socket,socket,socket,socket | (0,0,1) (0,0,-1) (-1,0,0) (1,0,0) | ✅ | 90° |
| mainboards/core_hub_15.glb | 12 | socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket | (0,0,-1) (-1,0,0) (1,0,0) (0,0,1) | ✅ | 90° |
| mainboards/core_hub_16.glb | 4 | plug,plug,plug,plug | (0,0,1) (1,0,0) (-1,0,0) (0,0,-1) | ✅ | 90° |

### landings

| File | Connectors | Types | -Y Directions | Inside BBox | Euler X |
|---|---|---|---|---|---|
| landings/arm_01.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_02.glb | 3 | plug,plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_03.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_04.glb | 1 | plug | (-1,0,0) | ✅ | 90° |
| landings/arm_05.glb | 3 | plug,plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_06.glb | 3 | plug,plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_07.glb | 3 | plug,plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_08.glb | 1 | plug | (1,0,0) | ✅ | 90° |
| landings/arm_09.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_10.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_11.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_12.glb | 3 | plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_13.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_14.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_15.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_16.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_17.glb | 4 | plug,plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_18.glb | 4 | plug,plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_19.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_20.glb | 4 | plug,plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_21.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_22.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_23.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_24.glb | 1 | plug | (-1,0,0) | ✅ | 90° |
| landings/arm_25.glb | 1 | plug | (-1,0,0) | ✅ | 90° |
| landings/arm_26.glb | 1 | plug | (1,0,0) | ✅ | 90° |
| landings/arm_27.glb | 1 | plug | (1,0,0) | ✅ | 90° |
| landings/arm_28.glb | 3 | plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_29.glb | 3 | plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_30.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_31.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |
| landings/arm_32.glb | 4 | plug,plug,plug,plug | (0,0,1) (0,0,-1) | ✅ | 90° |
| landings/arm_33.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_34.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_35.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_36.glb | 4 | plug,plug,plug,plug | (0,0,-1) (-1,0,0) (0,0,1) | ✅ | 90° |
| landings/arm_37.glb | 4 | plug,plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| landings/arm_38.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| landings/arm_39.glb | 3 | plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |

### guards

| File | Connectors | Types | -Y Directions | Inside BBox | Euler X |
|---|---|---|---|---|---|
| guards/joint_01.glb | 2 | plug,plug | (0,0,1) (-1,0,0) | ✅ | 90° |
| guards/joint_03.glb | 4 | plug,plug,plug,plug | (-1,0,0) (0,0,1) | ✅ | 90° |
| guards/joint_11.glb | 2 | plug,plug | (-1,0,0) (0,0,-1) | ✅ | 90° |
| guards/joint_12.glb | 2 | plug,plug | (1,0,0) (0,0,-1) | ✅ | 90° |
| guards/joint_13.glb | 2 | plug,plug | (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_14.glb | 2 | plug,plug | (-0.71,0,0.704) (-0.745,0,-0.667) | ✅ | 90° |
| guards/joint_16.glb | 2 | plug,plug | (0,0,-1) (-1,0,0) | ✅ | 90° |
| guards/joint_17.glb | 2 | plug,plug | (0,0,-1) (-1,0,0) | ✅ | 90° |
| guards/joint_18.glb | 2 | plug,plug | (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_19.glb | 2 | plug,plug | (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_20.glb | 2 | plug,plug | (-0.691,0,0.723) (-0.706,0,-0.708) | ✅ | 90° |
| guards/joint_25.glb | 2 | plug,plug | (1,0,0) (0,0,-1) | ✅ | 90° |
| guards/joint_26.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (0.974,0,0.227) (-0.236,0,-0.972) (0.964,0,-0.266) (0.194,0,-0.981) (-0.963,0,0.269) (-0.97,0,-0.242) (0.218,0,0.976) (-0.215,0,0.977) | ✅ | 90° |
| guards/joint_27.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-0.751,0,-0.66) (-0.698,0,-0.716) (0.661,0,-0.75) (0.69,0,-0.724) (0.705,0,0.709) (0.711,0,0.703) (-0.687,0,0.727) (-0.742,0,0.67) | ✅ | 90° |
| guards/joint_28.glb | 4 | socket,socket,socket,socket | (0,0,1) (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_29.glb | 16 | socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket | (0,0,1) (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_30.glb | 8 | socket,socket,socket,socket,socket,socket,socket,socket | (-0.751,0,-0.66) (-0.698,0,-0.716) (0.661,0,-0.75) (0.69,0,-0.724) (0.705,0,0.709) (0.711,0,0.703) (-0.687,0,0.727) (-0.742,0,0.67) | ✅ | 90° |
| guards/joint_31.glb | 16 | socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket,socket | (-0.707,0,0.707) (-0.707,0,-0.707) (0.707,0,-0.707) (0.707,0,0.707) (0.574,0,0.819) | ✅ | 90° |
| guards/joint_32.glb | 2 | plug,plug | (-0.91,0,0.414) (0.92,0,0.393) | ✅ | 90° |
| guards/joint_33.glb | 4 | plug,plug,plug,plug | (-0.707,0,0.707) (-1,0,0) (1,0,0) (0.707,0,0.707) | ✅ | 90° |
| guards/joint_34.glb | 4 | plug,plug,plug,plug | (1,0,0) (0,0,1) (-1,0,0) | ✅ | 90° |
| guards/joint_35.glb | 7 | plug,plug,plug,plug,plug,plug,plug | (0,0,1) (-1,0,0) (1,0,0) | ✅ | 90° |
| guards/joint_36.glb | 7 | plug,plug,plug,plug,plug,plug,plug | (-1,0,0) (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_37.glb | 7 | plug,plug,plug,plug,plug,plug,plug | (-1,0,0) (1,0,0) (0,0,-1) | ✅ | 90° |
| guards/joint_38.glb | 4 | plug,plug,plug,plug | (0,0,-1) (-1,0,0) (1,0,0) | ✅ | 90° |
| guards/joint_39.glb | 2 | socket,socket | (0,0,-1) (1,0,0) | ✅ | 90° |
| guards/joint_40.glb | 2 | socket,socket | (0,0,1) (1,0,0) | ✅ | 90° |
| guards/joint_41.glb | 2 | socket,socket | (0,0,1) (1,0,0) | ✅ | 90° |

### joints

| File | Connectors | Types | -Y Directions | Inside BBox | Euler X |
|---|---|---|---|---|---|
| joints/deco_01.glb | 3 | plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| joints/deco_02.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_03.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_04.glb | 3 | plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| joints/deco_05.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_06.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_07.glb | 3 | plug,plug,plug | (0,0,-1) (0,0,1) | ✅ | 90° |
| joints/deco_08.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_09.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_10.glb | 2 | plug,plug | (0,0,-1) | ✅ | 90° |
| joints/deco_11.glb | 2 | plug,plug | (0,0,1) | ✅ | 90° |

## 3. Anomalies: Connectors Outside Bounding Box

None found ✅


## 4. Euler X Consistency Check

- **mainboards**: Euler X values = [90, 0] ✅
- **landings**: Euler X values = [90] ✅
- **guards**: Euler X values = [90] ✅
- **joints**: Euler X values = [90] ✅
