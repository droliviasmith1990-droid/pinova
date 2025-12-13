'use client';

import React from 'react';
import {
    RotateCw,
    Link2,
    Link2Off,
    ChevronDown,
    ChevronUp,
    ChevronsUp,
    ChevronsDown,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignHorizontalJustifyStart,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement, ImageElement, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/editor';
import { cn } from '@/lib/utils';
import { CanvasSizeSection } from './CanvasSizeSection';
import { DynamicFieldTooltip } from '@/components/ui/DynamicFieldTooltip';

export function PropertiesPanel() {
    const elements = useEditorStore((s) => s.elements);
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const moveElementForward = useEditorStore((s) => s.moveElementForward);
    const moveElementBackward = useEditorStore((s) => s.moveElementBackward);
    const moveElementToFront = useEditorStore((s) => s.moveElementToFront);
    const moveElementToBack = useEditorStore((s) => s.moveElementToBack);
    const alignElement = useEditorStore((s) => s.alignElement);
    const alignSelectedElements = useEditorStore((s) => s.alignSelectedElements);
    const distributeSelectedElements = useEditorStore((s) => s.distributeSelectedElements);

    const selectedElement = elements.find((el) => el.id === selectedId);
    const multipleSelected = selectedIds.length >= 2;

    // When no element is selected, show Canvas Size controls
    if (!selectedElement) {
        return (
            <div>
                <CanvasSizeSection />

                {/* Placeholder message */}
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                    </div>
                    <p className="text-sm">Select an element to edit its properties</p>
                </div>
            </div>
        );
    }

    const handleChange = (updates: Partial<typeof selectedElement>) => {
        updateElement(selectedElement.id, updates);
    };

    const handleChangeWithHistory = (updates: Partial<typeof selectedElement>) => {
        updateElement(selectedElement.id, updates);
        pushHistory();
    };

    const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        alignElement(selectedElement.id, alignment);
        pushHistory();
    };

    const handleLayerOrder = (action: 'forward' | 'backward' | 'front' | 'back') => {
        switch (action) {
            case 'forward':
                moveElementForward(selectedElement.id);
                break;
            case 'backward':
                moveElementBackward(selectedElement.id);
                break;
            case 'front':
                moveElementToFront(selectedElement.id);
                break;
            case 'back':
                moveElementToBack(selectedElement.id);
                break;
        }
        pushHistory();
    };

    return (
        <div className="space-y-6">
            {/* Layer Order Section */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Layer Order</h3>
                <div className="flex gap-1">
                    <button
                        onClick={() => handleLayerOrder('front')}
                        title="Bring to Front"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
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

            {/* Align to Page Section */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Align to Page</h3>
                <div className="grid grid-cols-6 gap-1">
                    <button
                        onClick={() => handleAlign('left')}
                        title="Align Left"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyStart className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('center')}
                        title="Align Center"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('right')}
                        title="Align Right"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignHorizontalJustifyEnd className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('top')}
                        title="Align Top"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignVerticalJustifyStart className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('middle')}
                        title="Align Middle"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignVerticalJustifyCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleAlign('bottom')}
                        title="Align Bottom"
                        className="p-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                        <AlignVerticalJustifyEnd className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Align to Selection (multi-select only) */}
            {multipleSelected && (
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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

            {/* Distribute (3+ elements selected) */}
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

            {/* Position Section */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Position</h3>
                <div className="grid grid-cols-2 gap-3">
                    <PropertyInput
                        label="X"
                        value={Math.round(selectedElement.x)}
                        onChange={(val) => handleChangeWithHistory({ x: val })}
                    />
                    <PropertyInput
                        label="Y"
                        value={Math.round(selectedElement.y)}
                        onChange={(val) => handleChangeWithHistory({ y: val })}
                    />
                    <PropertyInput
                        label="W"
                        value={Math.round(selectedElement.width)}
                        onChange={(val) => handleChangeWithHistory({ width: val })}
                    />
                    <PropertyInput
                        label="H"
                        value={Math.round(selectedElement.height)}
                        onChange={(val) => handleChangeWithHistory({ height: val })}
                    />
                </div>

                <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 flex-1">
                        <RotateCw className="w-4 h-4 text-gray-500" />
                        <input
                            type="number"
                            value={Math.round(selectedElement.rotation)}
                            onChange={(e) => handleChangeWithHistory({ rotation: parseInt(e.target.value) || 0 })}
                            className="w-16 h-8 px-2 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-500">°</span>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Appearance</h3>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-20">Opacity</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedElement.opacity}
                            onChange={(e) => handleChange({ opacity: parseFloat(e.target.value) })}
                            onMouseUp={() => pushHistory()}
                            className="flex-1 accent-blue-600"
                        />
                        <span className="text-sm text-gray-600 w-12 text-right">
                            {Math.round(selectedElement.opacity * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Dynamic Field Section - only for text/image elements */}
            {(selectedElement.type === 'text' || selectedElement.type === 'image') && (
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dynamic Data</h3>

                    <div className="space-y-3">
                        <DynamicFieldTooltip>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={(selectedElement as TextElement | ImageElement).isDynamic}
                                    onChange={(e) => handleChangeWithHistory({ isDynamic: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Enable dynamic data</span>
                                {(selectedElement as TextElement | ImageElement).isDynamic ? (
                                    <Link2 className="w-4 h-4 text-blue-600" />
                                ) : (
                                    <Link2Off className="w-4 h-4 text-gray-400" />
                                )}
                            </label>
                        </DynamicFieldTooltip>

                        {selectedElement.type === 'text' && (selectedElement as TextElement).isDynamic && (
                            <select
                                value={(selectedElement as TextElement).dynamicField || ''}
                                onChange={(e) => handleChangeWithHistory({
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

                        {selectedElement.type === 'image' && (selectedElement as ImageElement).isDynamic && (
                            <select
                                value={(selectedElement as ImageElement).dynamicSource || ''}
                                onChange={(e) => handleChangeWithHistory({
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
            )}

            {/* Text Properties */}
            {selectedElement.type === 'text' && (
                <TextPropertiesSection element={selectedElement as TextElement} />
            )}

            {/* Image Properties */}
            {selectedElement.type === 'image' && (
                <ImagePropertiesSection element={selectedElement as ImageElement} />
            )}

            {/* Effects Section */}
            {selectedElement.type === 'text' && (
                <EffectsSection element={selectedElement as TextElement} />
            )}
        </div>
    );
}

function PropertyInput({
    label,
    value,
    onChange
}: {
    label: string;
    value: number;
    onChange: (val: number) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 w-4">{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="flex-1 h-8 px-2 border border-gray-300 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
        </div>
    );
}

function TextPropertiesSection({ element }: { element: TextElement }) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Text</h3>

            <div className="space-y-3">
                <textarea
                    value={element.text}
                    onChange={(e) => handleChange({ text: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
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

function ImagePropertiesSection({ element }: { element: ImageElement }) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    const handleChange = (updates: Partial<ImageElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    };

    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Image</h3>

            <div className="space-y-3">
                <div>
                    <label className="text-sm text-gray-600 block mb-1">Image URL</label>
                    <input
                        type="text"
                        value={element.imageUrl || ''}
                        onChange={(e) => handleChange({ imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
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

function EffectsSection({ element }: { element: TextElement }) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    // Determine current active style
    const activeStyle = element.backgroundEnabled ? 'background' :
        element.stroke ? 'outline' :
            element.shadowColor ? 'shadow' : 'none';

    const handleStyleChange = (style: 'none' | 'shadow' | 'outline' | 'background') => {
        const baseUpdates: Partial<TextElement> = {
            shadowColor: undefined,
            shadowBlur: undefined,
            shadowOffsetX: undefined,
            shadowOffsetY: undefined,
            shadowOpacity: undefined,
            stroke: undefined,
            strokeWidth: undefined,
            backgroundEnabled: false,
        };

        switch (style) {
            case 'shadow':
                updateElement(element.id, {
                    ...baseUpdates,
                    shadowColor: '#000000',
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowOpacity: 0.3
                });
                break;
            case 'outline':
                updateElement(element.id, {
                    ...baseUpdates,
                    stroke: '#000000',
                    strokeWidth: 2
                });
                break;
            case 'background':
                updateElement(element.id, {
                    ...baseUpdates,
                    backgroundEnabled: true,
                    backgroundColor: '#FFEB3B', // Default Canva-ish yellow
                    backgroundCornerRadius: 0,
                    backgroundPadding: 16
                });
                break;
            case 'none':
                updateElement(element.id, baseUpdates);
                break;
        }
        pushHistory();
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Style</h3>
                <div className="grid grid-cols-4 gap-2">
                    <StyleButton
                        label="None"
                        isActive={activeStyle === 'none'}
                        onClick={() => handleStyleChange('none')}
                        preview={<span className="text-gray-400">Aa</span>}
                    />
                    <StyleButton
                        label="Shadow"
                        isActive={activeStyle === 'shadow'}
                        onClick={() => handleStyleChange('shadow')}
                        preview={<span style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}>Aa</span>}
                    />
                    <StyleButton
                        label="Outline"
                        isActive={activeStyle === 'outline'}
                        onClick={() => handleStyleChange('outline')}
                        preview={<span style={{ WebkitTextStroke: '1px #000' }}>Aa</span>}
                    />
                    <StyleButton
                        label="Bg"
                        isActive={activeStyle === 'background'}
                        onClick={() => handleStyleChange('background')}
                        preview={<span className="bg-gray-200 px-1 rounded">Aa</span>}
                    />
                </div>
            </div>

            {/* Contextual Controls */}
            {activeStyle === 'shadow' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <SliderRow
                        label="Blur"
                        value={element.shadowBlur || 0}
                        min={0}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowBlur: v })}
                        onDone={pushHistory}
                    />
                    <SliderRow
                        label="Offset X"
                        value={element.shadowOffsetX || 0}
                        min={-50}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowOffsetX: v })}
                        onDone={pushHistory}
                    />
                    <SliderRow
                        label="Offset Y"
                        value={element.shadowOffsetY || 0}
                        min={-50}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowOffsetY: v })}
                        onDone={pushHistory}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-16">Color</label>
                        <input
                            type="color"
                            value={element.shadowColor || '#000000'}
                            onChange={(e) => {
                                updateElement(element.id, { shadowColor: e.target.value });
                                pushHistory();
                            }}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}

            {activeStyle === 'outline' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <SliderRow
                        label="Thickness"
                        value={element.strokeWidth || 2}
                        min={1}
                        max={20}
                        onChange={(v) => updateElement(element.id, { strokeWidth: v })}
                        onDone={pushHistory}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-16">Color</label>
                        <input
                            type="color"
                            value={element.stroke || '#000000'}
                            onChange={(e) => {
                                updateElement(element.id, { stroke: e.target.value });
                                pushHistory();
                            }}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}

            {activeStyle === 'background' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <SliderRow
                        label="Roundness"
                        value={element.backgroundCornerRadius || 0}
                        min={0}
                        max={100}
                        onChange={(v) => updateElement(element.id, { backgroundCornerRadius: v })}
                        onDone={pushHistory}
                    />
                    <SliderRow
                        label="Spread"
                        value={element.backgroundPadding || 0}
                        min={0}
                        max={100}
                        onChange={(v) => updateElement(element.id, { backgroundPadding: v })}
                        onDone={pushHistory}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-16">Color</label>
                        <input
                            type="color"
                            value={element.backgroundColor || '#FFEB3B'}
                            onChange={(e) => {
                                updateElement(element.id, { backgroundColor: e.target.value });
                                pushHistory();
                            }}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Shape</h3>
                <div className="grid grid-cols-4 gap-2">
                    <StyleButton
                        label="None"
                        isActive={!element.curvedEnabled}
                        onClick={() => {
                            updateElement(element.id, { curvedEnabled: false });
                            pushHistory();
                        }}
                        preview={<span className="text-gray-400">abc</span>}
                    />
                    <StyleButton
                        label="Curved"
                        isActive={!!element.curvedEnabled}
                        onClick={() => {
                            updateElement(element.id, { curvedEnabled: true, curvedPower: 50 });
                            pushHistory();
                        }}
                        preview={
                            <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                                <path d="M2 15C5 8 12 5 22 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        }
                    />
                </div>
            </div>

            {element.curvedEnabled && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <SliderRow
                        label="Curve"
                        value={element.curvedPower || 50}
                        min={0}
                        max={100}
                        onChange={(v) => updateElement(element.id, { curvedPower: v })}
                        onDone={pushHistory}
                    />
                </div>
            )}
        </div>
    );
}

function StyleButton({
    label,
    isActive,
    onClick,
    preview
}: {
    label: string,
    isActive: boolean,
    onClick: () => void,
    preview: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all h-20",
                isActive
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
            )}
        >
            <div className="text-2xl font-bold mb-1 h-8 flex items-center justify-center">
                {preview}
            </div>
            <span className="text-[10px] uppercase font-medium tracking-wider">{label}</span>
        </button>
    );
}

function Accordion({
    title,
    enabled,
    children
}: {
    title: string;
    enabled?: boolean;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-gray-200 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    {title}
                    {enabled && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
}

function SliderRow({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    onDone
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    onDone: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-16">{label}</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseUp={onDone}
                className="flex-1 accent-blue-600"
            />
            <span className="text-sm text-gray-600 w-8 text-right">{value}</span>
        </div>
    );
}
