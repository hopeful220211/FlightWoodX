/**
 * @fwx/shared · 数据模型类型（前后端唯一事实来源）
 *
 * 这里只定义「传输 / 业务」层面的 TS 类型；MongoDB 的 Mongoose schema 在
 * apps/api/src/models/*.js 中按这些类型落地。两边字段须保持一致。
 *
 * 约定：
 * - id 一律 string（Mongo ObjectId 序列化后的十六进制）。
 * - 时间一律 ISO 8601 字符串，便于 JSON 传输与缓存。
 * - 二进制资产（GLB / CAD / 缩略图）只存 URL，不进库（⚙️ 见 RFC-011 §2.1）。
 *
 * 详见 docs/rfcs/RFC-011-platform-2.0.md §2.4。
 */
import type { CommandProgram } from './commandProtocol';
import type { DroneDesignSnapshot } from '@fwx/parts-schema';

/** ISO 8601 时间字符串，例如 "2026-06-03T09:00:00.000Z"。 */
export type IsoDateString = string;

// ===== User =====

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  nickname: string;
  role: UserRole;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: IsoDateString;
}

// ===== DroneDesign（设计器产物） =====

export type DroneDesignStatus = 'draft' | 'published' | 'archived';

/** 参数化机身参数（设计器据此生成 / 校验机身）。后续 M2 可扩展。 */
export interface ParametricBodyParams {
  hubType: string; // 主板型号（对应 parts 体系的 HUB）
  layer: 'single' | 'double';
  armCount: number; // 机臂数量（三轴/四轴…）
  armLengthMm: number;
  guardStyle?: 'plate' | 'joint' | 'landing'; // 保护罩形态
}

export interface DroneDesign {
  id: string;
  ownerId: string;
  name: string;
  /** 版本化并经过运行时校验的设计器快照；存量兼容记录可为空。 */
  designData: DroneDesignSnapshot | null;
  /** 前端本地 id，用于按 (ownerId, localId) 幂等 upsert（RFC-013）。 */
  localId?: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  weightG: number;
  status: DroneDesignStatus;
  // ===== 作品库合一（RFC-024 §4.2）：DroneDesign 为「我的作品」唯一后端源 =====
  /** 展示封面（3D 截图大图）。与 thumbnailUrl（小自动缩略图）并存。 */
  coverUrl?: string;
  /** 可见性（作品库单一真相源，原 Project.visibility 并入）。后端默认 private。 */
  visibility: Visibility;
  /** 是否允许他人复用（原 Project.reusable 并入）。后端默认 false。 */
  reusable: boolean;
  /** 关联的积木程序 id（可选）。作品 = 设计 + 程序。 */
  programId?: string;
  /** 被复用次数（他人 fork 本作品的累计计数）。 */
  reuseCount?: number;
  /** @deprecated 改为可选以向后兼容存量数据；新设计走 designData。 */
  params?: ParametricBodyParams;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

// ===== Program（积木编程器产物） =====

export interface Program {
  id: string;
  ownerId: string;
  name: string;
  /** Blockly 原始积木 XML（保真，便于二次编辑）。 */
  blocklyXml: string;
  /** 编译后的指令协议 IR（仿真器 / 真机消费）。 */
  commandProgram: CommandProgram;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

// ===== Project（设计 + 程序的整合体） =====

export type Visibility = 'private' | 'public';

export interface Project {
  id: string;
  ownerId: string;
  designId: string;
  programId: string;
  name: string;
  coverUrl?: string;
  visibility: Visibility;
  /** 作者是否允许他人复用本作品（开源可复用标记）。后端默认 false。 */
  reusable: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

// ===== Part / KitItem（零件库） =====

export type PartType = 'motor' | 'prop' | 'flightController' | 'sensor' | 'wood';

export interface KitItem {
  id: string;
  name: string;
  type: PartType;
  spec: string;
  priceCents: number; // 以分存储，避免浮点
  imageUrl?: string;
}

// ===== Competition（赛事） =====

export type CompetitionStatus = 'draft' | 'open' | 'running' | 'closed';

/** 赛道配置（障碍布局、任务点等）。M6 接入时细化。 */
export interface TrackConfig {
  name: string;
  description?: string;
  /** 障碍/任务点的占位结构，先留作后续扩展。 */
  obstacles?: { posCm: [number, number, number]; radiusCm: number }[];
}

/** 评分规则：评设计 / 编程逻辑 / 创意 / 任务完成，不评纯竞速。 */
export interface ScoringRules {
  design: number; // 各维度权重（合计建议 100）
  programming: number;
  creativity: number;
  taskCompletion: number;
}

export interface Competition {
  id: string;
  name: string;
  rulesDescription: string;
  trackConfig: TrackConfig;
  scoringRules: ScoringRules;
  startTime: IsoDateString;
  endTime: IsoDateString;
  status: CompetitionStatus;
}

// ===== Submission（参赛提交） =====

/**
 * 提交 / 评分状态机（RFC-016 §2.6）：杜绝"提交即有分"。
 * submitted → running → scored → reviewed → published；任意步可 → rejected。
 */
export type SubmissionStatus =
  | 'submitted'
  | 'running'
  | 'scored'
  | 'reviewed'
  | 'published'
  | 'rejected';

export interface Submission {
  id: string;
  competitionId: string;
  userId: string;
  projectId: string;
  /** 提交状态（RFC-016 §2.6 状态机）。 */
  status: SubmissionStatus;
  /** 关联的仿真运行 id（评分 / 回放数据源，RFC-015）。 */
  runId?: string;
  submittedAt: IsoDateString;
  /** 仿真回放数据的 URL（大对象走对象存储，不入库）。 */
  simReplayUrl?: string;
}

// ===== Score（评分） =====

export type ScoreSource = 'auto' | 'human';

export interface ScoreDimensions {
  design: number;
  programming: number;
  creativity: number;
  taskCompletion: number;
}

export interface Score {
  id: string;
  submissionId: string;
  dimensions: ScoreDimensions;
  total: number;
  source: ScoreSource;
  createdAt: IsoDateString;
}

// ===== CommunityPost（社区作品） =====

export interface CommunityPost {
  id: string;
  authorId: string;
  projectId: string;
  title: string;
  description: string;
  likes: number;
  /** fork 来源作品 id（原创则为空）。 */
  forkFromId?: string;
  createdAt: IsoDateString;
}
