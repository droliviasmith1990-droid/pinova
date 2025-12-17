'use client';

import React, { memo } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';

interface TextPropertiesSectionProps {
    element: TextElement;
}

export const TextPropertiesSection = memo(function TextPropertiesSection({ element }: TextPropertiesSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <SectionHeader title="TEXT" />

            <div className="space-y-3">
                <textarea
                    value={element.text}
                    onChange={(e) => handleChange({ text: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
                    placeholder="Enter text..."
                />

                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleChange({ align: 'left' })}
                        aria-label="Align text left"
                        aria-pressed={element.align === 'left'}
                        className={cn(
                            "p-2 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            element.align === 'left' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignLeft className="w-4 h-4 mx-auto" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'center' })}
                        aria-label="Align text center"
                        aria-pressed={element.align === 'center'}
                        className={cn(
                            "p-2 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            element.align === 'center' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignCenter className="w-4 h-4 mx-auto" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'right' })}
                        aria-label="Align text right"
                        aria-pressed={element.align === 'right'}
                        className={cn(
                            "p-2 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            element.align === 'right' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <AlignRight className="w-4 h-4 mx-auto" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-20">Line Height</label>
                    <input
                        type="range"
                        min="0.8"
                        max="3"
                        step="0.1"
                        value={element.lineHeight}
                        onChange={(e) => updateElement(element.id, { lineHeight: parseFloat(e.target.value) })}
                        onMouseUp={() => pushHistory()}
                        className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm text-gray-600 w-8">{element.lineHeight}</span>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-20">Spacing</label>
                    <input
                        type="range"
                        min="-5"
                        max="20"
                        step="0.5"
                        value={element.letterSpacing}
                        onChange={(e) => updateElement(element.id, { letterSpacing: parseFloat(e.target.value) })}
                        onMouseUp={() => pushHistory()}
                        className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm text-gray-600 w-8">{element.letterSpacing}</span>
                </div>

                {/* Auto-fit Text Toggle */}
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200">
                    <input
                        type="checkbox"
                        checked={element.autoFitText || false}
                        onChange={(e) => handleChange({ autoFitText: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Auto-fit text</span>
                        <p className="text-xs text-gray-500">Automatically resize font to fit box</p>
                    </div>
                </label>
            </div>
        </div>
    );
});
