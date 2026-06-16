/**
 * 后台 P0 DTO（RFC-014a §3），入 @fwx/shared，禁止 web/api 重复定义。
 * 列表/展示 DTO 用纯 TS type；高风险写操作 payload 配 zod（Codex 评审建议）。
 */
import { z } from 'zod';

// ════════ 用户（M2）════════
export interface AdminUserListItem {
  id: string;
  username: string;
  nickname?: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  status: 'active' | 'disabled';
  grade?: string;
  school?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface GuardianLinkDTO {
  id: string;
  guardianUserId: string;
  studentUserId: string;
  status: 'pending' | 'authorized' | 'revoked';
  authorizedAt?: string;
  revokedAt?: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  email?: string; // 列表脱敏，详情按权限返回
  teacherCert?: {
    status: 'none' | 'pending' | 'verified';
    submittedAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  orgId?: string;
  guardians?: GuardianLinkDTO[];
  stats?: { projects: number; lessonsDone: number; competitions: number };
}

export interface UserImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

// ════════ 课程（M3）════════
export interface CourseDTO {
  id: string;
  title: string;
  order: number;
  status: 'draft' | 'published';
  version: number;
  publishedAt?: string;
  coverAssetId?: string;
}

export interface LessonDTO {
  id: string;
  courseId: string;
  title: string;
  order: number;
  duration: number;
  content: string; // Markdown
  assets: string[]; // AssetDTO.id[]，不内联
  refs?: { partCategory?: string; sceneId?: string; templateId?: string };
  status: 'draft' | 'published';
  version: number;
}

export interface CourseTree extends CourseDTO {
  lessons: Pick<LessonDTO, 'id' | 'title' | 'order' | 'duration' | 'status'>[];
}

// ════════ 资产（M3）════════
export interface AssetDTO {
  id: string;
  kind: 'image' | 'video' | 'glb' | 'thumbnail';
  url: string;
  uploadedBy: string;
  refCount: number;
  createdAt: string;
}

// ════════ 零件（M4）════════
export interface PartAdminItem {
  partNumber: string; // FW-[A-Z]+-\d{3}
  category: string; // PartCategoryEnum（避免 shared→parts-schema 耦合，用 string）
  nameZh: string;
  nameEn: string;
  glbPath: string;
  thumbnailPath: string;
  snapPointCount: number;
  layer?: 'single' | 'double';
  source: 'official' | 'ugc';
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  version: number;
  deprecated: boolean;
  bomItemIds: string[]; // 关联 KitItem
}

export interface KitItemDTO {
  id: string;
  name: string;
  type: 'motor' | 'prop' | 'flightController' | 'sensor' | 'wood';
  spec: string;
  priceCents: number; // 以分存储
  imageUrl?: string;
}

// ════════ 审计（M0）════════
export interface AuditLogDTO {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  diffSummary?: string;
}

// ════════ 概览（Overview）════════
// RFC 仅写"概览统计"，此处定一个具体形态供前端落地。
export interface AdminOverview {
  users: { total: number; students: number; teachers: number; admins: number };
  courses: { total: number; published: number };
  parts: { total: number; pendingReview: number };
  recentAudit: AuditLogDTO[];
}

// ════════ 高风险写操作 payload（zod）════════
export const UserRoleEnum = z.enum(['student', 'teacher', 'parent', 'admin']);
export const UserStatusEnum = z.enum(['active', 'disabled']);

export const RoleChangePayloadSchema = z.object({ role: UserRoleEnum });
export type RoleChangePayload = z.infer<typeof RoleChangePayloadSchema>;

export const UserPatchPayloadSchema = z.object({
  nickname: z.string().min(1).max(40).optional(),
  status: UserStatusEnum.optional(),
  grade: z.string().max(20).optional(),
  school: z.string().max(80).optional(),
});
export type UserPatchPayload = z.infer<typeof UserPatchPayloadSchema>;

export const GuardianCreatePayloadSchema = z.object({
  guardianUserId: z.string().min(1),
  studentUserId: z.string().min(1),
});
export type GuardianCreatePayload = z.infer<typeof GuardianCreatePayloadSchema>;

export const PartReviewPayloadSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected', 'pending']),
  comment: z.string().max(500).optional(),
});
export type PartReviewPayload = z.infer<typeof PartReviewPayloadSchema>;
