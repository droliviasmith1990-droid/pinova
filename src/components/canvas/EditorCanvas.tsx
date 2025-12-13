'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Transformer, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { TextElementComponent } from './TextElement';
import { ImageElementComponent } from './ImageElement';
import { ShapeElementComponent } from './ShapeElement';
import { useCreateStageRef } from '@/hooks/useStageRef';
import { ContextMenu } from './ContextMenu';
import { SmartGuides } from './SmartGuides';
import {
    Element,
    TextElement,
    Guide,
    CANVAS_WIDTH,
    CANVAS_HEIGHT
} from '@/types/editor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const SNAP_THRESHOLD = 5;
const CANVAS_PADDING = 100; // Padding around the canvas

export function EditorCanvas({ containerWidth, containerHeight }: EditorCanvasProps) {
    // Use shared stage ref for thumbnail generation
    const { stageRef, registerRef } = useCreateStageRef();
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });
    const transformerRef = useRef<Konva.Transformer>(null);

    // On-canvas text editing state
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Register stage ref on mount
    useEffect(() => {
        registerRef();
    }, [registerRef]);

    // OPT-001: Use useShallow to prevent unnecessary re-renders
    // This batches all store selections so component only re-renders when actual values change
    const {
        elements,
        selectedIds,
        selectElement,
        toggleSelection,
        updateElement,
        pushHistory,
        zoom,
        setZoom,
        backgroundColor,
        guides,
        setGuides,
        clearGuides,
        snapToGrid,
        gridSize,
        canvasSize
    } = useEditorStore(
        useShallow((s) => ({
            elements: s.elements,
            selectedIds: s.selectedIds,
            selectElement: s.selectElement,
            toggleSelection: s.toggleSelection,
            updateElement: s.updateElement,
            pushHistory: s.pushHistory,
            zoom: s.zoom,
            setZoom: s.setZoom,
            backgroundColor: s.backgroundColor,
            guides: s.guides,
            setGuides: s.setGuides,
            clearGuides: s.clearGuides,
            snapToGrid: s.snapToGrid,
            gridSize: s.gridSize,
            canvasSize: s.canvasSize
        }))
    );

    // Use dynamic canvas size from store
    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;

    // Calculate scaled dimensions
    const scaledCanvasWidth = canvasWidth * zoom;
    const scaledCanvasHeight = canvasHeight * zoom;

    // Total stage size includes padding
    const stageWidth = scaledCanvasWidth + CANVAS_PADDING * 2;
    const stageHeight = scaledCanvasHeight + CANVAS_PADDING * 2;

    // Check if element is locked before allowing transformer
    const selectedElement = elements.find(el => selectedIds.includes(el.id));
    const isSelectedLocked = selectedElement?.locked ?? false;

    // Attach transformer to selected elements (but not if locked)
    useEffect(() => {
        if (selectedIds.length > 0 && transformerRef.current && stageRef.current && !isSelectedLocked) {
            const selectedNodes = selectedIds
                .map(id => stageRef.current?.findOne(`#${id}`))
                .filter(node => node) as Konva.Node[];
            if (selectedNodes.length > 0) {
                transformerRef.current.nodes(selectedNodes);
                transformerRef.current.getLayer()?.batchDraw();
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer()?.batchDraw();
        }
    }, [selectedIds, elements, isSelectedLocked]);

    // Wheel zoom (Ctrl + wheel)
    const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
        if (e.evt.ctrlKey || e.evt.metaKey) {
            e.evt.preventDefault();
            const scaleBy = 1.1;
            const direction = e.evt.deltaY > 0 ? -1 : 1;
            const newZoom = direction > 0 ? zoom * scaleBy : zoom / scaleBy;
            setZoom(Math.max(0.25, Math.min(2, newZoom)));
        }
    }, [zoom, setZoom]);

    // Handle Context Menu
    const handleContextMenu = (e: KonvaEventObject<PointerEvent>) => {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        if (!stage) return;
        const clickedNode = e.target;
        const isBackground = clickedNode === stage || clickedNode.id() === 'canvas-background' || clickedNode.id() === 'stage-background';
        if (!isBackground) {
            const elementId = clickedNode.id();
            if (elementId && elementId.length > 10) selectElement(elementId);
        } else {
            selectElement(null);
        }
        setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, isOpen: true });
    };

    // Handle stage click (deselect)
    const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (contextMenu.isOpen) setContextMenu(prev => ({ ...prev, isOpen: false }));
        // Close text editing on click outside
        if (editingId) setEditingId(null);
        const clickedOnEmpty = e.target === e.target.getStage() ||
            e.target.attrs.id === 'canvas-background' ||
            e.target.attrs.id === 'stage-background';
        if (clickedOnEmpty) {
            selectElement(null);
        }
    };

    // Handle double-click for on-canvas text editing
    const handleDoubleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
        const clickedNode = e.target;
        const elementId = clickedNode.id() || clickedNode.getParent()?.id();
        const element = elements.find(el => el.id === elementId);

        if (element && element.type === 'text' && !element.locked) {
            setEditingId(element.id);
            // Focus textarea after state update
            setTimeout(() => textAreaRef.current?.focus(), 0);
        } else {
            setEditingId(null);
        }
    }, [elements]);

    // Handle element selection with Shift+Click for multi-select
    const handleSelect = useCallback((elementId: string, e?: KonvaEventObject<MouseEvent>) => {
        if (e?.evt?.shiftKey) {
            toggleSelection(elementId);
        } else {
            selectElement(elementId);
        }
    }, [selectElement, toggleSelection]);

    // Calculate snap guides with distance measurements and equal spacing detection
    const calculateGuides = useCallback((movingElement: Element, pos: { x: number; y: number }): Guide[] => {
        const newGuides: Guide[] = [];
        const otherElements = elements.filter((el) => el.id !== movingElement.id && el.visible);

        const width = movingElement.width;
        const height = movingElement.height;

        const movingEdges = {
            left: pos.x,
            right: pos.x + width,
            centerX: pos.x + width / 2,
            top: pos.y,
            bottom: pos.y + height,
            centerY: pos.y + height / 2
        };

        // --- Canvas Boundary Snapping (Enhanced) ---
        const canvasEdges = {
            vertical: [
                { value: 0, label: 'Left' },
                { value: canvasWidth, label: 'Right' },
                { value: canvasWidth / 2, label: 'Center' }
            ],
            horizontal: [
                { value: 0, label: 'Top' },
                { value: canvasHeight, label: 'Bottom' },
                { value: canvasHeight / 2, label: 'Center' }
            ]
        };

        // Check Vertical Canvas Edges (Left/Right/Center of canvas)
        canvasEdges.vertical.forEach(edge => {
            // Snap left edge of object to canvas line
            if (Math.abs(movingEdges.left - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'vertical' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'vertical',
                        position: edge.value,
                        points: [edge.value, 0, edge.value, canvasHeight],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
            // Snap right edge of object to canvas line
            if (Math.abs(movingEdges.right - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'vertical' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'vertical',
                        position: edge.value,
                        points: [edge.value, 0, edge.value, canvasHeight],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
            // Snap center of object to canvas line
            if (Math.abs(movingEdges.centerX - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'vertical' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'vertical',
                        position: edge.value,
                        points: [edge.value, 0, edge.value, canvasHeight],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
        });

        // Check Horizontal Canvas Edges (Top/Bottom/Center of canvas)
        canvasEdges.horizontal.forEach(edge => {
            if (Math.abs(movingEdges.top - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'horizontal' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'horizontal',
                        position: edge.value,
                        points: [0, edge.value, canvasWidth, edge.value],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
            if (Math.abs(movingEdges.bottom - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'horizontal' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'horizontal',
                        position: edge.value,
                        points: [0, edge.value, canvasWidth, edge.value],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
            if (Math.abs(movingEdges.centerY - edge.value) < SNAP_THRESHOLD) {
                if (!newGuides.some(g => g.type === 'horizontal' && Math.abs(g.position - edge.value) < 1)) {
                    newGuides.push({
                        type: 'horizontal',
                        position: edge.value,
                        points: [0, edge.value, canvasWidth, edge.value],
                        guideType: 'alignment',
                        metadata: { label: edge.label }
                    });
                }
            }
        });

        // Element-to-element guides with distance measurements
        otherElements.forEach((el) => {
            const elEdges = {
                left: el.x,
                right: el.x + el.width,
                centerX: el.x + el.width / 2,
                top: el.y,
                bottom: el.y + el.height,
                centerY: el.y + el.height / 2
            };

            // Vertical guides with distance
            (['left', 'right', 'centerX'] as const).forEach((edge) => {
                const diff = Math.abs(movingEdges[edge] - elEdges[edge]);
                if (diff < SNAP_THRESHOLD) {
                    const exists = newGuides.some(g => g.type === 'vertical' && g.position === elEdges[edge]);
                    if (!exists) {
                        newGuides.push({
                            type: 'vertical',
                            position: elEdges[edge],
                            points: [elEdges[edge], 0, elEdges[edge], canvasHeight],
                            guideType: 'snap'
                        });
                    }
                }

                // Calculate horizontal distance between elements
                if (edge === 'right' && movingEdges.left > elEdges.right) {
                    const distance = Math.round(movingEdges.left - elEdges.right);
                    if (distance > 0 && distance < 200) {
                        newGuides.push({
                            type: 'vertical',
                            position: (elEdges.right + movingEdges.left) / 2,
                            points: [elEdges.right, elEdges.centerY, movingEdges.left, movingEdges.centerY],
                            guideType: 'distance',
                            metadata: {
                                distance,
                                label: `${distance}px`,
                                connectedElements: [el.id, movingElement.id]
                            }
                        });
                    }
                }
            });

            // Horizontal guides with distance
            (['top', 'bottom', 'centerY'] as const).forEach((edge) => {
                const diff = Math.abs(movingEdges[edge] - elEdges[edge]);
                if (diff < SNAP_THRESHOLD) {
                    const exists = newGuides.some(g => g.type === 'horizontal' && g.position === elEdges[edge]);
                    if (!exists) {
                        newGuides.push({
                            type: 'horizontal',
                            position: elEdges[edge],
                            points: [0, elEdges[edge], canvasWidth, elEdges[edge]],
                            guideType: 'snap'
                        });
                    }
                }

                // Calculate vertical distance between elements
                if (edge === 'bottom' && movingEdges.top > elEdges.bottom) {
                    const distance = Math.round(movingEdges.top - elEdges.bottom);
                    if (distance > 0 && distance < 200) {
                        newGuides.push({
                            type: 'horizontal',
                            position: (elEdges.bottom + movingEdges.top) / 2,
                            points: [elEdges.centerX, elEdges.bottom, movingEdges.centerX, movingEdges.top],
                            guideType: 'distance',
                            metadata: {
                                distance,
                                label: `${distance}px`,
                                connectedElements: [el.id, movingElement.id]
                            }
                        });
                    }
                }
            });
        });

        // Equal spacing detection (3+ elements in a row)
        if (otherElements.length >= 2) {
            // Check horizontal spacing
            const horizontalElements = [...otherElements, movingElement]
                .sort((a, b) => a.x - b.x);

            if (horizontalElements.length >= 3) {
                const gaps = [];
                for (let i = 0; i < horizontalElements.length - 1; i++) {
                    const gap = horizontalElements[i + 1].x - (horizontalElements[i].x + horizontalElements[i].width);
                    gaps.push(gap);
                }

                // Check if gaps are equal (within threshold)
                const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
                const allEqualSpacing = gaps.every(g => Math.abs(g - avgGap) < SNAP_THRESHOLD * 2);

                if (allEqualSpacing && avgGap > 10) {
                    const midY = horizontalElements.reduce((sum, el) => sum + el.y + el.height / 2, 0) / horizontalElements.length;
                    newGuides.push({
                        type: 'horizontal',
                        position: midY,
                        points: [horizontalElements[0].x, midY, horizontalElements[horizontalElements.length - 1].x + horizontalElements[horizontalElements.length - 1].width, midY],
                        guideType: 'spacing',
                        metadata: {
                            isEqualSpacing: true,
                            label: '=',
                            distance: Math.round(avgGap)
                        }
                    });
                }
            }
        }

        return newGuides;
    }, [elements, canvasWidth, canvasHeight]);

    // Drag handlers - elements can move freely outside canvas
    const handleDragMove = useCallback((e: KonvaEventObject<DragEvent>, element: Element) => {
        if (element.locked) return;

        const shape = e.target;
        let pos = { x: shape.x(), y: shape.y() };

        // Calculate guides for snapping
        const newGuides = calculateGuides(element, pos);
        setGuides(newGuides);

        // Snap to guides
        newGuides.forEach((guide) => {
            if (guide.type === 'vertical') {
                const movingCenterX = pos.x + element.width / 2;
                const movingLeft = pos.x;
                const movingRight = pos.x + element.width;

                if (Math.abs(movingCenterX - guide.position) < SNAP_THRESHOLD) {
                    pos.x = guide.position - element.width / 2;
                } else if (Math.abs(movingLeft - guide.position) < SNAP_THRESHOLD) {
                    pos.x = guide.position;
                } else if (Math.abs(movingRight - guide.position) < SNAP_THRESHOLD) {
                    pos.x = guide.position - element.width;
                }
            } else {
                const movingCenterY = pos.y + element.height / 2;
                const movingTop = pos.y;
                const movingBottom = pos.y + element.height;

                if (Math.abs(movingCenterY - guide.position) < SNAP_THRESHOLD) {
                    pos.y = guide.position - element.height / 2;
                } else if (Math.abs(movingTop - guide.position) < SNAP_THRESHOLD) {
                    pos.y = guide.position;
                } else if (Math.abs(movingBottom - guide.position) < SNAP_THRESHOLD) {
                    pos.y = guide.position - element.height;
                }
            }
        });

        // Grid snapping (only if no guide snapping occurred)
        if (snapToGrid && newGuides.length === 0) {
            pos.x = Math.round(pos.x / gridSize) * gridSize;
            pos.y = Math.round(pos.y / gridSize) * gridSize;
        }

        shape.position(pos);
    }, [calculateGuides, setGuides, snapToGrid, gridSize]);

    const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>, element: Element) => {
        if (element.locked) return;

        updateElement(element.id, {
            x: e.target.x(),
            y: e.target.y()
        });
        clearGuides();
        pushHistory();
    }, [updateElement, clearGuides, pushHistory]);

    // Transform handler
    const handleTransformEnd = useCallback((e: KonvaEventObject<Event>, element: Element) => {
        if (element.locked) return;

        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation()
        });

        // Reset scale
        node.scaleX(1);
        node.scaleY(1);

        pushHistory();
    }, [updateElement, pushHistory]);

    // Sort elements by zIndex for rendering
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    return (
        <div
            className="flex items-start justify-start"
            style={{
                minWidth: stageWidth,
                minHeight: stageHeight,
                padding: 0
            }}
        >
            <Stage
                ref={stageRef}
                width={stageWidth}
                height={stageHeight}
                onWheel={handleWheel}
                onClick={handleStageClick}
                onTap={handleStageClick}
                onDblClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                // High-quality rendering for retina/high-DPI displays
                pixelRatio={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1}
                style={{
                    backgroundColor: '#e5e7eb' // gray-200
                }}
            >
                {/* Stage Background Layer (gray area around canvas) */}
                <Layer listening={true}>
                    <Rect
                        id="stage-background"
                        x={0}
                        y={0}
                        width={stageWidth}
                        height={stageHeight}
                        fill="#e5e7eb"
                        listening={true}
                    />
                </Layer>

                {/* Canvas Content Group - scaled and positioned */}
                <Layer
                    x={CANVAS_PADDING}
                    y={CANVAS_PADDING}
                    scaleX={zoom}
                    scaleY={zoom}
                >
                    {/* White Canvas Background */}
                    <Rect
                        id="canvas-background"
                        x={0}
                        y={0}
                        width={canvasWidth}
                        height={canvasHeight}
                        fill={backgroundColor}
                        shadowColor="rgba(0,0,0,0.15)"
                        shadowBlur={20}
                        shadowOffsetX={0}
                        shadowOffsetY={4}
                        listening={true}
                    />

                    {/* Visual Grid Overlay - shown when snapToGrid is enabled */}
                    {/* PERFORMANCE: Uses single Path instead of many Line elements */}
                    {snapToGrid && (() => {
                        // Build path data for entire grid in one string
                        let pathData = '';
                        // Vertical lines
                        for (let x = 0; x <= canvasWidth; x += gridSize) {
                            pathData += `M${x},0 L${x},${canvasHeight} `;
                        }
                        // Horizontal lines
                        for (let y = 0; y <= canvasHeight; y += gridSize) {
                            pathData += `M0,${y} L${canvasWidth},${y} `;
                        }
                        return (
                            <Path
                                data={pathData}
                                stroke="#e5e7eb"
                                strokeWidth={0.5 / zoom}
                                listening={false}
                                perfectDrawDisabled={true}
                            />
                        );
                    })()}

                    {/* Render Elements */}
                    {sortedElements.map((element) => {
                        if (!element.visible) return null;

                        if (element.type === 'text') {
                            return (
                                <TextElementComponent
                                    key={element.id}
                                    element={element}
                                    isSelected={selectedIds.includes(element.id)}
                                    onSelect={(e?: any) => handleSelect(element.id, e)}
                                    onDblClick={() => {
                                        if (!element.locked) {
                                            setEditingId(element.id);
                                        }
                                    }}
                                    onDragMove={(e) => handleDragMove(e, element)}
                                    onDragEnd={(e) => handleDragEnd(e, element)}
                                    onTransformEnd={(e) => handleTransformEnd(e, element)}
                                />
                            );
                        }

                        if (element.type === 'image') {
                            return (
                                <ImageElementComponent
                                    key={element.id}
                                    element={element}
                                    isSelected={selectedIds.includes(element.id)}
                                    onSelect={(e?: any) => handleSelect(element.id, e)}
                                    onDragMove={(e) => handleDragMove(e, element)}
                                    onDragEnd={(e) => handleDragEnd(e, element)}
                                    onTransformEnd={(e) => handleTransformEnd(e, element)}
                                />
                            );
                        }

                        if (element.type === 'shape') {
                            return (
                                <ShapeElementComponent
                                    key={element.id}
                                    element={element}
                                    isSelected={selectedIds.includes(element.id)}
                                    onSelect={(e?: any) => handleSelect(element.id, e)}
                                    onDragMove={(e) => handleDragMove(e, element)}
                                    onDragEnd={(e) => handleDragEnd(e, element)}
                                    onTransformEnd={(e) => handleTransformEnd(e, element)}
                                />
                            );
                        }

                        return null;
                    })}

                    {/* Smart Snap Guides */}
                    <SmartGuides
                        guides={guides}
                        zoom={zoom}
                        canvasWidth={canvasWidth}
                        canvasHeight={canvasHeight}
                    />
                </Layer>

                {/* Transformer Layer - separate so it's not affected by zoom transform */}
                <Layer>
                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            // Only limit minimum size, no boundary constraints
                            if (newBox.width < 20 || newBox.height < 20) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                        rotateEnabled={true}
                        enabledAnchors={[
                            'top-left',
                            'top-right',
                            'bottom-left',
                            'bottom-right',
                            'middle-left',
                            'middle-right',
                            'top-center',
                            'bottom-center'
                        ]}
                        borderStroke="#0076D3"
                        borderStrokeWidth={1.5}
                        anchorStroke="#0076D3"
                        anchorFill="#ffffff"
                        anchorSize={8}
                        anchorCornerRadius={2}
                    />
                </Layer>
            </Stage>
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isOpen={contextMenu.isOpen}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            />

            {/* On-Canvas Text Editing Overlay */}
            {editingId && (() => {
                const element = elements.find(el => el.id === editingId) as TextElement | undefined;
                if (!element) return null;

                // Calculate position relative to container
                const style: React.CSSProperties = {
                    position: 'absolute',
                    top: (element.y * zoom + CANVAS_PADDING) + 'px',
                    left: (element.x * zoom + CANVAS_PADDING) + 'px',
                    width: (element.width * zoom) + 'px',
                    minHeight: (element.height * zoom) + 'px',
                    fontSize: (element.fontSize * zoom) + 'px',
                    fontFamily: element.fontFamily,
                    color: element.fill,
                    lineHeight: element.lineHeight || 1.2,
                    textAlign: (element.align || 'center') as React.CSSProperties['textAlign'],
                    background: 'transparent',
                    border: '2px dashed #0076D3',
                    borderRadius: '2px',
                    outline: 'none',
                    resize: 'none',
                    padding: element.backgroundEnabled ? (element.backgroundPadding || 0) * zoom + 'px' : '4px',
                    zIndex: 100,
                    transform: `rotate(${element.rotation || 0}deg)`,
                    transformOrigin: 'top left',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                };

                return (
                    <textarea
                        ref={textAreaRef}
                        value={element.text}
                        style={style}
                        autoFocus
                        onBlur={() => {
                            setEditingId(null);
                            pushHistory();
                        }}
                        onChange={(e) => {
                            updateElement(element.id, { text: e.target.value });
                        }}
                        onKeyDown={(e) => {
                            // Shift+Enter for newline, Enter to finish
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                setEditingId(null);
                                pushHistory();
                            }
                            // Escape to cancel
                            if (e.key === 'Escape') {
                                setEditingId(null);
                            }
                        }}
                    />
                );
            })()}
        </div>
    );
}
