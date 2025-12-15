'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorStore } from '@/stores/editorStore'; // Keep for duplicate/delete coordination
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { Element } from '@/types/editor';
import { CanvasManager, CanvasConfig } from '@/lib/canvas/CanvasManager';
import { useSynchronizationBridge } from '@/hooks/useSynchronizationBridge';
import { detectElementChange } from '@/lib/canvas/elementChangeDetection';
import { ContextMenu } from './ContextMenu';
import { DimensionBadge } from './DimensionBadge';
import { ElementToolbar } from './ElementToolbar';

interface EditorCanvasProps {
    containerWidth: number;
    containerHeight: number;
}

const CANVAS_PADDING = 100;

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

    // Local state
    const [isCanvasReady, setIsCanvasReady] = useState(false);
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
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0, width: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // Track drag state for ghost effect

    // Bind resizing and dragging events for ghost effect
    useEffect(() => {
        const manager = canvasManagerRef.current;
        if (!manager || !isCanvasReady) return;

        // Ghost effect: set opacity to 50% during scaling
        const handleScaling = (e: fabric.IEvent<MouseEvent>) => {
            setIsResizing(true);
            const target = e.target || (e as any).transform?.target;
            if (target) {
                activeObjectRef.current = target;
                // Apply ghost effect
                target.set({ opacity: 0.5 });
                (manager as any).canvas?.requestRenderAll();
            }
        };

        // Ghost effect: set opacity to 50% during moving
        const handleMoving = (e: fabric.IEvent<MouseEvent>) => {
            setIsDragging(true);
            const target = e.target || (e as any).transform?.target;
            if (target && target.opacity !== 0.5) {
                target.set({ opacity: 0.5 });
                (manager as any).canvas?.requestRenderAll();
            }
        };

        // Restore opacity when operation ends
        const handleOperationEnd = (e: fabric.IEvent<MouseEvent>) => {
            setIsResizing(false);
            setIsDragging(false);
            const target = e.target || (e as any).transform?.target;
            if (target) {
                target.set({ opacity: 1 });
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

    // Canvas state from canvasStore
    const canvasSize = useCanvasStore((s) => s.canvasSize);
    const backgroundColor = useCanvasStore((s) => s.backgroundColor);
    const zoom = useCanvasStore((s) => s.zoom);

    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);
    const updateElement = useElementsStore((s) => s.updateElement);
    const deleteElement = useElementsStore((s) => s.deleteElement);
    const duplicateElement = useElementsStore((s) => s.duplicateElement);

    // Selection from selectionStore
    const selectedIds = useSelectionStore((s) => s.selectedIds);

    // DEBUG: Trace dimensions
    useEffect(() => {
        console.log('[EditorCanvas] Render Props:', {
            containerWidth,
            containerHeight,
            canvasSize,
            zoom,
            calculatedCanvasWidth: canvasSize.width * zoom,
            calculatedCanvasHeight: canvasSize.height * zoom,
            isCanvasReady
        });
    }, [containerWidth, containerHeight, canvasSize, zoom, isCanvasReady]);

    const selectedElement = elements.find(el => el.id === selectedIds[0]);

    // Initialize SynchronizationBridge
    useSynchronizationBridge(canvasManagerRef.current);

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
        setIsCanvasReady(true);

        console.log('[EditorCanvas.v2] CanvasManager initialized');

        return () => {
            console.log('[EditorCanvas.v2] Cleaning up CanvasManager');
            manager.destroy();
            canvasManagerRef.current = null;
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
            console.log('[EditorCanvas.v2] List change, full sync');
            canvasManagerRef.current.replaceAllElements(elements);
        } else if (change.type === 'properties' && change.modified) {
            console.log('[EditorCanvas.v2] Property changes:', change.modified.length);
            for (const id of change.modified) {
                const element = elements.find(el => el.id === id);
                if (element) {
                    canvasManagerRef.current.updateElement(id, element);
                }
            }
        }

        prevElementsRef.current = elements;

    }, [elements, isCanvasReady]);

    // Handle Dimension Badge via Canvas Events
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;

        const manager = canvasManagerRef.current;

        const updateBadge = (e: fabric.IEvent<MouseEvent>) => {
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

    // Update canvas size when dimensions or zoom changes
    useEffect(() => {
        if (canvasManagerRef.current && isCanvasReady) {
            console.log('[EditorCanvas] Updating canvas size:', {
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
                width: selectedElement.width
            });
        }
    }, [selectedIds, selectedElement]);

    /**
     * Track live toolbar position during drag/scale/rotate
     */
    useEffect(() => {
        if (!isCanvasReady || !canvasManagerRef.current) return;
        const manager = canvasManagerRef.current;

        const updateToolbarPosition = (e: fabric.IEvent<MouseEvent>) => {
            const obj = e.target;
            if (!obj) return;
            const rect = obj.getBoundingRect(true, true);
            const currentZoom = zoom || 1;
            setToolbarPosition({
                x: rect.left / currentZoom,
                y: rect.top / currentZoom,
                width: rect.width / currentZoom
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

    const handleCloseContextMenu = () => {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
    };

    /**
     * Handle toolbar actions
     */
    const handleDuplicate = () => {
        if (selectedIds.length === 0) return;
        duplicateElement(selectedIds[0]);
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;
        deleteElement(selectedIds[0]);
    };

    const handleToggleLock = () => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { locked: !selectedElement.locked });
    };

    // Layout Constants
    const CANVAS_PADDING = 100;
    const canvasWidth = canvasSize.width * zoom;
    const canvasHeight = canvasSize.height * zoom;

    console.log('[EditorCanvas] Render dimensions:', {
        canvasSize,
        zoom,
        canvasWidth,
        canvasHeight,
        totalWidth: canvasWidth + CANVAS_PADDING * 2,
        totalHeight: canvasHeight + CANVAS_PADDING * 2
    });

    return (
        <div
            onContextMenu={handleContextMenu}
            className="editor-canvas-scroll-container"
            data-testid="editor-canvas"
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

                {/* Element Toolbar - Hidden during drag/resize for clean UX */}
                {toolbarVisible && selectedElement && !isDragging && !isResizing && (
                    <ElementToolbar
                        x={toolbarPosition.x}
                        y={toolbarPosition.y}
                        width={toolbarPosition.width}
                        visible={true}
                        zoom={zoom}
                        isLocked={!!selectedElement.locked}
                        onRotate={() => {
                            const newAngle = ((selectedElement.rotation || 0) + 45) % 360;
                            canvasManagerRef.current?.updateElement(selectedElement.id, { rotation: newAngle });
                        }}
                        onDelete={() => {
                            if (selectedElement && !selectedElement.locked) {
                                deleteElement(selectedElement.id);
                            }
                        }}
                        onDuplicate={() => {
                            duplicateElement(selectedElement.id);
                        }}
                        onToggleLock={() => {
                            updateElement(selectedElement.id, { locked: !selectedElement.locked });
                        }}
                        onMore={() => {
                            console.log('More options clicked');
                        }}
                    />
                )}

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
        </div>
    );
};

// Default export for dynamic import
export default EditorCanvasV2;
