'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';

interface TextPropertiesSectionProps {
    element: TextElement;
}

export function TextPropertiesSection({ element }: TextPropertiesSectionProps) {
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
                        className={cn(
                            "p-2 rounded border transition-colors",
                            element.align === 'left' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'center' })}
                        className={cn(
                            "p-2 rounded border transition-colors",
                            element.align === 'center' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="5" y1="18" x2="19" y2="18" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleChange({ align: 'right' })}
                        className={cn(
                            "p-2 rounded border transition-colors",
                            element.align === 'right' ? "bg-blue-50 border-blue-500" : "border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                        </svg>
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
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
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
}
