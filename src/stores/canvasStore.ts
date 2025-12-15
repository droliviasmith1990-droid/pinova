/**
 * Canvas Store
 * 
 * Manages canvas configuration including size, background color, and zoom.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Canvas dimensions (constrained 300-5000)
 * - Background color
 * - Zoom level (0.1 - 3.0)
 * - Zoom to fit calculation
 */

import { create } from 'zustand';
import { CanvasSize, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/editor';

interface CanvasState {
    canvasSize: CanvasSize;
    backgroundColor: string;
    zoom: number;
}

interface CanvasActions {
    setCanvasSize: (width: number, height: number) => void;
    setBackgroundColor: (color: string) => void;
    setZoom: (zoomOrUpdater: number | ((prevZoom: number) => number)) => void;
    zoomToFit: (viewportWidth: number, viewportHeight: number) => void;
    resetCanvas: () => void;
}

const initialState: CanvasState = {
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    backgroundColor: '#FFFFFF',
    zoom: 0.5,
};

export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
    // Initial state
    ...initialState,

    // Actions
    setCanvasSize: (width, height) => {
        set({
            canvasSize: {
                width: Math.max(300, Math.min(5000, width)),
                height: Math.max(300, Math.min(5000, height)),
            },
        });
    },

    setBackgroundColor: (color) => {
        set({ backgroundColor: color });
    },

    setZoom: (zoomOrUpdater) => {
        set((state) => ({
            zoom: Math.max(0.1, Math.min(3,
                typeof zoomOrUpdater === 'function'
                    ? zoomOrUpdater(state.zoom)
                    : zoomOrUpdater
            )),
        }));
    },

    zoomToFit: (viewportWidth, viewportHeight) => {
        const { canvasSize } = get();
        const padding = 80;
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;

        const scaleX = availableWidth / canvasSize.width;
        const scaleY = availableHeight / canvasSize.height;
        const optimalZoom = Math.min(scaleX, scaleY, 1);

        set({ zoom: Math.max(0.1, Math.min(3, optimalZoom)) });
    },

    resetCanvas: () => {
        set(initialState);
    },
}));

// Type export for consumers
export type { CanvasState, CanvasActions };
