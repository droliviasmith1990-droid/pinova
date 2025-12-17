'use client';

import React, { memo } from 'react';
import { Link2, Link2Off } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement, ImageElement } from '@/types/editor';
import { SectionHeader } from './shared';
import { DynamicFieldTooltip } from '@/components/ui/DynamicFieldTooltip';

interface DynamicDataSectionProps {
    element: TextElement | ImageElement;
}

export const DynamicDataSection = memo(function DynamicDataSection({ element }: DynamicDataSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<TextElement | ImageElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <SectionHeader title="DYNAMIC DATA" />

            <div className="space-y-3">
                <DynamicFieldTooltip>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={element.isDynamic}
                            onChange={(e) => handleChange({ isDynamic: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Enable dynamic data</span>
                        {element.isDynamic ? (
                            <Link2 className="w-4 h-4 text-blue-600" />
                        ) : (
                            <Link2Off className="w-4 h-4 text-gray-400" />
                        )}
                    </label>
                </DynamicFieldTooltip>

                {element.type === 'text' && (element as TextElement).isDynamic && (
                    <select
                        value={(element as TextElement).dynamicField || ''}
                        onChange={(e) => handleChange({
                            dynamicField: e.target.value as TextElement['dynamicField']
                        })}
                        className="w-full h-9 px-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="">Select field...</option>
                        <option value="title">Title</option>
                        <option value="subtitle">Subtitle</option>
                        <option value="description">Description</option>
                        <option value="price">Price</option>
                    </select>
                )}

                {element.type === 'image' && (element as ImageElement).isDynamic && (
                    <select
                        value={(element as ImageElement).dynamicSource || ''}
                        onChange={(e) => handleChange({
                            dynamicSource: e.target.value as ImageElement['dynamicSource']
                        })}
                        className="w-full h-9 px-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="">Select source...</option>
                        <option value="image">Main Image</option>
                        <option value="logo">Logo</option>
                    </select>
                )}
            </div>
        </div>
    );
});
