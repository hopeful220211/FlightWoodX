/**
 * @fwx/shared · 项目聚合契约（C1，RFC-011 §4-C1 / §5.3 / §9 M5）
 *
 * Project 把「设计 + 程序」绑成一个可分享 / 可参赛的单元——这是项目详情页
 * 「引力枢纽」的跨模块数据模型。后端 `Project` 只存引用（designId / programId），
 * 本类型在其之上挂载**已解析**的设计与程序实体，供枢纽页、分享 / 嵌入（C3）、
 * 参赛提交（D）等下游模块统一消费。
 *
 * 本文件只含纯类型，无任何运行时副作用（A3 红线）。前端按本类型聚合后端实体；
 * 不在此重定义 IR / RunResult（§6.1 红线，结果模型由 commandProtocol 唯一持有）。
 *
 * 详见 docs/rfcs/RFC-011-platform-2.0.md §4-C1 / §5.3。
 */
import type { Project, DroneDesign, Program } from './models';

/**
 * 项目聚合：`Project` 元信息 + 已解析的设计 / 程序实体。
 *
 * `design` / `program` 允许为 `null`——语义是「聚合已完成，但该关系尚未绑定，
 * 或资源当前不可得」。枢纽页据此走「空态 / 未绑定」分支。
 *
 * ⚠️ 不要改成可选（`design?:`）：可选会被消费方误读为「字段未请求 / 未知」，
 * 而 `null` 明确表达「请求过，但没有」。这对 C3 分享 / D 参赛的判空逻辑很关键。
 */
export interface ProjectAggregate extends Omit<Project, 'designId' | 'programId'> {
  /** 设计 / 程序引用放宽为可选——新建项目可能尚未绑定任一侧（与前端 ProjectData 语义一致）。 */
  designId?: string;
  programId?: string;
  design: DroneDesign | null;
  program: Program | null;
}

/**
 * 项目枢纽页可直达的入口（§5.3「所有散落功能两跳内可达」的硬指标）。
 * 仅作枚举约定，供枢纽页与下游统一指代各挂载点；不含任何实现。
 */
export type ProjectHubEntry =
  | 'design' // B1 设计器
  | 'program' // B2 编程器
  | 'fly' // B3 模拟器 / 试飞
  | 'share' // C3 分享 / 嵌入（归 B）
  | 'export' // 建造导出（归 B / H1）
  | 'history' // C2 版本 / 分支
  | 'submit'; // D 提交参赛
