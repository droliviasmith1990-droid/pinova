/**
 * Alignment Store Tests
 * 
 * Tests for element alignment and distribution operations.
 */

import { useAlignmentStore } from '../alignmentStore';
import { Element, CanvasSize } from '@/types/editor';

// Standard canvas size for tests
const canvasSize: CanvasSize = { width: 1000, height: 1500 };

// Helper to create test elements
const createElement = (overrides: Partial<Element>): Element => ({
    id: 'el-1',
    name: 'Test Element',
    type: 'text',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    ...overrides,
} as Element);

describe('alignmentStore', () => {
    const store = useAlignmentStore.getState();

    describe('alignElement', () => {
        describe('horizontal alignment', () => {
            it('should align element to left edge', () => {
                const elements = [createElement({ id: 'el-1', x: 200 })];
                const result = store.alignElement(elements, 'el-1', 'left', canvasSize);

                expect(result[0].x).toBe(0);
            });

            it('should align element to center', () => {
                const elements = [createElement({ id: 'el-1', x: 0, width: 200 })];
                const result = store.alignElement(elements, 'el-1', 'center', canvasSize);

                // Center: (1000 - 200) / 2 = 400
                expect(result[0].x).toBe(400);
            });

            it('should align element to right edge', () => {
                const elements = [createElement({ id: 'el-1', x: 0, width: 200 })];
                const result = store.alignElement(elements, 'el-1', 'right', canvasSize);

                // Right: 1000 - 200 = 800
                expect(result[0].x).toBe(800);
            });
        });

        describe('vertical alignment', () => {
            it('should align element to top edge', () => {
                const elements = [createElement({ id: 'el-1', y: 500 })];
                const result = store.alignElement(elements, 'el-1', 'top', canvasSize);

                expect(result[0].y).toBe(0);
            });

            it('should align element to middle', () => {
                const elements = [createElement({ id: 'el-1', y: 0, height: 100 })];
                const result = store.alignElement(elements, 'el-1', 'middle', canvasSize);

                // Middle: (1500 - 100) / 2 = 700
                expect(result[0].y).toBe(700);
            });

            it('should align element to bottom edge', () => {
                const elements = [createElement({ id: 'el-1', y: 0, height: 100 })];
                const result = store.alignElement(elements, 'el-1', 'bottom', canvasSize);

                // Bottom: 1500 - 100 = 1400
                expect(result[0].y).toBe(1400);
            });
        });

        it('should return same array if element not found', () => {
            const elements = [createElement({ id: 'el-1' })];
            const result = store.alignElement(elements, 'non-existent', 'left', canvasSize);

            expect(result).toBe(elements);
        });

        it('should not affect other elements', () => {
            const elements = [
                createElement({ id: 'el-1', x: 100 }),
                createElement({ id: 'el-2', x: 200 }),
            ];
            const result = store.alignElement(elements, 'el-1', 'left', canvasSize);

            expect(result.find(e => e.id === 'el-2')?.x).toBe(200);
        });
    });

    describe('alignSelectedElements', () => {
        it('should align elements to left of selection bounding box', () => {
            const elements = [
                createElement({ id: 'el-1', x: 50, width: 100 }),
                createElement({ id: 'el-2', x: 200, width: 100 }),
                createElement({ id: 'el-3', x: 400, width: 100 }),
            ];
            const selectedIds = ['el-1', 'el-2', 'el-3'];

            const result = store.alignSelectedElements(elements, selectedIds, 'left');

            // All should align to leftmost edge (50)
            expect(result.find(e => e.id === 'el-1')?.x).toBe(50);
            expect(result.find(e => e.id === 'el-2')?.x).toBe(50);
            expect(result.find(e => e.id === 'el-3')?.x).toBe(50);
        });

        it('should align elements to center of selection bounding box', () => {
            const elements = [
                createElement({ id: 'el-1', x: 0, width: 100 }),   // left: 0, right: 100
                createElement({ id: 'el-2', x: 400, width: 100 }), // left: 400, right: 500
            ];
            const selectedIds = ['el-1', 'el-2'];

            const result = store.alignSelectedElements(elements, selectedIds, 'center');

            // Bounding box: left=0, right=500, center=250
            // el-1 (width 100): x = 250 - 50 = 200
            // el-2 (width 100): x = 250 - 50 = 200
            expect(result.find(e => e.id === 'el-1')?.x).toBe(200);
            expect(result.find(e => e.id === 'el-2')?.x).toBe(200);
        });

        it('should align elements to right of selection bounding box', () => {
            const elements = [
                createElement({ id: 'el-1', x: 0, width: 100 }),
                createElement({ id: 'el-2', x: 200, width: 150 }),
            ];
            const selectedIds = ['el-1', 'el-2'];

            const result = store.alignSelectedElements(elements, selectedIds, 'right');

            // Bounding box right edge: 200 + 150 = 350
            // el-1 (width 100): x = 350 - 100 = 250
            // el-2 (width 150): x = 350 - 150 = 200
            expect(result.find(e => e.id === 'el-1')?.x).toBe(250);
            expect(result.find(e => e.id === 'el-2')?.x).toBe(200);
        });

        it('should require at least 2 selected elements', () => {
            const elements = [createElement({ id: 'el-1', x: 100 })];
            const result = store.alignSelectedElements(elements, ['el-1'], 'left');

            expect(result).toBe(elements);
        });

        it('should not affect non-selected elements', () => {
            const elements = [
                createElement({ id: 'el-1', x: 100 }),
                createElement({ id: 'el-2', x: 200 }),
                createElement({ id: 'el-3', x: 300 }),
            ];
            const selectedIds = ['el-1', 'el-2'];

            const result = store.alignSelectedElements(elements, selectedIds, 'left');

            expect(result.find(e => e.id === 'el-3')?.x).toBe(300);
        });
    });

    describe('distributeSelectedElements', () => {
        describe('horizontal distribution', () => {
            it('should distribute elements evenly horizontally', () => {
                const elements = [
                    createElement({ id: 'el-1', x: 0, width: 50 }),     // Start
                    createElement({ id: 'el-2', x: 100, width: 50 }),   // Will be moved
                    createElement({ id: 'el-3', x: 300, width: 50 }),   // End
                ];
                const selectedIds = ['el-1', 'el-2', 'el-3'];

                const result = store.distributeSelectedElements(elements, selectedIds, 'horizontal');

                // Total span: 0 to 350, total width: 150, space: 200, gap: 100
                // el-2 should be at: 0 + 50 + 100 = 150
                const el2 = result.find(e => e.id === 'el-2');
                expect(el2?.x).toBe(150);
            });

            it('should not move first and last elements', () => {
                const elements = [
                    createElement({ id: 'el-1', x: 0, width: 50 }),
                    createElement({ id: 'el-2', x: 100, width: 50 }),
                    createElement({ id: 'el-3', x: 300, width: 50 }),
                ];
                const selectedIds = ['el-1', 'el-2', 'el-3'];

                const result = store.distributeSelectedElements(elements, selectedIds, 'horizontal');

                expect(result.find(e => e.id === 'el-1')?.x).toBe(0);
                expect(result.find(e => e.id === 'el-3')?.x).toBe(300);
            });
        });

        describe('vertical distribution', () => {
            it('should distribute elements evenly vertically', () => {
                const elements = [
                    createElement({ id: 'el-1', y: 0, height: 50 }),
                    createElement({ id: 'el-2', y: 100, height: 50 }),
                    createElement({ id: 'el-3', y: 300, height: 50 }),
                ];
                const selectedIds = ['el-1', 'el-2', 'el-3'];

                const result = store.distributeSelectedElements(elements, selectedIds, 'vertical');

                // el-2 should be repositioned for even spacing
                const el2 = result.find(e => e.id === 'el-2');
                expect(el2?.y).toBe(150);
            });
        });

        it('should require at least 3 selected elements', () => {
            const elements = [
                createElement({ id: 'el-1', x: 0 }),
                createElement({ id: 'el-2', x: 100 }),
            ];

            const result = store.distributeSelectedElements(elements, ['el-1', 'el-2'], 'horizontal');

            expect(result).toBe(elements);
        });

        it('should sort elements by position before distributing', () => {
            const elements = [
                createElement({ id: 'el-1', x: 300, width: 50 }),  // Rightmost in array, but will be end
                createElement({ id: 'el-2', x: 0, width: 50 }),    // Leftmost, will be start
                createElement({ id: 'el-3', x: 100, width: 50 }),  // Middle, will be redistributed
            ];
            const selectedIds = ['el-1', 'el-2', 'el-3'];

            const result = store.distributeSelectedElements(elements, selectedIds, 'horizontal');

            // el-2 is now first (x=0), el-1 is last (x=300)
            // el-3 should be redistributed between them
            expect(result.find(e => e.id === 'el-2')?.x).toBe(0);
            expect(result.find(e => e.id === 'el-1')?.x).toBe(300);
        });

        it('should not affect non-selected elements', () => {
            const elements = [
                createElement({ id: 'el-1', x: 0, width: 50 }),
                createElement({ id: 'el-2', x: 100, width: 50 }),
                createElement({ id: 'el-3', x: 300, width: 50 }),
                createElement({ id: 'el-4', x: 500, width: 50 }),
            ];
            const selectedIds = ['el-1', 'el-2', 'el-3'];

            const result = store.distributeSelectedElements(elements, selectedIds, 'horizontal');

            expect(result.find(e => e.id === 'el-4')?.x).toBe(500);
        });
    });
});
