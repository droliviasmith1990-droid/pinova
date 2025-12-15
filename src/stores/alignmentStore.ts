/**
 * Alignment Store
 * 
 * Manages element alignment and distribution operations.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Align single element to canvas edges/center
 * - Align multiple selected elements relative to selection bounding box
 * - Distribute elements evenly (horizontal/vertical)
 * 
 * Note: This store provides pure functions that return updated elements.
 * The caller is responsible for applying changes and pushing history.
 */

import { create } from 'zustand';
import { Element, CanvasSize } from '@/types/editor';

type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
type DistributeDirection = 'horizontal' | 'vertical';

interface AlignmentState {
    // No persistent state - this store provides pure functions
}

interface AlignmentActions {
    /**
     * Align a single element to canvas edges/center
     * @param elements Current elements array
     * @param id Element ID to align
     * @param alignment Alignment type
     * @param canvasSize Canvas dimensions
     * @returns Updated elements array
     */
    alignElement: (
        elements: Element[],
        id: string,
        alignment: Alignment,
        canvasSize: CanvasSize
    ) => Element[];

    /**
     * Align multiple elements relative to their selection bounding box
     * @param elements Current elements array
     * @param selectedIds IDs of selected elements
     * @param alignment Alignment type
     * @returns Updated elements array
     */
    alignSelectedElements: (
        elements: Element[],
        selectedIds: string[],
        alignment: Alignment
    ) => Element[];

    /**
     * Distribute elements evenly along an axis
     * @param elements Current elements array
     * @param selectedIds IDs of selected elements (need 3+ for distribution)
     * @param direction Distribution direction
     * @returns Updated elements array
     */
    distributeSelectedElements: (
        elements: Element[],
        selectedIds: string[],
        direction: DistributeDirection
    ) => Element[];
}

export const useAlignmentStore = create<AlignmentState & AlignmentActions>(() => ({
    // Actions (pure functions)
    alignElement: (elements, id, alignment, canvasSize) => {
        const element = elements.find((el) => el.id === id);
        if (!element) return elements;

        let update: Partial<Element> = {};
        const { width: cw, height: ch } = canvasSize;

        switch (alignment) {
            case 'left':
                update = { x: 0 };
                break;
            case 'center':
                update = { x: (cw - element.width) / 2 };
                break;
            case 'right':
                update = { x: cw - element.width };
                break;
            case 'top':
                update = { y: 0 };
                break;
            case 'middle':
                update = { y: (ch - element.height) / 2 };
                break;
            case 'bottom':
                update = { y: ch - element.height };
                break;
        }

        return elements.map((el) =>
            el.id === id ? { ...el, ...update } as Element : el
        );
    },

    alignSelectedElements: (elements, selectedIds, alignment) => {
        if (selectedIds.length < 2) return elements;

        const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
        if (selectedElements.length < 2) return elements;

        // Calculate bounding box of selection
        const minX = Math.min(...selectedElements.map((el) => el.x));
        const maxX = Math.max(...selectedElements.map((el) => el.x + el.width));
        const minY = Math.min(...selectedElements.map((el) => el.y));
        const maxY = Math.max(...selectedElements.map((el) => el.y + el.height));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        return elements.map((el) => {
            if (!selectedIds.includes(el.id)) return el;

            let update: Partial<Element> = {};
            switch (alignment) {
                case 'left':
                    update = { x: minX };
                    break;
                case 'center':
                    update = { x: centerX - el.width / 2 };
                    break;
                case 'right':
                    update = { x: maxX - el.width };
                    break;
                case 'top':
                    update = { y: minY };
                    break;
                case 'middle':
                    update = { y: centerY - el.height / 2 };
                    break;
                case 'bottom':
                    update = { y: maxY - el.height };
                    break;
            }
            return { ...el, ...update } as Element;
        });
    },

    distributeSelectedElements: (elements, selectedIds, direction) => {
        if (selectedIds.length < 3) return elements; // Need at least 3 for distribution

        const selectedElements = elements
            .filter((el) => selectedIds.includes(el.id))
            .sort((a, b) => (direction === 'horizontal' ? a.x - b.x : a.y - b.y));

        if (selectedElements.length < 3) return elements;

        // Pre-calculate all new positions
        const positionUpdates: Map<string, { x?: number; y?: number }> = new Map();

        if (direction === 'horizontal') {
            const first = selectedElements[0];
            const last = selectedElements[selectedElements.length - 1];
            const totalWidth = selectedElements.reduce((sum, el) => sum + el.width, 0);
            const totalSpace = (last.x + last.width) - first.x - totalWidth;
            const gap = totalSpace / (selectedElements.length - 1);

            let currentX = first.x + first.width + gap;

            // Calculate positions for middle elements (skip first and last)
            for (let i = 1; i < selectedElements.length - 1; i++) {
                const el = selectedElements[i];
                positionUpdates.set(el.id, { x: currentX });
                currentX = currentX + el.width + gap;
            }
        } else {
            const first = selectedElements[0];
            const last = selectedElements[selectedElements.length - 1];
            const totalHeight = selectedElements.reduce((sum, el) => sum + el.height, 0);
            const totalSpace = (last.y + last.height) - first.y - totalHeight;
            const gap = totalSpace / (selectedElements.length - 1);

            let currentY = first.y + first.height + gap;

            // Calculate positions for middle elements (skip first and last)
            for (let i = 1; i < selectedElements.length - 1; i++) {
                const el = selectedElements[i];
                positionUpdates.set(el.id, { y: currentY });
                currentY = currentY + el.height + gap;
            }
        }

        // Apply all updates immutably
        return elements.map((el) => {
            const update = positionUpdates.get(el.id);
            if (update) {
                return { ...el, ...update } as Element;
            }
            return el;
        });
    },
}));

// Type export for consumers
export type { AlignmentState, AlignmentActions, Alignment, DistributeDirection };
