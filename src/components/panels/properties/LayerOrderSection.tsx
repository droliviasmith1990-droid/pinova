'use client';

import React, { memo } from 'react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUp,
    ChevronsDown
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';
import { SectionHeader } from './shared';

interface LayerOrderSectionProps {
    element: Element;
    onAction?: () => void;
}

export const LayerOrderSection = memo(function LayerOrderSection({ element, onAction }: LayerOrderSectionProps) {
    const moveElementForward = useEditorStore((s) => s.moveElementForward);
    const moveElementBackward = useEditorStore((s) => s.moveElementBackward);
    const moveElementToFront = useEditorStore((s) => s.moveElementToFront);
    const moveElementToBack = useEditorStore((s) => s.moveElementToBack);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleLayerOrder = (action: 'forward' | 'backward' | 'front' | 'back') => {
        switch (action) {
            case 'forward':
                moveElementForward(element.id);
                break;
            case 'backward':
                moveElementBackward(element.id);
                break;
            case 'front':
                moveElementToFront(element.id);
                break;
            case 'back':
                moveElementToBack(element.id);
                break;
        }
        pushHistory();
        onAction?.();
    };

    return (
        <div>
            <SectionHeader title="LAYER ORDER" />
            <div className="flex gap-2">
                <button
                    onClick={() => handleLayerOrder('front')}
                    title="Bring to Front"
                    className="flex-1 p-2.5 rounded-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 flex items-center justify-center"
                >
                    <ChevronsUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleLayerOrder('forward')}
                    title="Bring Forward"
                    className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    <ChevronUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleLayerOrder('backward')}
                    title="Send Backward"
                    className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleLayerOrder('back')}
                    title="Send to Back"
                    className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    <ChevronsDown className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
