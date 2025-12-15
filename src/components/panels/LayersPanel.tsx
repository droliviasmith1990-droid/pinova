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
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore'; // For reorderElements and pushHistory
import { ImageElement, TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';

export function LayersPanel() {
    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);
    const updateElement = useElementsStore((s) => s.updateElement);
    const deleteElement = useElementsStore((s) => s.deleteElement);
    const duplicateElement = useElementsStore((s) => s.duplicateElement);

    // Selection from selectionStore
    const selectedIds = useSelectionStore((s) => s.selectedIds);
    const selectElement = useSelectionStore((s) => s.selectElement);
    const selectedId = selectedIds[0] || null;

    // History from editorStore (single source of truth for history)
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);
    const canvasSize = useCanvasStore((s) => s.canvasSize);

    // Keep reorderElements from editorStore for now (complex integration)
    const reorderElements = useEditorStore((s) => s.reorderElements);

    // Sort by zIndex descending (top to bottom = front to back)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

    // Helper to save current state to history
    const saveHistory = () => {
        pushHistory();
    };

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
            saveHistory();
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
        <div className="space-y-1" data-testid="layers-panel">
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
                                                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
                                                "hover:bg-gray-50",
                                                selectedId === element.id
                                                    ? "bg-blue-50/80 border-l-[3px] border-l-blue-500 shadow-sm"
                                                    : isCanvaBackground(element)
                                                        ? "bg-gradient-to-r from-purple-50 to-cyan-50 border-l-[3px] border-l-purple-300"
                                                        : "bg-white border-l-[3px] border-l-transparent",
                                                snapshot.isDragging && "shadow-lg scale-[1.02] bg-blue-50"
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
                                                    onBlur={() => saveHistory()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "flex-1 text-sm font-medium text-gray-700 bg-transparent border-none focus:outline-none min-w-0",
                                                        "focus:bg-white focus:ring-2 focus:ring-blue-200 focus:px-2 focus:py-0.5 focus:rounded transition-all duration-150"
                                                    )}
                                                />
                                            )}

                                            {/* Dynamic Data Toggle - Only for text/image elements */}
                                            {(element.type === 'text' || element.type === 'image') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const typedElement = element as TextElement | ImageElement;
                                                        updateElement(element.id, { isDynamic: !typedElement.isDynamic });
                                                        saveHistory();
                                                    }}
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-all duration-150 flex-shrink-0",
                                                        (element as TextElement | ImageElement).isDynamic
                                                            ? "bg-blue-50 hover:bg-blue-100"
                                                            : "hover:bg-gray-100"
                                                    )}
                                                    title={(element as TextElement | ImageElement).isDynamic
                                                        ? "Disable dynamic data"
                                                        : "Enable dynamic data"}
                                                >
                                                    <Link2 className={cn(
                                                        "w-4 h-4",
                                                        (element as TextElement | ImageElement).isDynamic
                                                            ? "text-blue-600"
                                                            : "text-gray-400"
                                                    )} />
                                                </button>
                                            )}

                                            {/* Visibility Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateElement(element.id, { visible: !element.visible });
                                                    saveHistory();
                                                }}
                                                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 flex-shrink-0"
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
                                                    saveHistory();
                                                }}
                                                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 flex-shrink-0"
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
                                                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 flex-shrink-0"
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
                                                className="p-1.5 hover:bg-red-50 rounded-md transition-all duration-150 flex-shrink-0 group/delete"
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
