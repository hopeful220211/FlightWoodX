/**
 * API 通用约定（RFC-014a §1）：响应信封、错误码、分页、error 兼容层。
 * 跨前后端共享，禁止 web/api 重复定义。
 */
import { z } from 'zod';

// ── 错误码 ──
export const ApiErrorCodeEnum = z.enum([
  'UNAUTHENTICATED', // 401 无/失效 JWT
  'FORBIDDEN',       // 403 缺权限码
  'NOT_FOUND',       // 404
  'CONFLICT',        // 409 唯一约束/命名冲突
  'VALIDATION',      // 422 schema 校验失败
  'INTERNAL',        // 500
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeEnum>;

export const ApiErrorObjectSchema = z.object({
  code: ApiErrorCodeEnum,
  message: z.string(),
});
export interface ApiErrorObject {
  code: ApiErrorCode;
  message: string;
}

// ── 响应信封 ──
export type ApiOk<T> = { success: true; data: T };
export type ApiErr = { success: false; error: ApiErrorObject };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

// ── 分页 ──
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * 兼容层：现有前端调用点假设 `error` 是 string（authStore、useProjects 等），
 * 后台契约升级为结构化 `{code,message}`。此函数统一两种形态取出可读消息，
 * 避免一次性全局替换 error 类型（RFC-014a §6.3 / Codex 评审）。
 */
export function getErrorMessage(
  err: string | ApiErrorObject | null | undefined,
  fallback = '操作失败',
): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err || fallback;
  return err.message || fallback;
}
