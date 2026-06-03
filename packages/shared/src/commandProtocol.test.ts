import { describe, it, expect } from 'vitest';
import {
  CommandProgramSchema,
  serializeProgram,
  deserializeProgram,
  type CommandProgram,
} from './commandProtocol';

/**
 * RFC-011 §2.5 检查点：验证指令协议 IR 能表达
 * 「遇障停住、锁定、只能左右」这个避障场景，并能正确序列化 / 反序列化。
 */
describe('commandProtocol IR', () => {
  // 起飞 → 等到前向距离 < 30cm（遇障）→ 锁定前后与升降轴（只剩左右）→ 横向避让 → 降落
  const obstacleAvoidance: CommandProgram = {
    version: '1.0',
    metadata: { name: '避障停住只能左右', author: 'tester', createdAt: '2026-06-03T00:00:00.000Z' },
    commands: [
      { type: 'takeoff', params: { altitudeCm: 100 } },
      { type: 'waitUntil', params: { condition: { sensor: 'frontDistanceCm', op: '<', value: 30 } } },
      // 锁定前后(forward)与升降(vertical)，只保留 lateral —— 即「只能左右」
      { type: 'lockAxis', params: { axes: ['forward', 'vertical'] } },
      { type: 'move', params: { direction: 'right', distanceCm: 50, speedCmS: 20 } },
      { type: 'land' },
    ],
  };

  it('该场景是合法的 CommandProgram', () => {
    expect(() => CommandProgramSchema.parse(obstacleAvoidance)).not.toThrow();
  });

  it('序列化后再反序列化得到等价对象（roundtrip）', () => {
    const json = serializeProgram(obstacleAvoidance);
    expect(typeof json).toBe('string');
    const restored = deserializeProgram(json);
    expect(restored).toEqual(obstacleAvoidance);
  });

  it('支持嵌套控制流（repeat 内含避障组合）的 roundtrip', () => {
    const nested: CommandProgram = {
      version: '1.0',
      metadata: { name: 'nested', author: 'tester', createdAt: '2026-06-03T00:00:00.000Z' },
      commands: [
        {
          type: 'repeat',
          params: {
            times: 4,
            body: [
              { type: 'move', params: { direction: 'forward', distanceCm: 100 } },
              {
                type: 'ifElse',
                params: {
                  condition: { sensor: 'frontDistanceCm', op: '<', value: 30 },
                  then: [{ type: 'lockAxis', params: { axes: ['forward'] } }],
                  else: [{ type: 'hover', params: { durationMs: 500 } }],
                },
              },
            ],
          },
        },
      ],
    };
    expect(deserializeProgram(serializeProgram(nested))).toEqual(nested);
  });

  it('非法结构（未知 axis）会被 schema 拒绝', () => {
    const bad = {
      version: '1.0',
      metadata: { name: 'bad', author: 'tester', createdAt: '2026-06-03T00:00:00.000Z' },
      commands: [{ type: 'lockAxis', params: { axes: ['diagonal'] } }],
    };
    expect(() => CommandProgramSchema.parse(bad)).toThrow();
  });
});
