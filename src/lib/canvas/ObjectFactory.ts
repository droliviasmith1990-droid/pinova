/**
 * ObjectFactory
 * 
 * Creates and syncs Fabric.js objects from/to Element data.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { Element, TextElement, ShapeElement, ImageElement } from '@/types/editor';

/**
 * Create a Fabric.js object from an Element
 */
export function createFabricObject(element: Element): fabric.FabricObject | null {
    let obj: fabric.FabricObject | null = null;

    switch (element.type) {
        case 'text': {
            const textEl = element as TextElement;
            obj = new fabric.Textbox(textEl.text || '', {
                left: element.x,
                top: element.y,
                width: element.width,
                fontSize: textEl.fontSize || 16,
                fontFamily: textEl.fontFamily || 'Arial',
                fill: textEl.fill || '#000000',
                textAlign: textEl.align || 'left',
            });
            break;
        }

        case 'image': {
            // For now, use colored rectangle placeholder
            // TODO: Load actual image with fabric.Image.fromURL
            obj = new fabric.Rect({
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                fill: '#cccccc',
            });
            break;
        }

        case 'shape': {
            const shapeEl = element as ShapeElement;
            if (shapeEl.shapeType === 'rect') {
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: shapeEl.fill || '#000000',
                    stroke: shapeEl.stroke || '',
                    strokeWidth: shapeEl.strokeWidth || 0,
                    rx: shapeEl.cornerRadius || 0,
                    ry: shapeEl.cornerRadius || 0,
                });
            } else if (shapeEl.shapeType === 'circle') {
                obj = new fabric.Circle({
                    left: element.x,
                    top: element.y,
                    radius: element.width / 2,
                    fill: shapeEl.fill || '#000000',
                    stroke: shapeEl.stroke || '',
                    strokeWidth: shapeEl.strokeWidth || 0,
                });
            } else if (shapeEl.shapeType === 'path') {
                // Handle path shapes (from SVG imports)
                // CRITICAL: Do NOT set left/top for paths - the path data itself
                // contains the coordinates. Setting left/top would offset the path
                // from its intended position.
                const pathFill = shapeEl.fill === 'none' ? null : (shapeEl.fill || '#000000');
                const pathStroke = shapeEl.stroke === 'none' ? null : (shapeEl.stroke || null);
                const finalFill = (!pathFill && !pathStroke) ? '#000000' : pathFill;

                obj = new fabric.Path(shapeEl.pathData || '', {
                    // Don't set left/top - path data has native coordinates
                    fill: finalFill,
                    stroke: pathStroke,
                    strokeWidth: shapeEl.strokeWidth || 0,
                });
            }
            break;
        }
    }

    if (obj) {
        // Store element ID and metadata on the fabric object
        (obj as any).id = element.id;
        (obj as any).name = element.name;

        // Apply common properties
        obj.set({
            angle: element.rotation || 0,
            opacity: element.opacity ?? 1,
            selectable: !element.locked,
            evented: !element.locked,
        });
    }

    return obj;
}

/**
 * Sync element updates to an existing Fabric object
 */
export function syncElementToFabric(
    fabricObject: fabric.FabricObject,
    updates: Partial<Element>
): void {
    const props: Record<string, unknown> = {};

    if (updates.x !== undefined) props.left = updates.x;
    if (updates.y !== undefined) props.top = updates.y;
    if (updates.width !== undefined) props.width = updates.width;
    if (updates.height !== undefined) props.height = updates.height;
    if (updates.rotation !== undefined) props.angle = updates.rotation;
    if (updates.opacity !== undefined) props.opacity = updates.opacity;
    if (updates.locked !== undefined) {
        props.selectable = !updates.locked;
        props.evented = !updates.locked;
    }

    fabricObject.set(props);
}

/**
 * Extract Element data from a Fabric object
 */
export function syncFabricToElement(fabricObject: fabric.FabricObject): Element | null {
    const id = (fabricObject as any).id;
    const name = (fabricObject as any).name || 'Untitled';

    if (!id) {
        console.warn('[ObjectFactory] Fabric object missing ID');
        return null;
    }

    // Base properties common to all elements
    const base = {
        id,
        name,
        x: fabricObject.left || 0,
        y: fabricObject.top || 0,
        width: fabricObject.width || 0,
        height: fabricObject.height || 0,
        rotation: fabricObject.angle || 0,
        opacity: fabricObject.opacity ?? 1,
        locked: !fabricObject.selectable,
        visible: fabricObject.visible !== false,
        zIndex: 0, // Calculated from canvas order
    };

    // Type-specific properties
    if (fabricObject instanceof fabric.Textbox) {
        return {
            ...base,
            type: 'text',
            text: fabricObject.text || '',
            fontFamily: fabricObject.fontFamily || 'Arial',
            fontSize: fabricObject.fontSize || 16,
            fontStyle: 'normal',
            fill: (fabricObject.fill as string) || '#000000',
            align: (fabricObject.textAlign as 'left' | 'center' | 'right') || 'left',
            verticalAlign: 'top',
            lineHeight: 1.2,
            letterSpacing: 0,
            textDecoration: '',
            isDynamic: false,
        } as TextElement;
    }

    if (fabricObject instanceof fabric.Rect) {
        return {
            ...base,
            type: 'shape',
            shapeType: 'rect',
            fill: (fabricObject.fill as string) || '#000000',
            stroke: (fabricObject.stroke as string) || '',
            strokeWidth: fabricObject.strokeWidth || 0,
            cornerRadius: fabricObject.rx || 0,
        } as ShapeElement;
    }

    if (fabricObject instanceof fabric.Circle) {
        return {
            ...base,
            type: 'shape',
            shapeType: 'circle',
            fill: (fabricObject.fill as string) || '#000000',
            stroke: (fabricObject.stroke as string) || '',
            strokeWidth: fabricObject.strokeWidth || 0,
        } as ShapeElement;
    }

    return null;
}
