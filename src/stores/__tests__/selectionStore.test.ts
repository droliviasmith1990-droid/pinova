/**
 * Selection Store Tests
 */

import { useSelectionStore } from '../selectionStore';

// Reset store before each test
const resetStore = () => {
    useSelectionStore.setState({ selectedIds: [] });
};

describe('selectionStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('selectElement', () => {
        it('should select a single element', () => {
            useSelectionStore.getState().selectElement('element-1');
            expect(useSelectionStore.getState().selectedIds).toEqual(['element-1']);
        });

        it('should replace previous selection', () => {
            useSelectionStore.getState().selectElement('element-1');
            useSelectionStore.getState().selectElement('element-2');
            expect(useSelectionStore.getState().selectedIds).toEqual(['element-2']);
        });

        it('should clear selection when passed null', () => {
            useSelectionStore.getState().selectElement('element-1');
            useSelectionStore.getState().selectElement(null);
            expect(useSelectionStore.getState().selectedIds).toEqual([]);
        });
    });

    describe('toggleSelection', () => {
        it('should add element to selection', () => {
            useSelectionStore.getState().toggleSelection('element-1');
            expect(useSelectionStore.getState().selectedIds).toContain('element-1');
        });

        it('should remove element if already selected', () => {
            useSelectionStore.getState().selectElement('element-1');
            useSelectionStore.getState().toggleSelection('element-1');
            expect(useSelectionStore.getState().selectedIds).toEqual([]);
        });

        it('should support multi-select', () => {
            useSelectionStore.getState().toggleSelection('element-1');
            useSelectionStore.getState().toggleSelection('element-2');
            expect(useSelectionStore.getState().selectedIds).toContain('element-1');
            expect(useSelectionStore.getState().selectedIds).toContain('element-2');
        });
    });

    describe('clearSelection', () => {
        it('should clear all selected elements', () => {
            useSelectionStore.getState().toggleSelection('element-1');
            useSelectionStore.getState().toggleSelection('element-2');
            useSelectionStore.getState().clearSelection();
            expect(useSelectionStore.getState().selectedIds).toEqual([]);
        });
    });

    describe('isSelected', () => {
        it('should return true for selected element', () => {
            useSelectionStore.getState().selectElement('element-1');
            expect(useSelectionStore.getState().isSelected('element-1')).toBe(true);
        });

        it('should return false for non-selected element', () => {
            useSelectionStore.getState().selectElement('element-1');
            expect(useSelectionStore.getState().isSelected('element-2')).toBe(false);
        });
    });
});
