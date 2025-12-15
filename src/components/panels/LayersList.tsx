'use client';

import React from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult
} from '@hello-pangea/dnd';
import {
    GripVertical,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Link2,
    Type,
    Image,
    Layers,
    Trash2,
    Copy
} from 'lucide-react';
import { useElementsStore } from '@/stores/elementsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore';
import { ImageElement, TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';

/**
 * LayersList - Reusable layers list component
 * Used by both LayersPanel and PositionPanel (Layers tab)
 */
export function LayersList() {
    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);
    const updateElement = useElementsStore((s) => s.updateElement);
    const deleteElement = useElementsStore((s) => s.deleteElement);
    const duplicateElement = useElementsStore((s) => s.duplicateElement);

    // Selection from selectionStore
    const selectedIds = useSelectionStore((s) => s.selectedIds);
    const selectElement = useSelectionStore((s) => s.selectElement);
    const selectedId = selectedIds[0] || null;

    // History from editorStore
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const reorderElements = useEditorStore((s) => s.reorderElements);

    // Sort by zIndex descending (top to bottom = front to back)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    const saveHistory = () => {
        pushHistory();
    };

    // Helper to check if element is Canva background
    const isCanvaBackground = (element: typeof elements[0]) =>
        element.type === 'image' && (element as ImageElement).isCanvaBackground;

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const fromIndex = result.source.index;
        const toIndex = result.destination.index;

        if (fromIndex !== toIndex) {
            reorderElements(fromIndex, toIndex);
            saveHistory();
        }
    };

    if (elements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                    <Layers className="w-5 h-5" />
                </div>
                <p className="text-sm">No layers yet</p>
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="layers-list">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                        {sortedElements.map((element, index) => (
                            <Draggable key={element.id} draggableId={element.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150",
                                            "hover:bg-gray-50",
                                            selectedId === element.id
                                                ? "bg-purple-50 border-l-2 border-l-purple-500"
                                                : isCanvaBackground(element)
                                                    ? "bg-gradient-to-r from-purple-50/50 to-cyan-50/50 border-l-2 border-l-purple-300"
                                                    : "bg-white border-l-2 border-l-transparent",
                                            snapshot.isDragging && "shadow-lg scale-[1.02] bg-purple-50"
                                        )}
                                        onClick={() => selectElement(element.id)}
                                    >
                                        {/* Drag Handle */}
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                                        </div>

                                        {/* Icon */}
                                        <div
                                            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                                            style={isCanvaBackground(element)
                                                ? { background: 'linear-gradient(135deg, #8B3DFF, #00C4CC)' }
                                                : { background: '#f3f4f6' }
                                            }
                                        >
                                            {element.type === 'text' ? (
                                                <Type className="w-3 h-3 text-gray-600" />
                                            ) : isCanvaBackground(element) ? (
                                                <Layers className="w-3 h-3 text-white" />
                                            ) : (
                                                <Image className="w-3 h-3 text-gray-600" />
                                            )}
                                        </div>

                                        {/* Name */}
                                        <span className="flex-1 text-xs font-medium text-gray-700 truncate min-w-0">
                                            {element.name}
                                        </span>

                                        {/* Dynamic indicator */}
                                        {(element.type === 'text' || element.type === 'image') &&
                                            (element as TextElement | ImageElement).isDynamic && (
                                                <Link2 className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                            )}

                                        {/* Visibility Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateElement(element.id, { visible: !element.visible });
                                                saveHistory();
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded transition-all duration-150 flex-shrink-0"
                                            title={element.visible ? "Hide" : "Show"}
                                        >
                                            {element.visible ? (
                                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                            ) : (
                                                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                            )}
                                        </button>

                                        {/* Lock Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateElement(element.id, { locked: !element.locked });
                                                saveHistory();
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded transition-all duration-150 flex-shrink-0"
                                            title={element.locked ? "Unlock" : "Lock"}
                                        >
                                            {element.locked ? (
                                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                            ) : (
                                                <Unlock className="w-3.5 h-3.5 text-gray-400" />
                                            )}
                                        </button>

                                        {/* More actions on hover could be added here */}
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
