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

/**
 * 协议级安全边界。编辑器、模拟器、服务端和未来真机适配器共用同一组限制，
 * 避免任一调用方把负数、无限循环或异常大的动作带到执行层。
 */
export const COMMAND_LIMITS = {
  maxAltitudeCm: 500,
  maxDistanceCm: 2_000,
  maxSpeedCmS: 500,
  maxRotationDegrees: 360,
  maxHoverMs: 60_000,
  maxRepeatTimes: 100,
  maxWhileIterations: 1_000,
  maxProgramCommands: 500,
  maxNestingDepth: 10,
} as const;

// ===== 基础枚举 =====

export const DirectionSchema = z.enum(['forward', 'back', 'left', 'right', 'up', 'down']);
export type Direction = z.infer<typeof DirectionSchema>;

/** 锁轴用的运动轴：前后 / 左右 / 升降。避障「锁定」靠它表达。 */
export const AxisSchema = z.enum(['forward', 'lateral', 'vertical']);
export type Axis = z.infer<typeof AxisSchema>;

export const ConditionSchema = z
  .object({
    sensor: z.enum(['frontDistanceCm', 'downDistanceCm', 'battery']),
    op: z.enum(['<', '>', '==']),
    value: z.number().finite(),
  })
  .superRefine((condition, ctx) => {
    const valid =
      condition.sensor === 'battery'
        ? condition.value >= 0 && condition.value <= 100
        : condition.value >= 0 && condition.value <= COMMAND_LIMITS.maxDistanceCm;
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message:
          condition.sensor === 'battery'
            ? '电量阈值必须在 0–100 之间'
            : `距离阈值必须在 0–${COMMAND_LIMITS.maxDistanceCm}cm 之间`,
      });
    }
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
  | { type: 'while'; params: { condition: Condition; body: Command[]; maxIterations?: number } }
  | { type: 'waitUntil'; params: { condition: Condition } }
  | { type: 'lockAxis'; params: { axes: Axis[] } }; // 避障「锁定」用

export const CommandSchema: z.ZodType<Command> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('takeoff'),
      params: z.object({
        altitudeCm: z.number().finite().positive().max(COMMAND_LIMITS.maxAltitudeCm),
      }),
    }),
    z.object({ type: z.literal('land') }),
    z.object({
      type: z.literal('move'),
      params: z.object({
        direction: DirectionSchema,
        distanceCm: z.number().finite().positive().max(COMMAND_LIMITS.maxDistanceCm),
        speedCmS: z.number().finite().positive().max(COMMAND_LIMITS.maxSpeedCmS).optional(),
      }),
    }),
    z.object({
      type: z.literal('rotate'),
      params: z.object({
        degrees: z
          .number()
          .finite()
          .min(-COMMAND_LIMITS.maxRotationDegrees)
          .max(COMMAND_LIMITS.maxRotationDegrees),
      }),
    }),
    z.object({
      type: z.literal('hover'),
      params: z.object({
        durationMs: z.number().finite().nonnegative().max(COMMAND_LIMITS.maxHoverMs),
      }),
    }),
    z.object({
      type: z.literal('led'),
      params: z.object({
        r: z.number().int().min(0).max(255),
        g: z.number().int().min(0).max(255),
        b: z.number().int().min(0).max(255),
      }),
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
      params: z.object({
        times: z.number().int().min(1).max(COMMAND_LIMITS.maxRepeatTimes),
        body: z.array(CommandSchema),
      }),
    }),
    z.object({
      type: z.literal('while'),
      params: z.object({
        condition: ConditionSchema,
        body: z.array(CommandSchema),
        maxIterations: z.number().int().min(1).max(COMMAND_LIMITS.maxWhileIterations).optional(),
      }),
    }),
    z.object({ type: z.literal('waitUntil'), params: z.object({ condition: ConditionSchema }) }),
    z.object({
      type: z.literal('lockAxis'),
      params: z.object({ axes: z.array(AxisSchema).max(3).refine((axes) => new Set(axes).size === axes.length, '轴不能重复') }),
    }),
  ]),
);

// ===== 程序 =====

function countCommands(commands: Command[], depth = 1): { count: number; maxDepth: number } {
  let count = 0;
  let maxDepth = depth;
  for (const command of commands) {
    count += 1;
    const children =
      command.type === 'repeat' || command.type === 'while'
        ? command.params.body
        : command.type === 'ifElse'
          ? [...command.params.then, ...(command.params.else ?? [])]
          : [];
    if (children.length > 0) {
      const nested = countCommands(children, depth + 1);
      count += nested.count;
      maxDepth = Math.max(maxDepth, nested.maxDepth);
    }
  }
  return { count, maxDepth };
}

export const CommandProgramSchema = z
  .object({
    version: z.literal(COMMAND_PROTOCOL_VERSION),
    metadata: z.object({
      name: z.string().trim().min(1).max(100),
      author: z.string().trim().min(1).max(100),
      createdAt: z.string().datetime({ offset: true }),
    }),
    commands: z.array(CommandSchema).max(COMMAND_LIMITS.maxProgramCommands),
  })
  .superRefine((program, ctx) => {
    const { count, maxDepth } = countCommands(program.commands);
    if (count > COMMAND_LIMITS.maxProgramCommands) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commands'],
        message: `程序最多包含 ${COMMAND_LIMITS.maxProgramCommands} 条指令`,
      });
    }
    if (maxDepth > COMMAND_LIMITS.maxNestingDepth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commands'],
        message: `控制结构最多嵌套 ${COMMAND_LIMITS.maxNestingDepth} 层`,
      });
    }
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
