/**
 * @fwx/parts-schema
 * FlightWoodX 零件类型定义，前后端共享。
 * 详细规格见 docs/03-parts-system.md
 */
import { z } from 'zod';

// Physical part categories (determined by folder, not filename)
export const PartCategoryEnum = z.enum([
  'mainboard', 'landing', 'guard', 'joint', 'MOTOR', 'PROP',
]);
export type PartCategory = z.infer<typeof PartCategoryEnum>;

// Legacy aliases for backwards compatibility
export const CATEGORY_ALIASES: Record<string, PartCategory> = {
  HUB: 'mainboard', core: 'mainboard',
  ARM: 'landing', arm: 'landing',
  PLATE: 'guard', JOINT: 'guard', LAND: 'guard',
  DECO: 'joint', deco: 'joint',
};

export const SnapPointSchema = z.object({
  id: z.string(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  normal: z.tuple([z.number(), z.number(), z.number()]),
  type: z.enum(['arm-mount', 'guard-mount', 'deco-mount', 'motor-mount']),
  mirrorOf: z.string().optional(),
});
export type SnapPoint = z.infer<typeof SnapPointSchema>;

export const PartSchema = z.object({
  partNumber: z.string().regex(/^FW-[A-Z]+-\d{3}$/),
  category: PartCategoryEnum,
  name: z.object({ zh: z.string(), en: z.string() }),
  description: z.object({ zh: z.string(), en: z.string() }),
  asset: z.object({
    glbPath: z.string(),
    thumbnailPath: z.string(),
    previewPath: z.string().optional(),
  }),
  geometry: z.object({
    boundingBox: z.object({
      min: z.tuple([z.number(), z.number(), z.number()]),
      max: z.tuple([z.number(), z.number(), z.number()]),
    }),
    volumeCm3: z.number(),
    estimatedWeightG: z.number(),
  }),
  snapPoints: z.array(SnapPointSchema),
  compatibility: z.object({
    requiresCategory: z.array(PartCategoryEnum).optional(),
    acceptsCategory: z.array(PartCategoryEnum).optional(),
    minQuantity: z.number().optional(),
    maxQuantity: z.number().optional(),
    symmetryRequired: z.boolean().optional(),
  }),
  layer: z.enum(['single', 'double']).optional(),
  tags: z.array(z.string()),
  deprecated: z.boolean().optional(),
});
export type Part = z.infer<typeof PartSchema>;

// Step IDs are internal identifiers, NOT category names.
// 'HUB' = mainboard step, 'ARM' = landing step, etc.
// Category names are: mainboard, landing, guard, joint.
export const BuildStepEnum = z.enum([
  'HUB', 'ARM', 'GUARD', 'DECO', 'REVIEW', 'MOTOR',
]);
export type BuildStep = z.infer<typeof BuildStepEnum>;

// Re-export registry and compatibility
export { PART_REGISTRY, STEP_CATEGORIES, BUILD_STEPS, STEP_INFO, CATEGORY_FOLDERS, CATEGORY_LABELS, getPartByNumber, getPartById, getPartsByCategory, getPartsForStep, getPartCategoryInfo, getPopulatedCategories, getCategoryStep } from './registry';
export type { PartEntry, PartCategoryInfo } from './registry';
export { canAddPart, canAdvanceStep, getNextStep, getPrevStep, isCategoryAllowedInStep } from './compatibility';
export type { BuildState, CompatibilityResult, CompatibilityReason } from './compatibility';
