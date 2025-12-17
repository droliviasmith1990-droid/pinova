'use client';

import React, { memo } from 'react';
import { RotateCw } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';
import { PropertyInput, SectionHeader } from './shared';

interface PositionSectionProps {
    element: Element;
}

/**
 * PositionSection - Memoized for performance (Phase 3.1)
 * Only re-renders when element prop changes
 */
export const PositionSection = memo(function PositionSection({ element }: PositionSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<Element>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <SectionHeader title="POSITION" />
            <div className="grid grid-cols-2 gap-3">
                <PropertyInput
                    label="X"
                    value={Math.round(element.x)}
                    onChange={(val) => handleChange({ x: val })}
                />
                <PropertyInput
                    label="Y"
                    value={Math.round(element.y)}
                    onChange={(val) => handleChange({ y: val })}
                />
                <PropertyInput
                    label="W"
                    value={Math.round(element.width)}
                    onChange={(val) => handleChange({ width: val })}
                />
                <PropertyInput
                    label="H"
                    value={Math.round(element.height)}
                    onChange={(val) => handleChange({ height: val })}
                />
            </div>

            <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 flex-1">
                    <RotateCw className="w-4 h-4 text-gray-500" />
                    <input
                        type="number"
                        value={Math.round(element.rotation)}
                        onChange={(e) => handleChange({ rotation: parseInt(e.target.value) || 0 })}
                        className="w-16 h-8 px-2 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">°</span>
                </div>
            </div>
        </div>
    );
});

