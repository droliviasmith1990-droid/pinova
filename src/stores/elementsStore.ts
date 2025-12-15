/**
 * Elements Store
 * 
 * Manages the elements array - core CRUD operations only.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Add, update, delete elements
 * - Duplicate elements
 * - Set/replace all elements
 * - Element visibility and lock state
 * 
 * Note: This store focuses on element data management.
 * Layer ordering is handled by layersStore.
 * Selection is handled by selectionStore.
 */

import { create } from 'zustand';
import { cloneDeep } from 'lodash';
import {
    Element,
    TextElement,
    ImageElement,
} from '@/types/editor';
import { generateId } from '@/lib/utils';
import { parseFieldNameFromLayer } from '@/lib/utils/fieldNameParser';
import { useSelectionStore } from './selectionStore';

interface ElementsState {
    elements: Element[];
}

interface ElementsActions {
    /**
     * Add a new element to the canvas
     */
    addElement: (element: Element) => void;

    /**
     * Update an existing element's properties
     * Handles dynamic field detection for text/image elements
     */
    updateElement: (id: string, updates: Partial<Element>) => void;

    /**
     * Delete an element by ID
     */
    deleteElement: (id: string) => void;

    /**
     * Duplicate an element with new ID and position offset
     */
    duplicateElement: (id: string) => Element | null;

    /**
     * Set/replace all elements (used when loading templates)
     */
    setElements: (elements: Element[]) => void;

    /**
     * Lock or unlock an element
     */
    lockElement: (id: string, locked: boolean) => void;

    /**
     * Toggle element visibility
     */
    toggleVisibility: (id: string) => void;

    /**
     * Get element by ID
     */
    getElementById: (id: string) => Element | undefined;

    /**
     * Clear all elements
     */
    clearElements: () => void;
}

const initialState: ElementsState = {
    elements: [],
};

export const useElementsStore = create<ElementsState & ElementsActions>((set, get) => ({
    // Initial state
    ...initialState,

    // Actions
    addElement: (element) => {
        set((state) => ({
            elements: [...state.elements, element],
        }));
    },

    updateElement: (id, updates) => {
        set((state) => ({
            elements: state.elements.map((el) => {
                if (el.id !== id) return el;

                // Check if layer name is being updated - auto-detect dynamic field
                const nameUpdates = updates as { name?: string };
                if (nameUpdates.name && nameUpdates.name !== el.name &&
                    (el.type === 'text' || el.type === 'image')) {

                    const parsed = parseFieldNameFromLayer(nameUpdates.name, el.type);

                    if (parsed) {
                        // Auto-assign dynamic field based on layer name
                        if (el.type === 'text') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: true,
                                dynamicField: parsed.fieldName,
                                text: `{{${parsed.fieldName}}}`,
                            } as TextElement;
                        } else if (el.type === 'image') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: true,
                                dynamicSource: parsed.fieldName,
                            } as ImageElement;
                        }
                    } else {
                        // Name doesn't match pattern - remove dynamic assignment
                        if (el.type === 'text') {
                            const textEl = el as TextElement;
                            return {
                                ...el,
                                ...updates,
                                isDynamic: false,
                                dynamicField: undefined,
                                text: textEl.text?.startsWith('{{') ? 'Your text here' : textEl.text,
                            } as TextElement;
                        } else if (el.type === 'image') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: false,
                                dynamicSource: undefined,
                            } as ImageElement;
                        }
                    }
                }

                return { ...el, ...updates } as Element;
            }),
        }));
    },

    deleteElement: (id) => {
        set((state) => ({
            elements: state.elements.filter((el) => el.id !== id),
        }));

        // Sync selection - remove deleted element from selection
        const selection = useSelectionStore.getState();
        if (selection.selectedIds.includes(id)) {
            selection.setSelectedIds(
                selection.selectedIds.filter(sid => sid !== id)
            );
        }
    },

    duplicateElement: (id) => {
        const state = get();
        const element = state.elements.find((el) => el.id === id);
        if (!element) return null;

        const newElement: Element = {
            ...cloneDeep(element),
            id: generateId(),
            name: `${element.name} Copy`,
            x: element.x + 20,
            y: element.y + 20,
            zIndex: state.elements.length,
        };

        // For image elements with dynamic source, assign new unique source
        if (newElement.type === 'image' && (newElement as ImageElement).isDynamic) {
            const imageNumbers = state.elements
                .filter((e) => e.type === 'image' && (e as ImageElement).isDynamic)
                .map((e) => {
                    const match = (e as ImageElement).dynamicSource?.match(/^image(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                });
            const nextNumber = imageNumbers.length > 0 ? Math.max(...imageNumbers) + 1 : 1;
            (newElement as ImageElement).dynamicSource = `image${nextNumber}`;
            newElement.name = `Image ${nextNumber}`;
        }

        // For text elements with dynamic field, assign new unique field
        if (newElement.type === 'text' && (newElement as TextElement).isDynamic) {
            const textNumbers = state.elements
                .filter((e) => e.type === 'text' && (e as TextElement).isDynamic)
                .map((e) => {
                    const match = (e as TextElement).dynamicField?.match(/^text(\d+)$/i);
                    return match ? parseInt(match[1]) : 0;
                });
            const nextNumber = textNumbers.length > 0 ? Math.max(...textNumbers) + 1 : 1;
            (newElement as TextElement).dynamicField = `text${nextNumber}`;
            (newElement as TextElement).text = `{{text${nextNumber}}}`;
            newElement.name = `Text ${nextNumber}`;
        }

        set((state) => ({
            elements: [...state.elements, newElement],
        }));

        return newElement;
    },

    setElements: (elements) => {
        set({ elements });
    },

    lockElement: (id, locked) => {
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, locked } : el
            ),
        }));
    },

    toggleVisibility: (id) => {
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, visible: !el.visible } : el
            ),
        }));
    },

    getElementById: (id) => {
        return get().elements.find((el) => el.id === id);
    },

    clearElements: () => {
        set({ elements: [] });
    },
}));

// Type export for consumers
export type { ElementsState, ElementsActions };
