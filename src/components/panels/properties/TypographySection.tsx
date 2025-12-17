'use client';

import React, { memo, useCallback, useState } from 'react';
import {
    Type,
    ChevronDown,
    ChevronUp,
    CaseSensitive,
    CaseUpper,
    CaseLower,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader, SliderRow } from './shared';
import { FontPicker } from '@/components/ui/FontPicker';
import {
    FONT_WEIGHT_NAMES,
    getAvailableWeights,
    loadGoogleFont,
} from '@/lib/fonts/googleFonts';

interface TypographySectionProps {
    element: TextElement;
}

/**
 * TypographySection - Advanced typography controls
 * 
 * Features:
 * - Font Family Selector (with Google Fonts)
 * - Font Weight Selector (100-900)
 * - Text Transform Buttons (none, uppercase, lowercase, capitalize)
 * - Text Background Box Controls (collapsible)
 * 
 * Phase 1 of Typography Enhancement
 */
export const TypographySection = memo(function TypographySection({ element }: TypographySectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(element.backgroundEnabled || false);

    // Handle changes with history
    const handleChange = useCallback((updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    }, [element.id, updateElement, pushHistory]);

    // Handle slider changes (update immediately, push history on done)
    const handleSliderChange = useCallback((key: keyof TextElement, value: number) => {
        updateElement(element.id, { [key]: value });
    }, [element.id, updateElement]);

    // Handle font family change
    const handleFontChange = useCallback(async (fontFamily: string, provider: 'system' | 'google' | 'custom') => {
        // Load font if it's a Google Font
        if (provider === 'google') {
            await loadGoogleFont(fontFamily);
        }
        
        handleChange({
            fontFamily,
            fontProvider: provider,
        });
    }, [handleChange]);

    // Get available weights for current font
    const availableWeights = getAvailableWeights(element.fontFamily);
    const currentWeight = element.fontWeight || 400;

    return (
        <div className="space-y-4">
            <SectionHeader title="TYPOGRAPHY" />

            {/* Font Family */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600 font-medium">Font Family</label>
                <FontPicker
                    value={element.fontFamily}
                    onChange={handleFontChange}
                />
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600 font-medium">Font Weight</label>
                <select
                    value={currentWeight}
                    onChange={(e) => handleChange({ fontWeight: parseInt(e.target.value) as TextElement['fontWeight'] })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
                    aria-label="Select font weight"
                >
                    {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => {
                        const isAvailable = availableWeights.includes(weight);
                        return (
                            <option
                                key={weight}
                                value={weight}
                                disabled={!isAvailable}
                                className={!isAvailable ? 'text-gray-300' : ''}
                            >
                                {FONT_WEIGHT_NAMES[weight]} ({weight})
                                {!isAvailable ? ' - Not available' : ''}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Text Transform */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600 font-medium">Text Transform</label>
                <div className="grid grid-cols-4 gap-2">
                    <TextTransformButton
                        icon={<Type className="w-4 h-4" />}
                        label="None"
                        isActive={!element.textTransform || element.textTransform === 'none'}
                        onClick={() => handleChange({ textTransform: 'none' })}
                    />
                    <TextTransformButton
                        icon={<CaseUpper className="w-4 h-4" />}
                        label="UPPER"
                        isActive={element.textTransform === 'uppercase'}
                        onClick={() => handleChange({ textTransform: 'uppercase' })}
                    />
                    <TextTransformButton
                        icon={<CaseLower className="w-4 h-4" />}
                        label="lower"
                        isActive={element.textTransform === 'lowercase'}
                        onClick={() => handleChange({ textTransform: 'lowercase' })}
                    />
                    <TextTransformButton
                        icon={<CaseSensitive className="w-4 h-4" />}
                        label="Title"
                        isActive={element.textTransform === 'capitalize'}
                        onClick={() => handleChange({ textTransform: 'capitalize' })}
                    />
                </div>
            </div>

            {/* Text Background Box (Collapsible) */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                    onClick={() => {
                        const newState = !isBackgroundOpen;
                        setIsBackgroundOpen(newState);
                        if (newState && !element.backgroundEnabled) {
                            handleChange({
                                backgroundEnabled: true,
                                backgroundColor: element.backgroundColor || '#FFEB3B',
                                backgroundCornerRadius: element.backgroundCornerRadius ?? 8,
                                backgroundPadding: element.backgroundPadding ?? 12,
                            });
                        }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                    aria-expanded={isBackgroundOpen}
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={element.backgroundEnabled || false}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleChange({ backgroundEnabled: e.target.checked });
                                if (e.target.checked) setIsBackgroundOpen(true);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                            aria-label="Enable text background"
                        />
                        <span className="text-sm font-medium text-gray-700">Text Background</span>
                    </div>
                    {isBackgroundOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>

                {isBackgroundOpen && element.backgroundEnabled && (
                    <div className="p-3 space-y-3 border-t border-gray-100">
                        {/* Background Color */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-600 w-20">Color</label>
                            <div className="flex-1 flex items-center gap-2">
                                <input
                                    type="color"
                                    value={element.backgroundColor || '#FFEB3B'}
                                    onChange={(e) => handleChange({ backgroundColor: e.target.value })}
                                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                                    aria-label="Background color"
                                />
                                <input
                                    type="text"
                                    value={element.backgroundColor || '#FFEB3B'}
                                    onChange={(e) => handleChange({ backgroundColor: e.target.value })}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                    aria-label="Background color hex"
                                />
                            </div>
                        </div>

                        {/* Corner Radius */}
                        <SliderRow
                            label="Radius"
                            value={element.backgroundCornerRadius ?? 8}
                            min={0}
                            max={50}
                            step={1}
                            onChange={(v) => handleSliderChange('backgroundCornerRadius', v)}
                            onDone={pushHistory}
                        />

                        {/* Padding */}
                        <SliderRow
                            label="Padding"
                            value={element.backgroundPadding ?? 12}
                            min={0}
                            max={50}
                            step={1}
                            onChange={(v) => handleSliderChange('backgroundPadding', v)}
                            onDone={pushHistory}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

/** Text transform button component */
function TextTransformButton({
    icon,
    label,
    isActive,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={isActive}
            aria-label={`Text transform: ${label}`}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150",
                isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
            )}
        >
            {icon}
            <span className="text-[10px]">{label}</span>
        </button>
    );
}
