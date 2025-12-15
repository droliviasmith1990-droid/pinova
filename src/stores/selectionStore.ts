/**
 * Selection Store
 * 
 * Manages which elements are currently selected in the editor.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Single element selection
 * - Multi-select with toggle
 * - Clear selection
 */

import { create } from 'zustand';

interface SelectionState {
    selectedIds: string[];
}

interface SelectionActions {
    selectElement: (id: string | null) => void;
    toggleSelection: (id: string) => void;
    setSelectedIds: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState & SelectionActions>((set, get) => ({
    // State
    selectedIds: [],

    // Actions
    selectElement: (id) => {
        set({ selectedIds: id ? [id] : [] });
    },

    toggleSelection: (id) => {
        set((state) => {
            if (state.selectedIds.includes(id)) {
                return { selectedIds: state.selectedIds.filter(sid => sid !== id) };
            } else {
                return { selectedIds: [...state.selectedIds, id] };
            }
        });
    },

    setSelectedIds: (ids) => {
        set({ selectedIds: ids });
    },

    clearSelection: () => {
        set({ selectedIds: [] });
    },

    isSelected: (id) => {
        return get().selectedIds.includes(id);
    },
}));

// Type export for consumers
export type { SelectionState, SelectionActions };
