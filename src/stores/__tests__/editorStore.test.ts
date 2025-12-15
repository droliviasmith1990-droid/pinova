/**
 * EditorStore Tests - Critical Paths
 * 
 * These tests verify the core functionality of the editorStore before
 * we split it into separate stores. They serve as a safety net during
 * refactoring.
 * 
 * Coverage:
 * - Element CRUD (add, update, delete, duplicate)
 * - Selection management
 * - History (undo/redo)
 * - Layer ordering
 * - Alignment operations
 */

import { useEditorStore } from '../editorStore';
import { useElementsStore } from '../elementsStore';
import { useSelectionStore } from '../selectionStore';
import { Element, TextElement, ImageElement, ShapeElement } from '@/types/editor';

// Helper to reset store before each test
const resetStore = () => {
    // Reset specialized stores first (they're now source of truth)
    useElementsStore.setState({ elements: [] });
    useSelectionStore.setState({ selectedIds: [] });

    // Reset editorStore
    useEditorStore.setState({
        templateId: 'test-template',
        templateName: 'Test Template',
        canvasSize: { width: 1000, height: 1500 },
        backgroundColor: '#FFFFFF',
        templateSource: 'native',
        elements: [],
        selectedIds: [],
        nextTextFieldNumber: 1,
        nextImageFieldNumber: 1,
        history: [{ elements: [], canvasSize: { width: 1000, height: 1500 }, backgroundColor: '#FFFFFF' }],
        historyIndex: 0,
        maxHistory: 50,
        zoom: 1,
        snapToGrid: true,
        gridSize: 10,
        previewMode: false,
        guides: [],
        activeTab: 'properties',
        isSaving: false,
        isNewTemplate: true,
        snappingEnabled: true,
        clipboard: null,
        styleClipboard: null,
        templates: [],
        _hasHydrated: true,
    });
};

// Test fixtures
const createTextElement = (overrides: Partial<TextElement> = {}): TextElement => ({
    id: `text-${Date.now()}-${Math.random()}`,
    name: 'Test Text',
    type: 'text',
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    text: 'Hello World',
    fontFamily: 'Inter',
    fontSize: 24,
    fontStyle: 'normal',
    fill: '#000000',
    align: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    letterSpacing: 0,
    textDecoration: '',
    isDynamic: false,
    ...overrides,
});

const createImageElement = (overrides: Partial<ImageElement> = {}): ImageElement => ({
    id: `image-${Date.now()}-${Math.random()}`,
    name: 'Test Image',
    type: 'image',
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    imageUrl: 'https://example.com/image.jpg',
    fitMode: 'cover',
    cornerRadius: 0,
    isDynamic: false,
    ...overrides,
});

const createShapeElement = (overrides: Partial<ShapeElement> = {}): ShapeElement => ({
    id: `shape-${Date.now()}-${Math.random()}`,
    name: 'Test Shape',
    type: 'shape',
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    shapeType: 'rect',
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 1,
    ...overrides,
});

describe('editorStore', () => {
    beforeEach(() => {
        resetStore();
    });

    // ========================================
    // ELEMENT CRUD OPERATIONS
    // ========================================
    describe('Element CRUD', () => {
        describe('addElement', () => {
            it('should add a text element to the store', () => {
                const element = createTextElement({ id: 'text-1' });

                useEditorStore.getState().addElement(element);

                const state = useEditorStore.getState();
                expect(state.elements).toHaveLength(1);
                expect(state.elements[0]).toEqual(element);
            });

            it('should select the newly added element', () => {
                const element = createTextElement({ id: 'text-1' });

                useEditorStore.getState().addElement(element);

                const state = useEditorStore.getState();
                expect(state.selectedIds).toEqual(['text-1']);
            });

            it('should add multiple elements', () => {
                const text = createTextElement({ id: 'text-1' });
                const image = createImageElement({ id: 'image-1' });
                const shape = createShapeElement({ id: 'shape-1' });

                useEditorStore.getState().addElement(text);
                useEditorStore.getState().addElement(image);
                useEditorStore.getState().addElement(shape);

                const state = useEditorStore.getState();
                expect(state.elements).toHaveLength(3);
            });
        });

        describe('updateElement', () => {
            it('should update element properties', () => {
                const element = createTextElement({ id: 'text-1', x: 0, y: 0 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().updateElement('text-1', { x: 100, y: 200 });

                const updated = useEditorStore.getState().elements[0];
                expect(updated.x).toBe(100);
                expect(updated.y).toBe(200);
            });

            it('should not affect other elements', () => {
                const text1 = createTextElement({ id: 'text-1', x: 0 });
                const text2 = createTextElement({ id: 'text-2', x: 50 });
                useEditorStore.getState().addElement(text1);
                useEditorStore.getState().addElement(text2);

                useEditorStore.getState().updateElement('text-1', { x: 100 });

                const elements = useEditorStore.getState().elements;
                expect(elements.find(e => e.id === 'text-1')?.x).toBe(100);
                expect(elements.find(e => e.id === 'text-2')?.x).toBe(50);
            });

            it('should not update non-existent element', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().updateElement('non-existent', { x: 999 });

                const state = useEditorStore.getState();
                expect(state.elements).toHaveLength(1);
                expect(state.elements[0].x).toBe(100); // Original value
            });
        });

        describe('deleteElement', () => {
            it('should remove element from store', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().deleteElement('text-1');

                expect(useEditorStore.getState().elements).toHaveLength(0);
            });

            it('should remove from selectedIds', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                // Element is auto-selected when added

                useEditorStore.getState().deleteElement('text-1');

                expect(useEditorStore.getState().selectedIds).toEqual([]);
            });

            it('should not affect other elements', () => {
                const text1 = createTextElement({ id: 'text-1' });
                const text2 = createTextElement({ id: 'text-2' });
                useEditorStore.getState().addElement(text1);
                useEditorStore.getState().addElement(text2);

                useEditorStore.getState().deleteElement('text-1');

                const state = useEditorStore.getState();
                expect(state.elements).toHaveLength(1);
                expect(state.elements[0].id).toBe('text-2');
            });
        });

        describe('duplicateElement', () => {
            it('should create a copy with new id', () => {
                const element = createTextElement({ id: 'text-1', text: 'Original' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().duplicateElement('text-1');

                const state = useEditorStore.getState();
                expect(state.elements).toHaveLength(2);
                expect(state.elements[1].id).not.toBe('text-1');
            });

            it('should offset the duplicate position', () => {
                const element = createTextElement({ id: 'text-1', x: 100, y: 100 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().duplicateElement('text-1');

                const duplicate = useEditorStore.getState().elements[1];
                expect(duplicate.x).toBe(120); // +20 offset
                expect(duplicate.y).toBe(120); // +20 offset
            });

            it('should append "Copy" to the name', () => {
                const element = createTextElement({ id: 'text-1', name: 'My Text' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().duplicateElement('text-1');

                const duplicate = useEditorStore.getState().elements[1];
                expect(duplicate.name).toBe('My Text Copy');
            });
        });
    });

    // ========================================
    // SELECTION MANAGEMENT
    // ========================================
    describe('Selection Management', () => {
        describe('selectElement', () => {
            it('should select a single element', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().selectElement(null); // Clear selection first

                useEditorStore.getState().selectElement('text-1');

                expect(useEditorStore.getState().selectedIds).toEqual(['text-1']);
            });

            it('should clear previous selection', () => {
                const text1 = createTextElement({ id: 'text-1' });
                const text2 = createTextElement({ id: 'text-2' });
                useEditorStore.getState().addElement(text1);
                useEditorStore.getState().addElement(text2);

                useEditorStore.getState().selectElement('text-1');
                expect(useEditorStore.getState().selectedIds).toEqual(['text-1']);

                useEditorStore.getState().selectElement('text-2');
                expect(useEditorStore.getState().selectedIds).toEqual(['text-2']);
            });

            it('should clear selection when passed null', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().selectElement(null);

                expect(useEditorStore.getState().selectedIds).toEqual([]);
            });
        });

        describe('toggleSelection', () => {
            it('should add element to selection', () => {
                const text1 = createTextElement({ id: 'text-1' });
                const text2 = createTextElement({ id: 'text-2' });
                useEditorStore.getState().addElement(text1);
                useEditorStore.getState().addElement(text2);
                useEditorStore.getState().selectElement(null);

                useEditorStore.getState().toggleSelection('text-1');
                useEditorStore.getState().toggleSelection('text-2');

                expect(useEditorStore.getState().selectedIds).toContain('text-1');
                expect(useEditorStore.getState().selectedIds).toContain('text-2');
            });

            it('should remove element if already selected', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);

                // Element is auto-selected, toggle should remove it
                useEditorStore.getState().toggleSelection('text-1');

                expect(useEditorStore.getState().selectedIds).toEqual([]);
            });
        });

        describe('getSelectedElement', () => {
            it('should return the first selected element', () => {
                const element = createTextElement({ id: 'text-1', text: 'Find me' });
                useEditorStore.getState().addElement(element);

                const selected = useEditorStore.getState().getSelectedElement();

                expect(selected).not.toBeNull();
                expect((selected as TextElement).text).toBe('Find me');
            });

            it('should return null when nothing selected', () => {
                useEditorStore.getState().selectElement(null);

                const selected = useEditorStore.getState().getSelectedElement();

                expect(selected).toBeNull();
            });
        });
    });

    // ========================================
    // HISTORY (UNDO/REDO)
    // ========================================
    describe('History (Undo/Redo)', () => {
        describe('pushHistory', () => {
            it('should add a snapshot to history', () => {
                const initialHistoryLength = useEditorStore.getState().history.length;

                useEditorStore.getState().pushHistory();

                expect(useEditorStore.getState().history.length).toBe(initialHistoryLength + 1);
            });

            it('should increment historyIndex', () => {
                const initialIndex = useEditorStore.getState().historyIndex;

                useEditorStore.getState().pushHistory();

                expect(useEditorStore.getState().historyIndex).toBe(initialIndex + 1);
            });

            it('should capture current elements in snapshot', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().pushHistory();

                const history = useEditorStore.getState().history;
                const latestSnapshot = history[history.length - 1];
                expect(latestSnapshot.elements).toHaveLength(1);
            });
        });

        describe('undo', () => {
            it('should restore previous state', () => {
                // Add element and push history
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().pushHistory();

                // Delete and push history
                useEditorStore.getState().deleteElement('text-1');
                // deleteElement calls pushHistory internally

                // Undo should restore the element
                useEditorStore.getState().undo();

                expect(useEditorStore.getState().elements).toHaveLength(1);
            });

            it('should decrement historyIndex', () => {
                useEditorStore.getState().pushHistory();
                useEditorStore.getState().pushHistory();
                const indexBefore = useEditorStore.getState().historyIndex;

                useEditorStore.getState().undo();

                expect(useEditorStore.getState().historyIndex).toBe(indexBefore - 1);
            });

            it('should clear selection after undo', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().pushHistory();

                useEditorStore.getState().undo();

                expect(useEditorStore.getState().selectedIds).toEqual([]);
            });

            it('should not undo past the first snapshot', () => {
                // historyIndex starts at 0, can't go below
                const initialIndex = useEditorStore.getState().historyIndex;

                useEditorStore.getState().undo();
                useEditorStore.getState().undo();
                useEditorStore.getState().undo();

                expect(useEditorStore.getState().historyIndex).toBe(initialIndex);
            });
        });

        describe('redo', () => {
            it('should restore next state after undo', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().pushHistory();

                // Undo, then redo
                useEditorStore.getState().undo();
                expect(useEditorStore.getState().elements).toHaveLength(0);

                useEditorStore.getState().redo();
                expect(useEditorStore.getState().elements).toHaveLength(1);
            });

            it('should increment historyIndex', () => {
                useEditorStore.getState().pushHistory();
                useEditorStore.getState().undo();
                const indexBefore = useEditorStore.getState().historyIndex;

                useEditorStore.getState().redo();

                expect(useEditorStore.getState().historyIndex).toBe(indexBefore + 1);
            });

            it('should not redo past the latest snapshot', () => {
                useEditorStore.getState().pushHistory();
                const maxIndex = useEditorStore.getState().historyIndex;

                useEditorStore.getState().redo();
                useEditorStore.getState().redo();

                expect(useEditorStore.getState().historyIndex).toBe(maxIndex);
            });
        });

        describe('canUndo/canRedo', () => {
            it('canUndo should return false at initial state', () => {
                expect(useEditorStore.getState().canUndo()).toBe(false);
            });

            it('canUndo should return true after pushHistory', () => {
                useEditorStore.getState().pushHistory();
                expect(useEditorStore.getState().canUndo()).toBe(true);
            });

            it('canRedo should return false at latest state', () => {
                expect(useEditorStore.getState().canRedo()).toBe(false);
            });

            it('canRedo should return true after undo', () => {
                useEditorStore.getState().pushHistory();
                useEditorStore.getState().undo();
                expect(useEditorStore.getState().canRedo()).toBe(true);
            });
        });
    });

    // ========================================
    // LAYER ORDERING
    // ========================================
    describe('Layer Ordering', () => {
        const setupLayeredElements = () => {
            // Add 3 elements with explicit zIndex
            const bottom = createTextElement({ id: 'bottom', zIndex: 0, name: 'Bottom' });
            const middle = createTextElement({ id: 'middle', zIndex: 1, name: 'Middle' });
            const top = createTextElement({ id: 'top', zIndex: 2, name: 'Top' });

            useEditorStore.setState({
                ...useEditorStore.getState(),
                elements: [bottom, middle, top],
                selectedIds: [],
            });
        };

        describe('moveElementForward', () => {
            it('should increase zIndex by 1', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementForward('middle');

                const element = useEditorStore.getState().elements.find(e => e.id === 'middle');
                expect(element?.zIndex).toBe(2);
            });

            it('should not increase zIndex beyond max', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementForward('top');

                const element = useEditorStore.getState().elements.find(e => e.id === 'top');
                expect(element?.zIndex).toBe(2); // Stays at max
            });
        });

        describe('moveElementBackward', () => {
            it('should decrease zIndex by 1', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementBackward('middle');

                const element = useEditorStore.getState().elements.find(e => e.id === 'middle');
                expect(element?.zIndex).toBe(0);
            });

            it('should not decrease zIndex below 0', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementBackward('bottom');

                const element = useEditorStore.getState().elements.find(e => e.id === 'bottom');
                expect(element?.zIndex).toBe(0); // Stays at 0
            });
        });

        describe('moveElementToFront', () => {
            it('should set zIndex to max + 1', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementToFront('bottom');

                const element = useEditorStore.getState().elements.find(e => e.id === 'bottom');
                expect(element?.zIndex).toBe(3); // Was 2 max, now 3
            });
        });

        describe('moveElementToBack', () => {
            it('should set element to lowest zIndex', () => {
                setupLayeredElements();

                useEditorStore.getState().moveElementToBack('top');

                const element = useEditorStore.getState().elements.find(e => e.id === 'top');
                expect(element?.zIndex).toBe(0); // Now at back
            });
        });
    });

    // ========================================
    // ALIGNMENT OPERATIONS
    // ========================================
    describe('Alignment Operations', () => {
        describe('alignElement (to canvas)', () => {
            it('should align element to left of canvas', () => {
                const element = createTextElement({ id: 'text-1', x: 500 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'left');

                const aligned = useEditorStore.getState().elements[0];
                expect(aligned.x).toBe(0);
            });

            it('should align element to center of canvas', () => {
                const element = createTextElement({ id: 'text-1', x: 0, width: 200 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'center');

                const aligned = useEditorStore.getState().elements[0];
                // Canvas width is 1000, element width is 200
                // Center = (1000 - 200) / 2 = 400
                expect(aligned.x).toBe(400);
            });

            it('should align element to right of canvas', () => {
                const element = createTextElement({ id: 'text-1', x: 0, width: 200 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'right');

                const aligned = useEditorStore.getState().elements[0];
                // Canvas width is 1000, element width is 200
                // Right = 1000 - 200 = 800
                expect(aligned.x).toBe(800);
            });

            it('should align element to top of canvas', () => {
                const element = createTextElement({ id: 'text-1', y: 500 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'top');

                const aligned = useEditorStore.getState().elements[0];
                expect(aligned.y).toBe(0);
            });

            it('should align element to middle of canvas', () => {
                const element = createTextElement({ id: 'text-1', y: 0, height: 100 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'middle');

                const aligned = useEditorStore.getState().elements[0];
                // Canvas height is 1500, element height is 100
                // Middle = (1500 - 100) / 2 = 700
                expect(aligned.y).toBe(700);
            });

            it('should align element to bottom of canvas', () => {
                const element = createTextElement({ id: 'text-1', y: 0, height: 100 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignElement('text-1', 'bottom');

                const aligned = useEditorStore.getState().elements[0];
                // Canvas height is 1500, element height is 100
                // Bottom = 1500 - 100 = 1400
                expect(aligned.y).toBe(1400);
            });
        });

        describe('alignSelectedElements (multi-select)', () => {
            it('should not align if less than 2 elements selected', () => {
                const element = createTextElement({ id: 'text-1', x: 100 });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().alignSelectedElements('left');

                // Should not change
                expect(useEditorStore.getState().elements[0].x).toBe(100);
            });

            it('should align multiple elements to leftmost position', () => {
                const el1 = createTextElement({ id: 'text-1', x: 100 });
                const el2 = createTextElement({ id: 'text-2', x: 300 });
                const el3 = createTextElement({ id: 'text-3', x: 200 });

                useEditorStore.setState({
                    ...useEditorStore.getState(),
                    elements: [el1, el2, el3],
                    selectedIds: ['text-1', 'text-2', 'text-3'],
                });

                useEditorStore.getState().alignSelectedElements('left');

                const elements = useEditorStore.getState().elements;
                expect(elements.find(e => e.id === 'text-1')?.x).toBe(100);
                expect(elements.find(e => e.id === 'text-2')?.x).toBe(100);
                expect(elements.find(e => e.id === 'text-3')?.x).toBe(100);
            });
        });
    });

    // ========================================
    // CLIPBOARD OPERATIONS
    // ========================================
    describe('Clipboard Operations', () => {
        describe('copyElement/pasteElement', () => {
            it('should copy selected element to clipboard', () => {
                const element = createTextElement({ id: 'text-1', text: 'Copy me' });
                useEditorStore.getState().addElement(element);

                useEditorStore.getState().copyElement();

                const clipboard = useEditorStore.getState().clipboard;
                expect(clipboard).not.toBeNull();
                expect((clipboard as TextElement).text).toBe('Copy me');
            });

            it('should paste element from clipboard', () => {
                const element = createTextElement({ id: 'text-1' });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().copyElement();

                useEditorStore.getState().pasteElement();

                expect(useEditorStore.getState().elements).toHaveLength(2);
            });

            it('should offset pasted element', () => {
                const element = createTextElement({ id: 'text-1', x: 100, y: 100 });
                useEditorStore.getState().addElement(element);
                useEditorStore.getState().copyElement();

                useEditorStore.getState().pasteElement();

                const pasted = useEditorStore.getState().elements[1];
                expect(pasted.x).toBe(120); // +20
                expect(pasted.y).toBe(120); // +20
            });
        });
    });
});
