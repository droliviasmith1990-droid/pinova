'use client';

import React, { memo, useCallback, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Zap, Eye, EyeOff } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';
import { calculateFitFontSize } from '@/lib/canvas/textUtils';

interface TextPropertiesSectionProps {
    element: TextElement;
}

export const TextPropertiesSection = memo(function TextPropertiesSection({ element }: TextPropertiesSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    
    // Get live element from store for reactive updates
    const liveElement = useEditorStore((state) => 
        state.elements.find(el => el.id === element.id) as TextElement | undefined
    ) || element;

    // Calculate display font size for auto-fit mode (read-only)
    const displayFontSize = liveElement.autoFitText ? calculateFitFontSize(
        liveElement.previewText || liveElement.text || '',
        liveElement.width,
        liveElement.height,
        liveElement.fontFamily || 'Arial',
        liveElement.fontWeight || 400,
        liveElement.lineHeight || 1.2,
        liveElement.letterSpacing || 0,
        liveElement.maxFontSize,
        liveElement.minFontSize,
        liveElement.autoFitPadding
    ) : liveElement.fontSize;
    
    // Local state for preview mode toggle
    const [showPreview, setShowPreview] = useState(!!liveElement.previewText);
    
    const handleChange = useCallback((updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
    }, [element.id, updateElement]);

    const handleDynamicToggle = useCallback((isDynamic: boolean) => {
        if (isDynamic) {
            // When enabling dynamic, ensure we have a placeholder
            const fieldName = liveElement.dynamicField || liveElement.name || 'text1';
            handleChange({ 
                isDynamic: true, 
                dynamicField: fieldName,
                text: `{{${fieldName}}}`
            });
        } else {
            // When disabling dynamic, use preview text or placeholder
            handleChange({ 
                isDynamic: false,
                text: liveElement.previewText || liveElement.text.replace(/\{\{.*?\}\}/g, 'Sample Text')
            });
        }
    }, [handleChange, liveElement]);

    const handlePreviewTextChange = useCallback((previewText: string) => {
        handleChange({ previewText });
    }, [handleChange]);

    const hasPlaceholder = liveElement.text.includes('{{');
    
    return (
        <div>
            <SectionHeader title="TEXT" />

            <div className="space-y-3">
                {/* Dynamic Field Toggle */}
                <div className="flex items-center justify-between p-2 bg-linear-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                        <Zap className={cn("w-4 h-4", liveElement.isDynamic ? "text-purple-600" : "text-gray-400")} />
                        <span className="text-sm font-medium text-gray-700">Dynamic Field</span>
                    </div>
                    <button
                        onClick={() => handleDynamicToggle(!liveElement.isDynamic)}
                        className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            liveElement.isDynamic ? "bg-purple-500" : "bg-gray-300"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                            liveElement.isDynamic ? "translate-x-5" : "translate-x-0.5"
                        )} />
                    </button>
                </div>

                {/* Dynamic Field Name (when dynamic is ON) */}
                {liveElement.isDynamic && (
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">Field Name</label>
                        <input
                            type="text"
                            value={liveElement.dynamicField || ''}
                            onChange={(e) => {
                                const fieldName = e.target.value;
                                handleChange({ 
                                    dynamicField: fieldName,
                                    text: `{{${fieldName}}}`
                                });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none"
                            placeholder="text1"
                        />
                    </div>
                )}

                {/* Preview Text (for dynamic fields) */}
                {liveElement.isDynamic && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-gray-500">Preview Text</label>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {showPreview ? 'Showing' : 'Show preview'}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={liveElement.previewText || ''}
                            onChange={(e) => handlePreviewTextChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Enter preview content..."
                        />
                        <p className="text-[10px] text-gray-400">
                            Type sample text to see how it looks. Placeholder &quot;{`{{${liveElement.dynamicField || 'field'}}}`}&quot; is preserved.
                        </p>
                    </div>
                )}

                {/* Regular Text Input (when not dynamic OR viewing placeholder) */}
                {!liveElement.isDynamic && (
                    <textarea
                        value={liveElement.text}
                        onChange={(e) => handleChange({ text: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
                        placeholder="Enter text..."
                    />
                )}

                {/* Show placeholder indicator when dynamic */}
                {liveElement.isDynamic && hasPlaceholder && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                        <span className="text-xs text-gray-500">Stored:</span>
                        <code className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            {liveElement.text}
                        </code>
                    </div>
                )}

                {/* Text Alignment */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleChange({ align: 'left' })}
                        aria-label="Align text left"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'left' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'center' })}
                        aria-label="Align text center"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'center' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'right' })}
                        aria-label="Align text right"
                        className={cn(
                            "p-2 rounded border transition-colors",
                            liveElement.align === 'right' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm text-gray-600">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="21" y1="6" x2="3" y2="6" />
                                <line x1="21" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="18" x2="3" y2="18" />
                                <path d="M9 3v18M15 3v18" strokeDasharray="2 2" opacity="0.4" />
                            </svg>
                            Line Height
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            max="4"
                            step="0.1"
                            value={liveElement.lineHeight}
                            onChange={(e) => handleChange({ lineHeight: parseFloat(e.target.value) || 1 })}
                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.1"
                        value={liveElement.lineHeight}
                        onChange={(e) => handleChange({ lineHeight: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 h-2"
                    />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-sm text-gray-600">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <text x="2" y="16" fontSize="12" fill="currentColor" stroke="none">A</text>
                                <path d="M10 12h4" />
                                <path d="M10 10l-2 2 2 2" />
                                <path d="M14 10l2 2-2 2" />
                                <text x="16" y="16" fontSize="12" fill="currentColor" stroke="none">B</text>
                            </svg>
                            Letter Spacing
                        </label>
                        <input
                            type="number"
                            min="-10"
                            max="50"
                            step="0.5"
                            value={liveElement.letterSpacing}
                            onChange={(e) => handleChange({ letterSpacing: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                        />
                    </div>
                    <input
                        type="range"
                        min="-10"
                        max="50"
                        step="0.5"
                        value={liveElement.letterSpacing}
                        onChange={(e) => handleChange({ letterSpacing: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 h-2"
                    />
                </div>

                {/* Auto-fit Text Toggle */}
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200">
                    <input
                        type="checkbox"
                        checked={liveElement.autoFitText || false}
                        onChange={(e) => handleChange({ autoFitText: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Auto-fit text</span>
                        <p className="text-xs text-gray-500">Automatically resize font to fit box</p>
                    </div>
                </label>

                {/* Auto-fit Settings - shown when Auto-fit is enabled */}
                {liveElement.autoFitText && (
                    <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-3">
                        {/* Current Font Size (read-only) */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Current Size</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold text-blue-600">
                                    {displayFontSize || 16}
                                </span>
                                <span className="text-xs text-gray-400">px (auto)</span>
                            </div>
                        </div>
                        
                        {/* Max Size Control */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Max Size</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={8}
                                    max={500}
                                    value={liveElement.maxFontSize || 48}
                                    onChange={(e) => handleChange({ maxFontSize: parseInt(e.target.value) || 48 })}
                                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                />
                                <span className="text-xs text-gray-400">px</span>
                            </div>
                        </div>

                        {/* Min Size Control */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Min Size</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={liveElement.minFontSize || 8}
                                    onChange={(e) => handleChange({ minFontSize: parseInt(e.target.value) || 8 })}
                                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                />
                                <span className="text-xs text-gray-400">px</span>
                            </div>
                        </div>

                        {/* Padding Control */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Padding</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={liveElement.autoFitPadding ?? 15}
                                    onChange={(e) => handleChange({ autoFitPadding: parseInt(e.target.value) || 0 })}
                                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                />
                                <span className="text-xs text-gray-400">px</span>
                            </div>
                        </div>
                        
                        <p className="text-[10px] text-gray-400 leading-tight">
                            Adjusts font between min/max sizes to fit box with padding.
                        </p>
                    </div>
                )}

                {/* Manual Font Size - shown when Auto-fit is OFF */}
                {!liveElement.autoFitText && (
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Font Size</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={8}
                                max={500}
                                value={liveElement.fontSize || 16}
                                onChange={(e) => handleChange({ fontSize: parseInt(e.target.value) || 16 })}
                                className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-center"
                            />
                            <span className="text-xs text-gray-400">px</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

