'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
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
import { LayersList } from './LayersList';

interface PositionPanelProps {
    onClose: () => void;
}

export function PositionPanel({ onClose }: PositionPanelProps) {
    const [activeTab, setActiveTab] = useState<'arrange' | 'layers'>('arrange');
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
        return null;
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Position</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100">
                <button
                    className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium relative",
                        activeTab === 'arrange' ? "text-purple-600" : "text-gray-600 hover:text-gray-900"
                    )}
                    onClick={() => setActiveTab('arrange')}
                >
                    Arrange
                    {activeTab === 'arrange' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                    )}
                </button>
                <button
                    className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium relative",
                        activeTab === 'layers' ? "text-purple-600" : "text-gray-600 hover:text-gray-900"
                    )}
                    onClick={() => setActiveTab('layers')}
                >
                    Layers
                    {activeTab === 'layers' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'arrange' ? (
                    <div className="space-y-5">
                        {/* Layer Order Section */}
                        <div>
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
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'top'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignVerticalJustifyStart className="w-4 h-4" />
                                    Top
                                </button>
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'left'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignHorizontalJustifyStart className="w-4 h-4" />
                                    Left
                                </button>
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'middle'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignVerticalJustifyCenter className="w-4 h-4" />
                                    Middle
                                </button>
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'center'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignHorizontalJustifyCenter className="w-4 h-4" />
                                    Centre
                                </button>
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'bottom'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignVerticalJustifyEnd className="w-4 h-4" />
                                    Bottom
                                </button>
                                <button
                                    onClick={() => { alignElement(selectedElement.id, 'right'); pushHistory(); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <AlignHorizontalJustifyEnd className="w-4 h-4" />
                                    Right
                                </button>
                            </div>
                        </div>

                        {/* Advanced Section */}
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                Advanced
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
                                            className="w-full h-9 px-2 pr-6 text-sm border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
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
                                            className="w-full h-9 px-2 pr-6 text-sm border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
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
                                                ? "bg-purple-50 border-purple-200 text-purple-600"
                                                : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                        )}
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
                                        className="w-full h-9 px-2 text-sm border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
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
                                        className="w-full h-9 px-2 text-sm border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
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
                                            className="w-full h-9 px-2 pr-5 text-sm border border-gray-200 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">°</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Layers Tab */
                    <LayersList />
                )}
            </div>
        </div>
    );
}
