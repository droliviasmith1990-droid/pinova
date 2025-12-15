'use client';

import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader, StyleButton, SliderRow } from './shared';

interface EffectsSectionProps {
    element: TextElement;
}

export function EffectsSection({ element }: EffectsSectionProps) {
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
                    backgroundColor: '#FFEB3B',
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
                <SectionHeader title="STYLE" />
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
                <SectionHeader title="SHAPE" />
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
