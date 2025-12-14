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

    // ✅ FIX: Use refs for mutable data to remove them from initCanvas dependencies
    // This prevents the canvas from being destroyed/recreated on every update
    const elementsRef = useRef<Element[]>([]);
    const editingTextRef = useRef<string>("");

    const isUpdatingFromFabric = useRef(false);
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    // ✅ FIX: Add render version to cancel stale async renders
    const renderVersionRef = useRef(0);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string>("");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

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

    // Keep refs in sync with store/state
    useEffect(() => { elementsRef.current = elements; }, [elements]);
    useEffect(() => { editingTextRef.current = editingText; }, [editingText]);

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;

    // ============================================
    // Canvas Initialization 
    // ============================================
    const initCanvas = useCallback(async () => {
        if (!canvasElRef.current) return;

        // Cleanup existing canvas
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.off();
            fabricCanvasRef.current.clear();
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
        }

        // Small delay to ensure DOM is ready/clean
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
        setFabricRef(fabricCanvasRef);
        setIsCanvasReady(true);

        // --- Event Listeners ---
        // We use refs (elementsRef) to access latest data without triggering re-init

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
        });

        canvas.on('object:modified', (e) => {
            const obj = e.target;
            if (!obj) return;
            const id = getElementId(obj);
            if (!id) return;

            isUpdatingFromFabric.current = true;
            updateElement(id, {
                x: obj.left || 0,
                y: obj.top || 0,
                width: Math.max(20, (obj.width || 100) * (obj.scaleX || 1)),
                height: Math.max(20, (obj.height || 100) * (obj.scaleY || 1)),
                rotation: obj.angle || 0,
            });
            obj.set({ scaleX: 1, scaleY: 1 });
            obj.setCoords();
            pushHistory();
            setTimeout(() => { isUpdatingFromFabric.current = false; }, 50);
        });

        canvas.on('mouse:dblclick', (e) => {
            const obj = e.target;
            const id = obj ? getElementId(obj) : null;
            // Use ref to find element without stale closure
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
            } else if (contextMenu.isOpen) {
                setContextMenu(prev => ({ ...prev, isOpen: false }));
            }
            if (editingId) {
                // Clicked outside - save using ref data
                const el = elementsRef.current.find(e => e.id === editingId);
                if (el && el.type === 'text') {
                    updateElement(editingId, { text: editingTextRef.current });
                    pushHistory();
                }
                setEditingId(null);
            }
        });

        // ✅ FIX: Use functional update for zoom to avoid dependency loop
        canvas.on('mouse:wheel', (opt) => {
            if (opt.e.ctrlKey || opt.e.metaKey) {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                const delta = opt.e.deltaY;
                const scaleBy = 1.1;
                const dir = delta > 0 ? -1 : 1;

                setZoom(prevZoom => {
                    const newZoom = dir > 0 ? prevZoom * scaleBy : prevZoom / scaleBy;
                    return Math.max(0.1, Math.min(3, newZoom));
                });
            }
        });

    }, [canvasWidth, canvasHeight, backgroundColor, selectElement, updateElement,
        pushHistory, setFabricRef, setZoom]); // ✅ Stable Dependencies: NO 'elements' or 'zoom' value

    // Initial Load Effect
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
    }, [initCanvas]);

    // ============================================
    // Rendering Loop - With Debounce & Cancellation
    // ============================================
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady || isUpdatingFromFabric.current) return;

        // ✅ FIX: Increment version to cancel any in-flight renders
        const currentVersion = ++renderVersionRef.current;

        // Debounce to coalesce rapid element additions
        const timeoutId = setTimeout(async () => {
            // Check if this render is still current
            if (renderVersionRef.current !== currentVersion || !fabricCanvasRef.current) {
                return; // Stale render - abort
            }

            // Call Shared Engine
            await renderTemplate(
                fabricCanvasRef.current,
                elements,
                { width: canvasWidth, height: canvasHeight, backgroundColor, interactive: true },
                previewMode ? (DEFAULT_DUMMY_DATA as unknown as Record<string, string>) : {},
                {}
            );

            // Check again after async operation
            if (renderVersionRef.current !== currentVersion || !fabricCanvasRef.current) {
                return; // Became stale during render
            }

            // Restore Selection Logic
            if (selectedIds.length > 0) {
                const objs = fabricCanvasRef.current.getObjects();
                const active = objs.find(o => getElementId(o) === selectedIds[0]);
                if (active) {
                    fabricCanvasRef.current.setActiveObject(active);
                    fabricCanvasRef.current.requestRenderAll();
                }
            }
        }, 16); // ~60fps debounce (one frame)

        return () => clearTimeout(timeoutId);
    }, [elements, backgroundColor, canvasWidth, canvasHeight, isCanvasReady, previewMode, selectedIds]);

    // Sync Zoom Effect (Separate from init)
    useEffect(() => {
        if (!fabricCanvasRef.current || !isCanvasReady) return;
        fabricCanvasRef.current.setZoom(zoom);
        fabricCanvasRef.current.setDimensions({ width: canvasWidth * zoom, height: canvasHeight * zoom });
        fabricCanvasRef.current.requestRenderAll();
    }, [zoom, canvasWidth, canvasHeight, isCanvasReady]);

    const handleTextSubmit = useCallback(() => {
        if (editingId && editingText !== undefined) {
            updateElement(editingId, { text: editingText });
            pushHistory();
        }
        setEditingId(null);
    }, [editingId, editingText, updateElement, pushHistory]);

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
