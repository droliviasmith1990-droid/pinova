'use client';

import React, { useState, useEffect } from 'react';
import {
    ArrowUp,
    ArrowDown,
    ArrowUpFromLine,
    ArrowDownFromLine,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignHorizontalJustifyStart,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd,
    Lock,
    Unlock
} from 'lucide-react';
import { useElementsStore } from '@/stores/elementsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';

/**
 * ArrangePanel - Layer order, alignment, and position controls
 * Used as a tab in RightPanel when an element is selected
 */
export function ArrangePanel() {
    const [aspectRatioLock, setAspectRatioLock] = useState(true);

    // Local input values (for controlled inputs that update on blur)
    const [localWidth, setLocalWidth] = useState('');
    const [localHeight, setLocalHeight] = useState('');
    const [localX, setLocalX] = useState('');
    const [localY, setLocalY] = useState('');
    const [localRotation, setLocalRotation] = useState('');

    // Stores
    const elements = useElementsStore((s) => s.elements);
    const updateElement = useElementsStore((s) => s.updateElement);
    const selectedIds = useSelectionStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;

    const {
        moveElementForward,
        moveElementBackward,
        moveElementToFront,
        moveElementToBack,
        alignElement,
        pushHistory
    } = useEditorStore();

    const selectedElement = selectedId ? elements.find((el) => el.id === selectedId) : null;

    // Sync local values when selection changes
    useEffect(() => {
        if (selectedElement) {
            setLocalWidth(Math.round(selectedElement.width).toString());
            setLocalHeight(Math.round(selectedElement.height).toString());
            setLocalX(Math.round(selectedElement.x).toString());
            setLocalY(Math.round(selectedElement.y).toString());
            setLocalRotation(Math.round(selectedElement.rotation || 0).toString());
        }
        return undefined;
    }, [selectedElement?.id, selectedElement?.width, selectedElement?.height, selectedElement?.x, selectedElement?.y, selectedElement?.rotation]);

    // Calculate layer position
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const elementIndex = selectedElement ? sortedElements.findIndex((el) => el.id === selectedElement.id) : -1;
    const isTopMost = elementIndex === 0;
    const isBottomMost = elementIndex === sortedElements.length - 1;

    // Handle dimension changes with aspect ratio lock
    const handleDimensionChange = (dimension: 'width' | 'height', value: string) => {
        if (!selectedElement) return;

        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue <= 0) return;

        const aspectRatio = selectedElement.width / selectedElement.height;

        if (aspectRatioLock) {
            if (dimension === 'width') {
                const newHeight = numValue / aspectRatio;
                updateElement(selectedElement.id, { width: numValue, height: newHeight });
                setLocalHeight(Math.round(newHeight).toString());
            } else {
                const newWidth = numValue * aspectRatio;
                updateElement(selectedElement.id, { width: newWidth, height: numValue });
                setLocalWidth(Math.round(newWidth).toString());
            }
        } else {
            updateElement(selectedElement.id, { [dimension]: numValue });
        }
        pushHistory();
    };

    const handlePositionChange = (field: 'x' | 'y' | 'rotation', value: string) => {
        if (!selectedElement) return;

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        updateElement(selectedElement.id, { [field]: numValue });
        pushHistory();
    };

    // Keyboard handler for Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    if (!selectedElement) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <p className="text-sm">Select an element to arrange</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Layer Order Section */}
            <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Layer Order
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        disabled={isTopMost}
                        onClick={() => { moveElementForward(selectedElement.id); pushHistory(); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
                            isTopMost
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : "text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        <ArrowUp className="w-4 h-4" />
                        Forward
                    </button>
                    <button
                        disabled={isBottomMost}
                        onClick={() => { moveElementBackward(selectedElement.id); pushHistory(); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
                            isBottomMost
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : "text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        <ArrowDown className="w-4 h-4" />
                        Backward
                    </button>
                    <button
                        disabled={isTopMost}
                        onClick={() => { moveElementToFront(selectedElement.id); pushHistory(); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
                            isTopMost
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : "text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        <ArrowUpFromLine className="w-4 h-4" />
                        To front
                    </button>
                    <button
                        disabled={isBottomMost}
                        onClick={() => { moveElementToBack(selectedElement.id); pushHistory(); }}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors",
                            isBottomMost
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : "text-gray-700 border-gray-200 hover:bg-gray-50"
                        )}
                    >
                        <ArrowDownFromLine className="w-4 h-4" />
                        To back
                    </button>
                </div>
            </div>

            {/* Align to Page Section */}
            <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Align to page
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'left'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignHorizontalJustifyStart className="w-4 h-4" />
                        <span className="text-xs">Left</span>
                    </button>
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'center'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignHorizontalJustifyCenter className="w-4 h-4" />
                        <span className="text-xs">Center</span>
                    </button>
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'right'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignHorizontalJustifyEnd className="w-4 h-4" />
                        <span className="text-xs">Right</span>
                    </button>
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'top'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignVerticalJustifyStart className="w-4 h-4" />
                        <span className="text-xs">Top</span>
                    </button>
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'middle'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignVerticalJustifyCenter className="w-4 h-4" />
                        <span className="text-xs">Middle</span>
                    </button>
                    <button
                        onClick={() => { alignElement(selectedElement.id, 'bottom'); pushHistory(); }}
                        className="flex flex-col items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <AlignVerticalJustifyEnd className="w-4 h-4" />
                        <span className="text-xs">Bottom</span>
                    </button>
                </div>
            </div>

            {/* Size & Position Section */}
            <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Size & Position
                </h4>

                {/* Width, Height, Ratio */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Width</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={localWidth}
                                onChange={(e) => setLocalWidth(e.target.value)}
                                onBlur={() => handleDimensionChange('width', localWidth)}
                                onKeyDown={handleKeyDown}
                                className="w-full h-9 px-2 pr-6 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">px</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Height</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={localHeight}
                                onChange={(e) => setLocalHeight(e.target.value)}
                                onBlur={() => handleDimensionChange('height', localHeight)}
                                onKeyDown={handleKeyDown}
                                className="w-full h-9 px-2 pr-6 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">px</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Ratio</label>
                        <button
                            onClick={() => setAspectRatioLock(!aspectRatioLock)}
                            className={cn(
                                "w-full h-9 flex items-center justify-center border rounded-lg transition-colors",
                                aspectRatioLock
                                    ? "bg-blue-50 border-blue-200 text-blue-600"
                                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                            )}
                            title={aspectRatioLock ? "Unlock aspect ratio" : "Lock aspect ratio"}
                        >
                            {aspectRatioLock ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* X, Y, Rotate */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">X</label>
                        <input
                            type="text"
                            value={localX}
                            onChange={(e) => setLocalX(e.target.value)}
                            onBlur={() => handlePositionChange('x', localX)}
                            onKeyDown={handleKeyDown}
                            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Y</label>
                        <input
                            type="text"
                            value={localY}
                            onChange={(e) => setLocalY(e.target.value)}
                            onBlur={() => handlePositionChange('y', localY)}
                            onKeyDown={handleKeyDown}
                            className="w-full h-9 px-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Rotate</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={localRotation}
                                onChange={(e) => setLocalRotation(e.target.value)}
                                onBlur={() => handlePositionChange('rotation', localRotation)}
                                onKeyDown={handleKeyDown}
                                className="w-full h-9 px-2 pr-5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">°</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
