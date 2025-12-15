'use client';

import React from 'react';
import {
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignHorizontalJustifyStart,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';
import { SectionHeader } from './shared';

interface AlignmentSectionProps {
    element: Element;
    selectedIds: string[];
    onAction?: () => void;
}

export function AlignmentSection({ element, selectedIds, onAction }: AlignmentSectionProps) {
    const alignElement = useEditorStore((s) => s.alignElement);
    const alignSelectedElements = useEditorStore((s) => s.alignSelectedElements);
    const distributeSelectedElements = useEditorStore((s) => s.distributeSelectedElements);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const multipleSelected = selectedIds.length >= 2;

    const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        alignElement(element.id, alignment);
        pushHistory();
        onAction?.();
    };

    return (
        <>
            {/* Align to Page */}
            <div>
                <SectionHeader title="ALIGN TO PAGE" />
                <div className="grid grid-cols-6 gap-1.5">
                    <button
                        onClick={() => handleAlign('left')}
                        title="Align Left"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyStart className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('center')}
                        title="Align Center"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('right')}
                        title="Align Right"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyEnd className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('top')}
                        title="Align Top"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignVerticalJustifyStart className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('middle')}
                        title="Align Middle"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignVerticalJustifyCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('bottom')}
                        title="Align Bottom"
                        className="p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                    >
                        <AlignVerticalJustifyEnd className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Align Selection (multi-select) */}
            {multipleSelected && (
                <div>
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Align Selection ({selectedIds.length} items)
                    </h3>
                    <div className="grid grid-cols-6 gap-1">
                        <button
                            onClick={() => alignSelectedElements('left')}
                            title="Align Left"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignHorizontalJustifyStart className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={() => alignSelectedElements('center')}
                            title="Align Center"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignHorizontalJustifyCenter className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={() => alignSelectedElements('right')}
                            title="Align Right"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignHorizontalJustifyEnd className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={() => alignSelectedElements('top')}
                            title="Align Top"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignVerticalJustifyStart className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={() => alignSelectedElements('middle')}
                            title="Align Middle"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignVerticalJustifyCenter className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={() => alignSelectedElements('bottom')}
                            title="Align Bottom"
                            className="p-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                            <AlignVerticalJustifyEnd className="w-4 h-4 text-blue-600" />
                        </button>
                    </div>
                </div>
            )}

            {/* Distribute (3+ elements) */}
            {selectedIds.length >= 3 && (
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Distribute</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => distributeSelectedElements('horizontal')}
                            title="Distribute Horizontally"
                            className="flex-1 py-2 px-3 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm text-purple-700"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="8" width="4" height="8" rx="1" />
                                <rect x="10" y="6" width="4" height="12" rx="1" />
                                <rect x="18" y="8" width="4" height="8" rx="1" />
                            </svg>
                            Horizontal
                        </button>
                        <button
                            onClick={() => distributeSelectedElements('vertical')}
                            title="Distribute Vertically"
                            className="flex-1 py-2 px-3 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 text-sm text-purple-700"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="8" y="2" width="8" height="4" rx="1" />
                                <rect x="6" y="10" width="12" height="4" rx="1" />
                                <rect x="8" y="18" width="8" height="4" rx="1" />
                            </svg>
                            Vertical
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
