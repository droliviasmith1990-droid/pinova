/**
 * Category Store
 * 
 * Manages user's categories for template organization.
 * Follows the same patterns as elementsStore and templateStore.
 * 
 * Features:
 * - Fetch and cache user's categories
 * - Create/edit/delete categories
 * - Optimistic updates with rollback on failure
 * - Loading and error states for UI feedback
 * 
 * Note: This store handles client-side category state.
 * Database operations are delegated to src/lib/db/categories.ts
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { DbCategory } from '@/types/database.types';
import {
    getCategories,
    getCategoriesWithCount,
    createCategory,
    updateCategory,
    deleteCategory,
    type CreateCategoryData,
} from '@/lib/db/categories';

// ============================================
// State & Actions Interfaces
// ============================================

interface CategoryState {
    /** List of user's categories */
    categories: DbCategory[];
    /** Loading state for fetch operations */
    isLoading: boolean;
    /** Error message from last failed operation */
    error: string | null;
    /** Selected category ID (for forms) */
    selectedCategoryId: string | null;
    /** Whether categories have been fetched at least once */
    hasFetched: boolean;
    /** Timestamp of last fetch (for cache TTL) */
    lastFetchedAt: number | null;
}

interface CategoryActions {
    /**
     * Fetch all categories for the current user
     * @param withCounts - If true, includes template counts (slower)
     */
    fetchCategories: (withCounts?: boolean) => Promise<void>;

    /**
     * Fetch categories only if cache is stale or not yet fetched
     * @param withCounts - If true, includes template counts (slower)
     */
    fetchIfNeeded: (withCounts?: boolean) => Promise<void>;

    /**
     * Create a new category
     * @param data - Category name, description, icon, color
     * @returns The created category or null on error
     */
    addCategory: (data: CreateCategoryData) => Promise<DbCategory | null>;

    /**
     * Update an existing category
     * @param id - Category ID to update
     * @param updates - Fields to update
     * @returns The updated category or null on error
     */
    editCategory: (id: string, updates: Partial<CreateCategoryData>) => Promise<DbCategory | null>;

    /**
     * Delete a category
     * @param id - Category ID to delete
     * @returns true on success, false on error
     */
    removeCategory: (id: string) => Promise<boolean>;

    /**
     * Set the selected category (for forms/modals)
     */
    setSelectedCategory: (id: string | null) => void;

    /**
     * Get a category by ID
     */
    getCategoryById: (id: string) => DbCategory | undefined;

    /**
     * Get a category by slug
     */
    getCategoryBySlug: (slug: string) => DbCategory | undefined;

    /**
     * Clear error state
     */
    clearError: () => void;

    /**
     * Reset store to initial state
     */
    reset: () => void;
}

// ============================================
// Initial State
// ============================================

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

const initialState: CategoryState = {
    categories: [],
    isLoading: false,
    error: null,
    selectedCategoryId: null,
    hasFetched: false,
    lastFetchedAt: null,
};

// ============================================
// Store Implementation
// ============================================

export const useCategoryStore = create<CategoryState & CategoryActions>((set, get) => ({
    // Initial state
    ...initialState,

    // ─────────────────────────────────────────────
    // Fetch Operations
    // ─────────────────────────────────────────────

    fetchCategories: async (withCounts = false) => {
        // Prevent duplicate fetches while loading
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const categories = withCounts
                ? await getCategoriesWithCount()
                : await getCategories();

            set({
                categories,
                isLoading: false,
                hasFetched: true,
                lastFetchedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            set({
                isLoading: false,
                error: 'Failed to load categories',
            });
            toast.error('Failed to load categories');
        }
    },

    fetchIfNeeded: async (withCounts = false) => {
        const { hasFetched, lastFetchedAt, isLoading } = get();
        
        // Skip if currently loading
        if (isLoading) return;
        
        // Skip if recently fetched (within cache TTL)
        if (hasFetched && lastFetchedAt && (Date.now() - lastFetchedAt) < CACHE_TTL_MS) {
            return;
        }
        
        // Fetch data
        await get().fetchCategories(withCounts);
    },


    // ─────────────────────────────────────────────
    // Create Operation (Optimistic)
    // ─────────────────────────────────────────────

    addCategory: async (data) => {
        set({ error: null });

        try {
            const newCategory = await createCategory(data);

            if (newCategory) {
                // Add to local state
                set((state) => ({
                    categories: [...state.categories, newCategory],
                }));
                toast.success(`Category "${newCategory.name}" created`);
                return newCategory;
            } else {
                set({ error: 'Failed to create category' });
                toast.error('Failed to create category');
                return null;
            }
        } catch (error) {
            console.error('Error creating category:', error);
            set({ error: 'Failed to create category' });
            toast.error('Failed to create category');
            return null;
        }
    },

    // ─────────────────────────────────────────────
    // Update Operation (Optimistic with Rollback)
    // ─────────────────────────────────────────────

    editCategory: async (id, updates) => {
        const { categories } = get();
        const originalCategory = categories.find((c) => c.id === id);

        if (!originalCategory) {
            toast.error('Category not found');
            return null;
        }

        // Optimistic update
        set((state) => ({
            categories: state.categories.map((c) =>
                c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
            ),
            error: null,
        }));

        try {
            const updatedCategory = await updateCategory(id, updates);

            if (updatedCategory) {
                // Sync with server response (in case slug changed etc.)
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? updatedCategory : c
                    ),
                }));
                toast.success(`Category "${updatedCategory.name}" updated`);
                return updatedCategory;
            } else {
                // Rollback on failure
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? originalCategory : c
                    ),
                    error: 'Failed to update category',
                }));
                toast.error('Failed to update category');
                return null;
            }
        } catch (error) {
            console.error('Error updating category:', error);
            // Rollback on error
            set((state) => ({
                categories: state.categories.map((c) =>
                    c.id === id ? originalCategory : c
                ),
                error: 'Failed to update category',
            }));
            toast.error('Failed to update category');
            return null;
        }
    },

    // ─────────────────────────────────────────────
    // Delete Operation (Optimistic with Rollback)
    // ─────────────────────────────────────────────

    removeCategory: async (id) => {
        const { categories, selectedCategoryId } = get();
        const categoryToDelete = categories.find((c) => c.id === id);

        if (!categoryToDelete) {
            return false;
        }

        // Optimistic removal
        set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
            selectedCategoryId: selectedCategoryId === id ? null : selectedCategoryId,
            error: null,
        }));

        try {
            const success = await deleteCategory(id);

            if (success) {
                toast.success(`Category "${categoryToDelete.name}" deleted`);
                return true;
            } else {
                // Rollback on failure
                set((state) => ({
                    categories: [...state.categories, categoryToDelete],
                    error: 'Failed to delete category',
                }));
                toast.error('Failed to delete category');
                return false;
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            // Rollback on error
            set((state) => ({
                categories: [...state.categories, categoryToDelete],
                error: 'Failed to delete category',
            }));
            toast.error('Failed to delete category');
            return false;
        }
    },

    // ─────────────────────────────────────────────
    // Selection & Lookup
    // ─────────────────────────────────────────────

    setSelectedCategory: (id) => {
        set({ selectedCategoryId: id });
    },

    getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
    },

    getCategoryBySlug: (slug) => {
        return get().categories.find((c) => c.slug === slug.toLowerCase());
    },

    // ─────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────

    clearError: () => {
        set({ error: null });
    },

    reset: () => {
        set(initialState);
    },
}));

// ============================================
// Type Exports
// ============================================

export type { CategoryState, CategoryActions };
