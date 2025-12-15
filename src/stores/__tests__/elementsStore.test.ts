/**
 * Elements Store Tests
 * 
 * Tests for element CRUD operations, dynamic field detection, and visibility/lock management.
 */

import { useElementsStore } from '../elementsStore';
import { Element, TextElement, ImageElement } from '@/types/editor';

// Helper to reset store between tests
const resetStore = () => {
    useElementsStore.setState({ elements: [] });
};

// Helper to create a test text element
const createTextElement = (overrides: Partial<TextElement> = {}): TextElement => ({
    id: 'text-1',
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

// Helper to create a test image element
const createImageElement = (overrides: Partial<ImageElement> = {}): ImageElement => ({
    id: 'image-1',
    name: 'Test Image',
    type: 'image',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    fitMode: 'cover',
    cornerRadius: 0,
    isDynamic: false,
    ...overrides,
});

describe('elementsStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('addElement', () => {
        it('should add element to store', () => {
            const element = createTextElement();
            useElementsStore.getState().addElement(element);

            const { elements } = useElementsStore.getState();
            expect(elements).toHaveLength(1);
            expect(elements[0].id).toBe('text-1');
        });

        it('should add multiple elements', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1' }));
            useElementsStore.getState().addElement(createTextElement({ id: 'el-2' }));

            expect(useElementsStore.getState().elements).toHaveLength(2);
        });
    });

    describe('updateElement', () => {
        it('should update element properties', () => {
            const element = createTextElement();
            useElementsStore.getState().addElement(element);

            useElementsStore.getState().updateElement('text-1', { x: 200, y: 300 });

            const updated = useElementsStore.getState().elements[0];
            expect(updated.x).toBe(200);
            expect(updated.y).toBe(300);
        });

        it('should not affect other elements', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', x: 0 }));
            useElementsStore.getState().addElement(createTextElement({ id: 'el-2', x: 100 }));

            useElementsStore.getState().updateElement('el-1', { x: 500 });

            const el2 = useElementsStore.getState().elements.find(e => e.id === 'el-2');
            expect(el2?.x).toBe(100);
        });

        it('should auto-detect dynamic field from name pattern "Text 1"', () => {
            const element = createTextElement({ id: 'el-1', name: 'My Text' });
            useElementsStore.getState().addElement(element);

            useElementsStore.getState().updateElement('el-1', { name: 'Text 1' });

            const updated = useElementsStore.getState().elements[0] as TextElement;
            expect(updated.isDynamic).toBe(true);
            expect(updated.dynamicField).toBe('text1');
            expect(updated.text).toBe('{{text1}}');
        });

        it('should auto-detect dynamic field from name pattern "Image 2"', () => {
            const element = createImageElement({ id: 'img-1', name: 'My Image' });
            useElementsStore.getState().addElement(element);

            useElementsStore.getState().updateElement('img-1', { name: 'Image 2' });

            const updated = useElementsStore.getState().elements[0] as ImageElement;
            expect(updated.isDynamic).toBe(true);
            expect(updated.dynamicSource).toBe('image2');
        });

        it('should remove dynamic assignment when name pattern is removed', () => {
            const element = createTextElement({
                id: 'el-1',
                name: 'Text 1',
                isDynamic: true,
                dynamicField: 'text1',
                text: '{{text1}}'
            });
            useElementsStore.getState().addElement(element);

            useElementsStore.getState().updateElement('el-1', { name: 'Random Name' });

            const updated = useElementsStore.getState().elements[0] as TextElement;
            expect(updated.isDynamic).toBe(false);
            expect(updated.dynamicField).toBeUndefined();
            expect(updated.text).toBe('Your text here');
        });
    });

    describe('deleteElement', () => {
        it('should remove element from store', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1' }));
            useElementsStore.getState().addElement(createTextElement({ id: 'el-2' }));

            useElementsStore.getState().deleteElement('el-1');

            const { elements } = useElementsStore.getState();
            expect(elements).toHaveLength(1);
            expect(elements[0].id).toBe('el-2');
        });

        it('should not fail for non-existent element', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1' }));

            useElementsStore.getState().deleteElement('non-existent');

            expect(useElementsStore.getState().elements).toHaveLength(1);
        });
    });

    describe('duplicateElement', () => {
        it('should create a copy with new id', () => {
            const element = createTextElement({ id: 'original' });
            useElementsStore.getState().addElement(element);

            const duplicate = useElementsStore.getState().duplicateElement('original');

            expect(duplicate).not.toBeNull();
            expect(duplicate?.id).not.toBe('original');
            expect(useElementsStore.getState().elements).toHaveLength(2);
        });

        it('should offset position by 20px', () => {
            const element = createTextElement({ id: 'original', x: 100, y: 100 });
            useElementsStore.getState().addElement(element);

            const duplicate = useElementsStore.getState().duplicateElement('original');

            expect(duplicate?.x).toBe(120);
            expect(duplicate?.y).toBe(120);
        });

        it('should append "Copy" to name', () => {
            const element = createTextElement({ id: 'original', name: 'My Element' });
            useElementsStore.getState().addElement(element);

            const duplicate = useElementsStore.getState().duplicateElement('original');

            expect(duplicate?.name).toBe('My Element Copy');
        });

        it('should assign new dynamic field for dynamic text', () => {
            const element = createTextElement({
                id: 'original',
                isDynamic: true,
                dynamicField: 'text1'
            });
            useElementsStore.getState().addElement(element);

            const duplicate = useElementsStore.getState().duplicateElement('original') as TextElement;

            expect(duplicate?.dynamicField).toBe('text2');
        });

        it('should return null for non-existent element', () => {
            const duplicate = useElementsStore.getState().duplicateElement('non-existent');
            expect(duplicate).toBeNull();
        });
    });

    describe('lockElement', () => {
        it('should lock element', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', locked: false }));

            useElementsStore.getState().lockElement('el-1', true);

            expect(useElementsStore.getState().elements[0].locked).toBe(true);
        });

        it('should unlock element', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', locked: true }));

            useElementsStore.getState().lockElement('el-1', false);

            expect(useElementsStore.getState().elements[0].locked).toBe(false);
        });
    });

    describe('toggleVisibility', () => {
        it('should hide visible element', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', visible: true }));

            useElementsStore.getState().toggleVisibility('el-1');

            expect(useElementsStore.getState().elements[0].visible).toBe(false);
        });

        it('should show hidden element', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', visible: false }));

            useElementsStore.getState().toggleVisibility('el-1');

            expect(useElementsStore.getState().elements[0].visible).toBe(true);
        });
    });

    describe('getElementById', () => {
        it('should return element by id', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1', name: 'Found Me' }));

            const element = useElementsStore.getState().getElementById('el-1');

            expect(element?.name).toBe('Found Me');
        });

        it('should return undefined for non-existent id', () => {
            const element = useElementsStore.getState().getElementById('non-existent');
            expect(element).toBeUndefined();
        });
    });

    describe('setElements', () => {
        it('should replace all elements', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'old-1' }));
            useElementsStore.getState().addElement(createTextElement({ id: 'old-2' }));

            const newElements = [
                createTextElement({ id: 'new-1' }),
                createTextElement({ id: 'new-2' }),
                createTextElement({ id: 'new-3' }),
            ];

            useElementsStore.getState().setElements(newElements);

            const { elements } = useElementsStore.getState();
            expect(elements).toHaveLength(3);
            expect(elements.map(e => e.id)).toEqual(['new-1', 'new-2', 'new-3']);
        });
    });

    describe('clearElements', () => {
        it('should remove all elements', () => {
            useElementsStore.getState().addElement(createTextElement({ id: 'el-1' }));
            useElementsStore.getState().addElement(createTextElement({ id: 'el-2' }));

            useElementsStore.getState().clearElements();

            expect(useElementsStore.getState().elements).toHaveLength(0);
        });
    });
});
