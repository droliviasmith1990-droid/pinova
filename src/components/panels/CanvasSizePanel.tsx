'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';

interface SizePreset {
    name: string;
    width: number;
    height: number;
}

const PRESETS: SizePreset[] = [
    { name: '1920×1080', width: 1920, height: 1080 },
    { name: '1080×1920', width: 1080, height: 1920 },
    { name: '1080×1080', width: 1080, height: 1080 },
];

export function CanvasSizePanel() {
    const canvasSize = useEditorStore((s) => s.canvasSize);
    const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
    const zoom = useEditorStore((s) => s.zoom);

    const [customWidth, setCustomWidth] = useState(canvasSize.width.toString());
    const [customHeight, setCustomHeight] = useState(canvasSize.height.toString());

    const handlePresetClick = (preset: SizePreset) => {
        setCanvasSize(preset.width, preset.height);
        setCustomWidth(preset.width.toString());
        setCustomHeight(preset.height.toString());
    };

    const handleCustomApply = () => {
        const width = parseInt(customWidth) || 300;
        const height = parseInt(customHeight) || 300;
        setCanvasSize(width, height);
    };

    const isPresetSelected = (preset: SizePreset) =>
        canvasSize.width === preset.width && canvasSize.height === preset.height;

    return (
        <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Canvas Size</h3>
            <p className="text-xs text-gray-500 mb-4">
                Preview and design your template for the ideal resolution.
            </p>

            {/* Presets */}
            <div className="flex gap-2 mb-4">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.name}
                        onClick={() => handlePresetClick(preset)}
                        className={cn(
                            "flex flex-col items-center p-2 rounded-lg border transition-all",
                            isPresetSelected(preset)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <div
                            className={cn(
                                "border border-gray-300 bg-white mb-1",
                                preset.width > preset.height
                                    ? "w-10 h-6"
                                    : preset.width < preset.height
                                        ? "w-6 h-10"
                                        : "w-8 h-8"
                            )}
                            style={{
                                borderRadius: 2,
                                boxShadow: isPresetSelected(preset) ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : undefined
                            }}
                        />
                        <span className="text-[10px] text-gray-600 whitespace-nowrap">
                            {preset.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Custom Size */}
            <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-medium text-blue-600 mb-2">
                    Custom Template (min 300×300)
                </p>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Width:</label>
                        <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            min={300}
                            max={4096}
                            className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Height:</label>
                        <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            min={300}
                            max={4096}
                            className="w-full h-8 px-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCustomApply}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    apply
                </button>
            </div>

            {/* Current Size Info */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    Current: <span className="font-medium text-gray-700">{canvasSize.width} × {canvasSize.height}</span> ({Math.round(zoom * 100)}%)
                </p>
            </div>
        </div>
    );
}
