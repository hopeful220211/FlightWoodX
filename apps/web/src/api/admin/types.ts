/**
 * 后台 API 契约（RFC-014a §4）。real 与 mock 两实现满足同一 AdminApi 接口。
 * DTO 全部来自 @fwx/shared（禁止重复定义）。
 */
import type {
  ApiResponse,
  Paginated,
  AdminOverview,
  AdminUserListItem,
  AdminUserDetail,
  GuardianLinkDTO,
  UserImportResult,
  CourseTree,
  PartAdminItem,
  KitItemDTO,
  AuditLogDTO,
  RoleChangePayload,
  UserPatchPayload,
  GuardianCreatePayload,
} from '@fwx/shared'

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface UserListQuery extends PageQuery {
  role?: string
  q?: string
  status?: string
}

export interface PartListQuery extends PageQuery {
  category?: string
  reviewStatus?: string
  q?: string
}

export interface AdminApi {
  getOverview(): Promise<ApiResponse<AdminOverview>>

  // ── 用户 (M2) ──
  listUsers(q?: UserListQuery): Promise<ApiResponse<Paginated<AdminUserListItem>>>
  getUser(id: string): Promise<ApiResponse<AdminUserDetail>>
  patchUser(id: string, body: UserPatchPayload): Promise<ApiResponse<AdminUserDetail>>
  changeUserRole(id: string, body: RoleChangePayload): Promise<ApiResponse<AdminUserDetail>>
  resetUserPassword(id: string): Promise<ApiResponse<{ resetLink?: string }>>
  verifyTeacher(id: string): Promise<ApiResponse<AdminUserDetail>>
  importUsers(file: File): Promise<ApiResponse<UserImportResult>>
  createGuardian(body: GuardianCreatePayload): Promise<ApiResponse<GuardianLinkDTO>>

  // ── 列表读（各模块页面用；CRUD 在各自 Phase 增补）──
  listCourses(): Promise<ApiResponse<CourseTree[]>>
  listParts(q?: PartListQuery): Promise<ApiResponse<Paginated<PartAdminItem>>>
  listKit(): Promise<ApiResponse<KitItemDTO[]>>
  listAudit(q?: PageQuery): Promise<ApiResponse<Paginated<AuditLogDTO>>>
}
