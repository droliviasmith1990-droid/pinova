/**
 * API Request Validation Schemas
 * 
 * Zod schemas for validating API request bodies to ensure
 * data integrity before processing.
 */

import { z } from 'zod';

// ============================================
// Generated Pins Schemas
// ============================================

/**
 * Schema for POST /api/generated-pins
 * Used when saving a generated pin record
 */
export const CreateGeneratedPinSchema = z.object({
    campaign_id: z.string().uuid('Invalid campaign ID format'),
    user_id: z.string().uuid('Invalid user ID format'), // Required for service role auth
    image_url: z.string().optional(),
    data_row: z.record(z.string(), z.string()).optional(),
    status: z.enum(['completed', 'failed', 'pending']).default('completed'),
    error_message: z.string().optional(),
});

export type CreateGeneratedPinInput = z.infer<typeof CreateGeneratedPinSchema>;

// ============================================
// Upload Pin Schemas
// ============================================

/**
 * Schema for form data validation in /api/upload-pin
 * Note: File validation happens separately via FormData
 */
export const UploadPinMetadataSchema = z.object({
    campaign_id: z.string().uuid('Invalid campaign ID format'),
    row_index: z.coerce.number().int().min(0, 'Row index must be non-negative'),
});

export type UploadPinMetadata = z.infer<typeof UploadPinMetadataSchema>;

// ============================================
// Campaign Schemas
// ============================================

/**
 * Schema for creating a new campaign
 */
export const CreateCampaignSchema = z.object({
    name: z.string().min(1, 'Campaign name is required').max(255),
    template_id: z.string().uuid('Invalid template ID format'),
    csv_data: z.array(z.record(z.string(), z.string())).min(1, 'At least one CSV row required'),
    field_mapping: z.record(z.string(), z.string()).default({}),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

/**
 * Schema for updating campaign progress
 */
export const UpdateCampaignProgressSchema = z.object({
    generated_pins: z.number().int().min(0).optional(),
    current_index: z.number().int().min(0).optional(),
    status: z.enum(['pending', 'processing', 'paused', 'completed', 'failed']).optional(),
});

export type UpdateCampaignProgressInput = z.infer<typeof UpdateCampaignProgressSchema>;

// ============================================
// Validation Helper
// ============================================

/**
 * Safely parse and validate request body with Zod schema
 * Returns parsed data or formatted error response
 */
export function validateRequest<T extends z.ZodType>(
    schema: T,
    data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string; details: z.ZodIssue[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Format error message from Zod issues
    const errorMessages = result.error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`
    );

    return {
        success: false,
        error: errorMessages.join('; '),
        details: result.error.issues,
    };
}
