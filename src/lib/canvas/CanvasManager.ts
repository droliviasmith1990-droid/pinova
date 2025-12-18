import * as fabric from 'fabric';
import { debounce } from 'lodash';
import { Element } from '@/types/editor';
import { AlignmentGuides } from '../fabric/AlignmentGuides';
import { SnappingSettings } from '@/stores/snappingSettingsStore';
import { SpatialHashGrid, GridElement } from './SpatialHashGrid';
import { applyCanvaStyleControls } from '@/lib/fabric/FabricControlConfig';

// Import from new modules
import {
    CanvasConfig,
    ElementChangeCallback,
    SelectionChangeCallback,
    PerformanceMetrics
} from './types';
import { createFabricObject, syncElementToFabric, syncFabricToElement, loadFabricImage } from './ObjectFactory';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ViewportManager } from './ViewportManager';

// Re-export types for backward compatibility
export type { CanvasConfig, ElementChangeCallback, SelectionChangeCallback };

/**
 * CanvasManager - Imperative Core (Layer 1)
 * 
 * Owns all Fabric.js lifecycle and is the ONLY thing that touches the canvas directly.
 * Never triggers React re-renders directly - reports state changes through callbacks.
 * 
 * Now delegates to specialized sub-modules:
 * - ObjectFactory: fabric object creation/sync
 * - PerformanceMonitor: FPS tracking
 * - ViewportManager: zoom, size, background
 */
export class CanvasManager {
    // Core Fabric.js instance
    private canvas: fabric.Canvas | null = null;

    // Element tracking
    private elementMap: Map<string, fabric.FabricObject> = new Map();

    // Features
    private guides: AlignmentGuides | null = null;
    private spatialGrid: SpatialHashGrid | null = null;

    // Configuration
    private config: CanvasConfig | null = null;
    private enabled: boolean = false;

    // Callbacks
    private onElementsChangedCallback: ElementChangeCallback | null = null;
    private onSelectionChangedCallback: SelectionChangeCallback | null = null;

    // Sub-modules
    private performanceMonitor: PerformanceMonitor = new PerformanceMonitor();
    private viewportManager: ViewportManager = new ViewportManager();

    // Legacy metrics reference (for backward compatibility)
    private metrics: PerformanceMetrics = {
        fps: 60,
        frames: 0,
        lastTime: performance.now(),
        snapCalcTime: 0,
        lastSnapDuration: 0
    };
    private collisionCalcTime: number = 0;

    /**
     * Debounced render for 60fps performance
     * Batches multiple render requests into single frame
     */
    private debouncedRender = debounce(() => {
        this.canvas?.requestRenderAll();
    }, 16); // 60fps = 16ms frame budget

    /**
     * Initialize the canvas manager with a canvas element
     */
    initialize(canvasElement: HTMLCanvasElement, config: CanvasConfig): void {
        if (this.canvas) {
            console.warn('[CanvasManager] Already initialized, destroying previous instance');
            this.destroy();
        }

        console.log('[CanvasManager] Initializing with config:', config);

        this.config = config;

        // Create Fabric canvas with performance-optimized settings
        this.canvas = new fabric.Canvas(canvasElement, {
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor || '#ffffff',
            selection: true,
            preserveObjectStacking: true,
            renderOnAddRemove: true,
            enableRetinaScaling: true,
            // Performance optimizations
            imageSmoothingEnabled: false,
            skipOffscreen: true,
        });

        console.log('[CanvasManager] Canvas created with dimensions:', {
            width: this.canvas.width,
            height: this.canvas.height,
            zoom: this.canvas.getZoom(),
            configWidth: config.width,
            configHeight: config.height,
        });

        // Initialize alignment guides
        this.guides = new AlignmentGuides(this.canvas);
        this.guides.init();

        // Initialize ViewportManager with canvas, config, and guides
        this.viewportManager.initialize(this.canvas, config, this.guides);

        // Apply zoom if specified (now via ViewportManager)
        if (config.zoom && config.zoom !== 1) {
            this.viewportManager.setZoom(config.zoom);
        }

        // Apply Canva-style controls (purple circular handles, custom rotation)
        applyCanvaStyleControls(this.canvas);

        // Initialize spatial hash grid for collision optimization
        this.spatialGrid = new SpatialHashGrid({
            canvasWidth: config.width,
            canvasHeight: config.height,
            cellSize: 100, // 100px cells - adjust based on average element size
        });

        // Bind event handlers
        this.bindEvents();

        // Start performance monitoring (now via PerformanceMonitor)
        this.performanceMonitor.start(this.canvas, () => this.elementMap.size);

        this.enabled = true;
        console.log('[CanvasManager] Initialization complete');
    }

    /**
     * Clean up and destroy the canvas
     */
    destroy(): void {
        console.log('[CanvasManager] Destroying canvas');

        this.enabled = false;

        // Cancel pending debounced renders
        this.debouncedRender.cancel();

        // Stop performance monitoring (via PerformanceMonitor)
        this.performanceMonitor.stop();

        // Destroy viewport manager
        this.viewportManager.destroy();

        // Dispose alignment guides
        if (this.guides) {
            this.guides.dispose();
            this.guides = null;
        }

        // Clear spatial grid
        if (this.spatialGrid) {
            this.spatialGrid.clear();
            this.spatialGrid = null;
        }

        // Unbind events
        this.unbindEvents();

        // Clear element map
        this.elementMap.clear();

        // Dispose canvas
        if (this.canvas) {
            this.canvas.dispose();
            this.canvas = null;
        }

        this.config = null;
        console.log('[CanvasManager] Destruction complete');
    }

    /**
     * Check if canvas is initialized
     */
    isInitialized(): boolean {
        return this.canvas !== null && this.enabled;
    }

    /**
     * Subscribe to canvas events
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(eventName: any, handler: (e: any) => void): void {
        if (this.canvas) {
            this.canvas.on(eventName, handler);
        }
    }

    /**
     * Unsubscribe from canvas events
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public off(eventName: any, handler: (e: any) => void): void {
        if (this.canvas) {
            this.canvas.off(eventName, handler);
        }
    }

    /**
     * Add an element to the canvas
     */
    addElement(element: Element): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot add element: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Adding element:', element.id, element.type);

        // Create Fabric object from element (via ObjectFactory)
        const fabricObject = createFabricObject(element);

        if (!fabricObject) {
            console.error('[CanvasManager] Failed to create Fabric object for element:', element.id);
            return;
        }

        // Store in element map
        this.elementMap.set(element.id, fabricObject);

        // Add to canvas
        this.canvas.add(fabricObject);

        // Register in spatial grid for collision detection
        if (this.spatialGrid) {
            this.spatialGrid.insert({
                id: element.id,
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
            });
        }

        this.debouncedRender();

        // Check if this is an image that needs async loading
        if ((fabricObject as any)._needsAsyncImageLoad && element.type === 'image') {
            const imageUrl = (fabricObject as any)._imageUrl;
            const imageElement = element as import('@/types/editor').ImageElement;

            console.log('[CanvasManager] Triggering async image load:', element.id);

            // Load image asynchronously and replace placeholder
            loadFabricImage(imageUrl, imageElement).then((img) => {
                if (img && this.canvas) {
                    // Get placeholder to transfer metadata
                    const placeholder = this.elementMap.get(element.id);
                    
                    // CRITICAL FIX: Transfer _element metadata from placeholder to loaded image
                    // This preserves dynamicSource, isDynamic, and all other metadata
                    if (placeholder && (placeholder as any)._element) {
                        (img as any)._element = (placeholder as any)._element;
                        console.log('[CanvasManager] Transferred metadata to loaded image:', element.id);
                    }
                    
                    if (placeholder) {
                        this.canvas.remove(placeholder);
                    }

                    // Add loaded image
                    this.canvas.add(img);
                    this.elementMap.set(element.id, img);
                    this.debouncedRender();

                    console.log('[CanvasManager] Image replaced placeholder:', element.id);
                }
            }).catch((err) => {
                console.error('[CanvasManager] Async image load failed:', element.id, err);
            });
        }
    }

    /**
     * Update an existing element on the canvas
     */
    updateElement(id: string, updates: Partial<Element>): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot update element: canvas not initialized');
            return;
        }

        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            console.warn('[CanvasManager] Element not found for update:', id);
            return;
        }

        console.log('[CanvasManager] Updating element:', id);

        // Apply updates to Fabric object (via ObjectFactory)
        syncElementToFabric(fabricObject, updates);

        // Update spatial grid if position/size changed
        if (this.spatialGrid && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined)) {
            this.spatialGrid.update({
                id,
                left: fabricObject.left || 0,
                top: fabricObject.top || 0,
                width: fabricObject.width || 0,
                height: fabricObject.height || 0,
            });
        }

        this.debouncedRender();
    }

    /**
     * Remove an element from the canvas
     */
    removeElement(id: string): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot remove element: canvas not initialized');
            return;
        }

        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            console.warn('[CanvasManager] Element not found for removal:', id);
            return;
        }

        console.log('[CanvasManager] Removing element:', id);

        // Remove from canvas
        this.canvas.remove(fabricObject);

        // Remove from element map
        this.elementMap.delete(id);

        this.debouncedRender();
    }

    /**
     * Replace all elements on the canvas (used for undo/redo)
     */
    replaceAllElements(elements: Element[]): void {
        if (!this.canvas) {
            console.error('[CanvasManager] Cannot replace elements: canvas not initialized');
            return;
        }

        console.log('[CanvasManager] Replacing all elements:', elements.length);

        // Get current element IDs
        const currentIds = new Set(this.elementMap.keys());
        const newIds = new Set(elements.map(el => el.id));

        // Remove elements that are no longer in the new set
        for (const id of currentIds) {
            if (!newIds.has(id)) {
                const fabricObject = this.elementMap.get(id);
                if (fabricObject) {
                    this.canvas.remove(fabricObject);
                    this.elementMap.delete(id);
                }
            }
        }

        // Add or update elements
        for (const element of elements) {
            const existingObject = this.elementMap.get(element.id);

            if (existingObject) {
                // Update existing object
                syncElementToFabric(existingObject, element);
            } else {
                // Add new object
                this.addElement(element);
            }
        }

        // Re-apply Canva-style controls to all objects after replacement
        applyCanvaStyleControls(this.canvas);

        this.debouncedRender();
        console.log('[CanvasManager] Element replacement complete');
    }

    /**
     * Set canvas size (delegates to ViewportManager)
     */
    setCanvasSize(width: number, height: number): void {
        console.log(`[CanvasManager] setCanvasSize: ${width}x${height}`);

        // Update config
        if (this.config) {
            this.config.width = width;
            this.config.height = height;
        }

        // Update spatial grid
        this.spatialGrid?.resize(width, height);

        // Delegate to ViewportManager
        this.viewportManager.setCanvasSize(width, height);
    }

    /**
     * Set the background color (delegates to ViewportManager)
     */
    setBackgroundColor(color: string): void {
        this.viewportManager.setBackgroundColor(color);
    }

    /**
     * Get current element state from canvas
     */
    getElementState(id: string): Element | null {
        const fabricObject = this.elementMap.get(id);

        if (!fabricObject) {
            return null;
        }

        // Extract element data from Fabric object (via ObjectFactory)
        return syncFabricToElement(fabricObject);
    }

    /**
     * Get current selection
     */
    getSelection(): string[] {
        if (!this.canvas) {
            return [];
        }

        const activeObjects = this.canvas.getActiveObjects();
        return activeObjects
            .map(obj => (obj as any).id)
            .filter((id): id is string => typeof id === 'string');
    }

    /**
     * Set zoom level (delegates to ViewportManager)
     */
    setZoom(zoom: number): void {
        this.viewportManager.setZoom(zoom);
    }

    /**
     * Update snapping settings
     */
    updateSnappingSettings(settings: SnappingSettings): void {
        if (!this.guides) {
            console.warn('[CanvasManager] Cannot update snapping: guides not initialized');
            return;
        }

        console.log('[CanvasManager] Updating snapping settings:', settings);

        // AlignmentGuides will be modified to support updateSettings()
        // For now, toggle enabled state
        this.guides.setEnabled(settings.magneticSnapping);
    }

    /**
     * Register callback for element changes
     */
    onElementsChanged(callback: ElementChangeCallback): void {
        this.onElementsChangedCallback = callback;
    }

    /**
     * Register callback for selection changes
     */
    onSelectionChanged(callback: SelectionChangeCallback): void {
        this.onSelectionChangedCallback = callback;
    }

    // ============================================================================
    // PRIVATE METHODS
    // ============================================================================

    /**
     * Bind Fabric.js event handlers
     */
    private bindEvents(): void {
        if (!this.canvas) return;

        this.canvas.on('object:modified', this.handleObjectModified);
        this.canvas.on('selection:created', this.handleSelectionChanged);
        this.canvas.on('selection:updated', this.handleSelectionChanged);
        this.canvas.on('selection:cleared', this.handleSelectionChanged);

        // Text editing events
        this.canvas.on('mouse:dblclick', this.handleDoubleClick as any);
        this.canvas.on('text:editing:exited', this.handleTextEditingExit as any);
    }

    /**
     * Unbind Fabric.js event handlers
     */
    private unbindEvents(): void {
        if (!this.canvas) return;

        this.canvas.off('object:modified', this.handleObjectModified);
        this.canvas.off('selection:created', this.handleSelectionChanged);
        this.canvas.off('selection:updated', this.handleSelectionChanged);
        this.canvas.off('selection:cleared', this.handleSelectionChanged);
    }

    /**
   * Handle object modified event (after drag/resize/rotate)
   */
    private handleObjectModified = (e: fabric.ModifiedEvent<fabric.TPointerEvent>): void => {
        // Get target from transform or action
        const target = e.transform?.target || (e as any).target;
        if (!target || !this.onElementsChangedCallback) return;

        const modifiedObjects = target.type === 'activeselection'
            ? (target as fabric.ActiveSelection).getObjects()
            : [target];

        // Extract updated element data
        const updatedElements: Element[] = [];

        for (const obj of modifiedObjects) {
            const element = syncFabricToElement(obj);
            if (element) {
                updatedElements.push(element);
            }
        }

        if (updatedElements.length > 0) {
            console.log('[CanvasManager] Objects modified, notifying callback');
            this.onElementsChangedCallback(updatedElements);
        }
    };

    /**
     * Handle selection change events
     */
    private handleSelectionChanged = (): void => {
        if (!this.onSelectionChangedCallback) return;

        const selectedIds = this.getSelection();
        console.log('[CanvasManager] Selection changed:', selectedIds);
        this.onSelectionChangedCallback(selectedIds);
    };

    /**
     * Handle double-click to enable text editing
     */
    private handleDoubleClick = (event: fabric.TPointerEventInfo<fabric.TPointerEvent>): void => {
        if (!this.canvas) return;

        const target = event.target;

        // Only enable editing for text objects  
        if (target && (target.type === 'textbox' || target.type === 'i-text')) {
            const textObject = target as fabric.Textbox;

            // Enter editing mode
            textObject.enterEditing();
            textObject.selectAll();

            console.log('[CanvasManager] Text editing started:', (target as any).id);
        }
    };

    /**
     * Handle text editing exit to update store
     */
    private handleTextEditingExit = (event: { target: fabric.FabricObject }): void => {
        if (!this.canvas || !this.onElementsChangedCallback) return;

        const target = event.target;
        if (target && (target.type === 'textbox' || target.type === 'i-text')) {
            const textObject = target as fabric.Textbox;
            const elementId = (target as any).id;

            console.log('[CanvasManager] Text editing exited:', elementId, 'New text:', textObject.text);

            // Get all elements from canvas
            const allObjects = this.canvas.getObjects();
            const elements: Element[] = [];

            for (const obj of allObjects) {
                const objId = (obj as any).id;
                if (objId) {
                    const el = this.getElementState(objId);
                    if (el) elements.push(el);
                }
            }

            this.onElementsChangedCallback(elements);
        }
    };

    /**
     * Get current performance metrics (delegates to PerformanceMonitor)
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return this.performanceMonitor.getMetrics();
    }
}
