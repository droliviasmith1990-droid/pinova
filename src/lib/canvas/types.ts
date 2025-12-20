/**
 * Canvas Manager Types
 * 
 * Shared interfaces for the canvas management system.
 */

import * as fabric from 'fabric';
import { Element } from '@/types/editor';

/**
 * Canvas configuration options
 */
export interface CanvasConfig {
    width: number;
    height: number;
    backgroundColor?: string;
    zoom?: number;
}

/**
 * Element state change callback
 */
export type ElementChangeCallback = (elements: Element[]) => void;

/**
 * Selection change callback  
 */
export type SelectionChangeCallback = (selectedIds: string[]) => void;

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    fps: number;
    frames: number;
    lastTime: number;
    snapCalcTime: number;
    lastSnapDuration: number;
}

/**
 * Canvas context passed to sub-managers
 */
export interface CanvasContext {
    getCanvas(): fabric.Canvas | null;
    getElementMap(): Map<string, fabric.FabricObject>;
    notifyElementsChanged(): void;
    notifySelectionChanged(): void;
}

// ============================================
// P2-2 FIX: Extended Fabric Object Types
// ============================================

/**
 * Extended Fabric object with editor-specific properties
 * P2-2 FIX: Provides type safety for custom properties on Fabric objects
 */
export interface EditorFabricObject extends fabric.FabricObject {
    /** Unique element ID from editor */
    id: string;
    /** Human-readable element name */
    name: string;
    /** Original element data for metadata preservation (renamed from _element to avoid Fabric.js collision) */
    _elementData: Element;
    /** Original text before transforms (for text elements) */
    _originalText?: string;
    /** Flag for async image loading */
    _needsAsyncImageLoad?: boolean;
    /** Image URL for async loading */
    _imageUrl?: string;
}

/**
 * Type guard to check if a Fabric object is an EditorFabricObject
 */
export function isEditorFabricObject(obj: fabric.FabricObject): obj is EditorFabricObject {
    return 'id' in obj && typeof (obj as EditorFabricObject).id === 'string';
}

/**
 * Create an EditorFabricObject from a regular Fabric object
 */
export function toEditorFabricObject(
    obj: fabric.FabricObject, 
    element: Element
): EditorFabricObject {
    const editorObj = obj as EditorFabricObject;
    editorObj.id = element.id;
    editorObj.name = element.name;
    editorObj._elementData = element;
    return editorObj;
}

// ============================================
// P2-3 FIX: Conditional Debug Logging
// ============================================

/** Whether debug logging is enabled (only in development) */
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

/**
 * Debug logger that only logs in development mode
 * P2-3 FIX: Prevents console clutter in production
 */
export const canvasDebug = {
    log: (...args: unknown[]) => {
        if (DEBUG_ENABLED) console.log('[Canvas]', ...args);
    },
    warn: (...args: unknown[]) => {
        if (DEBUG_ENABLED) console.warn('[Canvas]', ...args);
    },
    error: (...args: unknown[]) => {
        // Errors always log
        console.error('[Canvas]', ...args);
    },
    /** Force log even in production (for critical info) */
    info: (...args: unknown[]) => {
        console.info('[Canvas]', ...args);
    }
};
