/**
 * Layers Store Tests
 * 
 * Tests for layer ordering operations (reorder, forward, backward, front, back).
 */

import { useLayersStore } from '../layersStore';
import { Element } from '@/types/editor';

// Helper to create test elements
const createElements = (): Element[] => [
    { id: 'el-1', name: 'Element 1', type: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 0 } as Element,
    { id: 'el-2', name: 'Element 2', type: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 1 } as Element,
    { id: 'el-3', name: 'Element 3', type: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 2 } as Element,
    { id: 'el-4', name: 'Element 4', type: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 3 } as Element,
];

describe('layersStore', () => {
    const store = useLayersStore.getState();

    describe('reorderElements', () => {
        it('should move element from one position to another', () => {
            const elements = createElements();
            // Move element from index 0 (highest zIndex in sorted) to index 2
            const result = store.reorderElements(elements, 0, 2);

            // Verify zIndex values were updated
            const el4 = result.find(e => e.id === 'el-4');
            expect(el4?.zIndex).toBeLessThan(3); // el-4 was moved down
        });

        it('should update zIndex for all affected elements', () => {
            const elements = createElements();
            const result = store.reorderElements(elements, 3, 0);

            // All elements should have sequential zIndex
            const zIndexes = result.map(e => e.zIndex).sort((a, b) => a - b);
            expect(zIndexes).toEqual([0, 1, 2, 3]);
        });

        it('should return new array (immutable)', () => {
            const elements = createElements();
            const result = store.reorderElements(elements, 0, 1);

            expect(result).not.toBe(elements);
            result.forEach((el, i) => {
                expect(el).not.toBe(elements[i]);
            });
        });
    });

    describe('moveElementForward', () => {
        it('should increase element zIndex by 1', () => {
            const elements = createElements();
            const result = store.moveElementForward(elements, 'el-2');

            const el2 = result.find(e => e.id === 'el-2');
            expect(el2?.zIndex).toBe(2);
        });

        it('should swap with element above', () => {
            const elements = createElements();
            const result = store.moveElementForward(elements, 'el-2');

            const el3 = result.find(e => e.id === 'el-3');
            expect(el3?.zIndex).toBe(1);
        });

        it('should not change if already at front', () => {
            const elements = createElements();
            const result = store.moveElementForward(elements, 'el-4');

            const el4 = result.find(e => e.id === 'el-4');
            expect(el4?.zIndex).toBe(3);
        });

        it('should return same array if element not found', () => {
            const elements = createElements();
            const result = store.moveElementForward(elements, 'non-existent');

            expect(result).toBe(elements);
        });
    });

    describe('moveElementBackward', () => {
        it('should decrease element zIndex by 1', () => {
            const elements = createElements();
            const result = store.moveElementBackward(elements, 'el-3');

            const el3 = result.find(e => e.id === 'el-3');
            expect(el3?.zIndex).toBe(1);
        });

        it('should swap with element below', () => {
            const elements = createElements();
            const result = store.moveElementBackward(elements, 'el-3');

            const el2 = result.find(e => e.id === 'el-2');
            expect(el2?.zIndex).toBe(2);
        });

        it('should not change if already at back', () => {
            const elements = createElements();
            const result = store.moveElementBackward(elements, 'el-1');

            const el1 = result.find(e => e.id === 'el-1');
            expect(el1?.zIndex).toBe(0);
        });
    });

    describe('moveElementToFront', () => {
        it('should set element to highest zIndex', () => {
            const elements = createElements();
            const result = store.moveElementToFront(elements, 'el-1');

            const el1 = result.find(e => e.id === 'el-1');
            const maxZ = Math.max(...result.map(e => e.zIndex));
            expect(el1?.zIndex).toBe(maxZ);
        });

        it('should not affect other elements', () => {
            const elements = createElements();
            const result = store.moveElementToFront(elements, 'el-1');

            // Other elements should keep their zIndex
            expect(result.find(e => e.id === 'el-2')?.zIndex).toBe(1);
            expect(result.find(e => e.id === 'el-3')?.zIndex).toBe(2);
            expect(result.find(e => e.id === 'el-4')?.zIndex).toBe(3);
        });
    });

    describe('moveElementToBack', () => {
        it('should set element to lowest zIndex (0)', () => {
            const elements = createElements();
            const result = store.moveElementToBack(elements, 'el-4');

            const el4 = result.find(e => e.id === 'el-4');
            expect(el4?.zIndex).toBe(0);
        });

        it('should shift other elements up', () => {
            const elements = createElements();
            const result = store.moveElementToBack(elements, 'el-4');

            // el-1 was at 0, after el-4 moves to back and normalization:
            // el-4: -1 -> 0, el-1: 0+1=1 -> 1-(-1)=2
            expect(result.find(e => e.id === 'el-1')?.zIndex).toBe(2);
        });

        it('should normalize zIndex values', () => {
            const elements = createElements();
            const result = store.moveElementToBack(elements, 'el-4');

            const minZ = Math.min(...result.map(e => e.zIndex));
            expect(minZ).toBe(0);
        });
    });

    describe('normalizeZIndexes', () => {
        it('should make zIndex values sequential starting from 0', () => {
            const elements: Element[] = [
                { id: 'el-1', zIndex: 5 } as Element,
                { id: 'el-2', zIndex: 10 } as Element,
                { id: 'el-3', zIndex: 15 } as Element,
            ];

            const result = store.normalizeZIndexes(elements);

            expect(result.find(e => e.id === 'el-1')?.zIndex).toBe(0);
            expect(result.find(e => e.id === 'el-2')?.zIndex).toBe(1);
            expect(result.find(e => e.id === 'el-3')?.zIndex).toBe(2);
        });

        it('should preserve relative order', () => {
            const elements: Element[] = [
                { id: 'el-1', zIndex: 100 } as Element,
                { id: 'el-2', zIndex: 50 } as Element,
                { id: 'el-3', zIndex: 75 } as Element,
            ];

            const result = store.normalizeZIndexes(elements);

            // Order by zIndex should be: el-2 (50) < el-3 (75) < el-1 (100)
            expect(result.find(e => e.id === 'el-2')?.zIndex).toBe(0);
            expect(result.find(e => e.id === 'el-3')?.zIndex).toBe(1);
            expect(result.find(e => e.id === 'el-1')?.zIndex).toBe(2);
        });
    });
});
