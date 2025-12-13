import { create } from 'zustand';
import { cloneDeep } from 'lodash';
import {
    Element,
    TextElement,
    ImageElement,
    ShapeElement,
    FrameElement,
    Guide,
    CanvasSize,

    CANVAS_WIDTH,
    CANVAS_HEIGHT
} from '@/types/editor';
import { generateId } from '@/lib/utils';
import { parseFieldNameFromLayer } from '@/lib/utils/fieldNameParser';

interface EditorState {
    // Template
    templateId: string;
    templateName: string;
    canvasSize: CanvasSize;
    backgroundColor: string;

    templateSource: 'native' | 'canva_import';

    // Elements
    elements: Element[];
    selectedIds: string[];

    // Dynamic field counters (never decrease, even on delete)
    nextTextFieldNumber: number;
    nextImageFieldNumber: number;

    // History (now stores full canvas state snapshots)
    history: HistorySnapshot[];
    historyIndex: number;
    maxHistory: number;

    // UI State
    zoom: number;
    snapToGrid: boolean;
    gridSize: number;
    previewMode: boolean;
    guides: Guide[];
    activeTab: 'properties' | 'layers';
    isSaving: boolean;
    isNewTemplate: boolean;

    // Clipboard
    clipboard: Element | null;
    styleClipboard: Partial<TextElement> | null;

    // Template list for sidebar
    templates: Array<{
        id: string;
        name: string;
        thumbnail_url?: string;
    }>;
}

// History snapshot includes elements and canvas configuration
interface HistorySnapshot {
    elements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
}

interface EditorActions {
    // Element operations
    addElement: (element: Element) => void;
    updateElement: (id: string, updates: Partial<Element>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    selectElement: (id: string | null) => void;
    toggleSelection: (id: string) => void;

    // Reorder
    reorderElements: (fromIndex: number, toIndex: number) => void;
    moveElementForward: (id: string) => void;
    moveElementBackward: (id: string) => void;
    moveElementToFront: (id: string) => void;
    moveElementToBack: (id: string) => void;

    // Alignment
    alignElement: (id: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    alignSelectedElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    distributeSelectedElements: (direction: 'horizontal' | 'vertical') => void;

    // Clipboard & State
    copyElement: () => void;
    pasteElement: () => void;
    copyStyle: () => void;
    pasteStyle: () => void;
    lockElement: (id: string, locked: boolean) => void;

    // History
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    // Template
    setTemplateName: (name: string) => void;
    setBackgroundColor: (color: string) => void;
    setCanvasSize: (width: number, height: number) => void;
    setElements: (elements: Element[]) => void;
    loadTemplate: (template: {
        id: string;
        name: string;
        elements: Element[];
        background_color: string;
        canvas_size?: { width: number; height: number };
    }) => void;
    setTemplates: (templates: EditorState['templates']) => void;
    resetToNewTemplate: () => void;


    addCanvaBackground: (params: {
        url: string;
        type: 'svg' | 'png' | 'jpg';
        originalFilename: string;
        width: number;
        height: number;
        locked: boolean;
    }) => void;

    // UI
    setZoom: (zoom: number) => void;
    zoomToFit: (viewportWidth: number, viewportHeight: number) => void;
    setSnapToGrid: (snap: boolean) => void;
    setPreviewMode: (preview: boolean) => void;
    setGuides: (guides: Guide[]) => void;
    clearGuides: () => void;
    setActiveTab: (tab: 'properties' | 'layers') => void;
    setIsSaving: (saving: boolean) => void;

    // Helpers
    getSelectedElement: () => Element | null;
    getDynamicFields: () => { textFields: string[]; imageFields: string[] };
    addText: () => void;
    addImage: () => void;
    addShape: (shapeType: 'rect' | 'circle' | 'line' | 'arrow') => void;
    addDynamicText: () => void;
    addDynamicImage: () => void;

    // Frame layout
    createFrame: () => void;
    applyFrameLayout: (frameId: string) => void;
}

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
    // Initial state
    templateId: generateId(),
    templateName: 'Untitled Template',
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    backgroundColor: '#FFFFFF',
    templateSource: 'native' as const,
    elements: [],
    selectedIds: [],
    nextTextFieldNumber: 1,
    nextImageFieldNumber: 1,
    history: [{ elements: [], canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, backgroundColor: '#FFFFFF' }],
    historyIndex: 0,
    maxHistory: 50,
    zoom: 0.5,
    snapToGrid: true,
    gridSize: 10,
    previewMode: false,
    guides: [],
    activeTab: 'properties',
    isSaving: false,
    isNewTemplate: true,
    clipboard: null,
    styleClipboard: null,
    templates: [],

    // Element operations
    addElement: (element) => {
        set((state) => ({
            elements: [...state.elements, element],
            selectedIds: [element.id]
        }));
    },

    updateElement: (id, updates) => {
        set((state) => ({
            elements: state.elements.map((el) => {
                if (el.id !== id) return el;

                // Check if layer name is being updated - auto-detect dynamic field (only for text/image)
                const nameUpdates = updates as { name?: string };
                if (nameUpdates.name && nameUpdates.name !== el.name && (el.type === 'text' || el.type === 'image')) {
                    const parsed = parseFieldNameFromLayer(nameUpdates.name, el.type);
                    if (parsed) {
                        // Auto-assign dynamic field based on layer name
                        if (el.type === 'text') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: true,
                                dynamicField: parsed.fieldName,
                                text: `{{${parsed.fieldName}}}`
                            } as TextElement;
                        } else if (el.type === 'image') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: true,
                                dynamicSource: parsed.fieldName
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
                                text: textEl.text?.startsWith('{{') ? 'Your text here' : textEl.text
                            } as TextElement;
                        } else if (el.type === 'image') {
                            return {
                                ...el,
                                ...updates,
                                isDynamic: false,
                                dynamicSource: undefined
                            } as ImageElement;
                        }
                    }
                }

                return { ...el, ...updates } as Element;
            })
        }));
    },

    deleteElement: (id) => {
        set((state) => ({
            elements: state.elements.filter((el) => el.id !== id),
            selectedIds: state.selectedIds.filter(sid => sid !== id)
        }));
        get().pushHistory();
    },

    duplicateElement: (id) => {
        const state = get();
        const element = state.elements.find((el) => el.id === id);
        if (!element) return;

        const newElement = {
            ...cloneDeep(element),
            id: generateId(),
            name: `${element.name} Copy`,
            x: element.x + 20,
            y: element.y + 20,
            zIndex: state.elements.length
        };

        // For image elements, assign a new unique dynamicSource
        if (newElement.type === 'image' && (newElement as ImageElement).isDynamic) {
            // Get existing image numbers to find the next available number
            const imageNumbers = state.elements
                .filter(e => e.type === 'image' && (e as ImageElement).isDynamic)
                .map(e => {
                    const match = (e as ImageElement).dynamicSource?.match(/^image(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                });
            const nextNumber = imageNumbers.length > 0 ? Math.max(...imageNumbers) + 1 : 1;
            (newElement as ImageElement).dynamicSource = `image${nextNumber}`;
            newElement.name = `Image ${nextNumber}`;
        }

        // For text elements, assign a new unique dynamicField
        if (newElement.type === 'text' && (newElement as TextElement).isDynamic) {
            const textNumbers = state.elements
                .filter(e => e.type === 'text' && (e as TextElement).isDynamic)
                .map(e => {
                    const match = (e as TextElement).dynamicField?.match(/^text(\d+)$/i);
                    return match ? parseInt(match[1]) : 0;
                });
            const nextNumber = textNumbers.length > 0 ? Math.max(...textNumbers) + 1 : 1;
            (newElement as TextElement).dynamicField = `text${nextNumber}`;
            newElement.name = `Text ${nextNumber}`;
        }

        state.addElement(newElement);
        state.pushHistory();
    },

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

    lockElement: (id, locked) => {
        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, locked } : el
            )
        }));
        get().pushHistory();
    },

    copyElement: () => {
        const { elements, selectedIds } = get();
        if (selectedIds.length === 0) return;
        const element = elements.find(el => el.id === selectedIds[0]);
        if (element) {
            set({ clipboard: cloneDeep(element) });
        }
    },

    pasteElement: () => {
        const { clipboard, elements } = get();
        if (!clipboard) return;

        const newElement = cloneDeep(clipboard);
        newElement.id = generateId();
        newElement.x += 20;
        newElement.y += 20;
        newElement.zIndex = elements.length;

        // If pasting a Canva background that was previously a background, ensure it's treated as a normal element now?
        // Actually, just pasting it as is works, it's just another element.

        get().addElement(newElement);
        get().selectElement(newElement.id); // Select the new element
        get().pushHistory();
    },

    copyStyle: () => {
        const { elements, selectedIds } = get();
        if (selectedIds.length === 0) return;
        const element = elements.find(el => el.id === selectedIds[0]);

        if (element && element.type === 'text') {
            const textEl = element as TextElement;
            const style: Partial<TextElement> = {
                fontFamily: textEl.fontFamily,
                fontSize: textEl.fontSize,
                fontStyle: textEl.fontStyle,
                fill: textEl.fill,
                align: textEl.align,
                lineHeight: textEl.lineHeight,
                letterSpacing: textEl.letterSpacing,
                textDecoration: textEl.textDecoration,
                shadowColor: textEl.shadowColor,
                shadowBlur: textEl.shadowBlur,
                shadowOffsetX: textEl.shadowOffsetX,
                shadowOffsetY: textEl.shadowOffsetY,
                shadowOpacity: textEl.shadowOpacity,
                stroke: textEl.stroke,
                strokeWidth: textEl.strokeWidth,
                backgroundEnabled: textEl.backgroundEnabled,
                backgroundColor: textEl.backgroundColor,
                backgroundCornerRadius: textEl.backgroundCornerRadius,
                backgroundPadding: textEl.backgroundPadding,
            };
            set({ styleClipboard: style });
        }
    },

    pasteStyle: () => {
        const { styleClipboard, elements, selectedIds } = get();
        if (!styleClipboard || selectedIds.length === 0) return;

        const element = elements.find(el => el.id === selectedIds[0]);
        if (element && element.type === 'text') {
            get().updateElement(selectedIds[0], styleClipboard);
            get().pushHistory();
        }
    },

    // Reorder operations
    reorderElements: (fromIndex, toIndex) => {
        set((state) => {
            const sortedElements = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);
            const [removed] = sortedElements.splice(fromIndex, 1);
            sortedElements.splice(toIndex, 0, removed);

            // Update zIndex for all elements
            const updatedElements = sortedElements.map((el, idx) => ({
                ...el,
                zIndex: sortedElements.length - 1 - idx
            }));

            return { elements: updatedElements };
        });
    },

    moveElementForward: (id) => {
        set((state) => {
            const element = state.elements.find((el) => el.id === id);
            if (!element) return state;

            const maxZ = Math.max(...state.elements.map((el) => el.zIndex));
            if (element.zIndex >= maxZ) return state;

            const targetZ = element.zIndex + 1;
            const updatedElements = state.elements.map((el) => {
                if (el.id === id) return { ...el, zIndex: targetZ };
                if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex - 1 };
                return el;
            });

            return { elements: updatedElements as Element[] };
        });
    },

    moveElementBackward: (id) => {
        set((state) => {
            const element = state.elements.find((el) => el.id === id);
            if (!element || element.zIndex <= 0) return state;

            const targetZ = element.zIndex - 1;
            const updatedElements = state.elements.map((el) => {
                if (el.id === id) return { ...el, zIndex: targetZ };
                if (el.zIndex === targetZ) return { ...el, zIndex: el.zIndex + 1 };
                return el;
            });

            return { elements: updatedElements as Element[] };
        });
    },

    moveElementToFront: (id) => {
        set((state) => {
            const element = state.elements.find((el) => el.id === id);
            if (!element) return state;

            const maxZ = Math.max(...state.elements.map((el) => el.zIndex));

            // Use immutable update - create new element object
            return {
                elements: state.elements.map((el) =>
                    el.id === id ? { ...el, zIndex: maxZ + 1 } : el
                )
            };
        });
    },

    moveElementToBack: (id) => {
        set((state) => {
            const elements = state.elements.map((el) => ({
                ...el,
                zIndex: el.id === id ? -1 : el.zIndex + 1
            }));

            // Normalize zIndex to start from 0
            const minZ = Math.min(...elements.map((el) => el.zIndex));
            const normalizedElements = elements.map((el) => ({
                ...el,
                zIndex: el.zIndex - minZ
            }));

            return { elements: normalizedElements };
        });
    },

    alignElement: (id, alignment) => {
        set((state) => {
            const element = state.elements.find((el) => el.id === id);
            if (!element) return state;

            let update: Partial<Element> = {};

            const { width: cw, height: ch } = state.canvasSize;
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

            return {
                elements: state.elements.map((el) =>
                    el.id === id ? { ...el, ...update } as Element : el
                )
            };
        });
    },

    // Align selected elements relative to selection bounding box
    alignSelectedElements: (alignment) => {
        const { selectedIds, elements } = get();
        if (selectedIds.length < 2) return;

        const selectedElements = elements.filter(el => selectedIds.includes(el.id));
        if (selectedElements.length < 2) return;

        // Calculate bounding box of selection
        const minX = Math.min(...selectedElements.map(el => el.x));
        const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
        const minY = Math.min(...selectedElements.map(el => el.y));
        const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        set((state) => {
            const updatedElements = state.elements.map((el) => {
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
            return { elements: updatedElements };
        });
        get().pushHistory();
    },

    // Distribute selected elements evenly
    distributeSelectedElements: (direction) => {
        const { selectedIds, elements } = get();
        if (selectedIds.length < 3) return; // Need at least 3 for distribution

        const selectedElements = elements
            .filter(el => selectedIds.includes(el.id))
            .sort((a, b) => direction === 'horizontal' ? a.x - b.x : a.y - b.y);

        if (selectedElements.length < 3) return;

        // Pre-calculate all new positions BEFORE calling set()
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
        set((state) => ({
            elements: state.elements.map((el) => {
                const update = positionUpdates.get(el.id);
                if (update) {
                    return { ...el, ...update } as Element;
                }
                return el;
            })
        }));
        get().pushHistory();
    },

    // History operations
    pushHistory: () => {
        set((state) => {
            // Create full canvas snapshot including elements and canvas configuration
            const snapshot: HistorySnapshot = {
                elements: cloneDeep(state.elements),
                canvasSize: { ...state.canvasSize },
                backgroundColor: state.backgroundColor
            };
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(snapshot);

            // Limit history size
            if (newHistory.length > state.maxHistory) {
                newHistory.shift();
                return {
                    history: newHistory,
                    historyIndex: newHistory.length - 1
                };
            }

            return {
                history: newHistory,
                historyIndex: state.historyIndex + 1
            };
        });
    },

    undo: () => {
        const { canUndo, history, historyIndex } = get();
        if (canUndo()) {
            const newIndex = historyIndex - 1;
            const snapshot = history[newIndex];
            set({
                elements: cloneDeep(snapshot.elements),
                canvasSize: { ...snapshot.canvasSize },
                backgroundColor: snapshot.backgroundColor,
                historyIndex: newIndex,
                selectedIds: []
            });
        }
    },

    redo: () => {
        const { canRedo, history, historyIndex } = get();
        if (canRedo()) {
            const newIndex = historyIndex + 1;
            const snapshot = history[newIndex];
            set({
                elements: cloneDeep(snapshot.elements),
                canvasSize: { ...snapshot.canvasSize },
                backgroundColor: snapshot.backgroundColor,
                historyIndex: newIndex,
                selectedIds: []
            });
        }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // Template operations
    setTemplateName: (name) => set({ templateName: name }),
    setBackgroundColor: (color) => set({ backgroundColor: color }),
    setCanvasSize: (width, height) => set({
        canvasSize: {
            width: Math.max(300, Math.min(5000, width)),
            height: Math.max(300, Math.min(5000, height))
        }
    }),
    setElements: (elements) => set({ elements }),

    loadTemplate: (template) => {
        const canvasSize = template.canvas_size || { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
        const backgroundColor = template.background_color || '#FFFFFF';
        const elements = template.elements || [];
        set({
            templateId: template.id,
            templateName: template.name,
            elements,
            backgroundColor,
            canvasSize,
            selectedIds: [],
            history: [{ elements, canvasSize, backgroundColor }],
            historyIndex: 0,
            isNewTemplate: false
        });
    },

    setTemplates: (templates) => set({ templates }),

    resetToNewTemplate: () => {
        const canvasSize = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
        const backgroundColor = '#FFFFFF';
        set({
            templateId: generateId(),
            templateName: 'Untitled Template',
            canvasSize,
            backgroundColor,

            templateSource: 'native',
            elements: [],
            selectedIds: [],
            history: [{ elements: [], canvasSize, backgroundColor }],
            historyIndex: 0,
            isNewTemplate: true
        });
    },



    // Add Canva background as a regular ImageElement (participates in layer ordering)
    addCanvaBackground: (params) => {
        const { elements, addElement, pushHistory } = get();

        // First, remove any existing Canva background elements
        const filteredElements = elements.filter(el =>
            !(el.type === 'image' && (el as ImageElement).isCanvaBackground)
        );

        // Shift all existing elements' zIndex up by 1 to make room for background at index 0
        const shiftedElements = filteredElements.map(el => ({
            ...el,
            zIndex: el.zIndex + 1
        }));

        // Create the Canva background as a regular ImageElement
        const canvaBackground: ImageElement = {
            id: generateId(),
            name: 'Canva Background',
            type: 'image',
            x: 0,
            y: 0,
            width: params.width,
            height: params.height,
            rotation: 0,
            opacity: 1,
            locked: params.locked,
            visible: true,
            zIndex: 0, // Start at the bottom
            fitMode: 'fill',
            cornerRadius: 0,
            isDynamic: false,
            isCanvaBackground: true,
            originalFilename: params.originalFilename,
            imageUrl: params.url
        };

        set({
            elements: [canvaBackground, ...shiftedElements],
            templateSource: 'canva_import',
            // Keep backgroundImage null since we're using regular element now

        });

        pushHistory();
    },


    // UI operations
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(2, zoom)) }),
    zoomToFit: (viewportWidth, viewportHeight) => {
        const { canvasSize } = get();
        // Calculate zoom to fit canvas within viewport with some padding
        const padding = 80; // 40px padding on each side
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;
        const zoomX = availableWidth / canvasSize.width;
        const zoomY = availableHeight / canvasSize.height;
        const optimalZoom = Math.min(zoomX, zoomY, 2); // Cap at 200%
        set({ zoom: Math.max(0.1, optimalZoom) });
    },
    setSnapToGrid: (snap) => set({ snapToGrid: snap }),
    setPreviewMode: (preview) => set({ previewMode: preview }),
    setGuides: (guides) => set({ guides }),
    clearGuides: () => set({ guides: [] }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setIsSaving: (saving) => set({ isSaving: saving }),

    // Helpers
    getSelectedElement: () => {
        const { elements, selectedIds } = get();
        return elements.find((el) => selectedIds.includes(el.id)) || null;
    },

    addText: () => {
        const { elements, addElement, pushHistory, canvasSize } = get();

        // Get next text number based on existing elements
        const textNumbers = elements
            .filter(e => e.type === 'text')
            .map(e => {
                const match = e.name.match(/^Text\s*(\d+)$/i);
                return match ? parseInt(match[1]) : 0;
            });
        const nextNumber = textNumbers.length > 0 ? Math.max(...textNumbers) + 1 : 1;
        const fieldName = `text${nextNumber}`;

        const newText: TextElement = {
            id: generateId(),
            name: `Text ${nextNumber}`,
            type: 'text',
            x: canvasSize.width / 2 - 100,
            y: canvasSize.height / 2 - 25,
            width: 300,
            height: 60,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
            text: `{{${fieldName}}}`,
            fontFamily: 'Inter',
            fontSize: 32,
            fontStyle: 'normal',
            fill: '#000000',
            align: 'center',
            verticalAlign: 'middle',
            lineHeight: 1.2,
            letterSpacing: 0,
            textDecoration: '',
            isDynamic: true,
            dynamicField: fieldName
        };

        addElement(newText);
        pushHistory();
    },

    addImage: () => {
        const { elements, addElement, pushHistory, canvasSize } = get();

        // Get next image number based on existing elements
        const imageNumbers = elements
            .filter(e => e.type === 'image')
            .map(e => {
                const match = e.name.match(/^Image\s*(\d+)$/i);
                return match ? parseInt(match[1]) : 0;
            });
        const nextNumber = imageNumbers.length > 0 ? Math.max(...imageNumbers) + 1 : 1;
        const fieldName = `image${nextNumber}`;

        const newImage: ImageElement = {
            id: generateId(),
            name: `Image ${nextNumber}`,
            type: 'image',
            x: canvasSize.width / 2 - 150,
            y: canvasSize.height / 2 - 150,
            width: 300,
            height: 300,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
            fitMode: 'cover',
            cornerRadius: 0,
            isDynamic: true,
            dynamicSource: fieldName
        };

        addElement(newImage);
        pushHistory();
    },

    // Get all dynamic fields from elements
    getDynamicFields: () => {
        const { elements } = get();
        const textFields: string[] = [];
        const imageFields: string[] = [];

        elements.forEach(el => {
            if (el.type === 'text') {
                const textEl = el as TextElement;
                if (textEl.isDynamic && textEl.dynamicField) {
                    textFields.push(textEl.dynamicField);
                }
            } else if (el.type === 'image') {
                const imgEl = el as ImageElement;
                if (imgEl.isDynamic && imgEl.dynamicSource) {
                    imageFields.push(imgEl.dynamicSource);
                }
            }
        });

        return { textFields, imageFields };
    },

    // Add dynamic text field with auto-numbering
    addDynamicText: () => {
        const { elements, addElement, pushHistory, canvasSize, nextTextFieldNumber } = get();
        const fieldName = `text${nextTextFieldNumber}`;

        const newText: TextElement = {
            id: generateId(),
            name: `Dynamic Text ${nextTextFieldNumber}`,
            type: 'text',
            x: canvasSize.width / 2 - 100,
            y: canvasSize.height / 2 - 25,
            width: 300,
            height: 60,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
            text: `{{${fieldName}}}`,
            fontFamily: 'Inter',
            fontSize: 28,
            fontStyle: 'normal',
            fill: '#000000',
            align: 'center',
            verticalAlign: 'middle',
            lineHeight: 1.2,
            letterSpacing: 0,
            textDecoration: '',
            isDynamic: true,
            dynamicField: fieldName
        };

        set({ nextTextFieldNumber: nextTextFieldNumber + 1 });
        addElement(newText);
        pushHistory();
    },

    // Add dynamic image field with auto-numbering
    addDynamicImage: () => {
        const { elements, addElement, pushHistory, canvasSize, nextImageFieldNumber } = get();
        const fieldName = `image${nextImageFieldNumber}`;

        const newImage: ImageElement = {
            id: generateId(),
            name: `Dynamic Image ${nextImageFieldNumber}`,
            type: 'image',
            x: canvasSize.width / 2 - 150,
            y: canvasSize.height / 2 - 150,
            width: 300,
            height: 300,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
            fitMode: 'cover',
            cornerRadius: 0,
            isDynamic: true,
            dynamicSource: fieldName
        };

        set({ nextImageFieldNumber: nextImageFieldNumber + 1 });
        addElement(newImage);
        pushHistory();
    },

    // Add shape
    addShape: (shapeType) => {
        const { elements, addElement, pushHistory, canvasSize } = get();

        // Get next shape number based on existing elements
        const shapeNumbers = elements
            .filter(e => e.type === 'shape')
            .map(e => {
                const match = e.name.match(/^(Rectangle|Circle|Line|Arrow)\s*(\d+)$/i);
                return match ? parseInt(match[2]) : 0;
            });
        const nextNumber = shapeNumbers.length > 0 ? Math.max(...shapeNumbers) + 1 : 1;

        const shapeNames: Record<string, string> = {
            'rect': 'Rectangle',
            'circle': 'Circle',
            'line': 'Line',
            'arrow': 'Arrow'
        };

        const newShape: ShapeElement = {
            id: generateId(),
            name: `${shapeNames[shapeType]} ${nextNumber}`,
            type: 'shape',
            shapeType,
            x: canvasSize.width / 2 - 75,
            y: canvasSize.height / 2 - 75,
            width: 150,
            height: 150,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: elements.length,
            fill: shapeType === 'line' || shapeType === 'arrow' ? 'transparent' : '#4A90A4',
            stroke: '#333333',
            strokeWidth: shapeType === 'line' || shapeType === 'arrow' ? 3 : 0,
            cornerRadius: shapeType === 'rect' ? 8 : 0,
            points: shapeType === 'line' || shapeType === 'arrow' ? [0, 75, 150, 75] : undefined
        };

        addElement(newShape);
        pushHistory();
    },

    // Create frame from selected elements
    createFrame: () => {
        const { selectedIds, elements, canvasSize, pushHistory } = get();
        if (selectedIds.length < 1) return;

        const selectedElements = elements.filter(el => selectedIds.includes(el.id));
        if (selectedElements.length === 0) return;

        // Calculate bounding box of selected elements
        const minX = Math.min(...selectedElements.map(el => el.x));
        const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
        const minY = Math.min(...selectedElements.map(el => el.y));
        const maxY = Math.max(...selectedElements.map(el => el.y + el.height));

        const frameNumbers = elements
            .filter(e => e.type === 'frame')
            .map(e => {
                const match = e.name.match(/^Frame\s*(\d+)$/i);
                return match ? parseInt(match[1]) : 0;
            });
        const nextNumber = frameNumbers.length > 0 ? Math.max(...frameNumbers) + 1 : 1;

        const newFrame: FrameElement = {
            id: generateId(),
            name: `Frame ${nextNumber}`,
            type: 'frame',
            x: minX - 20,
            y: minY - 20,
            width: (maxX - minX) + 40,
            height: (maxY - minY) + 40,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex: Math.min(...selectedElements.map(el => el.zIndex)) - 1,
            layoutDirection: 'horizontal',
            layoutGap: 16,
            layoutPadding: 20,
            layoutAlign: 'center',
            fill: 'rgba(255, 255, 255, 0.1)',
            stroke: '#E5E7EB',
            strokeWidth: 1,
            cornerRadius: 12,
            childIds: selectedIds
        };

        set((state) => ({
            elements: [...state.elements, newFrame],
            selectedIds: [newFrame.id]
        }));
        pushHistory();
    },

    // Apply frame layout to child elements
    applyFrameLayout: (frameId) => {
        const { elements, pushHistory } = get();
        const frame = elements.find(el => el.id === frameId) as FrameElement | undefined;
        if (!frame || frame.type !== 'frame') return;

        const children = elements.filter(el => frame.childIds.includes(el.id));
        if (children.length === 0) return;

        // Sort children by their current position
        const sortedChildren = frame.layoutDirection === 'horizontal'
            ? [...children].sort((a, b) => a.x - b.x)
            : [...children].sort((a, b) => a.y - b.y);

        // Calculate layout
        const contentStart = frame.layoutDirection === 'horizontal'
            ? frame.x + frame.layoutPadding
            : frame.y + frame.layoutPadding;

        let currentPos = contentStart;

        const updates: { id: string; x?: number; y?: number }[] = [];

        sortedChildren.forEach((child, idx) => {
            if (frame.layoutDirection === 'horizontal') {
                let yPos = frame.y + frame.layoutPadding;
                if (frame.layoutAlign === 'center') {
                    yPos = frame.y + (frame.height - child.height) / 2;
                } else if (frame.layoutAlign === 'end') {
                    yPos = frame.y + frame.height - frame.layoutPadding - child.height;
                }
                updates.push({ id: child.id, x: currentPos, y: yPos });
                currentPos += child.width + frame.layoutGap;
            } else {
                let xPos = frame.x + frame.layoutPadding;
                if (frame.layoutAlign === 'center') {
                    xPos = frame.x + (frame.width - child.width) / 2;
                } else if (frame.layoutAlign === 'end') {
                    xPos = frame.x + frame.width - frame.layoutPadding - child.width;
                }
                updates.push({ id: child.id, x: xPos, y: currentPos });
                currentPos += child.height + frame.layoutGap;
            }
        });

        set((state) => ({
            elements: state.elements.map(el => {
                const update = updates.find(u => u.id === el.id);
                if (update) {
                    return { ...el, x: update.x ?? el.x, y: update.y ?? el.y } as Element;
                }
                return el;
            })
        }));
        pushHistory();
    }
}));
