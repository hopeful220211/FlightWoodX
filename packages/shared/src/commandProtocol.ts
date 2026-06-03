/**
 * @fwx/shared · 指令协议 IR（Command Protocol Intermediate Representation）
 *
 * 架构核心 / 硬件解耦红线：
 * 积木编辑器只「生成」CommandProgram；模拟器（SimAdapter）与真机（RealDroneAdapter）
 * 各自实现一个 DroneAdapter 来「消费」它。换硬件 = 新增一个适配器，不改积木、不改课程。
 *
 * 详见 docs/rfcs/RFC-011-platform-2.0.md §2.3。
 */
import { z } from 'zod';

/** 当前协议版本。序列化产物里写死这个值，方便未来迁移。 */
export const COMMAND_PROTOCOL_VERSION = '1.0' as const;

// ===== 基础枚举 =====

export const DirectionSchema = z.enum(['forward', 'back', 'left', 'right', 'up', 'down']);
export type Direction = z.infer<typeof DirectionSchema>;

/** 锁轴用的运动轴：前后 / 左右 / 升降。避障「锁定」靠它表达。 */
export const AxisSchema = z.enum(['forward', 'lateral', 'vertical']);
export type Axis = z.infer<typeof AxisSchema>;

export const ConditionSchema = z.object({
  sensor: z.enum(['frontDistanceCm', 'downDistanceCm', 'battery']),
  op: z.enum(['<', '>', '==']),
  value: z.number(),
});
export type Condition = z.infer<typeof ConditionSchema>;

// ===== 指令（递归判别联合） =====
// 显式声明 TS 类型，再用 z.lazy 构造同构的运行时 schema，避免 zod 递归类型推断爆栈。

export type Command =
  | { type: 'takeoff'; params: { altitudeCm: number } }
  | { type: 'land' }
  | { type: 'move'; params: { direction: Direction; distanceCm: number; speedCmS?: number } }
  | { type: 'rotate'; params: { degrees: number } } // 正=顺时针，负=逆时针
  | { type: 'hover'; params: { durationMs: number } }
  | { type: 'led'; params: { r: number; g: number; b: number } }
  | { type: 'ifElse'; params: { condition: Condition; then: Command[]; else?: Command[] } }
  | { type: 'repeat'; params: { times: number; body: Command[] } }
  | { type: 'while'; params: { condition: Condition; body: Command[] } }
  | { type: 'waitUntil'; params: { condition: Condition } }
  | { type: 'lockAxis'; params: { axes: Axis[] } }; // 避障「锁定」用

export const CommandSchema: z.ZodType<Command> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('takeoff'), params: z.object({ altitudeCm: z.number() }) }),
    z.object({ type: z.literal('land') }),
    z.object({
      type: z.literal('move'),
      params: z.object({
        direction: DirectionSchema,
        distanceCm: z.number(),
        speedCmS: z.number().optional(),
      }),
    }),
    z.object({ type: z.literal('rotate'), params: z.object({ degrees: z.number() }) }),
    z.object({ type: z.literal('hover'), params: z.object({ durationMs: z.number() }) }),
    z.object({
      type: z.literal('led'),
      params: z.object({ r: z.number(), g: z.number(), b: z.number() }),
    }),
    z.object({
      type: z.literal('ifElse'),
      params: z.object({
        condition: ConditionSchema,
        then: z.array(CommandSchema),
        else: z.array(CommandSchema).optional(),
      }),
    }),
    z.object({
      type: z.literal('repeat'),
      params: z.object({ times: z.number(), body: z.array(CommandSchema) }),
    }),
    z.object({
      type: z.literal('while'),
      params: z.object({ condition: ConditionSchema, body: z.array(CommandSchema) }),
    }),
    z.object({ type: z.literal('waitUntil'), params: z.object({ condition: ConditionSchema }) }),
    z.object({ type: z.literal('lockAxis'), params: z.object({ axes: z.array(AxisSchema) }) }),
  ]),
);

// ===== 程序 =====

export const CommandProgramSchema = z.object({
  version: z.literal(COMMAND_PROTOCOL_VERSION),
  metadata: z.object({
    name: z.string(),
    author: z.string(),
    createdAt: z.string(),
  }),
  commands: z.array(CommandSchema),
});
export type CommandProgram = z.infer<typeof CommandProgramSchema>;

/** 序列化为可入库 / 传输的 JSON 字符串。 */
export function serializeProgram(program: CommandProgram): string {
  return JSON.stringify(program);
}

/** 从 JSON 反序列化并校验。非法结构会抛 ZodError。 */
export function deserializeProgram(json: string): CommandProgram {
  return CommandProgramSchema.parse(JSON.parse(json) as unknown);
}

// ===== 适配器接口（运行时，含函数/Promise，保持纯 TS 接口） =====

export interface Telemetry {
  posCm: [number, number, number];
  headingDeg: number;
  frontDistanceCm: number;
}

export interface RunResult {
  success: boolean;
  score?: number;
  events: string[];
}

export interface ExecHooks {
  onCommandStart?(index: number, cmd: Command): void; // 用于高亮当前积木
  onTelemetry?(t: Telemetry): void;
  onFinish?(result: RunResult): void;
}

/**
 * 仿真器与真机都实现它，实现硬件解耦。
 * 积木编辑器与适配器之间只通过 CommandProgram 通信——这是硬件解耦红线。
 */
export interface DroneAdapter {
  execute(program: CommandProgram, hooks: ExecHooks): Promise<void>;
  stop(): void;
}
