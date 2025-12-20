/**
 * Tag Store
 * 
 * Manages user's tags for template organization.
 * Follows the same patterns as categoryStore and elementsStore.
 * 
 * Features:
 * - Fetch and cache user's tags
 * - Create/edit/delete tags
 * - Search tags for autocomplete (debounced)
 * - Optimistic updates with rollback on failure
 * - Loading and error states for UI feedback
 * 
 * Note: This store handles client-side tag state.
 * Database operations are delegated to src/lib/db/tags.ts
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { DbTag } from '@/types/database.types';
import {
    getTags,
    getTagsWithCount,
    createTag,
    updateTag,
    deleteTag,
    searchTags,
    type CreateTagData,
} from '@/lib/db/tags';

// ============================================
// State & Actions Interfaces
// ============================================

interface TagState {
    /** List of user's tags */
    tags: DbTag[];
    /** Loading state for fetch operations */
    isLoading: boolean;
    /** Error message from last failed operation */
    error: string | null;
    /** Selected tag ID (for forms) */
    selectedTagId: string | null;
    /** Whether tags have been fetched at least once */
    hasFetched: boolean;
    /** Timestamp of last fetch (for cache TTL) */
    lastFetchedAt: number | null;
    /** Search results (separate from main list) */
    searchResults: DbTag[];
    /** Loading state for search operations */
    isSearching: boolean;
    /** Current search query */
    searchQuery: string;
}

interface TagActions {
    /**
     * Fetch all tags for the current user
     * @param withCounts - If true, includes template counts (slower)
     */
    fetchTags: (withCounts?: boolean) => Promise<void>;

    /**
     * Fetch tags only if cache is stale or not yet fetched
     * @param withCounts - If true, includes template counts (slower)
     */
    fetchIfNeeded: (withCounts?: boolean) => Promise<void>;

    /**
     * Create a new tag
     * @param data - Tag name and description
     * @returns The created tag or null on error
     */
    addTag: (data: CreateTagData) => Promise<DbTag | null>;

    /**
     * Update an existing tag
     * @param id - Tag ID to update
     * @param updates - Fields to update
     * @returns The updated tag or null on error
     */
    editTag: (id: string, updates: Partial<CreateTagData>) => Promise<DbTag | null>;

    /**
     * Delete a tag
     * @param id - Tag ID to delete
     * @returns true on success, false on error
     */
    removeTag: (id: string) => Promise<boolean>;

    /**
     * Search tags by name (for autocomplete)
     * @param query - Search query
     */
    search: (query: string) => Promise<void>;

    /**
     * Clear search results
     */
    clearSearch: () => void;

    /**
     * Set the selected tag (for forms/modals)
     */
    setSelectedTag: (id: string | null) => void;

    /**
     * Get a tag by ID
     */
    getTagById: (id: string) => DbTag | undefined;

    /**
     * Get multiple tags by IDs
     */
    getTagsByIds: (ids: string[]) => DbTag[];

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

const initialState: TagState = {
    tags: [],
    isLoading: false,
    error: null,
    selectedTagId: null,
    hasFetched: false,
    lastFetchedAt: null,
    searchResults: [],
    isSearching: false,
    searchQuery: '',
};

// ============================================
// Search Debounce Controller
// ============================================

// Used to cancel pending search requests
let searchAbortController: AbortController | null = null;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Debounce delay in milliseconds
const SEARCH_DEBOUNCE_MS = 300;

// ============================================
// Store Implementation
// ============================================

export const useTagStore = create<TagState & TagActions>((set, get) => ({
    // Initial state
    ...initialState,

    // ─────────────────────────────────────────────
    // Fetch Operations
    // ─────────────────────────────────────────────

    fetchTags: async (withCounts = false) => {
        // Prevent duplicate fetches while loading
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const tags = withCounts
                ? await getTagsWithCount()
                : await getTags();

            set({
                tags,
                isLoading: false,
                hasFetched: true,
                lastFetchedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error fetching tags:', error);
            set({
                isLoading: false,
                error: 'Failed to load tags',
            });
            toast.error('Failed to load tags');
        }
    },

    fetchIfNeeded: async (withCounts = false) => {
        const { hasFetched, lastFetchedAt, isLoading } = get();
        const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
        
        // Skip if currently loading
        if (isLoading) return;
        
        // Skip if recently fetched (within cache TTL)
        if (hasFetched && lastFetchedAt && (Date.now() - lastFetchedAt) < CACHE_TTL_MS) {
            return;
        }
        
        // Fetch data
        await get().fetchTags(withCounts);
    },

    // ─────────────────────────────────────────────
    // Create Operation
    // ─────────────────────────────────────────────

    addTag: async (data) => {
        set({ error: null });

        try {
            const newTag = await createTag(data);

            if (newTag) {
                // Add to local state
                set((state) => ({
                    tags: [...state.tags, newTag],
                }));
                toast.success(`Tag "${newTag.name}" created`);
                return newTag;
            } else {
                set({ error: 'Failed to create tag' });
                toast.error('Failed to create tag');
                return null;
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            set({ error: 'Failed to create tag' });
            toast.error('Failed to create tag');
            return null;
        }
    },

    // ─────────────────────────────────────────────
    // Update Operation (Optimistic with Rollback)
    // ─────────────────────────────────────────────

    editTag: async (id, updates) => {
        const { tags } = get();
        const originalTag = tags.find((t) => t.id === id);

        if (!originalTag) {
            toast.error('Tag not found');
            return null;
        }

        // Optimistic update
        set((state) => ({
            tags: state.tags.map((t) =>
                t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
            ),
            error: null,
        }));

        try {
            const updatedTag = await updateTag(id, updates);

            if (updatedTag) {
                // Sync with server response
                set((state) => ({
                    tags: state.tags.map((t) =>
                        t.id === id ? updatedTag : t
                    ),
                }));
                toast.success(`Tag "${updatedTag.name}" updated`);
                return updatedTag;
            } else {
                // Rollback on failure
                set((state) => ({
                    tags: state.tags.map((t) =>
                        t.id === id ? originalTag : t
                    ),
                    error: 'Failed to update tag',
                }));
                toast.error('Failed to update tag');
                return null;
            }
        } catch (error) {
            console.error('Error updating tag:', error);
            // Rollback on error
            set((state) => ({
                tags: state.tags.map((t) =>
                    t.id === id ? originalTag : t
                ),
                error: 'Failed to update tag',
            }));
            toast.error('Failed to update tag');
            return null;
        }
    },

    // ─────────────────────────────────────────────
    // Delete Operation (Optimistic with Rollback)
    // ─────────────────────────────────────────────

    removeTag: async (id) => {
        const { tags, selectedTagId } = get();
        const tagToDelete = tags.find((t) => t.id === id);

        if (!tagToDelete) {
            return false;
        }

        // Optimistic removal
        set((state) => ({
            tags: state.tags.filter((t) => t.id !== id),
            selectedTagId: selectedTagId === id ? null : selectedTagId,
            error: null,
        }));

        try {
            const success = await deleteTag(id);

            if (success) {
                toast.success(`Tag "${tagToDelete.name}" deleted`);
                return true;
            } else {
                // Rollback on failure
                set((state) => ({
                    tags: [...state.tags, tagToDelete],
                    error: 'Failed to delete tag',
                }));
                toast.error('Failed to delete tag');
                return false;
            }
        } catch (error) {
            console.error('Error deleting tag:', error);
            // Rollback on error
            set((state) => ({
                tags: [...state.tags, tagToDelete],
                error: 'Failed to delete tag',
            }));
            toast.error('Failed to delete tag');
            return false;
        }
    },

    // ─────────────────────────────────────────────
    // Search Operation (Debounced)
    // ─────────────────────────────────────────────

    search: async (query) => {
        // Cancel any pending search
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        if (searchAbortController) {
            searchAbortController.abort();
        }

        // Update query immediately for UI
        set({ searchQuery: query });

        // Empty query - clear results immediately
        if (!query.trim()) {
            set({ searchResults: [], isSearching: false });
            return;
        }

        // Set searching state
        set({ isSearching: true });

        // Create new abort controller
        searchAbortController = new AbortController();
        const currentController = searchAbortController;

        // Debounce the actual search
        searchDebounceTimer = setTimeout(async () => {
            try {
                const results = await searchTags(query);

                // Only update if this request wasn't cancelled
                if (!currentController.signal.aborted) {
                    set({
                        searchResults: results,
                        isSearching: false,
                    });
                }
            } catch (error) {
                if (!currentController.signal.aborted) {
                    console.error('Error searching tags:', error);
                    set({ searchResults: [], isSearching: false });
                }
            }
        }, SEARCH_DEBOUNCE_MS);
    },

    clearSearch: () => {
        // Cancel any pending search
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        if (searchAbortController) {
            searchAbortController.abort();
        }

        set({
            searchResults: [],
            isSearching: false,
            searchQuery: '',
        });
    },

    // ─────────────────────────────────────────────
    // Selection & Lookup
    // ─────────────────────────────────────────────

    setSelectedTag: (id) => {
        set({ selectedTagId: id });
    },

    getTagById: (id) => {
        return get().tags.find((t) => t.id === id);
    },

    getTagsByIds: (ids) => {
        const { tags } = get();
        return ids
            .map((id) => tags.find((t) => t.id === id))
            .filter((t): t is DbTag => t !== undefined);
    },

    // ─────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────

    clearError: () => {
        set({ error: null });
    },

    reset: () => {
        // Clean up search timers
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        if (searchAbortController) {
            searchAbortController.abort();
        }

        set(initialState);
    },
}));

// ============================================
// Type Exports
// ============================================

export type { TagState, TagActions };
