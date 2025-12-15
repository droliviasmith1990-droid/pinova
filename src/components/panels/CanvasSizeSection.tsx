'use client';

import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useHistoryStore } from '@/stores/historyStore';
import { cn } from '@/lib/utils';

export function CanvasSizeSection() {
    // Canvas state from canvasStore
    const canvasSize = useCanvasStore((s) => s.canvasSize);
    const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
    const setZoom = useCanvasStore((s) => s.setZoom);
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);

    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);
    const clearElements = useElementsStore((s) => s.clearElements);

    // History from historyStore
    const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

    const [width, setWidth] = useState(canvasSize.width.toString());
    const [height, setHeight] = useState(canvasSize.height.toString());
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync inputs with store when canvas size changes externally
    useEffect(() => {
        setWidth(canvasSize.width.toString());
        setHeight(canvasSize.height.toString());
    }, [canvasSize.width, canvasSize.height]);

    const validateDimensions = (w: number, h: number): string | null => {
        if (w < 300 || h < 300) {
            return 'Dimensions must be at least 300 pixels';
        }
        if (w > 5000 || h > 5000) {
            return 'Dimensions cannot exceed 5000 pixels';
        }
        return null;
    };

    const parsedWidth = parseInt(width) || 0;
    const parsedHeight = parseInt(height) || 0;
    const validationError = validateDimensions(parsedWidth, parsedHeight);
    const isSameSize = parsedWidth === canvasSize.width && parsedHeight === canvasSize.height;
    const isApplyDisabled = !!validationError || isSameSize;

    // Update error state when inputs change
    useEffect(() => {
        setError(validationError);
    }, [validationError]);

    const calculateFitZoom = (newWidth: number, newHeight: number, viewportWidth: number, viewportHeight: number): number => {
        const padding = 200; // 100px on each side
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;

        const scaleX = availableWidth / newWidth;
        const scaleY = availableHeight / newHeight;
        const fitZoom = Math.min(scaleX, scaleY);

        // Never zoom in beyond 100%, but zoom out to fit
        return Math.min(1, Math.max(0.1, fitZoom));
    };

    const applyNewSize = () => {
        const newWidth = parsedWidth;
        const newHeight = parsedHeight;

        // Clear elements if any exist
        if (elements.length > 0) {
            clearElements();
        }

        // Apply new canvas size
        setCanvasSize(newWidth, newHeight);

        // Calculate smart zoom to fit in viewport
        // Estimate viewport size (approximate, will be refined in EditorCanvas)
        const viewportWidth = window.innerWidth - 300 - 384; // left sidebar + right panel
        const viewportHeight = window.innerHeight - 64 - 48; // header + toolbar

        const fitZoom = calculateFitZoom(newWidth, newHeight, viewportWidth, viewportHeight);
        setZoom(fitZoom);

        // Push history snapshot
        pushSnapshot({
            elements: [], // Elements were just cleared
            canvasSize: { width: newWidth, height: newHeight },
            backgroundColor,
        });
        setShowConfirmDialog(false);
    };

    const handleApply = () => {
        if (elements.length > 0) {
            // Show confirmation dialog
            setShowConfirmDialog(true);
        } else {
            // Apply immediately
            applyNewSize();
        }
    };

    return (
        <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Canvas Size</h3>
            <p className="text-xs text-gray-500 mb-4">Set custom dimensions for your template</p>

            <div className="flex gap-3 mb-3">
                {/* Width Input */}
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Width</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            min={300}
                            max={5000}
                            className={cn(
                                "flex-1 h-9 px-3 border rounded-lg text-sm focus:ring-1 outline-none transition-colors",
                                error ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                            )}
                        />
                        <span className="text-xs text-gray-500">px</span>
                    </div>
                </div>

                {/* Height Input */}
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Height</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            min={300}
                            max={5000}
                            className={cn(
                                "flex-1 h-9 px-3 border rounded-lg text-sm focus:ring-1 outline-none transition-colors",
                                error ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                            )}
                        />
                        <span className="text-xs text-gray-500">px</span>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-xs text-red-600 mb-3">{error}</p>
            )}

            {/* Apply Button */}
            <button
                onClick={handleApply}
                disabled={isApplyDisabled}
                className={cn(
                    "w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                    isApplyDisabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                )}
            >
                Apply Size
            </button>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Change Canvas Size?</h4>
                        <p className="text-sm text-gray-600 mb-6">
                            Changing canvas size will clear all elements. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyNewSize}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
