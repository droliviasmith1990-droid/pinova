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
import { useEditorStore } from '@/stores/editorStore';
import { ImageElement, TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';

export function LayersPanel() {
    const elements = useEditorStore((s) => s.elements);
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;
    const selectElement = useEditorStore((s) => s.selectElement);
    const updateElement = useEditorStore((s) => s.updateElement);
    const deleteElement = useEditorStore((s) => s.deleteElement);
    const duplicateElement = useEditorStore((s) => s.duplicateElement);
    const reorderElements = useEditorStore((s) => s.reorderElements);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    // Sort by zIndex descending (top to bottom = front to back)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    // Check if we have any content
    const hasContent = elements.length > 0;

    // Helper to check if element is Canva background
    const isCanvaBackground = (element: typeof elements[0]) =>
        element.type === 'image' && (element as ImageElement).isCanvaBackground;

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const fromIndex = result.source.index;
        const toIndex = result.destination.index;

        if (fromIndex !== toIndex) {
            reorderElements(fromIndex, toIndex);
            pushHistory();
        }
    };

    if (!hasContent) {
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
        <div className="space-y-1">
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="layers">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                            {sortedElements.map((element, index) => (
                                <Draggable key={element.id} draggableId={element.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                                                "hover:bg-gray-50 border-2",
                                                selectedId === element.id
                                                    ? "bg-blue-50 border-blue-300"
                                                    : isCanvaBackground(element)
                                                        ? "bg-gradient-to-r from-purple-50 to-cyan-50 border-purple-200"
                                                        : "bg-white border-transparent",
                                                snapshot.isDragging && "shadow-lg border-blue-400"
                                            )}
                                            onClick={() => selectElement(element.id)}
                                        >
                                            {/* Drag Handle */}
                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                                <GripVertical className="w-4 h-4 text-gray-400" />
                                            </div>

                                            {/* Icon */}
                                            <div
                                                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                                style={isCanvaBackground(element)
                                                    ? { background: 'linear-gradient(135deg, #8B3DFF, #00C4CC)' }
                                                    : { background: '#f3f4f6' }
                                                }
                                            >
                                                {element.type === 'text' ? (
                                                    <Type className="w-4 h-4 text-gray-600" />
                                                ) : isCanvaBackground(element) ? (
                                                    <Layers className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Image className="w-4 h-4 text-gray-600" />
                                                )}
                                            </div>

                                            {/* Name */}
                                            {isCanvaBackground(element) ? (
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 truncate">
                                                        {element.name}
                                                    </p>
                                                    {(element as ImageElement).originalFilename && (
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {(element as ImageElement).originalFilename}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <input
                                                    value={element.name}
                                                    onChange={(e) => {
                                                        updateElement(element.id, { name: e.target.value });
                                                    }}
                                                    onBlur={() => pushHistory()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "flex-1 text-sm bg-transparent border-none focus:outline-none min-w-0",
                                                        "focus:bg-white focus:ring-1 focus:ring-blue-300 focus:px-1 focus:rounded"
                                                    )}
                                                />
                                            )}

                                            {/* Dynamic indicator */}
                                            {(element.type === 'text' || element.type === 'image') &&
                                                (element as TextElement | ImageElement).isDynamic && (
                                                    <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                )}

                                            {/* Visibility Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateElement(element.id, { visible: !element.visible });
                                                    pushHistory();
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                title={element.visible ? "Hide layer" : "Show layer"}
                                            >
                                                {element.visible ? (
                                                    <Eye className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>

                                            {/* Lock Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateElement(element.id, { locked: !element.locked });
                                                    pushHistory();
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                title={element.locked ? "Unlock layer" : "Lock layer"}
                                            >
                                                {element.locked ? (
                                                    <Lock className="w-4 h-4 text-amber-500" />
                                                ) : (
                                                    <Unlock className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>

                                            {/* Duplicate Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    duplicateElement(element.id);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                title="Duplicate layer"
                                            >
                                                <Copy className="w-4 h-4 text-gray-400" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isCanvaBackground(element)) {
                                                        if (confirm('Remove Canva background?')) {
                                                            deleteElement(element.id);
                                                        }
                                                    } else {
                                                        deleteElement(element.id);
                                                    }
                                                }}
                                                className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0 group/delete"
                                                title="Delete layer"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-400 group-hover/delete:text-red-500" />
                                            </button>
                                        </div>
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
