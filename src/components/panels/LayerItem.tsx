'use client';

import React, { memo } from 'react';
import { DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
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
import { ImageElement, TextElement, Element } from '@/types/editor';
import { cn } from '@/lib/utils';

export interface LayerItemProps {
    element: Element;
    isSelected: boolean;
    provided: DraggableProvided;
    snapshot: DraggableStateSnapshot;
    onSelect: (id: string) => void;
    onUpdateElement: (id: string, updates: Partial<Element>) => void;
    onDeleteElement: (id: string) => void;
    onDuplicateElement: (id: string) => void;
    onSaveHistory: () => void;
}

/**
 * LayerItem - Memoized for performance (Phase 3.2)
 * Extracted from LayersPanel to enable memoization and potential virtualization
 */
export const LayerItem = memo(function LayerItem({
    element,
    isSelected,
    provided,
    snapshot,
    onSelect,
    onUpdateElement,
    onDeleteElement,
    onDuplicateElement,
    onSaveHistory,
}: LayerItemProps) {
    // Helper to check if element is Canva background
    const isCanvaBackground = element.type === 'image' && (element as ImageElement).isCanvaBackground;

    return (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
                "hover:bg-gray-50",
                isSelected
                    ? "bg-blue-50/80 border-l-[3px] border-l-blue-500 shadow-sm"
                    : isCanvaBackground
                        ? "bg-linear-to-r from-purple-50 to-cyan-50 border-l-[3px] border-l-purple-300"
                        : "bg-white border-l-[3px] border-l-transparent",
                snapshot.isDragging && "shadow-lg scale-[1.02] bg-blue-50"
            )}
            onClick={() => onSelect(element.id)}
        >
            {/* Drag Handle */}
            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            {/* Icon */}
            <div
                className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={isCanvaBackground
                    ? { background: 'linear-gradient(135deg, #8B3DFF, #00C4CC)' }
                    : { background: '#f3f4f6' }
                }
            >
                {element.type === 'text' ? (
                    <Type className="w-4 h-4 text-gray-600" />
                ) : isCanvaBackground ? (
                    <Layers className="w-4 h-4 text-white" />
                ) : (
                    <Image className="w-4 h-4 text-gray-600" />
                )}
            </div>

            {/* Name */}
            {isCanvaBackground ? (
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
                        onUpdateElement(element.id, { name: e.target.value });
                    }}
                    onBlur={() => onSaveHistory()}
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
                        onUpdateElement(element.id, { isDynamic: !typedElement.isDynamic });
                        onSaveHistory();
                    }}
                    className={cn(
                        "p-1.5 rounded-md transition-all duration-150 shrink-0",
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
                    onUpdateElement(element.id, { visible: !element.visible });
                    onSaveHistory();
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 shrink-0"
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
                    onUpdateElement(element.id, { locked: !element.locked });
                    onSaveHistory();
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 shrink-0"
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
                    onDuplicateElement(element.id);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-150 shrink-0"
                title="Duplicate layer"
            >
                <Copy className="w-4 h-4 text-gray-400" />
            </button>

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (isCanvaBackground) {
                        if (confirm('Remove Canva background?')) {
                            onDeleteElement(element.id);
                        }
                    } else {
                        onDeleteElement(element.id);
                    }
                }}
                className="p-1.5 hover:bg-red-50 rounded-md transition-all duration-150 shrink-0 group/delete"
                title="Delete layer"
            >
                <Trash2 className="w-4 h-4 text-gray-400 group-hover/delete:text-red-500" />
            </button>
        </div>
    );
});
