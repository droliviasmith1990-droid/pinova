import * as fabric from 'fabric';
import { Element, TextElement, ImageElement, ShapeElement } from '@/types/editor';

// ============================================
// Types
// ============================================
export interface RenderConfig {
    width: number;
    height: number;
    backgroundColor?: string;
}

export interface FieldMapping {
    [templateField: string]: string; // templateField -> csvColumn
}

// ============================================
// Environment Detection
// ============================================
// NOTE: Do NOT cache this at module level - check inside functions for bundler safety

// ============================================
// Universal Image Loader Helper
// ============================================

/**
 * Creates a visual placeholder for failed images.
 * Used as a safety net when both direct and proxy loading fail.
 */
function createErrorPlaceholder(width: number = 200, height: number = 200): fabric.Group {
    const rect = new fabric.Rect({
        width: width,
        height: height,
        fill: '#f3f4f6',
        stroke: '#9ca3af',
        strokeWidth: 2,
    });
    // Add text indicator
    const text = new fabric.Text('Image Failed', {
        fontSize: Math.min(width, height) * 0.1,
        fontFamily: 'Arial',
        fill: '#6b7280',
        originX: 'center',
        originY: 'center',
        left: width / 2,
        top: height / 2,
    });
    return new fabric.Group([rect, text], { width, height });
}

/**
 * ROBUST IMAGE LOADER: Direct -> Proxy -> Placeholder
 * 
 * Strategy (inspired by the working Konva implementation):
 * 1. Attempt DIRECT load first (optimistic - works for Midjourney, Unsplash, most CDNs)
 * 2. If direct fails (CORS/network error), try PROXY as fallback
 * 3. If proxy also fails, return a PLACEHOLDER to prevent batch crashes
 * 
 * Node.js Environment: Fetch buffer -> Base64 data URL (no CORS restrictions)
 */
async function loadImageToCanvas(
    url: string,
    options: Partial<fabric.ImageProps> = {}
): Promise<fabric.FabricObject> {
    // CRITICAL: Check environment INSIDE the function, not at module level
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isNodeEnv = !isBrowser;

    // Early exit for empty URLs
    if (!url) {
        console.warn('[Engine] Empty URL - returning placeholder');
        const placeholder = createErrorPlaceholder(
            typeof options.width === 'number' ? options.width : 200,
            typeof options.height === 'number' ? options.height : 200
        );
        if (options.left) placeholder.set({ left: options.left });
        if (options.top) placeholder.set({ top: options.top });
        return placeholder;
    }

    // Helper to try loading a specific URL
    const tryLoad = async (urlToTry: string): Promise<fabric.FabricImage> => {
        const img = await fabric.FabricImage.fromURL(urlToTry, {
            crossOrigin: 'anonymous',
            ...options
        });
        if (!img || !img.width || !img.height) {
            throw new Error('Fabric loaded empty or invalid image');
        }
        return img;
    };

    // Handle Data URLs - load directly (no CORS issues)
    if (url.startsWith('data:')) {
        console.log('[Engine] Loading data URL directly');
        try {
            return await tryLoad(url);
        } catch (error) {
            console.error('[Engine] Data URL load failed:', error);
            return createErrorPlaceholder(
                typeof options.width === 'number' ? options.width : 200,
                typeof options.height === 'number' ? options.height : 200
            );
        }
    }

    // Node.js Environment: Fetch buffer -> Base64 (no CORS restrictions)
    if (isNodeEnv) {
        console.log('[Engine] Node.js: Fetching image as buffer:', url.substring(0, 80) + '...');
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const contentType = response.headers.get('content-type') || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64}`;

            return await tryLoad(dataUrl);
        } catch (fetchError) {
            console.error('[Engine] Node.js fetch failed:', fetchError);
            throw fetchError; // In Node.js, let it throw - no fallback needed
        }
    }

    // Browser Environment: SMART FALLBACK STRATEGY
    // =============================================

    const isHttpUrl = url.startsWith('http://') || url.startsWith('https://');

    // Check if it's same origin (no proxy needed)
    let isSameOrigin = false;
    if (isHttpUrl) {
        try {
            const parsedUrl = new URL(url);
            isSameOrigin = parsedUrl.origin === window.location.origin;
        } catch {
            isSameOrigin = false;
        }
    }

    // Same-origin or non-HTTP URLs: load directly
    if (!isHttpUrl || isSameOrigin) {
        console.log('[Engine] Loading same-origin/relative URL directly');
        try {
            return await tryLoad(url);
        } catch (error) {
            console.error('[Engine] Same-origin load failed:', error);
            const placeholder = createErrorPlaceholder(
                typeof options.width === 'number' ? options.width : 200,
                typeof options.height === 'number' ? options.height : 200
            );
            if (options.left) placeholder.set({ left: options.left });
            if (options.top) placeholder.set({ top: options.top });
            return placeholder;
        }
    }

    // EXTERNAL HTTP/HTTPS URLs: Use Smart Fallback
    // STRATEGY 1: Try DIRECT load first (optimistic)
    try {
        console.log('[Engine] Attempt 1: Direct load', url.substring(0, 60) + '...');
        const img = await tryLoad(url);
        console.log('[Engine] Direct load SUCCESS:', img.width, 'x', img.height);
        return img;

    } catch (directError) {
        // Direct load failed (likely CORS or network error)
        console.warn('[Engine] Direct load failed, trying proxy...', directError);

        // STRATEGY 2: Try PROXY fallback
        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            console.log('[Engine] Attempt 2: Proxy load', proxyUrl.substring(0, 80));
            const img = await tryLoad(proxyUrl);
            console.log('[Engine] Proxy load SUCCESS:', img.width, 'x', img.height);
            return img;

        } catch (proxyError) {
            console.error('[Engine] Proxy load failed:', proxyError);
        }
    }

    // STRATEGY 3: Return PLACEHOLDER (safety net)
    console.error('[Engine] All attempts failed for:', url.substring(0, 80));
    const placeholder = createErrorPlaceholder(
        typeof options.width === 'number' ? options.width : 200,
        typeof options.height === 'number' ? options.height : 200
    );

    // Apply basic positioning from options if they exist
    if (options.left) placeholder.set({ left: options.left });
    if (options.top) placeholder.set({ top: options.top });

    return placeholder;
}

// ============================================
// Text Field Replacement
// ============================================
function replaceDynamicFields(
    text: string,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): string {
    let result = text;

    // Replace {{field}} patterns with actual values
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
        matches.forEach((match) => {
            const fieldName = match.replace(/\{\{|\}\}/g, '').trim();
            const csvColumn = fieldMapping[fieldName];
            if (csvColumn && rowData[csvColumn] !== undefined) {
                result = result.replace(match, rowData[csvColumn]);
            } else {
                // Replace missing fields with empty string
                result = result.replace(match, '');
            }
        });
    }

    return result;
}

// ============================================
// Dynamic Image URL Resolution
// ============================================
function getDynamicImageUrl(
    element: ImageElement,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): string {
    const src = element.imageUrl || '';
    const isBrowser = typeof window !== 'undefined';
    const elementName = element.name || '';

    // Debug helper
    const debug = (msg: string, value?: string) => {
        if (isBrowser) {
            console.log(`[Engine] getDynamicImageUrl [${elementName}]: ${msg}`, value || '');
        }
    };

    debug('Starting resolution for element');

    // Priority 1: Check for explicit dynamic mapping via isDynamic + dynamicSource
    if (element.isDynamic && element.dynamicSource) {
        debug('Checking dynamicSource:', element.dynamicSource);

        // First check fieldMapping
        const column = fieldMapping[element.dynamicSource];
        if (column && rowData[column]) {
            const value = rowData[column];
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                debug('Found via fieldMapping:', value.substring(0, 60));
                return value;
            }
        }

        // Also check direct CSV column name (dynamicSource might BE the column name)
        if (rowData[element.dynamicSource]) {
            const value = rowData[element.dynamicSource];
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                debug('Found via direct dynamicSource column:', value.substring(0, 60));
                return value;
            }
        }
    }

    // Priority 2: Check if imageUrl contains {{field}} pattern
    if (src.includes('{{')) {
        const resolved = replaceDynamicFields(src, rowData, fieldMapping);
        debug('Resolved template pattern:', resolved.substring(0, 60));
        return resolved;
    }

    // Priority 3: Try to match element name to CSV columns DIRECTLY
    // This handles "image1", "image2", "Image 1", "product_image", etc.
    const normalizedName = elementName.toLowerCase().replace(/[\s_-]+/g, '');

    // Check each CSV column for a matching name
    for (const [csvColumn, value] of Object.entries(rowData)) {
        if (!value || (!value.startsWith('http') && !value.startsWith('data:'))) {
            continue; // Skip non-URL values
        }

        const normalizedColumn = csvColumn.toLowerCase().replace(/[\s_-]+/g, '');

        // Exact match
        if (normalizedName === normalizedColumn) {
            debug(`Matched directly to CSV column [${csvColumn}]:`, value.substring(0, 60));
            return value;
        }

        // Contains match (e.g., "image1" contains "image" and column is "image1")
        if (normalizedColumn.includes(normalizedName) || normalizedName.includes(normalizedColumn)) {
            debug(`Partial match to CSV column [${csvColumn}]:`, value.substring(0, 60));
            return value;
        }
    }

    // Priority 4: Fallback - Check element name against field mapping names
    for (const [field, column] of Object.entries(fieldMapping)) {
        const normalizedField = field.toLowerCase().replace(/[\s_-]+/g, '');
        if (normalizedName === normalizedField || normalizedName.includes(normalizedField) || normalizedField.includes(normalizedName)) {
            const value = rowData[column];
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                debug(`Matched via fieldMapping [${field}]:`, value.substring(0, 60));
                return value;
            }
        }
    }

    debug('No dynamic URL found, using src:', src.substring(0, 60));
    return src;
}

// ============================================
// The Core Rendering Function (Isomorphic)
// ============================================
/**
 * Renders a template onto a provided Fabric StaticCanvas instance.
 * This function is environment-agnostic and works in both Browser and Node.js.
 */
export async function renderTemplate(
    canvas: fabric.StaticCanvas | fabric.Canvas,
    elements: Element[],
    config: RenderConfig,
    rowData: Record<string, string> = {},
    fieldMapping: FieldMapping = {}
): Promise<void> {
    // 1. Setup Canvas Dimensions & Background
    canvas.setDimensions({ width: config.width, height: config.height });

    if (config.backgroundColor) {
        canvas.backgroundColor = config.backgroundColor;
    }

    // Clear previous objects
    canvas.clear();

    // Sort elements by zIndex
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    // 2. Create all fabric objects in parallel (for speed)
    // BUT we'll add them to canvas in order AFTER all are created (for correct z-index)
    const fabricObjectPromises = sortedElements.map(async (el, index): Promise<{ index: number; obj: fabric.FabricObject | null }> => {
        // Only process visible elements
        if (el.visible === false) return { index, obj: null };

        let fabricObject: fabric.FabricObject | null = null;

        const commonOptions = {
            left: el.x,
            top: el.y,
            angle: el.rotation || 0,
            opacity: el.opacity ?? 1,
        };

        switch (el.type) {
            case 'text': {
                const textEl = el as TextElement;

                // Resolve dynamic text
                let text = textEl.text;

                // Check for isDynamic and dynamicField property
                if (textEl.isDynamic && textEl.dynamicField) {
                    const csvColumn = fieldMapping[textEl.dynamicField];
                    if (csvColumn && rowData[csvColumn] !== undefined) {
                        text = rowData[csvColumn];
                    }
                }

                // Also check for {{field}} patterns in text
                text = replaceDynamicFields(text, rowData, fieldMapping);

                // If still no replacement, try matching by element name
                if (text === textEl.text) {
                    const elementName = textEl.name.toLowerCase();
                    for (const [field, column] of Object.entries(fieldMapping)) {
                        if (elementName.includes(field.toLowerCase()) || field.toLowerCase().includes(elementName)) {
                            if (rowData[column] !== undefined) {
                                text = rowData[column];
                                break;
                            }
                        }
                    }
                }

                // Use Textbox for better wrapping support
                const textbox = new fabric.Textbox(text, {
                    ...commonOptions,
                    width: textEl.width,
                    fontSize: textEl.fontSize || 16,
                    fontFamily: textEl.fontFamily || 'Arial',
                    fill: textEl.fill || '#000000',
                    textAlign: textEl.align || 'left',
                    lineHeight: textEl.lineHeight || 1.2,
                    charSpacing: (textEl.letterSpacing || 0) * 10, // Fabric uses different scale
                    fontWeight: textEl.fontStyle?.includes('bold') ? 'bold' : 'normal',
                    fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
                    underline: textEl.textDecoration === 'underline',
                    linethrough: textEl.textDecoration === 'line-through',
                    splitByGrapheme: true, // Better wrapping behavior
                });

                // Add shadow if enabled
                if (textEl.shadowColor && textEl.shadowBlur) {
                    textbox.shadow = new fabric.Shadow({
                        color: textEl.shadowColor,
                        blur: textEl.shadowBlur,
                        offsetX: textEl.shadowOffsetX || 0,
                        offsetY: textEl.shadowOffsetY || 0,
                    });
                }

                // Add stroke if enabled
                if (textEl.stroke && textEl.strokeWidth) {
                    textbox.stroke = textEl.stroke;
                    textbox.strokeWidth = textEl.strokeWidth;
                }

                fabricObject = textbox;
                break;
            }

            case 'image': {
                const imageEl = el as ImageElement;
                const imageSrc = getDynamicImageUrl(imageEl, rowData, fieldMapping);

                if (imageSrc) {
                    const img = await loadImageToCanvas(imageSrc, commonOptions);

                    // Scale logic: Fabric images use scaleX/Y, editor uses width/height
                    if (img.width && imageEl.width) {
                        img.scaleX = imageEl.width / img.width;
                    }
                    if (img.height && imageEl.height) {
                        img.scaleY = imageEl.height / img.height;
                    }

                    fabricObject = img;
                }
                break;
            }

            case 'shape': {
                const shapeEl = el as ShapeElement;

                if (shapeEl.shapeType === 'circle') {
                    fabricObject = new fabric.Circle({
                        ...commonOptions,
                        radius: (shapeEl.width || 0) / 2,
                        fill: shapeEl.fill,
                        stroke: shapeEl.stroke,
                        strokeWidth: shapeEl.strokeWidth
                    });
                } else if (shapeEl.shapeType === 'rect') {
                    fabricObject = new fabric.Rect({
                        ...commonOptions,
                        width: shapeEl.width,
                        height: shapeEl.height,
                        fill: shapeEl.fill,
                        stroke: shapeEl.stroke,
                        strokeWidth: shapeEl.strokeWidth,
                        rx: shapeEl.cornerRadius || 0,
                        ry: shapeEl.cornerRadius || 0
                    });
                } else if (shapeEl.shapeType === 'line') {
                    const points = (shapeEl.points || [0, 0, shapeEl.width || 0, 0]) as [number, number, number, number];
                    fabricObject = new fabric.Line(points, {
                        ...commonOptions,
                        stroke: shapeEl.stroke || '#000000',
                        strokeWidth: shapeEl.strokeWidth || 1,
                        strokeLineCap: shapeEl.strokeLineCap || 'butt',
                    });
                } else if (shapeEl.shapeType === 'path' && shapeEl.pathData) {
                    fabricObject = new fabric.Path(shapeEl.pathData, {
                        ...commonOptions,
                        fill: shapeEl.fill,
                        stroke: shapeEl.stroke,
                        strokeWidth: shapeEl.strokeWidth,
                    });
                }
                break;
            }
        }

        return { index, obj: fabricObject };
    });

    // Wait for all objects to be created
    const results = await Promise.all(fabricObjectPromises);

    // 3. Add objects to canvas IN ORDER (crucial for correct z-index)
    // Sort by original index to maintain z-order
    results
        .sort((a, b) => a.index - b.index)
        .forEach(({ obj }) => {
            if (obj) {
                canvas.add(obj);
            }
        });

    // 4. Final Render (Crucial for Node)
    canvas.renderAll();
}

// ============================================
// Export Helpers
// ============================================
export interface ExportOptions {
    format?: 'png' | 'jpeg';
    quality?: number;
    multiplier?: number;
}

/**
 * Export canvas to data URL
 */
export function exportToDataURL(
    canvas: fabric.StaticCanvas | fabric.Canvas,
    options: ExportOptions = {}
): string {
    const { format = 'png', quality = 1, multiplier = 1 } = options;

    return canvas.toDataURL({
        format,
        quality,
        multiplier,
    });
}

/**
 * Export canvas to Blob (Browser only)
 */
export async function exportToBlob(
    canvas: fabric.StaticCanvas | fabric.Canvas,
    options: ExportOptions = {}
): Promise<Blob> {
    const dataUrl = exportToDataURL(canvas, options);
    const response = await fetch(dataUrl);
    return response.blob();
}
