/**
 * Layers Store
 * 
 * Manages layer ordering operations for canvas elements.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Reorder elements via drag-drop
 * - Move element forward/backward
 * - Move element to front/back
 * - zIndex management
 * 
 * Note: This store operates on elements array passed to it.
 * It returns updated elements arrays - the caller applies them.
 */

import { create } from 'zustand';
import { Element } from '@/types/editor';

interface LayersState {
    // No persistent state - this store provides pure functions
}

interface LayersActions {
    /**
     * Reorder elements via drag-drop (layers panel)
     * @param elements Current elements array
     * @param fromIndex Source index in sorted (by zIndex desc) array
     * @param toIndex Target index in sorted array
     * @returns Updated elements array with new zIndex values
     */
    reorderElements: (elements: Element[], fromIndex: number, toIndex: number) => Element[];

    /**
     * Move element one layer forward (higher zIndex)
     * @param elements Current elements array
     * @param id Element ID to move
     * @returns Updated elements array
     */
    moveElementForward: (elements: Element[], id: string) => Element[];

    /**
     * Move element one layer backward (lower zIndex)
     * @param elements Current elements array
     * @param id Element ID to move
     * @returns Updated elements array
     */
    moveElementBackward: (elements: Element[], id: string) => Element[];

    /**
     * Move element to the front (highest zIndex)
     * @param elements Current elements array
     * @param id Element ID to move
     * @returns Updated elements array
     */
    moveElementToFront: (elements: Element[], id: string) => Element[];

    /**
     * Move element to the back (lowest zIndex)
     * @param elements Current elements array
     * @param id Element ID to move
     * @returns Updated elements array
     */
    moveElementToBack: (elements: Element[], id: string) => Element[];

    /**
     * Normalize zIndex values to be sequential starting from 0
     * @param elements Current elements array
     * @returns Updated elements array with normalized zIndex
     */
    normalizeZIndexes: (elements: Element[]) => Element[];
}

export const useLayersStore = create<LayersState & LayersActions>(() => ({
    // Actions (pure functions)
    reorderElements: (elements, fromIndex, toIndex) => {
        // Sort elements by zIndex (descending - highest first for layers panel display)
        const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

        // Move element from fromIndex to toIndex
        const [removed] = sortedElements.splice(fromIndex, 1);
        sortedElements.splice(toIndex, 0, removed);

        // Update zIndex for all elements (highest zIndex at index 0)
        const updatedElements = sortedElements.map((el, idx) => ({
            ...el,
            zIndex: sortedElements.length - 1 - idx,
        }));

        return updatedElements;
    },

    moveElementForward: (elements, id) => {
        const element = elements.find((el) => el.id === id);
        if (!element) return elements;

        const maxZ = Math.max(...elements.map((el) => el.zIndex));
        if (element.zIndex >= maxZ) return elements;

        const targetZ = element.zIndex + 1;
        return elements.map((el) => {
            if (el.id === id) return { ...el, zIndex: targetZ };
            if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex - 1 };
            return el;
        });
    },

    moveElementBackward: (elements, id) => {
        const element = elements.find((el) => el.id === id);
        if (!element || element.zIndex <= 0) return elements;

        const targetZ = element.zIndex - 1;
        return elements.map((el) => {
            if (el.id === id) return { ...el, zIndex: targetZ };
            if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex + 1 };
            return el;
        });
    },

    moveElementToFront: (elements, id) => {
        const element = elements.find((el) => el.id === id);
        if (!element) return elements;

        const maxZ = Math.max(...elements.map((el) => el.zIndex));
        return elements.map((el) =>
            el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        );
    },

    moveElementToBack: (elements, id) => {
        // Set target element to -1, increment all others
        const updated = elements.map((el) => ({
            ...el,
            zIndex: el.id === id ? -1 : el.zIndex + 1,
        }));

        // Normalize zIndex to start from 0
        const minZ = Math.min(...updated.map((el) => el.zIndex));
        return updated.map((el) => ({
            ...el,
            zIndex: el.zIndex - minZ,
        }));
    },

    normalizeZIndexes: (elements) => {
        // Sort by current zIndex and reassign sequential values
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        return sorted.map((el, idx) => ({
            ...el,
            zIndex: idx,
        }));
    },
}));

// Type export for consumers
export type { LayersState, LayersActions };
