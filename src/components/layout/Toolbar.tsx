'use client';

import React from 'react';
import {
    Type,
    Image,
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Grid3X3,
    Library,
    Square,
    Circle,
    Minus,
    ArrowRight
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { TextElement as TextElementType } from '@/types/editor';
import { FontPicker } from '@/components/panels/FontPicker';

const ZOOM_LEVELS = [0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

interface ToolbarProps {
    onOpenFontLibrary?: () => void;
}

export function Toolbar({ onOpenFontLibrary }: ToolbarProps) {
    const addText = useEditorStore((s) => s.addText);
    const addImage = useEditorStore((s) => s.addImage);
    const addShape = useEditorStore((s) => s.addShape);
    const [showShapeMenu, setShowShapeMenu] = React.useState(false);
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;
    const elements = useEditorStore((s) => s.elements);
    const updateElement = useEditorStore((s) => s.updateElement);
    const undo = useEditorStore((s) => s.undo);
    const redo = useEditorStore((s) => s.redo);
    // Subscribe to history state directly for reactivity
    const historyIndex = useEditorStore((s) => s.historyIndex);
    const historyLength = useEditorStore((s) => s.history.length);
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < historyLength - 1;
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const snapToGrid = useEditorStore((s) => s.snapToGrid);
    const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const zoomToFit = useEditorStore((s) => s.zoomToFit);
    const canvasSize = useEditorStore((s) => s.canvasSize);

    const selectedElement = elements.find((el) => el.id === selectedId);
    const isTextSelected = selectedElement?.type === 'text';
    const textElement = isTextSelected ? (selectedElement as TextElementType) : null;

    const handleZoomIn = () => {
        const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
        if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
    };

    const handleZoomOut = () => {
        const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
        if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
    };

    const toggleStyle = (style: 'bold' | 'italic') => {
        if (!textElement) return;
        const current = textElement.fontStyle || 'normal';
        let newStyle: string = 'normal';

        if (style === 'bold') {
            newStyle = current.includes('bold')
                ? current.replace('bold', '').trim() || 'normal'
                : current === 'normal' ? 'bold' : 'bold italic';
        } else {
            newStyle = current.includes('italic')
                ? current.replace('italic', '').trim() || 'normal'
                : current === 'normal' ? 'italic' : 'bold italic';
        }

        updateElement(textElement.id, { fontStyle: newStyle as 'normal' | 'bold' | 'italic' | 'bold italic' });
        pushHistory();
    };

    return (
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 gap-1 flex-shrink-0">
            {/* Add Elements */}
            <IconButton onClick={addText} icon={Type} label="Add Text" withText />
            <IconButton onClick={addImage} icon={Image} label="Add Image" withText />

            {/* Shapes Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowShapeMenu(!showShapeMenu)}
                    className="flex items-center gap-1 h-8 px-2 border border-gray-300 rounded text-xs hover:bg-gray-50"
                >
                    <Square className="w-4 h-4" />
                    <span className="hidden sm:inline">Shapes</span>
                </button>
                {showShapeMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 grid grid-cols-2 gap-1 min-w-[120px]">
                        <button
                            onClick={() => { addShape('rect'); setShowShapeMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                            <Square className="w-4 h-4" />
                            Rect
                        </button>
                        <button
                            onClick={() => { addShape('circle'); setShowShapeMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                            <Circle className="w-4 h-4" />
                            Circle
                        </button>
                        <button
                            onClick={() => { addShape('line'); setShowShapeMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                            <Minus className="w-4 h-4" />
                            Line
                        </button>
                        <button
                            onClick={() => { addShape('arrow'); setShowShapeMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Arrow
                        </button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Text Tools - only when text selected */}
            {isTextSelected && textElement && (
                <>

                    {/* Font Library */}
                    <button
                        onClick={() => onOpenFontLibrary?.()}
                        className="flex items-center gap-1 h-8 px-2 rounded border border-blue-400 bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100"
                    >
                        <Library className="w-3.5 h-3.5" />
                        More
                    </button>

                    {/* Font Picker */}
                    <FontPicker
                        currentFont={textElement.fontFamily}
                        onFontChange={(font) => {
                            updateElement(textElement.id, { fontFamily: font });
                            pushHistory();
                        }}
                    />

                    {/* Font Size */}
                    <input
                        type="number"
                        value={textElement.fontSize}
                        onChange={(e) => {
                            updateElement(textElement.id, { fontSize: parseInt(e.target.value) || 12 });
                            pushHistory();
                        }}
                        className="h-8 w-12 px-1 border border-gray-300 rounded text-xs text-center"
                        min={8}
                        max={200}
                    />

                    {/* Bold/Italic/Underline */}
                    <IconButton
                        onClick={() => toggleStyle('bold')}
                        icon={Bold}
                        label="Bold"
                        active={textElement.fontStyle?.includes('bold')}
                    />
                    <IconButton
                        onClick={() => toggleStyle('italic')}
                        icon={Italic}
                        label="Italic"
                        active={textElement.fontStyle?.includes('italic')}
                    />
                    <IconButton
                        onClick={() => {
                            const newDecor = textElement.textDecoration === 'underline' ? '' : 'underline';
                            updateElement(textElement.id, { textDecoration: newDecor });
                            pushHistory();
                        }}
                        icon={Underline}
                        label="Underline"
                        active={textElement.textDecoration === 'underline'}
                    />

                    {/* Alignment */}
                    <IconButton
                        onClick={() => { updateElement(textElement.id, { align: 'left' }); pushHistory(); }}
                        icon={AlignLeft}
                        label="Left"
                        active={textElement.align === 'left'}
                    />
                    <IconButton
                        onClick={() => { updateElement(textElement.id, { align: 'center' }); pushHistory(); }}
                        icon={AlignCenter}
                        label="Center"
                        active={textElement.align === 'center'}
                    />
                    <IconButton
                        onClick={() => { updateElement(textElement.id, { align: 'right' }); pushHistory(); }}
                        icon={AlignRight}
                        label="Right"
                        active={textElement.align === 'right'}
                    />

                    {/* Color */}
                    <div className="flex items-center h-8 px-1 border border-gray-300 rounded">
                        <input
                            type="color"
                            value={textElement.fill}
                            onChange={(e) => {
                                updateElement(textElement.id, { fill: e.target.value });
                                pushHistory();
                            }}
                            className="w-5 h-5 cursor-pointer border-none"
                        />
                        <span className="text-xs text-gray-500 ml-1">Color</span>
                    </div>

                    <Separator />
                </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Undo/Redo */}
            <IconButton onClick={undo} icon={Undo2} label="Undo" disabled={!canUndo} withText />
            <IconButton onClick={redo} icon={Redo2} label="Redo" disabled={!canRedo} withText />

            <Separator />

            {/* Zoom Controls */}
            <IconButton onClick={handleZoomOut} icon={ZoomOut} label="Zoom Out" withText />

            <select
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-8 w-16 px-1 border border-gray-300 rounded text-xs"
            >
                {ZOOM_LEVELS.map((level) => (
                    <option key={level} value={level}>{Math.round(level * 100)}%</option>
                ))}
            </select>

            <IconButton onClick={handleZoomIn} icon={ZoomIn} label="Zoom In" withText />

            <button
                onClick={() => {
                    // Get viewport dimensions from a ref or estimate
                    const viewportWidth = window.innerWidth - 600; // Subtract sidebars
                    const viewportHeight = window.innerHeight - 200; // Subtract header/toolbar
                    zoomToFit(viewportWidth, viewportHeight);
                }}
                title="Zoom to Fit"
                className="h-8 px-2 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center gap-1"
            >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Fit</span>
            </button>

            <Separator />

            {/* Snap to Grid */}
            <label className="flex items-center gap-1 cursor-pointer h-8 px-2 border border-gray-300 rounded hover:bg-gray-50">
                <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                />
                <Grid3X3 className="w-3.5 h-3.5 text-gray-600" />
            </label>
        </div>
    );
}

// Compact icon button
function IconButton({
    onClick,
    icon: Icon,
    label,
    disabled = false,
    active = false,
    withText = false
}: {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    disabled?: boolean;
    active?: boolean;
    withText?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={cn(
                "flex items-center justify-center gap-1 h-8 rounded border text-xs transition-colors",
                withText ? "px-2" : "w-8",
                active
                    ? "bg-blue-50 border-blue-400 text-blue-600"
                    : "border-gray-300 hover:bg-gray-50 hover:border-gray-400",
                disabled && "opacity-40 cursor-not-allowed hover:bg-white hover:border-gray-300"
            )}
        >
            <Icon className="w-4 h-4" />
            {withText && <span className="hidden sm:inline">{label}</span>}
        </button>
    );
}

function Separator() {
    return <div className="h-6 w-px bg-gray-300 mx-1" />;
}
