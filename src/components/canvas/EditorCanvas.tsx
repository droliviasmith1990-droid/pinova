'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from '@/stores/editorStore';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { Element, ImageElement, TextElement } from '@/types/editor';
import { CanvasManager, CanvasConfig } from '@/lib/canvas/CanvasManager';
import { useSynchronizationBridge } from '@/hooks/useSynchronizationBridge';
import { detectElementChange } from '@/lib/canvas/elementChangeDetection';
import { DimensionBadge } from './DimensionBadge';
import { ContextMenu } from './ContextMenu';
import { RichTextEditor } from './RichTextEditor';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

/**
 * EditorCanvas.v2 - New Architecture using CanvasManager
 * 
 * Key Differences from EditorCanvas.tsx:
 * - Uses CanvasManager instead of direct Fabric.js access
 * - State sync handled by SynchronizationBridge
 * - No renderTemplate() calls - elements managed imperatively
 * - Performance optimized with SpatialHashGrid
 */
export function EditorCanvasV2({ containerWidth, containerHeight }: EditorCanvasProps) {
    // Refs
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const canvasManagerRef = useRef<CanvasManager | null>(null);
    const activeObjectRef = useRef<any>(null); // Ref to track active object for live updates

    // FIX: State-based manager instance to trigger hook updates when initialized
    const [canvasManagerInstance, setCanvasManagerInstance] = useState<CanvasManager | null>(null);

    // Local state
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
        x: 0,
        y: 0,
        isOpen: false
    });

    // Dimension badge state (during resize)
    const [dimensionBadge, setDimensionBadge] = useState<{
        visible: boolean;
        width: number;
        height: number;
        x: number;
        y: number;
    }>({ visible: false, width: 0, height: 0, x: 0, y: 0 });

    // Element toolbar state
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // Track drag state for ghost effect

    // Bind resizing and dragging events for ghost effect
    useEffect(() => {
        const manager = canvasManagerRef.current;
        if (!manager || !isCanvasReady) return;

        // Handle scaling - apply ghost effect during resize
        // For ALL TEXT: prevent scaling transform, resize dimensions directly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleScaling = (e: any) => {
            setIsResizing(true);
            const target = e.target || e.transform?.target;
            if (!target) return;
            
            activeObjectRef.current = target;
            
            // Check if this is a text element (regardless of auto-fit setting)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const elementId = (target as any).id;
            const storeState = useEditorStore.getState();
            const element = storeState.elements.find(el => el.id === elementId);
            
            if (element?.type === 'text') {
                // For ALL text: update dimensions directly instead of scaling
                // This prevents the stretched appearance
                const scaleX = target.scaleX || 1;
                const scaleY = target.scaleY || 1;
                const baseWidth = target.width || element.width || 100;
                const baseHeight = target.height || element.height || 50;
                
                // Calculate new dimensions
                const newWidth = Math.max(50, Math.round(baseWidth * scaleX));
                const newHeight = Math.max(30, Math.round(baseHeight * scaleY));
                
                // Update dimensions without scaling
                target.set({
                    scaleX: 1,
                    scaleY: 1,
                    width: newWidth,
                    height: newHeight,
                });
                target.setCoords();
                
                // Update store - for auto-fit text, this triggers font recalculation
                // For regular text, just updates box dimensions
                storeState.updateElement(elementId, {
                    width: newWidth,
                    height: newHeight,
                });
                
                (manager as any).canvas?.requestRenderAll();
                return; // Skip opacity effect for text
            }
            
            // Apply ghost effect during scaling for other elements (shapes, images)
            target.set({ opacity: 0.5 });
            (manager as any).canvas?.requestRenderAll();
        };

        // Ghost effect: set opacity to 50% during moving
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMoving = (e: any) => {
            setIsDragging(true);
            const target = e.target || e.transform?.target;
            if (target && target.opacity !== 0.5) {
                target.set({ opacity: 0.5 });
                (manager as any).canvas?.requestRenderAll();
            }
        };

        // Restore opacity when operation ends
        // Also handle auto-fit text recalculation after resize
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleOperationEnd = (e: any) => {
            setIsResizing(false);
            setIsDragging(false);
            const target = e.target || e.transform?.target;
            if (target) {
                target.set({ opacity: 1 });
                
                // Handle autoFitText elements - recalculate dimensions and font
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const elementId = (target as any).id;
                const storeState = useEditorStore.getState();
                const element = storeState.elements.find(el => el.id === elementId);
                
                if (element?.type === 'text') {
                    const textEl = element as TextElement;
                    if (textEl.autoFitText) {
                        // Get the NEW dimensions after scaling
                        const scaleX = target.scaleX || 1;
                        const scaleY = target.scaleY || 1;
                        const baseWidth = target.width || element.width || 100;
                        const baseHeight = target.height || element.height || 50;
                        
                        // Calculate new actual dimensions
                        const newWidth = Math.max(50, Math.round(baseWidth * scaleX));
                        const newHeight = Math.max(30, Math.round(baseHeight * scaleY));
                        
                        // Reset scale on fabric object
                        target.set({
                            scaleX: 1,
                            scaleY: 1,
                            width: newWidth,
                            height: newHeight,
                        });
                        target.setCoords();
                        
                        // Update store with new dimensions - this triggers re-render 
                        // and ObjectFactory will recalculate the optimal font size
                        storeState.updateElement(elementId, {
                            width: newWidth,
                            height: newHeight,
                        });
                    }
                }
                
                (manager as any).canvas?.requestRenderAll();
            }
        };

        const handleSelectionCleared = () => {
            setIsResizing(false);
            setIsDragging(false);
            activeObjectRef.current = null;
        };

        manager.on('object:scaling', handleScaling);
        manager.on('object:moving', handleMoving);
        manager.on('object:modified', handleOperationEnd);
        manager.on('selection:cleared', handleSelectionCleared);

        return () => {
            manager.off('object:scaling', handleScaling);
            manager.off('object:moving', handleMoving);
            manager.off('object:modified', handleOperationEnd);
            manager.off('selection:cleared', handleSelectionCleared);
        };
    }, [isCanvasReady]);

    // All state from consolidated editorStore
    const canvasSize = useEditorStore((s) => s.canvasSize);
    const backgroundColor = useEditorStore((s) => s.backgroundColor);
    const zoom = useEditorStore((s) => s.zoom);

    // Elements from editorStore
    const elements = useEditorStore((s) => s.elements);
    const updateElement = useEditorStore((s) => s.updateElement);
    const deleteElement = useEditorStore((s) => s.deleteElement);
    const duplicateElement = useEditorStore((s) => s.duplicateElement);

    // Selection from editorStore
    const selectedIds = useEditorStore((s) => s.selectedIds);

    // DEBUG: Trace dimensions (commented out to reduce console spam)
    // useEffect(() => {
    //     console.log('[EditorCanvas] Render Props:', {
    //         containerWidth,
    //         containerHeight,
    //         canvasSize,
    //         zoom,
    //         calculatedCanvasWidth: canvasSize.width * zoom,
    //         calculatedCanvasHeight: canvasSize.height * zoom,
    //         isCanvasReady
    //     });
    // }, [containerWidth, containerHeight, canvasSize, zoom, isCanvasReady]);

    const selectedElement = elements.find(el => el.id === selectedIds[0]);

    // Initialize SynchronizationBridge - uses state instance so hook re-runs when manager is ready
    useSynchronizationBridge(canvasManagerInstance);

    /**
     * Initialize CanvasManager
     */
    useEffect(() => {
        if (!canvasElRef.current || canvasManagerRef.current) return;

        console.log('[EditorCanvas.v2] Initializing CanvasManager');

        const config: CanvasConfig = {
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor: backgroundColor,
            zoom: zoom,
        };

        const manager = new CanvasManager();
        manager.initialize(canvasElRef.current, config);

        canvasManagerRef.current = manager;
        setCanvasManagerInstance(manager); // Trigger re-render so useSynchronizationBridge can subscribe
        setIsCanvasReady(true);

        // Register canvas with shared store for thumbnail generation
         
        const { useFabricRefStore } = require('@/hooks/useStageRef');
        const canvasRef = { current: (manager as any).canvas };
        useFabricRefStore.getState().setFabricRef(canvasRef);

        console.log('[EditorCanvas.v2] CanvasManager initialized');

        return () => {
            console.log('[EditorCanvas.v2] Cleaning up CanvasManager');
            manager.destroy();
            canvasManagerRef.current = null;
            // Clear canvas ref on cleanup
            useFabricRefStore.getState().setFabricRef({ current: null });
        };
    }, []); // Only run once on mount

    /**
     * Smart element sync using change detection
     * Only syncs when necessary to avoid interrupting interactions
     */
    const prevElementsRef = useRef<Element[]>([]);

    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        const change = detectElementChange(prevElementsRef.current, elements);

        if (change.type === 'list') {
            canvasManagerRef.current.replaceAllElements(elements);
        } else if (change.type === 'properties' && change.modified) {
            
            // Check if any modified elements need full replacement (fitMode or previewText changes)
            let needsFullSync = false;
            for (const id of change.modified) {
                const prevEl = prevElementsRef.current.find(el => el.id === id);
                const currEl = elements.find(el => el.id === id);
                
                // Image fitMode changes require full sync
                if (prevEl?.type === 'image' && currEl?.type === 'image') {
                    if (prevEl.fitMode !== currEl.fitMode) {
                        needsFullSync = true;
                        console.log('[EditorCanvas.v2] fitMode changed for image, needs full sync');
                        break;
                    }
                }
                
                // Text changes that require full sync (structure changes)
                if (prevEl?.type === 'text' && currEl?.type === 'text') {
                    // previewText, isDynamic, and backgroundEnabled changes require full replacement
                    // because they change the object structure (Group vs Textbox)
                    if (prevEl.previewText !== currEl.previewText || 
                        prevEl.isDynamic !== currEl.isDynamic ||
                        prevEl.backgroundEnabled !== currEl.backgroundEnabled) {
                        needsFullSync = true;
                        console.log('[EditorCanvas.v2] text structure changed, needs full sync');
                        break;
                    }
                }

            }
            
            if (needsFullSync) {
                canvasManagerRef.current.replaceAllElements(elements);
            } else {
                for (const id of change.modified) {
                    const element = elements.find(el => el.id === id);
                    if (element) {
                        canvasManagerRef.current.updateElement(id, element);
                    }
                }
            }
        }


        prevElementsRef.current = elements;

    }, [elements, isCanvasReady]);

    // Handle Dimension Badge via Canvas Events
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;

        const manager = canvasManagerRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateBadge = (e: any) => {
            const obj = e.target;
            if (!obj) return;

            // Get absolute coordinates (canvas space)
            const rect = obj.getBoundingRect(true, true);

            // Calculate center top position
            const centerX = rect.left + rect.width / 2;
            const topY = rect.top;

            // Current zoom is handled by the canvas scaling, so rect is already scaled
            // We pass zoom={1} to DimensionBadge because we're giving it exact canvas pixels
            // But wait, the badge is DOM overlay, so it needs to match Canvas DOM size

            // If Fabric canvas is zoomed, getBoundingRect returns zoomed values?
            // Yes, usually. 

            setDimensionBadge({
                visible: true,
                width: obj.getScaledWidth(), // Use logical width for display
                height: obj.getScaledHeight(), // Use logical height for display
                x: centerX,
                y: topY,
            });
        };

        const hideBadge = () => {
            setDimensionBadge(prev => ({ ...prev, visible: false }));
        };

        manager.on('object:scaling', updateBadge);
        manager.on('object:resizing', updateBadge);
        manager.on('object:modified', hideBadge);
        manager.on('selection:cleared', hideBadge);
        manager.on('selection:updated', hideBadge); // Hide when switching selection

        return () => {
            manager.off('object:scaling', updateBadge);
            manager.off('object:resizing', updateBadge);
            manager.off('object:modified', hideBadge);
            manager.off('selection:cleared', hideBadge);
            manager.off('selection:updated', hideBadge);
        };
    }, [isCanvasReady]);

    // Handle Text Editing State
    const [isEditingText, setIsEditingText] = useState(false);

    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        const handleTextEditStart = () => setIsEditingText(true);
        const handleTextEditEnd = () => setIsEditingText(false);

        manager.on('text:editing:entered', handleTextEditStart);
        manager.on('text:editing:exited', handleTextEditEnd);

        return () => {
            manager.off('text:editing:entered', handleTextEditStart);
            manager.off('text:editing:exited', handleTextEditEnd);
        };
    }, [isCanvasReady]);

    // Rich Text Editor state
    const [richTextEditorState, setRichTextEditorState] = useState<{
        isOpen: boolean;
        element: TextElement | null;
        position: { x: number; y: number };
    }>({ isOpen: false, element: null, position: { x: 0, y: 0 } });

    // Handle double-click for rich text editing
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleDblClick = (e: any) => {
            const target = e.target;
            if (!target) return;

            const elementId = (target as any).id;
            const element = elements.find(el => el.id === elementId);

            // Only open rich text editor for text elements with rich text enabled
            if (element?.type === 'text' && (element as TextElement).richTextEnabled) {
                const rect = target.getBoundingRect(true, true);
                setRichTextEditorState({
                    isOpen: true,
                    element: element as TextElement,
                    position: { x: rect.left, y: rect.top + rect.height + 10 }
                });
            }
        };

        manager.on('mouse:dblclick', handleDblClick);
        return () => {
            manager.off('mouse:dblclick', handleDblClick);
        };
    }, [isCanvasReady, elements]);

    // Callback to close rich text editor
    const handleCloseRichTextEditor = useCallback(() => {
        setRichTextEditorState(prev => ({ ...prev, isOpen: false }));
    }, []);

    // Update canvas size when dimensions or zoom changes
    useEffect(() => {
        if (canvasManagerRef.current && isCanvasReady) {
            console.log('[EditorCanvas.v2] Updating canvas size:', {
                canvasWidth: canvasSize.width,
                canvasHeight: canvasSize.height,
                zoom
            });

            // Set the LOGICAL canvas size (not viewport size!)
            canvasManagerRef.current.setCanvasSize(canvasSize.width, canvasSize.height);
            // Then apply zoom which will scale it
            canvasManagerRef.current.setZoom(zoom);
        }
    }, [canvasSize.width, canvasSize.height, zoom, isCanvasReady]);

    /**
     * Subscribe to snapping settings changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current) return;
        if (!canvasManagerRef.current || !isCanvasReady) return;

        // Initial sync
        canvasManagerRef.current.updateSnappingSettings(useSnappingSettingsStore.getState());

        // Subscribe to changes
        const unsubscribe = useSnappingSettingsStore.subscribe((state) => {
            if (canvasManagerRef.current) {
                canvasManagerRef.current.updateSnappingSettings(state);
            }
        });

        return () => unsubscribe();
    }, [isCanvasReady]);

    /**
     * Update background color when it changes
     */
    useEffect(() => {
        if (!canvasManagerRef.current || !isCanvasReady) return;

        console.log('[EditorCanvas.v2] Updating background color:', backgroundColor);
        canvasManagerRef.current.setBackgroundColor(backgroundColor);
    }, [backgroundColor, isCanvasReady]);

    /**
     * Update zoom when it changes - ALREADY HANDLED ABOVE
     */
    // useEffect(() => {
    //     if (!canvasManagerRef.current || !isCanvasReady) return;
    //     console.log('[EditorCanvas.v2] Updating zoom:', zoom);
    //     canvasManagerRef.current.setZoom(zoom);
    // }, [zoom, isCanvasReady]);

    /**
     * Update toolbar visibility based on selection
     */
    useEffect(() => {
        setToolbarVisible(selectedIds.length > 0 && !!selectedElement);
        // Also set initial toolbar position when selection changes
        if (selectedElement && canvasManagerRef.current) {
            setToolbarPosition({
                x: selectedElement.x,
                y: selectedElement.y,
                width: selectedElement.width,
                height: selectedElement.height
            });
        }
    }, [selectedIds, selectedElement]);

    /**
     * Track live toolbar position during drag/scale/rotate
     */
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateToolbarPosition = (e: any) => {
            const obj = e.target;
            if (!obj) return;
            const rect = obj.getBoundingRect(true, true);
            const currentZoom = zoom || 1;
            setToolbarPosition({
                x: rect.left / currentZoom,
                y: rect.top / currentZoom,
                width: rect.width / currentZoom,
                height: rect.height / currentZoom
            });
        };

        manager.on('object:moving', updateToolbarPosition);
        manager.on('object:scaling', updateToolbarPosition);
        manager.on('object:rotating', updateToolbarPosition);

        return () => {
            manager.off('object:moving', updateToolbarPosition);
            manager.off('object:scaling', updateToolbarPosition);
            manager.off('object:rotating', updateToolbarPosition);
        };
    }, [isCanvasReady, zoom]);

    /**
     * Handle Context Menu
     */
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasElRef.current?.getBoundingClientRect();
        if (rect) {
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                isOpen: true
            });
        }
    };

    // Layout Constants
    const CANVAS_PADDING = 100;
    const canvasWidth = canvasSize.width * zoom;
    const canvasHeight = canvasSize.height * zoom;

    // Render dimensions (logging disabled to reduce console spam)
    // console.log('[EditorCanvas] Render dimensions:', {
    //     canvasSize,
    //     zoom,
    //     canvasWidth,
    //     canvasHeight,
    //     totalWidth: canvasWidth + CANVAS_PADDING * 2,
    //     totalHeight: canvasHeight + CANVAS_PADDING * 2
    // });

    // Handle click on background to deselect
    const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
        // Check if clicked on background wrapper (outer div) or target has the background marker
        const target = e.target as HTMLElement;
        const isBackgroundClick = 
            e.target === e.currentTarget || // Direct click on outer wrapper
            target.dataset?.canvasBackground === 'true'; // Click on marked background element
        
        if (isBackgroundClick) {
            useEditorStore.getState().selectElement(null);
            setToolbarVisible(false);
            // Also clear selection in canvas manager if available
            if (canvasManagerRef.current?.isInitialized()) {
                const canvas = canvasManagerRef.current as any;
                if (canvas.canvas) {
                    canvas.canvas.discardActiveObject();
                    canvas.canvas.requestRenderAll();
                }
            }
        }
    }, []);

    return (
        <div
            onClick={handleBackgroundClick}
            onContextMenu={handleContextMenu}
            className="editor-canvas-scroll-container"
            data-testid="editor-canvas"
            data-canvas-background="true"
            style={{
                position: 'relative',
                minWidth: '100%',
                minHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${CANVAS_PADDING}px`,
            }}
        >
            {/* White Canvas Paper - centered in viewport */}
            <div
                style={{
                    position: 'relative',
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
            >
                {/* Fabric.js Canvas */}
                <canvas
                    ref={canvasElRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: `${canvasWidth}px`,
                        height: `${canvasHeight}px`,
                    }}
                />

                {/* Right-Click Context Menu */}
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isOpen={contextMenu.isOpen}
                    onClose={() => setContextMenu({ x: 0, y: 0, isOpen: false })}
                />

                {/* Dimension Badge for Resizing */}
                <DimensionBadge
                    width={dimensionBadge.width}
                    height={dimensionBadge.height}
                    x={dimensionBadge.x}
                    y={dimensionBadge.y}
                    visible={dimensionBadge.visible}
                    zoom={zoom}
                />

                {/* Text Editing Overlay */}
                {isEditingText && (
                    <div className="absolute top-0 left-0 w-full bg-blue-500 text-white text-xs px-2 py-1 flex justify-between items-center z-50 opacity-90">
                        <span>Editing Text...</span>
                        <span className="text-[10px] opacity-80">Press ESC to finish</span>
                    </div>
                )}
            </div>

            {/* Rich Text Editor Modal */}
            {richTextEditorState.isOpen && richTextEditorState.element && (
                <RichTextEditor
                    element={richTextEditorState.element}
                    isOpen={richTextEditorState.isOpen}
                    position={richTextEditorState.position}
                    zoom={zoom}
                    onClose={handleCloseRichTextEditor}
                    onUpdate={(updates) => updateElement(richTextEditorState.element!.id, updates)}
                />
            )}
        </div>
    );
};

// Default export for dynamic import
export default EditorCanvasV2;
