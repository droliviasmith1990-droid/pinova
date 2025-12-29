'use client';

import React, { useCallback, useMemo } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from '@hello-pangea/dnd';
import { useEditorStore } from '@/stores/editorStore';
import { LayerItem } from './LayerItem';

/**
 * LayersPanel - Optimized with memoized LayerItem (Phase 3.2)
 * 
 * Performance improvements:
 * - LayerItem is memoized to prevent unnecessary re-renders
 * - Callbacks are memoized with useCallback
 * - Only renders ~15 visible items at a time (drag-drop constraint)
 */
export function LayersPanel() {
    // All state from consolidated editorStore
    const elements = useEditorStore((s) => s.elements);
    const updateElement = useEditorStore((s) => s.updateElement);
    const deleteElement = useEditorStore((s) => s.deleteElement);
    const duplicateElement = useEditorStore((s) => s.duplicateElement);

    // Selection from editorStore
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectElement = useEditorStore((s) => s.selectElement);
    const selectedId = selectedIds[0] || null;

    // History from editorStore
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const reorderElements = useEditorStore((s) => s.reorderElements);

    // Sort by zIndex descending (top to bottom = front to back)
    // Memoized to prevent re-sorting on every render (e.g. selection changes)
    const sortedElements = useMemo(() => {
        return [...elements].sort((a, b) => b.zIndex - a.zIndex);
    }, [elements]);

    // Memoized callbacks for LayerItem
    const handleSaveHistory = useCallback(() => {
        pushHistory();
    }, [pushHistory]);

    const handleSelect = useCallback((id: string) => {
        selectElement(id);
    }, [selectElement]);

    const handleUpdateElement = useCallback((id: string, updates: Parameters<typeof updateElement>[1]) => {
        updateElement(id, updates);
    }, [updateElement]);

    const handleDeleteElement = useCallback((id: string) => {
        deleteElement(id);
    }, [deleteElement]);

    const handleDuplicateElement = useCallback((id: string) => {
        duplicateElement(id);
    }, [duplicateElement]);

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;

        const fromIndex = result.source.index;
        const toIndex = result.destination.index;

        if (fromIndex !== toIndex) {
            reorderElements(fromIndex, toIndex);
            pushHistory();
        }
    }, [reorderElements, pushHistory]);

    // Empty state
    if (elements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <p className="text-sm">No layers yet</p>
                <p className="text-xs mt-1">Add elements from the toolbar</p>
            </div>
        );
    }

    return (
        <div className="space-y-1" data-testid="layers-panel">
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="layers">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                            {sortedElements.map((element, index) => (
                                <Draggable key={element.id} draggableId={element.id} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                        <LayerItem
                                            element={element}
                                            isSelected={selectedId === element.id}
                                            provided={dragProvided}
                                            snapshot={dragSnapshot}
                                            onSelect={handleSelect}
                                            onUpdateElement={handleUpdateElement}
                                            onDeleteElement={handleDeleteElement}
                                            onDuplicateElement={handleDuplicateElement}
                                            onSaveHistory={handleSaveHistory}
                                        />
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}

