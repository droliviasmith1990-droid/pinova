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
import { generateUniqueName } from '@/lib/utils/nameValidation';
import { parseFieldNameFromLayer } from '@/lib/utils/fieldNameParser';
import { validateCharacterStyles } from '@/lib/text/characterStyles';
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

                // Phase 2: Validate character styles if present in update
                if (el.type === 'text') {
                    const textEl = el as TextElement;
                    const textUpdates = updates as Partial<TextElement>;
                    
                    // Get the final text (from update or existing)
                    const finalText = textUpdates.text ?? textEl.text ?? '';
                    
                    // Check if characterStyles are being updated
                    if (textUpdates.characterStyles && textUpdates.characterStyles.length > 0) {
                        const { sanitized, errors } = validateCharacterStyles(
                            textUpdates.characterStyles,
                            finalText.length
                        );
                        
                        if (errors.length > 0) {
                            console.warn('[elementsStore] Character style validation errors:', errors);
                        }
                        
                        return {
                            ...el,
                            ...updates,
                            characterStyles: sanitized,
                        } as TextElement;
                    }
                }

                return { ...el, ...updates } as Element;
            }),
        }));
    },

    deleteElement: (id) => {
        set((state) => {
            const filtered = state.elements.filter((el) => el.id !== id);
            // Normalize zIndex after deletion to fill gaps
            const normalized = filtered
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((el, index) => ({ ...el, zIndex: index }));
            
            return { elements: normalized };
        });

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

        // Calculate top Z-index
        const maxZ = state.elements.length > 0 
            ? Math.max(...state.elements.map(e => e.zIndex)) 
            : 0;

        const newElement: Element = {
            ...cloneDeep(element),
            id: generateId(),
            x: element.x + 20,
            y: element.y + 20,
            zIndex: maxZ + 1, // Ensure it goes to top
        };

        // For image elements, assign a new unique name and dynamicSource
        if (newElement.type === 'image') {
            const unique = generateUniqueName(state.elements, 'image');
            newElement.name = unique.name;
            if ((newElement as ImageElement).isDynamic) {
                (newElement as ImageElement).dynamicSource = unique.fieldName;
            }
        }
        // For text elements, assign a new unique name and dynamicField
        else if (newElement.type === 'text') {
            const unique = generateUniqueName(state.elements, 'text');
            newElement.name = unique.name;
            if ((newElement as TextElement).isDynamic) {
                (newElement as TextElement).dynamicField = unique.fieldName;
                (newElement as TextElement).text = `{{${unique.fieldName}}}`;
            }
        }
        // For other types (shapes), append Copy
        else {
            newElement.name = `${element.name} Copy`;
        }

        set((state) => ({
            elements: [...state.elements, newElement],
        }));

        return newElement;
    },

    setElements: (elements) => {
        // Normalize zIndex on set to ensure no gaps/duplicates and clean state
        const normalized = [...elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((el, index) => ({ ...el, zIndex: index }));
        set({ elements: normalized });
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
