'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { ImageElement } from '@/types/editor';
import { SectionHeader } from './shared';

interface ImagePropertiesSectionProps {
    element: ImageElement;
}

export function ImagePropertiesSection({ element }: ImagePropertiesSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<ImageElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <SectionHeader title="IMAGE" />

            <div className="space-y-3">
                <div>
                    <label className="text-sm text-gray-600 block mb-1">Image URL</label>
                    <input
                        type="text"
                        value={element.imageUrl || ''}
                        onChange={(e) => handleChange({ imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-24">Corner Radius</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={element.cornerRadius}
                        onChange={(e) => updateElement(element.id, { cornerRadius: parseInt(e.target.value) })}
                        onMouseUp={() => pushHistory()}
                        className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm text-gray-600 w-8">{element.cornerRadius}</span>
                </div>
            </div>
        </div>
    );
}
