'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { useFabricRefStore } from '@/hooks/useStageRef';
import { ContextMenu } from './ContextMenu';
import { renderTemplate } from '@/lib/fabric/engine'; // ✅ Using Shared Engine
import { TextElement, DEFAULT_DUMMY_DATA } from '@/types/editor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const CANVAS_PADDING = 100;

// Helper to get element ID from Fabric object
function getElementId(obj: fabric.FabricObject): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (obj as any).elementId;
}

export function EditorCanvas({ containerWidth, containerHeight }: EditorCanvasProps) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

    // State Flags
    const isUpdatingFromFabric = useRef(false); // ✅ Prevent re-render loops
    const [isCanvasReady, setIsCanvasReady] = useState(false); // ✅ BUG #1 FIX: Race condition

    // UI State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
        x: 0, y: 0, isOpen: false
    });

    // ✅ BUG #2 FIX: Local state for text editing (no store update on keystroke)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

    // Store Data
    const {
        elements,
        selectedIds,
        selectElement,
        updateElement,
        pushHistory,
        zoom,
        setZoom,
        backgroundColor,
        canvasSize,
        previewMode,
    } = useEditorStore(
        useShallow((s) => ({
            elements: s.elements,
            selectedIds: s.selectedIds,
            selectElement: s.selectElement,
            updateElement: s.updateElement,
            pushHistory: s.pushHistory,
            zoom: s.zoom,
            setZoom: s.setZoom,
            backgroundColor: s.backgroundColor,
            canvasSize: s.canvasSize,
            previewMode: s.previewMode,
        }))
    );

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const stageWidth = (canvasWidth * zoom) + CANVAS_PADDING * 2;
    const stageHeight = (canvasHeight * zoom) + CANVAS_PADDING * 2;

    // ============================================
    // Canvas Initialization & Cleanup (✅ BUG #4 FIX)
    // ============================================
    const initCanvas = useCallback(async () => {
        if (!canvasElRef.current) return;

        // ✅ Complete disposal
        if (fabricCanvasRef.current) {
            const oldCanvas = fabricCanvasRef.current;
            oldCanvas.off(); // Remove ALL event listeners
            oldCanvas.clear(); // Clear all objects
            oldCanvas.dispose(); // Dispose Fabric internals
            fabricCanvasRef.current = null;
        }

        // Small delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 50));

        const canvas = new fabric.Canvas(canvasElRef.current, {
            width: canvasWidth,
            height: canvasHeight,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: backgroundColor,
            controlsAboveOverlay: true,
        });

        fabricCanvasRef.current = canvas;
        setFabricRef(fabricCanvasRef); // Register globally for thumbnails
        setIsCanvasReady(true); // ✅ Signal canvas is ready

        // --- Event Listeners ---

        // Selection Events
        canvas.on('selection:created', (e) => {
            if (isUpdatingFromFabric.current) return;
            const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
            if (id) selectElement(id);
        });

        canvas.on('selection:updated', (e) => {
            if (isUpdatingFromFabric.current) return;
            const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
            if (id) selectElement(id);
        });

        canvas.on('selection:cleared', () => {
            if (isUpdatingFromFabric.current) return;
            selectElement(null);
            // ✅ BUG #5 FIX: Clear guides on deselection (if you implement guides)
            // clearGuidesOverlay();
        });

        // Transform Events (Move/Scale/Rotate)
        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj) return;
            const id = getElementId(obj);
            if (!id) return;

            // ✅ Prevent re-render loop
            isUpdatingFromFabric.current = true;

            // Sync to store
            updateElement(id, {
                x: obj.left || 0,
                y: obj.top || 0,
                width: Math.max(20, (obj.width || 100) * (obj.scaleX || 1)),
                height: Math.max(20, (obj.height || 100) * (obj.scaleY || 1)),
                rotation: obj.angle || 0,
            });

            // Reset scale to 1 after applying to width/height
            obj.set({ scaleX: 1, scaleY: 1 });
            obj.setCoords();

            pushHistory();

            // Reset flag after state update
            setTimeout(() => {
                isUpdatingFromFabric.current = false;
            }, 50);
        });

        // Double Click for Text Editing
        canvas.on('mouse:dblclick', (e) => {
            const obj = e.target;
            const id = obj ? getElementId(obj) : null;
            const el = elements.find(e => e.id === id);

            if (el && el.type === 'text' && !el.locked) {
                setEditingId(el.id);
                setEditingText((el as TextElement).text); // ✅ Copy to local state
                setTimeout(() => textAreaRef.current?.focus(), 50);
            }
        });

        // Context Menu
        canvas.on('mouse:down', (e) => {
            const evt = e.e as MouseEvent;

            // Right click - open context menu
            if (evt.button === 2) {
                evt.preventDefault();
                setContextMenu({ x: evt.clientX, y: evt.clientY, isOpen: true });
            } else if (contextMenu.isOpen) {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }

            // Click outside text editor - save changes
            if (editingId) {
                const element = elements.find(el => el.id === editingId);
                if (element && element.type === 'text') {
                    updateElement(editingId, { text: editingText });
                    pushHistory();
                }
                setEditingId(null);
            }
        });

        // Zoom with Ctrl+Wheel
        canvas.on('mouse:wheel', (opt) => {
            if (opt.e.ctrlKey || opt.e.metaKey) {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                const delta = opt.e.deltaY;
                const scaleBy = 1.1;
                const direction = delta > 0 ? -1 : 1;
                const newZoom = direction > 0 ? zoom * scaleBy : zoom / scaleBy;
                setZoom(Math.max(0.25, Math.min(2, newZoom)));
            }
        });

    }, [canvasWidth, canvasHeight, backgroundColor, selectElement, updateElement,
        pushHistory, zoom, setZoom, elements, setFabricRef, editingId, editingText,
        contextMenu.isOpen]);

    // ============================================
    // Initial Load
    // ============================================
    useEffect(() => {
        initCanvas();

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.off();
                fabricCanvasRef.current.clear();
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
            setIsCanvasReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================
    // ✅ UNIFIED RENDERING: Use Shared Engine
    // ============================================
    useEffect(() => {
        // Prevent race conditions and loops
        if (!fabricCanvasRef.current || !isCanvasReady || isUpdatingFromFabric.current) return;

        const render = async () => {
            if (!fabricCanvasRef.current) return;

            // ✅ CALL SHARED ENGINE (Not manual loop!)
            await renderTemplate(
                fabricCanvasRef.current,
                elements,
                {
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor,
                    interactive: true // ✅ Enable selection & events
                },
                // ✅ Pass dummy data in preview mode
                previewMode ? (DEFAULT_DUMMY_DATA as unknown as Record<string, string>) : {},
                {} // Empty field mapping for editor
            );

            // Restore selection if needed
            if (selectedIds.length > 0) {
                const objs = fabricCanvasRef.current.getObjects();
                const active = objs.find(o => getElementId(o) === selectedIds[0]);
                if (active) fabricCanvasRef.current.setActiveObject(active);
            }
        };

        render();

    }, [elements, backgroundColor, canvasWidth, canvasHeight, isCanvasReady, previewMode, selectedIds]);

    // ============================================
    // Sync Zoom (✅ BUG #3 FIX: Let Fabric handle zoom)
    // ============================================
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;

        fabricCanvasRef.current.setZoom(zoom);
        fabricCanvasRef.current.setDimensions({
            width: canvasWidth * zoom,
            height: canvasHeight * zoom
        });
        fabricCanvasRef.current.requestRenderAll();
    }, [zoom, canvasWidth, canvasHeight, isCanvasReady]);

    // ============================================
    // Text Editing Handler (✅ BUG #2 FIX)
    // ============================================
    const handleTextSubmit = useCallback(() => {
        if (editingId && editingText !== undefined) {
            updateElement(editingId, { text: editingText }); // ✅ Commit to store only on blur
            pushHistory();
        }
        setEditingId(null);
    }, [editingId, editingText, updateElement, pushHistory]);

    const editingElement = editingId
        ? elements.find(el => el.id === editingId) as TextElement | undefined
        : null;

    return (
        <div
            className="flex items-start justify-start relative"
            style={{
                minWidth: stageWidth,
                minHeight: stageHeight,
                padding: 0,
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Grey Background */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: stageWidth,
                    height: stageHeight,
                    backgroundColor: '#e5e7eb',
                }}
            />

            {/* Canvas Container (✅ No CSS transform, Fabric handles zoom) */}
            <div
                style={{
                    position: 'relative',
                    marginLeft: CANVAS_PADDING,
                    marginTop: CANVAS_PADDING,
                    width: canvasWidth * zoom,
                    height: canvasHeight * zoom,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
            >
                <canvas ref={canvasElRef} />
            </div>

            {/* Text Editor Overlay (✅ Local state, no store update on keystroke) */}
            {editingElement && (
                <textarea
                    ref={textAreaRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)} // ✅ Update local only
                    onBlur={handleTextSubmit} // ✅ Save on blur
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit();
                        }
                        if (e.key === 'Escape') {
                            setEditingId(null);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        left: CANVAS_PADDING + (editingElement.x * zoom),
                        top: CANVAS_PADDING + (editingElement.y * zoom),
                        width: editingElement.width * zoom,
                        minHeight: editingElement.height * zoom,
                        fontSize: (editingElement.fontSize || 16) * zoom,
                        fontFamily: editingElement.fontFamily,
                        color: editingElement.fill,
                        textAlign: (editingElement.align || 'center') as React.CSSProperties['textAlign'],
                        lineHeight: editingElement.lineHeight || 1.2,
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '2px dashed #0076D3',
                        borderRadius: '4px',
                        padding: '4px',
                        zIndex: 1000,
                        resize: 'none',
                        outline: 'none',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        transform: `rotate(${editingElement.rotation || 0}deg)`,
                        transformOrigin: 'top left'
                    }}
                    autoFocus
                />
            )}

            {/* Context Menu */}
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                isOpen={contextMenu.isOpen}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
