/**
 * Template Types
 * 
 * Shared types and interfaces for template operations.
 * Used across CRUD, filter, and metadata modules.
 */

import { DbCategory, DbTag } from '@/types/database.types';
import { Element, CanvasSize } from '@/types/editor';

// ============================================
// Template Data Types
// ============================================

/**
 * Data required to save a template (create or update)
 */
export interface SaveTemplateData {
    id?: string;
    name: string;
    description?: string;
    canvas_size: CanvasSize;
    background_color: string;
    elements: Element[];
    thumbnail_url?: string;
    category?: string;
    category_id?: string;
    is_public?: boolean;
    is_featured?: boolean;
}

/**
 * Template summary for list views (lighter than full DbTemplate)
 */
export interface TemplateListItem {
    id: string;
    name: string;
    thumbnail_url: string | null;
    category: string | null;
    category_id: string | null;
    is_featured: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
    // Joined data
    category_data?: DbCategory | null;
    tags?: DbTag[];
}

/**
 * Template with elements for dynamic data extraction
 */
export interface TemplateWithElements extends TemplateListItem {
    elements?: Element[];
}

// ============================================
// Filter & Query Types
// ============================================

/**
 * Filters for querying templates
 */
export interface TemplateFilters {
    categoryId?: string;
    tagIds?: string[];
    search?: string;
    isFeatured?: boolean;
    isPublic?: boolean;
}

/**
 * Metadata update for templates
 */
export interface TemplateMetadata {
    name?: string;
    categoryId?: string | null;
    tagIds?: string[];
    isFeatured?: boolean;
    description?: string;
}

// ============================================
// Query Result Types
// ============================================

/**
 * Result of checking template name existence
 */
export interface TemplateNameCheckResult {
    exists: boolean;
    existingId?: string;
}
