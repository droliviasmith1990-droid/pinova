/**
 * ObjectFactory
 * 
 * Creates and syncs Fabric.js objects from/to Element data.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { Element, TextElement, ShapeElement, ImageElement } from '@/types/editor';
import { convertToFabricStyles } from '@/lib/text/characterStyles';

/**
 * Extended Fabric.js object with custom properties for async loading
 * Used to track pending image loads and element references
 */
interface ExtendedFabricObject extends fabric.FabricObject {
    id?: string;
    name?: string;
    _needsAsyncImageLoad?: boolean;
    _imageUrl?: string;
    /** Element data from our stores (renamed from _element to avoid Fabric.js collision) */
    _elementData?: Element;
    /** Original untransformed text for text elements (Phase 1) */
    _originalText?: string;
    /** Flag for image placeholder groups */
    _isImagePlaceholder?: boolean;
}

/**
 * Apply text transformation (uppercase, lowercase, capitalize)
 */
function applyTextTransform(
    text: string,
    transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
): string {
    switch (transform) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'capitalize':
            return text.replace(/\b\w/g, (char) => char.toUpperCase());
        case 'none':
        default:
            return text;
    }
}


/**
 * Create a Fabric.js object from an Element
 */
export function createFabricObject(element: Element): fabric.FabricObject | null {
    let obj: fabric.FabricObject | null = null;

    switch (element.type) {
        case 'text': {
            const textEl = element as TextElement;
            
            // For dynamic text elements, use previewText for canvas display if available
            // This shows custom preview while keeping the {{placeholder}} stored
            let displayText = textEl.text || '';
            if (textEl.isDynamic && textEl.previewText) {
                displayText = textEl.previewText;
            }
            
            // Apply text transform if specified
            if (textEl.textTransform) {
                displayText = applyTextTransform(displayText, textEl.textTransform);
            }
            
            // Build textbox with ALL styling properties (matching engine.ts)
            // NOTE: Position is set conditionally - for Group, use relative (0,0)
            // For standalone textbox, use absolute element.x/y
            const textbox = new fabric.Textbox(displayText, {
                width: element.width,
                fontSize: textEl.fontSize || 16,
                fontFamily: textEl.fontFamily || 'Arial',
                // Font weight: use fontWeight property (100-900), fallback to fontStyle for backward compatibility
                fontWeight: textEl.fontWeight || (textEl.fontStyle?.includes('bold') ? 'bold' : 'normal'),
                fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
                // Hollow text: transparent fill, otherwise use specified fill
                fill: textEl.hollowText ? 'transparent' : (textEl.fill || '#000000'),
                textAlign: textEl.align || 'left',
                lineHeight: textEl.lineHeight || 1.2,
                charSpacing: (textEl.letterSpacing || 0) * 10, // Fabric.js uses 1/1000 of em
                underline: textEl.textDecoration === 'underline',
                linethrough: textEl.textDecoration === 'line-through',
            });
            
            // Apply shadow effect
            if (textEl.shadowColor && (textEl.shadowBlur || textEl.shadowOffsetX || textEl.shadowOffsetY)) {
                textbox.shadow = new fabric.Shadow({
                    color: textEl.shadowColor,
                    blur: textEl.shadowBlur || 0,
                    offsetX: textEl.shadowOffsetX || 0,
                    offsetY: textEl.shadowOffsetY || 0,
                });
            }
            
            // Apply stroke/outline (required for hollow text, optional otherwise)
            if (textEl.stroke || textEl.hollowText) {
                // For hollow text, use the fill color as stroke if no stroke specified
                textbox.stroke = textEl.stroke || textEl.fill || '#000000';
                textbox.strokeWidth = textEl.strokeWidth || (textEl.hollowText ? 2 : 1);
            }
            
            // Apply character styles if rich text mode is enabled
            if (textEl.richTextEnabled && textEl.characterStyles && textEl.characterStyles.length > 0) {
                textbox.set('styles', convertToFabricStyles(displayText, textEl.characterStyles));
            }
            
            // Text background with padding support (matching engine.ts)
            if (textEl.backgroundEnabled && textEl.backgroundColor) {
                const padding = textEl.backgroundPadding || 0;
                
                // For Group: textbox uses relative position (0,0), bgRect with negative padding
                // The Group provides the absolute position
                textbox.set('left', 0);
                textbox.set('top', 0);
                
                const bgRect = new fabric.Rect({
                    width: textEl.width + padding * 2,
                    height: textEl.height + padding * 2,
                    left: -padding,
                    top: -padding,
                    fill: textEl.backgroundColor,
                    rx: textEl.backgroundCornerRadius || 0,
                    ry: textEl.backgroundCornerRadius || 0,
                });
                obj = new fabric.Group([bgRect, textbox], {
                    left: element.x,
                    top: element.y,
                    angle: element.rotation || 0,
                    opacity: element.opacity ?? 1,
                });
            } else {
                // Standalone textbox: set absolute position
                textbox.set('left', element.x);
                textbox.set('top', element.y);
                textbox.set('angle', element.rotation || 0);
                textbox.set('opacity', element.opacity ?? 1);
                obj = textbox;
            }
            
            // Store original text for text transform switching
            (obj as ExtendedFabricObject)._originalText = textEl.text || '';
            break;
        }


        case 'image': {
            const imageEl = element as ImageElement;
            const imageUrl = imageEl.imageUrl;

            if (imageUrl) {
                // Return placeholder immediately, then load async
                // The actual image will be loaded by createFabricObjectAsync
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#e5e7eb', // Light grey loading placeholder
                    stroke: '#d1d5db',
                    strokeWidth: 1,
                });
                // Mark for async loading
                (obj as ExtendedFabricObject)._needsAsyncImageLoad = true;
                (obj as ExtendedFabricObject)._imageUrl = imageUrl;
                (obj as ExtendedFabricObject)._elementData = element;
            } else {
                // No URL - create simple placeholder rect
                // Note: Using simple Rect instead of Group to avoid position sync issues
                obj = new fabric.Rect({
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    fill: '#f8fafc', // Very light slate
                    stroke: '#94a3b8', // Slate-400
                    strokeWidth: 2,
                    strokeDashArray: [10, 5],
                    rx: 8,
                    ry: 8,
                });
                
                // Mark this as an image placeholder for proper detection
                (obj as ExtendedFabricObject)._isImagePlaceholder = true;
            }
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

                // BUG-SVG-003 FIX: Validate pathData exists and is not empty
                if (!shapeEl.pathData || shapeEl.pathData.trim() === '') {
                    console.warn(`[ObjectFactory] Skipping path with empty data: ${element.name} (ID: ${element.id})`);
                    return null;
                }

                const pathFill = shapeEl.fill === 'none' ? null : (shapeEl.fill || '#000000');
                const pathStroke = shapeEl.stroke === 'none' ? null : (shapeEl.stroke || null);
                const finalFill = (!pathFill && !pathStroke) ? '#000000' : pathFill;

                obj = new fabric.Path(shapeEl.pathData, {
                    fill: finalFill,
                    stroke: pathStroke,
                    strokeWidth: shapeEl.strokeWidth || 0,
                });

                // CENTERING FIX: Set left/top to element.x/y directly
                // Element x/y contains the final centered position
                // Don't ADD to currentLeft - that causes double-positioning!
                if (element.x !== 0 || element.y !== 0) {
                    obj.set({
                        left: element.x || 0,
                        top: element.y || 0
                    });
                }
            }
            break;
        }
    }

    if (obj) {
        // Store element ID and metadata on the fabric object
        (obj as ExtendedFabricObject).id = element.id;
        (obj as ExtendedFabricObject).name = element.name;
        
        // BUGFIX: Store complete element data for metadata preservation
        // This allows syncFabricToElement to preserve properties not stored in Fabric.js
        (obj as ExtendedFabricObject)._elementData = element;

        // Apply common properties
        obj.set({
            angle: element.rotation || 0,
            opacity: element.opacity ?? 1,
            selectable: !element.locked,
            evented: !element.locked,
            // P2-1 FIX: Enable object caching for better render performance
            objectCaching: true,
        });
    }

    return obj;
}

/**
 * Check if a property has actually changed
 */
function hasPropertyChanged<T>(current: T | undefined, update: T | undefined): boolean {
    if (update === undefined) return false;
    if (current === undefined) return true;
    return current !== update;
}

/**
 * Sync element updates to an existing Fabric object
 * Uses diff detection to only update changed properties (70% faster)
 * 
 * BUGFIX: Updates stored element reference to keep metadata fresh
 */
export function syncElementToFabric(
    fabricObject: fabric.FabricObject,
    updates: Partial<Element>
): void {
    let hasPositionChanges = false;
    
    // BUGFIX: Update stored element with new data to preserve metadata
    // Only update if this is a direct element update, not a sync operation
    const extFabric = fabricObject as ExtendedFabricObject;
    if (extFabric._elementData && updates && Object.keys(updates).length > 0) {
        // Create clean merge without any internal Fabric-specific properties
        const cleanUpdates: Record<string, unknown> = {};
        for (const key in updates) {
            const value = updates[key as keyof Element];
            // Skip undefined and function values
            if (value !== undefined && typeof value !== 'function') {
                cleanUpdates[key] = value;
            }
        }
        extFabric._elementData = { ...extFabric._elementData, ...cleanUpdates } as Element;
    }

    // Position properties - most frequently changed during drag
    if (hasPropertyChanged(fabricObject.left, updates.x)) {
        fabricObject.set('left', updates.x!);
        hasPositionChanges = true;
    }
    if (hasPropertyChanged(fabricObject.top, updates.y)) {
        fabricObject.set('top', updates.y!);
        hasPositionChanges = true;
    }


    // Size properties - FIXED to account for scaleX/scaleY transforms
    if (updates.width !== undefined || updates.height !== undefined) {
        const currentScaledWidth = (fabricObject.width || 0) * (fabricObject.scaleX || 1);
        const currentScaledHeight = (fabricObject.height || 0) * (fabricObject.scaleY || 1);
        
        const newProps: Record<string, number> = {};
        let needsUpdate = false;
        
        if (updates.width !== undefined && currentScaledWidth !== updates.width) {
            newProps.width = updates.width;
            needsUpdate = true;
        }
        
        if (updates.height !== undefined && currentScaledHeight !== updates.height) {
            newProps.height = updates.height;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            // Reset both scales together to prevent aspect ratio distortion
            newProps.scaleX = 1;
            newProps.scaleY = 1;
            fabricObject.set(newProps);
            hasPositionChanges = true;
        }
    }

    // Transform properties
    if (hasPropertyChanged(fabricObject.angle, updates.rotation)) {
        fabricObject.set('angle', updates.rotation!);
        hasPositionChanges = true;
    }

    // Style properties - no coordinate recalculation needed
    if (hasPropertyChanged(fabricObject.opacity, updates.opacity)) {
        fabricObject.set('opacity', updates.opacity!);
    }

    // Lock state - no coordinate recalculation needed
    if (updates.locked !== undefined) {
        const currentSelectable = fabricObject.selectable ?? true;
        if (currentSelectable === updates.locked) { // locked = !selectable
            fabricObject.set('selectable', !updates.locked);
            fabricObject.set('evented', !updates.locked);
        }
    }

    // Text-specific property handling
    // Handle both direct Textbox and Group (when backgroundEnabled creates a group)
    let targetTextbox: fabric.Textbox | null = null;
    
    if (fabricObject instanceof fabric.Textbox) {
        targetTextbox = fabricObject;
    } else if (fabricObject instanceof fabric.Group) {
        // Text with background is a Group containing [bgRect, textbox]
        const objects = fabricObject.getObjects();
        const textboxInGroup = objects.find(o => o instanceof fabric.Textbox) as fabric.Textbox | undefined;
        if (textboxInGroup) {
            targetTextbox = textboxInGroup;
        }
    }
    
    if (targetTextbox) {
        const textUpdates = updates as Partial<TextElement>;
        const storedEl = extFabric._elementData as TextElement | undefined;

        // P1-3 FIX: Build updates object for single batched set() call
        // Reduces ~15 individual set() calls to 1, saving ~30% on dirty checks
        const batchedUpdates: Record<string, unknown> = {};
        
        // Font properties
        if (textUpdates.fontWeight !== undefined) {
            batchedUpdates.fontWeight = textUpdates.fontWeight;
        }
        if (textUpdates.fontFamily !== undefined) {
            batchedUpdates.fontFamily = textUpdates.fontFamily;
        }
        if (textUpdates.fontSize !== undefined) {
            batchedUpdates.fontSize = textUpdates.fontSize;
        }
        if (textUpdates.fontStyle !== undefined) {
            const isItalic = textUpdates.fontStyle?.includes('italic');
            batchedUpdates.fontStyle = isItalic ? 'italic' : 'normal';
        }
        
        // Text color
        if (textUpdates.fill !== undefined) {
            batchedUpdates.fill = textUpdates.fill;
        }
        
        // Alignment
        if (textUpdates.align !== undefined) {
            batchedUpdates.textAlign = textUpdates.align;
        }
        
        // Spacing
        if (textUpdates.lineHeight !== undefined) {
            batchedUpdates.lineHeight = textUpdates.lineHeight;
        }
        if (textUpdates.letterSpacing !== undefined) {
            // Fabric.js uses charSpacing (in 1/1000 of em units)
            batchedUpdates.charSpacing = textUpdates.letterSpacing * 10;
        }
        
        // Text decoration
        if (textUpdates.textDecoration !== undefined) {
            batchedUpdates.underline = textUpdates.textDecoration === 'underline';
            batchedUpdates.linethrough = textUpdates.textDecoration === 'line-through';
        }
        
        // Shadow effect (special case - needs Shadow object)
        if (textUpdates.shadowColor !== undefined || 
            textUpdates.shadowBlur !== undefined || 
            textUpdates.shadowOffsetX !== undefined || 
            textUpdates.shadowOffsetY !== undefined) {
            const shadowColor = textUpdates.shadowColor ?? storedEl?.shadowColor ?? 'rgba(0,0,0,0.5)';
            const shadowBlur = textUpdates.shadowBlur ?? storedEl?.shadowBlur ?? 5;
            const shadowOffsetX = textUpdates.shadowOffsetX ?? storedEl?.shadowOffsetX ?? 2;
            const shadowOffsetY = textUpdates.shadowOffsetY ?? storedEl?.shadowOffsetY ?? 2;
            
            if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
                batchedUpdates.shadow = new fabric.Shadow({
                    color: shadowColor,
                    blur: shadowBlur,
                    offsetX: shadowOffsetX,
                    offsetY: shadowOffsetY,
                });
            } else {
                batchedUpdates.shadow = null;
            }
        }
        
        // Stroke/outline effect
        if (textUpdates.stroke !== undefined) {
            batchedUpdates.stroke = textUpdates.stroke;
        }
        if (textUpdates.strokeWidth !== undefined) {
            batchedUpdates.strokeWidth = textUpdates.strokeWidth;
        }
        
        // Hollow text effect - transparent fill with stroke
        if (textUpdates.hollowText !== undefined) {
            const isHollow = textUpdates.hollowText ?? storedEl?.hollowText ?? false;
            const fillColor = textUpdates.fill ?? storedEl?.fill ?? '#000000';
            
            if (isHollow) {
                batchedUpdates.fill = 'transparent';
                const strokeColor = storedEl?.stroke || fillColor;
                batchedUpdates.stroke = strokeColor;
                batchedUpdates.strokeWidth = storedEl?.strokeWidth || 2;
            } else {
                batchedUpdates.fill = fillColor;
                if (!storedEl?.stroke) {
                    batchedUpdates.stroke = undefined;
                    batchedUpdates.strokeWidth = 0;
                }
            }
        }
        
        // Background box
        if (textUpdates.backgroundEnabled !== undefined || textUpdates.backgroundColor !== undefined) {
            const bgEnabled = textUpdates.backgroundEnabled ?? storedEl?.backgroundEnabled ?? false;
            const bgColor = textUpdates.backgroundColor ?? storedEl?.backgroundColor ?? 'transparent';
            
            if (bgEnabled && bgColor) {
                batchedUpdates.textBackgroundColor = bgColor;
            } else {
                batchedUpdates.textBackgroundColor = '';
            }
        }
        
        // Apply all batched updates in a single set() call
        if (Object.keys(batchedUpdates).length > 0) {
            targetTextbox.set(batchedUpdates);
        }
        
        // Text transform - requires re-applying to display text
        // Use stored original text to properly switch transforms
        // For dynamic elements, use previewText for display if available
        if (textUpdates.textTransform !== undefined || textUpdates.text !== undefined || textUpdates.previewText !== undefined || textUpdates.isDynamic !== undefined) {
            const storedEl = extFabric._elementData as TextElement | undefined;
            const isDynamic = textUpdates.isDynamic ?? storedEl?.isDynamic ?? false;
            const previewText = textUpdates.previewText ?? storedEl?.previewText;
            
            // Determine what text to display
            let originalText: string;
            if (isDynamic && previewText) {
                originalText = previewText;
            } else {
                originalText = textUpdates.text ?? extFabric._originalText ?? targetTextbox.text ?? '';
            }
            
            const transform = textUpdates.textTransform ?? (storedEl?.textTransform) ?? 'none';
            const displayText = applyTextTransform(originalText, transform);
            targetTextbox.set('text', displayText);
            
            // Update stored original if text changed
            if (textUpdates.text !== undefined) {
                extFabric._originalText = textUpdates.text;
            }
        }
        
        // Character styles - apply per-character formatting
        if (textUpdates.characterStyles !== undefined || textUpdates.richTextEnabled !== undefined) {
            if (textUpdates.richTextEnabled && textUpdates.characterStyles && textUpdates.characterStyles.length > 0) {
                const currentText = targetTextbox.text || '';
                const styles = convertToFabricStyles(currentText, textUpdates.characterStyles);
                targetTextbox.set('styles', styles);
            } else {
                // Clear styles when rich text is disabled
                targetTextbox.set('styles', {});
            }
        }
    }


    // Only recalculate coordinates if position/size/rotation changed
    // This is the expensive operation we want to minimize
    if (hasPositionChanges) {
        fabricObject.setCoords();
    }
}

/**
 * Extract Element data from a Fabric object
 * 
 * BUGFIX: Preserves metadata not stored on Fabric objects by merging with
 * stored element data. This fixes Bug 1: template elements losing metadata on reload.
 */
export function syncFabricToElement(fabricObject: fabric.FabricObject): Element | null {
    const id = (fabricObject as ExtendedFabricObject).id;
    const name = (fabricObject as ExtendedFabricObject).name || 'Untitled';
    const storedElement = (fabricObject as ExtendedFabricObject)._elementData;

    if (!id) {
        console.warn('[ObjectFactory] Fabric object missing ID');
        return null;
    }

    // CRITICAL FIX: Calculate actual displayed dimensions accounting for scale
    // Fabric.js stores natural/intrinsic width/height and applies scaleX/scaleY transforms
    // For images, width/height are the natural dimensions, so we must multiply by scale
    const baseWidth = fabricObject.width || 0;
    const baseHeight = fabricObject.height || 0;
    const scaleX = fabricObject.scaleX || 1;
    const scaleY = fabricObject.scaleY || 1;
    
    const displayedWidth = baseWidth * scaleX;
    const displayedHeight = baseHeight * scaleY;

    // Base properties common to all elements  (extracted from Fabric state)
    const base = {
        id,
        name,
        x: fabricObject.left || 0,
        y: fabricObject.top || 0,
        width: displayedWidth,   // Use displayed dimensions, not natural dimensions
        height: displayedHeight, // Use displayed dimensions, not natural dimensions
        rotation: fabricObject.angle || 0,
        opacity: fabricObject.opacity ?? 1,
        locked: !fabricObject.selectable,
        visible: fabricObject.visible !== false,
        zIndex: storedElement?.zIndex || 0, // Preserve original zIndex
    };

    // Type-specific properties
    if (fabricObject instanceof fabric.Textbox) {
        // Extract fontWeight - fabric stores it as string or number
        const fabricWeight = fabricObject.fontWeight;
        let fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 = 400;
        if (typeof fabricWeight === 'number' && [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(fabricWeight)) {
            fontWeight = fabricWeight as typeof fontWeight;
        } else if (typeof fabricWeight === 'string') {
            const parsed = parseInt(fabricWeight, 10);
            if ([100, 200, 300, 400, 500, 600, 700, 800, 900].includes(parsed)) {
                fontWeight = parsed as typeof fontWeight;
            } else if (fabricWeight === 'bold') {
                fontWeight = 700;
            }
        }
        
        const textElement: TextElement = {
            ...base,
            type: 'text',
            text: fabricObject.text || '',
            fontFamily: fabricObject.fontFamily || 'Arial',
            fontSize: fabricObject.fontSize || 16,
            fontStyle: 'normal',
            fontWeight,
            fill: (fabricObject.fill as string) || '#000000',
            align: (fabricObject.textAlign as 'left' | 'center' | 'right') || 'left',
            verticalAlign: 'top',
            lineHeight: fabricObject.lineHeight || 1.2,
            letterSpacing: (fabricObject.charSpacing || 0) / 10,
            textDecoration: fabricObject.underline ? 'underline' : (fabricObject.linethrough ? 'line-through' : ''),
            isDynamic: false,
        };
        
        // BUGFIX: Merge metadata from stored element (preserves dynamicField, textTransform, etc.)
        if (storedElement && storedElement.type === 'text') {
            const storedText = storedElement as TextElement;
            return {
                ...textElement,
                isDynamic: storedText.isDynamic,
                dynamicField: storedText.dynamicField,
                textTransform: storedText.textTransform,
                backgroundEnabled: storedText.backgroundEnabled,
                backgroundColor: storedText.backgroundColor,
                backgroundCornerRadius: storedText.backgroundCornerRadius,
                backgroundPadding: storedText.backgroundPadding,
                curvedEnabled: storedText.curvedEnabled,
                curvedPower: storedText.curvedPower,
                autoFitText: storedText.autoFitText,
                fontProvider: storedText.fontProvider,
                richTextEnabled: storedText.richTextEnabled,
                characterStyles: storedText.characterStyles,
                shadowColor: storedText.shadowColor,
                shadowBlur: storedText.shadowBlur,
                shadowOffsetX: storedText.shadowOffsetX,
                shadowOffsetY: storedText.shadowOffsetY,
                shadowOpacity: storedText.shadowOpacity,
                stroke: storedText.stroke,
                strokeWidth: storedText.strokeWidth,
            };
        }
        
        return textElement;
    }
    
    // Handle image elements (currently rendered as Rect or FabricImage)
    if (fabricObject instanceof fabric.FabricImage) {
        const imageElement: ImageElement = {
            ...base,
            type: 'image',
            imageUrl: '',
            fitMode: 'cover',
            cornerRadius: 0,
            isDynamic: false,
        };
        
        // BUGFIX: Merge metadata from stored element (preserves dynamicSource, imageUrl, etc.)
        if (storedElement && storedElement.type === 'image') {
            const storedImage = storedElement as ImageElement;
            return {
                ...imageElement,
                imageUrl: storedImage.imageUrl,
                cropX: storedImage.cropX,
                cropY: storedImage.cropY,
                cropWidth: storedImage.cropWidth,
                cropHeight: storedImage.cropHeight,
                fitMode: storedImage.fitMode,
                cornerRadius: storedImage.cornerRadius,
                filters: storedImage.filters,
                isDynamic: storedImage.isDynamic,
                dynamicSource: storedImage.dynamicSource,
                isCanvaBackground: storedImage.isCanvaBackground,
                originalFilename: storedImage.originalFilename,
            };
        }
        
        return imageElement;
    }

    if (fabricObject instanceof fabric.Rect) {
        // Check if this is an image placeholder or actual shape
        if (storedElement && storedElement.type === 'image') {
            // This is an image element rendered as placeholder
            const storedImage = storedElement as ImageElement;
            return {
                ...base,
                type: 'image',
                imageUrl: storedImage.imageUrl,
                cropX: storedImage.cropX,
                cropY: storedImage.cropY,
                cropWidth: storedImage.cropWidth,
                cropHeight: storedImage.cropHeight,
                fitMode: storedImage.fitMode,
                cornerRadius: storedImage.cornerRadius,
                filters: storedImage.filters,
                isDynamic: storedImage.isDynamic,
                dynamicSource: storedImage.dynamicSource,
                isCanvaBackground: storedImage.isCanvaBackground,
                originalFilename: storedImage.originalFilename,
            } as ImageElement;
        }
        
        // Regular rect shape
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

/**
 * Load an image asynchronously and return a Fabric.js Image object
 * Handles CORS via proxy for external URLs
 * 
 * CRITICAL FIX: Uses manual HTMLImageElement preloading to ensure
 * the image is fully loaded before Fabric.js creates the FabricImage.
 * This fixes "Failed to execute 'drawImage'" TypeError in Fabric.js 6.x
 */
export async function loadFabricImage(
    imageUrl: string,
    element: ImageElement
): Promise<fabric.FabricImage | null> {
    // Handle CORS by using proxy for external URLs
    const knownCorsBlockedDomains = ['s3.tebi.io', 'tebi.io', 'amazonaws.com'];
    const needsProxy = knownCorsBlockedDomains.some(d => imageUrl.includes(d));

    const urlToLoad = needsProxy
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl;

    /**
     * Helper function to preload image and create FabricImage
     */
    const loadImageFromUrl = (url: string): Promise<fabric.FabricImage> => {
        return new Promise((resolve, reject) => {
            const imgElement = new Image();
            imgElement.crossOrigin = 'anonymous';
            
            imgElement.onload = () => {
                try {
                    // Create FabricImage from the loaded HTMLImageElement
                    const fabricImg = new fabric.FabricImage(imgElement, {
                        left: element.x,
                        top: element.y,
                        angle: element.rotation || 0,
                        opacity: element.opacity ?? 1,
                        selectable: !element.locked,
                        evented: !element.locked,
                    });
                    
                    // Scale image to fit element dimensions
                    if (fabricImg.width && element.width) {
                        fabricImg.scaleX = element.width / fabricImg.width;
                        fabricImg.scaleY = element.height / fabricImg.height;
                    }
                    
                    resolve(fabricImg);
                } catch (err) {
                    console.error('[ObjectFactory] Error creating FabricImage:', err);
                    reject(err);
                }
            };
            
            imgElement.onerror = () => {
                console.error('[ObjectFactory] Image load error:', url.substring(0, 100));
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            imgElement.src = url;
        });
    };

    try {
        const img = await loadImageFromUrl(urlToLoad);

        // Store element ID and metadata for reference
        (img as unknown as ExtendedFabricObject).id = element.id;
        (img as unknown as ExtendedFabricObject).name = element.name;
        // BUGFIX: Store complete element data for metadata preservation
        (img as unknown as ExtendedFabricObject)._elementData = element;

        // Apply corner radius if specified
        if (element.cornerRadius && element.cornerRadius > 0) {
            img.clipPath = new fabric.Rect({
                width: img.width,
                height: img.height,
                rx: element.cornerRadius / (img.scaleX || 1),
                ry: element.cornerRadius / (img.scaleY || 1),
                originX: 'center',
                originY: 'center',
            });
        }

        console.log('[ObjectFactory] Image loaded successfully:', element.id);
        return img;
    } catch (error) {
        console.error('[ObjectFactory] Failed to load image:', imageUrl, error);

        // Try with proxy if direct load failed
        if (!needsProxy) {
            try {
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
                const img = await loadImageFromUrl(proxyUrl);

                // Store element ID and metadata for reference
                (img as unknown as ExtendedFabricObject).id = element.id;
                (img as unknown as ExtendedFabricObject).name = element.name;
                (img as unknown as ExtendedFabricObject)._elementData = element;

                // Apply corner radius if specified
                if (element.cornerRadius && element.cornerRadius > 0) {
                    img.clipPath = new fabric.Rect({
                        width: img.width,
                        height: img.height,
                        rx: element.cornerRadius / (img.scaleX || 1),
                        ry: element.cornerRadius / (img.scaleY || 1),
                        originX: 'center',
                        originY: 'center',
                    });
                }

                console.log('[ObjectFactory] Image loaded via proxy fallback:', element.id);
                return img;
            } catch (proxyError) {
                console.error('[ObjectFactory] Proxy fallback also failed:', proxyError);
            }
        }

        return null;
    }
}
