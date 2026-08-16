/**
 * RBAC 权限码（RFC-014a §2）。命名规范：`资源:动作`。
 *
 * ⚠️ 前端用这些码做导航隐藏 / 按钮禁用，仅为体验，**不是安全边界**——
 * 权限真源在后端中间件（用同一组码校验）。前端"禁用"不代表后端放行。
 */
import { z } from 'zod';

export const PermissionCodeEnum = z.enum([
  'users:read', 'users:write', 'users:role', 'users:import',
  'guardians:write',
  'courses:read', 'courses:write', 'courses:publish',
  'assets:read', 'assets:write',
  'parts:read', 'parts:write', 'parts:review',
  'kit:read', 'kit:write',
  'audit:read',
  'compliance:read', 'compliance:export',
]);
export type PermissionCode = z.infer<typeof PermissionCodeEnum>;
export const PERMISSION_CODES = PermissionCodeEnum.options;

export const AdminRoleEnum = z.enum([
  'super-admin', 'operator', 'content-editor', 'reviewer', 'teacher',
]);
export type AdminRole = z.infer<typeof AdminRoleEnum>;

/**
 * 角色 → 权限码（RFC-014a §2.2）。
 * teacher 仅本班数据，由服务端按 orgId/managedClassIds 过滤，不发全局写权限码。
 */
export const ROLE_PERMISSIONS: Record<AdminRole, PermissionCode[]> = {
  'super-admin': [...PERMISSION_CODES],
  'operator': ['users:read', 'users:write', 'audit:read', 'parts:read', 'courses:read', 'kit:read'],
  'content-editor': ['courses:read', 'courses:write', 'courses:publish', 'assets:read', 'assets:write', 'parts:read'],
  'reviewer': ['parts:read', 'parts:review', 'audit:read'],
  'teacher': [],
};

/** 当前用户（已知权限码集合）是否具备某权限码。 */
export function hasPermission(codes: readonly PermissionCode[], code: PermissionCode): boolean {
  return codes.includes(code);
}

/** 由角色推出权限码集合。 */
export function permissionsForRole(role: AdminRole): PermissionCode[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
