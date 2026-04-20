/**
 * @fwx/parts-schema
 * FlightWoodX 零件类型定义，前后端共享。
 * 详细规格见 docs/03-parts-system.md
 */
import { z } from 'zod';

export const PartCategoryEnum = z.enum([
  'HUB', 'ARM', 'PLATE', 'JOINT', 'LAND', 'DECO', 'MOTOR', 'PROP',
]);
export type PartCategory = z.infer<typeof PartCategoryEnum>;

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

export const BuildStepEnum = z.enum([
  'HUB', 'ARM', 'MOTOR', 'GUARD', 'DECO', 'REVIEW',
]);
export type BuildStep = z.infer<typeof BuildStepEnum>;
