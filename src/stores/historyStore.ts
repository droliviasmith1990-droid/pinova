/**
 * History Store
 * 
 * Manages undo/redo history with full canvas state snapshots.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Canvas state snapshots (elements, canvasSize, backgroundColor)
 * - Undo/Redo navigation
 * - History limit (50 snapshots max)
 * - History state queries (canUndo, canRedo)
 */

import { create } from 'zustand';
import { cloneDeep } from 'lodash';
import { Element, CanvasSize, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/editor';

// History snapshot includes elements and canvas configuration
export interface HistorySnapshot {
    elements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
}

interface HistoryState {
    history: HistorySnapshot[];
    historyIndex: number;
    maxHistory: number;
}

interface HistoryActions {
    /**
     * Push current state to history
     * Call this BEFORE making changes to preserve the current state
     */
    pushSnapshot: (snapshot: HistorySnapshot) => void;

    /**
     * Undo - returns the previous snapshot or null if can't undo
     */
    undo: () => HistorySnapshot | null;

    /**
     * Redo - returns the next snapshot or null if can't redo
     */
    redo: () => HistorySnapshot | null;

    /**
     * Check if undo is available
     */
    canUndo: () => boolean;

    /**
     * Check if redo is available
     */
    canRedo: () => boolean;

    /**
     * Get current snapshot without modifying history
     */
    getCurrentSnapshot: () => HistorySnapshot | null;

    /**
     * Reset history with initial snapshot
     */
    resetHistory: (initialSnapshot?: HistorySnapshot) => void;

    /**
     * Initialize history with a snapshot (for loading templates)
     */
    initializeWithSnapshot: (snapshot: HistorySnapshot) => void;
}

const createInitialSnapshot = (): HistorySnapshot => ({
    elements: [],
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    backgroundColor: '#FFFFFF',
});

const initialState: HistoryState = {
    history: [createInitialSnapshot()],
    historyIndex: 0,
    maxHistory: 50,
};

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
    // Initial state
    ...initialState,

    // Actions
    pushSnapshot: (snapshot) => {
        set((state) => {
            // Clone the snapshot to prevent mutations
            const clonedSnapshot: HistorySnapshot = {
                elements: cloneDeep(snapshot.elements),
                canvasSize: { ...snapshot.canvasSize },
                backgroundColor: snapshot.backgroundColor,
            };

            // Truncate any future history (redo stack) when making new changes
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(clonedSnapshot);

            // Limit history size
            if (newHistory.length > state.maxHistory) {
                newHistory.shift();
                return {
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                };
            }

            return {
                history: newHistory,
                historyIndex: state.historyIndex + 1,
            };
        });
    },

    undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return null;

        const newIndex = state.historyIndex - 1;
        const snapshot = state.history[newIndex];

        set({ historyIndex: newIndex });

        // Return a cloned snapshot to prevent mutations
        return {
            elements: cloneDeep(snapshot.elements),
            canvasSize: { ...snapshot.canvasSize },
            backgroundColor: snapshot.backgroundColor,
        };
    },

    redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return null;

        const newIndex = state.historyIndex + 1;
        const snapshot = state.history[newIndex];

        set({ historyIndex: newIndex });

        // Return a cloned snapshot to prevent mutations
        return {
            elements: cloneDeep(snapshot.elements),
            canvasSize: { ...snapshot.canvasSize },
            backgroundColor: snapshot.backgroundColor,
        };
    },

    canUndo: () => {
        return get().historyIndex > 0;
    },

    canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
    },

    getCurrentSnapshot: () => {
        const state = get();
        const snapshot = state.history[state.historyIndex];
        if (!snapshot) return null;

        return {
            elements: cloneDeep(snapshot.elements),
            canvasSize: { ...snapshot.canvasSize },
            backgroundColor: snapshot.backgroundColor,
        };
    },

    resetHistory: (initialSnapshot) => {
        const snapshot = initialSnapshot || createInitialSnapshot();
        set({
            history: [snapshot],
            historyIndex: 0,
        });
    },

    initializeWithSnapshot: (snapshot) => {
        set({
            history: [{
                elements: cloneDeep(snapshot.elements),
                canvasSize: { ...snapshot.canvasSize },
                backgroundColor: snapshot.backgroundColor,
            }],
            historyIndex: 0,
        });
    },
}));

// Type export for consumers
export type { HistoryState, HistoryActions };
