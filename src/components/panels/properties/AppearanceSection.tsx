'use client';

import React, { memo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';
import { SectionHeader } from './shared';

interface AppearanceSectionProps {
    element: Element;
}

export const AppearanceSection = memo(function AppearanceSection({ element }: AppearanceSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<Element>) => {
        updateElement(element.id, updates);
    };

    return (
        <div>
            <SectionHeader title="APPEARANCE" />

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-20">Opacity</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={element.opacity}
                        onChange={(e) => handleChange({ opacity: parseFloat(e.target.value) })}
                        onMouseUp={() => pushHistory()}
                        className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm text-gray-600 w-12 text-right">
                        {Math.round(element.opacity * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
});
