// features/partStudio/types.ts
//
// 自制零件工坊（RFC-021）的【feature 内部】几何运行时类型。
// ⚠️ 这不是跨前后端契约：持久化契约 CustomPartDef / CustomConnector 由基建落到
//    @fwx/parts-schema（见 RFC-021 §3），本期未落地。这里仅描述画布/挤出的运行时态，
//    存盘时（M2）再映射到 @fwx/parts-schema 的契约形状。

/** 画布/模型坐标系下的一个二维点。 */
export type Point2D = [number, number]

/** 一条闭合轮廓环：去重后的顶点序列（不含重复的闭合点）。 */
export interface Outline2D {
  /** 顶点序列；外轮廓约定 CCW，孔约定 CW（挤出前由 winding 校正）。 */
  points: Point2D[]
}

/** 画布当前的轮廓状态。 */
export interface SketchState {
  /** 已确认的轮廓顶点（可能未闭合）。 */
  points: Point2D[]
  /** 是否已闭合（闭合才能立起来）。 */
  closed: boolean
}
