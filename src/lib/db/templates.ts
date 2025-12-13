// Template database operations
import { supabase, isSupabaseConfigured, getCurrentUserId } from '../supabase';
import { DbTemplate } from '@/types/database.types';
import { Element, CanvasSize } from '@/types/editor';

// ============================================
// Types for template operations
// ============================================
export interface SaveTemplateData {
    id?: string;
    name: string;
    description?: string;
    canvas_size: CanvasSize;
    background_color: string;
    elements: Element[];
    thumbnail_url?: string;
    category?: string;
    is_public?: boolean;
}

export interface TemplateListItem {
    id: string;
    name: string;
    thumbnail_url: string | null;
    category: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Template CRUD Operations
// ============================================

/**
 * Save a template (insert or update)
 * @param data Template data to save
 * @returns The saved template or null on error
 */
export async function saveTemplate(data: SaveTemplateData): Promise<DbTemplate | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, skipping template save');
        return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return null;
    }

    try {
        if (data.id) {
            // Update existing template
            const updateData = {
                name: data.name,
                description: data.description || null,
                canvas_size: data.canvas_size,
                background_color: data.background_color,
                elements: data.elements,
                thumbnail_url: data.thumbnail_url || null,
                category: data.category || null,
                is_public: data.is_public ?? false,
            };

            const { data: template, error } = await supabase
                .from('templates')
                .update(updateData)
                .eq('id', data.id)
                .eq('user_id', userId) // Ensure user owns the template
                .select()
                .single();

            if (error) {
                console.error('Error updating template:', error);
                return null;
            }

            return template;
        } else {
            // Insert new template
            const insertData = {
                user_id: userId,
                name: data.name,
                description: data.description || null,
                canvas_size: data.canvas_size,
                background_color: data.background_color,
                elements: data.elements,
                thumbnail_url: data.thumbnail_url || null,
                category: data.category || null,
                is_public: data.is_public ?? false,
            };

            const { data: template, error } = await supabase
                .from('templates')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('Error inserting template:', error);
                return null;
            }

            return template;
        }
    } catch (error) {
        console.error('Error saving template:', error);
        return null;
    }
}

/**
 * Get all templates for the current user
 * @returns Array of templates or empty array on error
 */
export async function getTemplates(): Promise<TemplateListItem[]> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return [];
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.warn('User not authenticated');
        return [];
    }

    try {
        const { data: templates, error } = await supabase
            .from('templates')
            .select('id, name, thumbnail_url, category, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            return [];
        }

        return templates || [];
    } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
    }
}

/**
 * Get public templates for the gallery
 * @returns Array of public templates
 */
export async function getPublicTemplates(): Promise<TemplateListItem[]> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return [];
    }

    try {
        const { data: templates, error } = await supabase
            .from('templates')
            .select('id, name, thumbnail_url, category, created_at, updated_at')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching public templates:', error);
            return [];
        }

        return templates || [];
    } catch (error) {
        console.error('Error fetching public templates:', error);
        return [];
    }
}

/**
 * Get a single template by ID with full data
 * @param templateId Template ID
 * @returns Full template data or null
 */
export async function getTemplate(templateId: string): Promise<DbTemplate | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return null;
    }

    try {
        const { data: template, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) {
            console.error('Error fetching template:', error);
            return null;
        }

        return template;
    } catch (error) {
        console.error('Error fetching template:', error);
        return null;
    }
}

/**
 * Delete a template
 * @param templateId Template ID to delete
 * @returns true on success, false on error
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return false;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return false;
    }

    try {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', templateId)
            .eq('user_id', userId); // Ensure user owns the template

        if (error) {
            console.error('Error deleting template:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting template:', error);
        return false;
    }
}

/**
 * Duplicate a template
 * @param templateId Template ID to duplicate
 * @param newName Optional custom name for the duplicate
 * @returns The duplicated template or null on error
 */
export async function duplicateTemplate(templateId: string, newName?: string): Promise<DbTemplate | null> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured');
        return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('User not authenticated');
        return null;
    }

    try {
        // First, get the original template
        const original = await getTemplate(templateId);
        if (!original) {
            console.error('Original template not found');
            return null;
        }

        // Create a duplicate with a new name
        const duplicateData: SaveTemplateData = {
            name: newName || `${original.name} (Copy)`,
            description: original.description || undefined,
            canvas_size: original.canvas_size,
            background_color: original.background_color,
            elements: original.elements,
            category: original.category || undefined,
            is_public: false, // Duplicates are private by default
        };

        return await saveTemplate(duplicateData);
    } catch (error) {
        console.error('Error duplicating template:', error);
        return null;
    }
}
