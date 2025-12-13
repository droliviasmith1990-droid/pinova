'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore } from '@/stores/editorStore';
import { Hand } from 'lucide-react';
import { EmptyCanvasState } from '@/components/canvas/EmptyCanvasState';

// Dynamic import of canvas component to avoid SSR issues with Konva
const EditorCanvas = dynamic(
    () => import('@/components/canvas/EditorCanvas').then(mod => ({ default: mod.EditorCanvas })),
    { ssr: false, loading: () => <CanvasLoading /> }
);

function CanvasLoading() {
    return (
        <div className="flex-1 bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500">Loading canvas...</div>
        </div>
    );
}

export function CanvasArea() {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hasAutoFitted, setHasAutoFitted] = useState(false);

    // Pan mode state
    const [isPanMode, setIsPanMode] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    const canvasSize = useEditorStore((s) => s.canvasSize);
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const elements = useEditorStore((s) => s.elements);
    const addText = useEditorStore((s) => s.addText);
    const addImage = useEditorStore((s) => s.addImage);

    // Spacebar hold for pan mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
                return;
            }
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                setIsPanMode(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanMode(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Pan mouse handlers
    const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
        if (isPanMode && scrollRef.current) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            setScrollStart({
                x: scrollRef.current.scrollLeft,
                y: scrollRef.current.scrollTop
            });
        }
    }, [isPanMode]);

    const handlePanMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning && scrollRef.current) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            scrollRef.current.scrollLeft = scrollStart.x - dx;
            scrollRef.current.scrollTop = scrollStart.y - dy;
        }
    }, [isPanning, panStart, scrollStart]);

    const handlePanMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Calculate auto-fit zoom
    const calculateFitZoom = useCallback((viewportWidth: number, viewportHeight: number) => {
        const padding = 200; // 100px on each side
        const availableWidth = viewportWidth - padding;
        const availableHeight = viewportHeight - padding;

        const scaleX = availableWidth / canvasSize.width;
        const scaleY = availableHeight / canvasSize.height;
        const fitZoom = Math.min(scaleX, scaleY);

        // Never zoom in beyond 100%, can zoom out as needed
        // Minimum 10%, maximum 100%
        return Math.min(1, Math.max(0.1, fitZoom));
    }, [canvasSize.width, canvasSize.height]);

    // Update dimensions and auto-fit on mount
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
                return rect;
            }
            return null;
        };

        const rect = updateDimensions();

        // Auto-fit zoom on first mount
        if (rect && !hasAutoFitted) {
            const fitZoom = calculateFitZoom(rect.width - 24, rect.height - 48);
            setZoom(fitZoom);
            setHasAutoFitted(true);
        }

        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [hasAutoFitted, calculateFitZoom, setZoom]);

    // Note: We intentionally don't auto-recalculate zoom when canvas size changes
    // This preserves the user's manual zoom setting. The user can use "Fit to Screen" 
    // button if they want to reset zoom after changing canvas size.

    // Ruler marker component
    const RulerMarkers = ({ direction, size }: { direction: 'horizontal' | 'vertical'; size: number }) => {
        const markers = [];
        const step = 100;

        for (let i = 0; i <= Math.max(size, 2000); i += step) {
            markers.push(
                <div
                    key={i}
                    className="absolute text-[9px] text-gray-500 font-mono"
                    style={direction === 'horizontal'
                        ? { left: i, top: 2 }
                        : { top: i, left: 2, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }
                    }
                >
                    {i}
                </div>
            );
        }
        return <>{markers}</>;
    };

    // Cursor style based on pan mode
    const getCursorStyle = () => {
        if (isPanning) return 'grabbing';
        if (isPanMode) return 'grab';
        return 'default';
    };

    return (
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col" ref={containerRef}>
            {/* Current Dimensions Display + Pan Mode Hint */}
            <div className="h-6 bg-gray-100 border-b border-gray-300 flex items-center justify-center z-10 gap-4">
                <span className="text-xs text-gray-500 font-mono">
                    {canvasSize.width} × {canvasSize.height} px ({Math.round(zoom * 100)}%)
                </span>
                {zoom > 0.5 && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Hand className="w-3 h-3" /> Hold Space to pan
                    </span>
                )}
                {isPanMode && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">
                        Pan Mode
                    </span>
                )}
            </div>

            {/* Main Canvas Container */}
            <div className="flex-1 relative overflow-hidden">
                {/* Empty Canvas State - show when no elements */}
                {elements.length === 0 && (
                    <EmptyCanvasState
                        onAddText={addText}
                        onAddImage={addImage}
                    />
                )}
                {/* Horizontal Ruler */}
                <div className="absolute top-0 left-6 right-0 h-6 bg-gray-50 border-b border-gray-300 z-10 overflow-hidden">
                    <div className="relative h-full" style={{ width: 2000 }}>
                        <RulerMarkers direction="horizontal" size={2000} />
                    </div>
                </div>

                {/* Vertical Ruler */}
                <div className="absolute top-6 left-0 w-6 bottom-0 bg-gray-50 border-r border-gray-300 z-10 overflow-hidden">
                    <div className="relative w-full" style={{ height: 2000 }}>
                        <RulerMarkers direction="vertical" size={2000} />
                    </div>
                </div>

                {/* Ruler Corner */}
                <div className="absolute top-0 left-0 w-6 h-6 bg-gray-200 border-b border-r border-gray-300 z-20" />

                {/* Canvas Scroll Container with Pan Mode */}
                <div
                    ref={scrollRef}
                    className="absolute top-6 left-6 right-0 bottom-0 overflow-auto bg-gray-200"
                    style={{ cursor: getCursorStyle() }}
                    onMouseDown={handlePanMouseDown}
                    onMouseMove={handlePanMouseMove}
                    onMouseUp={handlePanMouseUp}
                    onMouseLeave={handlePanMouseUp}
                >
                    {dimensions.width > 0 && (
                        <EditorCanvas
                            containerWidth={dimensions.width - 24}
                            containerHeight={dimensions.height - 48}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
