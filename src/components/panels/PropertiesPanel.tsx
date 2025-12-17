'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement, ImageElement } from '@/types/editor';
import { CanvasSizeSection } from './CanvasSizeSection';
import {
    AppearanceSection,
    TextPropertiesSection,
    ImagePropertiesSection,
    EffectsSection,
    TypographySection,
} from './properties';

/**
 * PropertiesPanel - Element-specific properties
 * 
 * Shows:
 * - Canvas size (when no element selected)
 * - Appearance (opacity)
 * - Text properties (font, size, color, etc.)
 * - Image properties
 * - Effects (shadow, stroke, etc.)
 * 
 * NOTE: Layer order, alignment, and position controls are in the Arrange tab
 */
export function PropertiesPanel() {
    const elements = useEditorStore((s) => s.elements);
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;

    const selectedElement = elements.find((el) => el.id === selectedId);

    // When no element is selected, show Canvas Size controls
    if (!selectedElement) {
        return (
            <div data-testid="properties-panel">
                <CanvasSizeSection />

                {/* Placeholder message */}
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                    </div>
                    <p className="text-sm">Select an element to edit its properties</p>
                    <p className="text-xs mt-1 text-gray-400">Use the Arrange tab for positioning</p>
                </div>
            </div>
        );
    }

    const isText = selectedElement.type === 'text';
    const isImage = selectedElement.type === 'image';

    return (
        <div className="space-y-6" data-testid="properties-panel">
            {/* Appearance (opacity) */}
            <AppearanceSection element={selectedElement} />

            {/* Text Properties */}
            {isText && (
                <TextPropertiesSection element={selectedElement as TextElement} />
            )}

            {/* Typography (font family, weight, transform) */}
            {isText && (
                <TypographySection element={selectedElement as TextElement} />
            )}

            {/* Image Properties */}
            {isImage && (
                <ImagePropertiesSection element={selectedElement as ImageElement} />
            )}

            {/* Effects (text only) */}
            {isText && (
                <EffectsSection element={selectedElement as TextElement} />
            )}

            {/* Hint to use Arrange tab */}
            <div className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
                Use the <strong>Arrange</strong> tab for layer order, alignment, and position
            </div>
        </div>
    );
}


