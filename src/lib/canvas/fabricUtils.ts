/**
 * Fabric.js Object Utilities
 * 
 * P3-3 FIX: Proper object cloning and transform utilities
 * aligned with Fabric.js best practices.
 */

import * as fabric from 'fabric';
import { Element } from '@/types/editor';
import { EditorFabricObject } from './types';

// ============================================
// P3-3: Proper Object Cloning
// ============================================

/**
 * Clone a Fabric object using Fabric.js's native clone method
 * This is the correct way to duplicate objects for undo/redo
 * 
 * @param obj - The Fabric object to clone
 * @returns Promise resolving to the cloned object
 */
export async function cloneFabricObject<T extends fabric.FabricObject>(
    obj: T
): Promise<T> {
    return await obj.clone() as T;
}

/**
 * Clone an EditorFabricObject with element metadata
 * 
 * @param obj - The editor Fabric object to clone
 * @param newId - Optional new ID for the cloned element
 * @returns Promise resolving to cloned object with metadata
 */
export async function cloneEditorObject(
    obj: EditorFabricObject,
    newId?: string
): Promise<EditorFabricObject> {
    const cloned = await obj.clone() as EditorFabricObject;
    
    // Copy editor-specific properties
    cloned.id = newId || `${obj.id}_copy_${Date.now()}`;
    cloned.name = `${obj.name} (copy)`;
    
    // Deep clone the element data
    if (obj._elementData) {
        cloned._elementData = {
            ...obj._elementData,
            id: cloned.id,
            name: cloned.name,
        };
    }
    
    // Copy text-specific properties
    if (obj._originalText) {
        cloned._originalText = obj._originalText;
    }
    
    return cloned;
}

/**
 * Clone multiple objects maintaining their relative positions
 * 
 * @param objects - Array of objects to clone
 * @returns Promise resolving to cloned objects
 */
export async function cloneObjectGroup(
    objects: EditorFabricObject[]
): Promise<EditorFabricObject[]> {
    const cloned: EditorFabricObject[] = [];
    const offset = 20; // Offset for pasted objects
    
    for (const obj of objects) {
        const clone = await cloneEditorObject(obj);
        
        // Offset position so it's visible
        clone.set({
            left: (clone.left || 0) + offset,
            top: (clone.top || 0) + offset,
        });
        clone.setCoords();
        
        cloned.push(clone);
    }
    
    return cloned;
}

// ============================================
// P3-2: Transform Matrix Utilities
// ============================================

/**
 * Get the full transform matrix for an object
 * Useful for complex positioning calculations
 */
export function getObjectTransformMatrix(obj: fabric.FabricObject): number[] {
    return obj.calcTransformMatrix();
}

/**
 * Decompose a transform matrix into readable components
 */
export function decomposeTransformMatrix(matrix: fabric.TMat2D): {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    skewX: number;
    skewY: number;
} {
    return fabric.util.qrDecompose(matrix);
}

/**
 * Calculate the absolute position of a nested/grouped object
 * Accounts for parent group transforms
 */
export function getAbsolutePosition(obj: fabric.FabricObject): {
    x: number;
    y: number;
    angle: number;
    scaleX: number;
    scaleY: number;
} {
    const matrix = obj.calcTransformMatrix();
    const decomposed = fabric.util.qrDecompose(matrix);
    
    return {
        x: decomposed.translateX,
        y: decomposed.translateY,
        angle: decomposed.angle,
        scaleX: decomposed.scaleX,
        scaleY: decomposed.scaleY,
    };
}

/**
 * Apply a parent transform to calculate child's world position
 */
export function applyParentTransform(
    childTransform: fabric.TMat2D,
    parentTransform: fabric.TMat2D
): fabric.TMat2D {
    return fabric.util.multiplyTransformMatrices(parentTransform, childTransform);
}

/**
 * Get the inverse of a transform matrix
 */
export function invertTransform(transform: fabric.TMat2D): fabric.TMat2D {
    return fabric.util.invertTransform(transform);
}

// ============================================
// Object Measurement Utilities
// ============================================

/**
 * Get the bounding box of an object in absolute canvas coordinates
 */
export function getObjectBounds(obj: fabric.FabricObject): {
    left: number;
    top: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
} {
    const rect = obj.getBoundingRect();
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
    };
}

/**
 * Check if two objects overlap
 */
export function objectsOverlap(
    obj1: fabric.FabricObject,
    obj2: fabric.FabricObject
): boolean {
    const bounds1 = getObjectBounds(obj1);
    const bounds2 = getObjectBounds(obj2);
    
    return !(
        bounds1.right < bounds2.left ||
        bounds1.left > bounds2.right ||
        bounds1.bottom < bounds2.top ||
        bounds1.top > bounds2.bottom
    );
}

/**
 * Get the center point of an object
 */
export function getObjectCenter(obj: fabric.FabricObject): { x: number; y: number } {
    const center = obj.getCenterPoint();
    return { x: center.x, y: center.y };
}

// ============================================
// Element Conversion Utilities
// ============================================

/**
 * Convert Element position/size to Fabric properties
 */
export function elementToFabricProps(element: Element): {
    left: number;
    top: number;
    width: number;
    height: number;
    angle: number;
    opacity: number;
    selectable: boolean;
    evented: boolean;
} {
    return {
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        angle: element.rotation || 0,
        opacity: element.opacity ?? 1,
        selectable: !element.locked,
        evented: !element.locked,
    };
}

/**
 * Extract common element properties from Fabric object
 */
export function fabricToElementProps(obj: fabric.FabricObject): Partial<Element> {
    const scaleX = obj.scaleX || 1;
    const scaleY = obj.scaleY || 1;
    
    return {
        x: obj.left || 0,
        y: obj.top || 0,
        width: (obj.width || 0) * scaleX,
        height: (obj.height || 0) * scaleY,
        rotation: obj.angle || 0,
        opacity: obj.opacity ?? 1,
        locked: !obj.selectable,
    };
}
