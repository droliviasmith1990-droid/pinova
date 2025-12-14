'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { useFabricRefStore } from '@/hooks/useStageRef';
import { ContextMenu } from './ContextMenu';
import { renderTemplate } from '@/lib/fabric/engine';
import { TextElement, DEFAULT_DUMMY_DATA, Element } from '@/types/editor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const CANVAS_PADDING = 100;

function getElementId(obj: fabric.FabricObject): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (obj as any).elementId || (obj as any).data?.id;
}

export function EditorCanvas({ containerWidth, containerHeight }: EditorCanvasProps) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

    // ✅ FIX: Use refs for mutable data - canvas init should NOT depend on these
    const elementsRef = useRef<Element[]>([]);
    const editingTextRef = useRef<string>("");
    const editingIdRef = useRef<string | null>(null);
    const selectedIdsRef = useRef<string[]>([]);
    const canvasSizeRef = useRef({ width: 1000, height: 1500 });
    const backgroundColorRef = useRef('#FFFFFF');

    const isUpdatingFromFabric = useRef(false);
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    // ✅ FIX: Add render version to cancel stale async renders
    const renderVersionRef = useRef(0);
    // ✅ FIX: Track last Fabric update to skip redundant renders
    const lastFabricUpdateRef = useRef<{ id: string, x: number, y: number, width: number, height: number } | null>(null);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

    const {
        elements,
        selectedIds,
        zoom,
        backgroundColor,
        canvasSize,
        previewMode,
    } = useEditorStore(
        useShallow((s) => ({
            elements: s.elements,
            selectedIds: s.selectedIds,
            zoom: s.zoom,
            backgroundColor: s.backgroundColor,
            canvasSize: s.canvasSize,
            previewMode: s.previewMode,
        }))
    );

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;

    // ✅ Keep refs in sync with store/state
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { editingTextRef.current = editingText; }, [editingText]);
    useEffect(() => { editingIdRef.current = editingId; }, [editingId]);
    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
    useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);
    useEffect(() => { backgroundColorRef.current = backgroundColor; }, [backgroundColor]);

    // ============================================
    // Canvas Initialization - RUNS ONLY ONCE
    // ============================================
    useEffect(() => {
        // ✅ FIX: Check fabricCanvasRef instead of separate flag (handles StrictMode)
        if (!canvasElRef.current) return;
        if (fabricCanvasRef.current) return; // Already initialized

        const initCanvas = async () => {
            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 50));

            if (!canvasElRef.current) return;

            const canvas = new fabric.Canvas(canvasElRef.current, {
                width: canvasSizeRef.current.width,
                height: canvasSizeRef.current.height,
                selection: true,
                preserveObjectStacking: true,
                backgroundColor: backgroundColorRef.current,
                controlsAboveOverlay: true,
            });

            fabricCanvasRef.current = canvas;
            setFabricRef(fabricCanvasRef);
            setIsCanvasReady(true);

            // ✅ Event Listeners use getState() for fresh store access
            canvas.on('selection:created', (e) => {
                if (isUpdatingFromFabric.current) return;
                const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
                if (id) useEditorStore.getState().selectElement(id);
            });

            canvas.on('selection:updated', (e) => {
                if (isUpdatingFromFabric.current) return;
                const id = e.selected?.[0] ? getElementId(e.selected[0]) : null;
                if (id) useEditorStore.getState().selectElement(id);
            });

            canvas.on('selection:cleared', () => {
                if (isUpdatingFromFabric.current) return;
                useEditorStore.getState().selectElement(null);
            });

            // ✅ FIX: Set flag during LIVE drag/resize to prevent render interference
            canvas.on('object:moving', () => {
                isUpdatingFromFabric.current = true;
            });

            canvas.on('object:scaling', () => {
                isUpdatingFromFabric.current = true;
            });

            canvas.on('object:rotating', () => {
                isUpdatingFromFabric.current = true;
            });

            canvas.on('object:modified', (e) => {
                const obj = e.target;
                if (!obj) return;
                const id = getElementId(obj);
                if (!id) return;

                isUpdatingFromFabric.current = true;
                const store = useEditorStore.getState();

                // ✅ FIX: Use Fabric's built-in methods for accurate geometry
                const newX = obj.left || 0;
                const newY = obj.top || 0;
                const newWidth = Math.max(20, obj.getScaledWidth());
                const newHeight = Math.max(20, obj.getScaledHeight());
                const newRotation = obj.angle || 0;

                // ✅ FIX: Track this update to skip redundant renders
                lastFabricUpdateRef.current = { id, x: newX, y: newY, width: newWidth, height: newHeight };

                // ✅ FIX: Handle Textbox fontSize scaling
                const el = elementsRef.current.find(e => e.id === id);
                if (el?.type === 'text' && obj.type === 'textbox') {
                    const textbox = obj as fabric.Textbox;
                    const originalFontSize = textbox.fontSize || 16;
                    const scaleFactor = obj.scaleY || 1;
                    const newFontSize = Math.max(8, Math.round(originalFontSize * scaleFactor));

                    store.updateElement(id, {
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight,
                        rotation: newRotation,
                        fontSize: newFontSize,  // ✅ Scale fontSize
                    });

                    // Apply fontSize to Fabric object before resetting scale
                    textbox.set({ fontSize: newFontSize, scaleX: 1, scaleY: 1 });
                    textbox.setCoords();
                } else {
                    // Non-text elements: standard update
                    store.updateElement(id, {
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight,
                        rotation: newRotation,
                    });
                    obj.set({ scaleX: 1, scaleY: 1 });
                    obj.setCoords();
                }

                store.pushHistory();
                // ✅ FIX: Extend protection window (must be > 16ms render debounce)
                setTimeout(() => {
                    isUpdatingFromFabric.current = false;
                    lastFabricUpdateRef.current = null;
                }, 300);
            });

            canvas.on('mouse:dblclick', (e) => {
                const obj = e.target;
                const id = obj ? getElementId(obj) : null;
                const el = elementsRef.current.find(e => e.id === id);

                if (el && el.type === 'text' && !el.locked) {
                    setEditingId(el.id);
                    setEditingText((el as TextElement).text);
                    setTimeout(() => textAreaRef.current?.focus(), 50);
                }
            });

            canvas.on('mouse:down', (e) => {
                const evt = e.e as MouseEvent;
                if (evt.button === 2) {
                    evt.preventDefault();
                    setContextMenu({ x: evt.clientX, y: evt.clientY, isOpen: true });
                } else {
                    setContextMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
                }
                const currentEditingId = editingIdRef.current;
                if (currentEditingId) {
                    const el = elementsRef.current.find(e => e.id === currentEditingId);
                    if (el && el.type === 'text') {
                        useEditorStore.getState().updateElement(currentEditingId, { text: editingTextRef.current });
                        useEditorStore.getState().pushHistory();
                    }
                    setEditingId(null);
                }
            });

            canvas.on('mouse:wheel', (opt) => {
                if (opt.e.ctrlKey || opt.e.metaKey) {
                    opt.e.preventDefault();
                    opt.e.stopPropagation();
                    const delta = opt.e.deltaY;
                    const scaleBy = 1.1;
                    const dir = delta > 0 ? -1 : 1;

                    useEditorStore.getState().setZoom(prevZoom => {
                        const newZoom = dir > 0 ? prevZoom * scaleBy : prevZoom / scaleBy;
                        return Math.max(0.1, Math.min(3, newZoom));
                    });
                }
            });
        };

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
    }, []); // ✅ EMPTY DEPS - Only run once on mount

    // ============================================
    // Rendering Loop - With Debounce & Cancellation
    // ============================================
    useEffect(() => {
        // ✅ FIX: Check flag IMMEDIATELY - don't even schedule timeout if user is interacting
        if (isUpdatingFromFabric.current) return;
        if (!fabricCanvasRef.current || !isCanvasReady) return;

        const currentVersion = ++renderVersionRef.current;

        const timeoutId = setTimeout(async () => {
            // ✅ FIX: Check flag INSIDE setTimeout (after debounce period)
            if (isUpdatingFromFabric.current) {
                // ✅ FIX: Check if this render would be redundant
                const lastUpdate = lastFabricUpdateRef.current;
                if (lastUpdate) {
                    const storeEl = elements.find(e => e.id === lastUpdate.id);
                    if (storeEl &&
                        Math.abs(storeEl.x - lastUpdate.x) < 1 &&
                        Math.abs(storeEl.y - lastUpdate.y) < 1) {
                        // Skip render - positions already match what Fabric set
                        return;
                    }
                }
                return; // Skip render - user is actively dragging
            }
            if (renderVersionRef.current !== currentVersion || !fabricCanvasRef.current) {
                return;
            }

            await renderTemplate(
                fabricCanvasRef.current,
                elements,
                { width: canvasWidth, height: canvasHeight, backgroundColor, interactive: true },
                previewMode ? (DEFAULT_DUMMY_DATA as unknown as Record<string, string>) : {},
                {},
                // ✅ FIX: Pass isStale callback for async race protection
                () => renderVersionRef.current !== currentVersion
            );

            if (renderVersionRef.current !== currentVersion || !fabricCanvasRef.current) {
                return;
            }

            // Restore selection after render
            const currentSelectedIds = selectedIdsRef.current;
            if (currentSelectedIds.length > 0) {
                const objs = fabricCanvasRef.current.getObjects();
                const active = objs.find(o => getElementId(o) === currentSelectedIds[0]);
                if (active) {
                    fabricCanvasRef.current.setActiveObject(active);
                }
            }

            fabricCanvasRef.current.requestRenderAll();
        }, 16);

        return () => clearTimeout(timeoutId);
    }, [elements, backgroundColor, canvasWidth, canvasHeight, isCanvasReady, previewMode]);

    // ============================================
    // Selection Sync
    // ============================================
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;

        const canvas = fabricCanvasRef.current;

        if (selectedIds.length === 0) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            return;
        }

        const objs = canvas.getObjects();
        const targetObj = objs.find(o => getElementId(o) === selectedIds[0]);

        if (targetObj) {
            const currentActive = canvas.getActiveObject();
            if (currentActive !== targetObj) {
                isUpdatingFromFabric.current = true;
                canvas.setActiveObject(targetObj);
                canvas.requestRenderAll();
                setTimeout(() => { isUpdatingFromFabric.current = false; }, 50);
            }
        }
    }, [selectedIds, isCanvasReady]);

    // ============================================
    // Zoom Sync
    // ============================================
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;
        fabricCanvasRef.current.setZoom(zoom);
        fabricCanvasRef.current.setDimensions({ width: canvasWidth * zoom, height: canvasHeight * zoom });
        fabricCanvasRef.current.requestRenderAll();
    }, [zoom, canvasWidth, canvasHeight, isCanvasReady]);

    // ============================================
    // Canvas Size Change
    // ============================================
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;
        fabricCanvasRef.current.setDimensions({ width: canvasWidth * zoom, height: canvasHeight * zoom });
        fabricCanvasRef.current.requestRenderAll();
    }, [canvasWidth, canvasHeight, zoom, isCanvasReady]);

    const handleTextSubmit = useCallback(() => {
        if (editingId && editingText !== undefined) {
            useEditorStore.getState().updateElement(editingId, { text: editingText });
            useEditorStore.getState().pushHistory();
        }
        setEditingId(null);
    }, [editingId, editingText]);

    const editingElement = editingId ? elements.find(el => el.id === editingId) as TextElement : null;

    return (
        <div className="flex items-start justify-start relative"
            style={{ minWidth: (canvasWidth * zoom) + CANVAS_PADDING * 2, minHeight: (canvasHeight * zoom) + CANVAS_PADDING * 2, padding: 0 }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#e5e7eb' }} />

            {/* Canvas Container */}
            <div style={{
                position: 'relative', marginLeft: CANVAS_PADDING, marginTop: CANVAS_PADDING,
                width: canvasWidth * zoom, height: canvasHeight * zoom,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <canvas ref={canvasElRef} />
            </div>

            {/* Text Editor Overlay */}
            {editingElement && (
                <textarea
                    ref={textAreaRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                        if (e.key === 'Escape') setEditingId(null);
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
                        zIndex: 1000, resize: 'none', outline: 'none', overflow: 'hidden',
                        transform: `rotate(${editingElement.rotation || 0}deg)`,
                        transformOrigin: 'top left'
                    }}
                    autoFocus
                />
            )}
            <ContextMenu x={contextMenu.x} y={contextMenu.y} isOpen={contextMenu.isOpen} onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
}
