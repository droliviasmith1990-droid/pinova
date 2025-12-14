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
 * Handles loading images in both Browser (Client) and Node.js (Server) environments.
 * 
 * CRITICAL: This function MUST route external URLs through the proxy in browser
 * to prevent CORS "tainted canvas" errors that break toDataURL() exports.
 * 
 * Strategy:
 * - Browser + HTTP/HTTPS URL (not same origin): Route through /api/proxy-image
 * - Browser + Data URL or same-origin: Load directly
 * - Node.js: Fetch buffer -> Base64 data URL (Node has no CORS restrictions)
 */
async function loadImageToCanvas(
    url: string,
    options: Partial<fabric.ImageProps> = {}
): Promise<fabric.FabricImage> {
    // CRITICAL: Check environment INSIDE the function, not at module level
    // This ensures accurate detection even with bundler optimizations
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    const isNodeEnv = !isBrowser;

    let loadUrl = url;

    // Early exit for empty URLs
    if (!url) {
        console.error('[SharedEngine] Empty URL provided to loadImageToCanvas');
        throw new Error('Empty image URL');
    }

    // Handle Data URLs - no proxy needed
    if (url.startsWith('data:')) {
        console.log('[SharedEngine] Loading data URL directly');
        loadUrl = url;
    }
    // Node.js Environment: Fetch buffer -> Base64
    else if (isNodeEnv) {
        console.log('[SharedEngine] Node.js: Fetching image as buffer:', url.substring(0, 80) + '...');
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const contentType = response.headers.get('content-type') || 'image/png';
            loadUrl = `data:${contentType};base64,${base64}`;
        } catch (fetchError) {
            console.error('[SharedEngine] Node.js fetch failed:', fetchError);
            throw fetchError;
        }
    }
    // Browser Environment: Check if URL needs proxying
    else if (isBrowser) {
        // AGGRESSIVE PROXY: Any http/https URL that is NOT our origin MUST go through proxy
        const isHttpUrl = url.startsWith('http://') || url.startsWith('https://');

        if (isHttpUrl) {
            // Check if it's same origin
            let isSameOrigin = false;
            try {
                const parsedUrl = new URL(url);
                isSameOrigin = parsedUrl.origin === window.location.origin;
            } catch {
                // If URL parsing fails, assume it needs proxy
                isSameOrigin = false;
            }

            if (!isSameOrigin) {
                // MUST proxy external URLs to avoid CORS tainted canvas
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                console.log('[SharedEngine] Browser: Proxying external URL:', url.substring(0, 60) + '...');
                console.log('[SharedEngine] -> Proxy URL:', proxyUrl.substring(0, 80));
                loadUrl = proxyUrl;
            } else {
                console.log('[SharedEngine] Browser: Same-origin URL, loading directly');
                loadUrl = url;
            }
        } else {
            // Relative URL or other protocol - load directly
            console.log('[SharedEngine] Browser: Non-HTTP URL, loading directly:', url.substring(0, 60));
            loadUrl = url;
        }
    }

    // Load the image with Fabric
    try {
        console.log('[SharedEngine] Loading via Fabric.fromURL:', loadUrl.substring(0, 80) + '...');

        const img = await fabric.FabricImage.fromURL(loadUrl, {
            crossOrigin: 'anonymous',
            ...options
        });

        if (!img || !img.width || !img.height) {
            throw new Error('Fabric loaded empty or invalid image');
        }

        console.log('[SharedEngine] Successfully loaded image:', img.width, 'x', img.height);
        return img;

    } catch (fabricError) {
        console.error('[SharedEngine] Fabric.fromURL failed for:', loadUrl.substring(0, 80));
        console.error('[SharedEngine] Original URL was:', url.substring(0, 80));
        console.error('[SharedEngine] Error:', fabricError);

        // IMPORTANT: Throw the error so the caller knows the pin failed
        // Do NOT return an empty image - that hides failures
        throw new Error(`Failed to load image: ${fabricError instanceof Error ? fabricError.message : 'Unknown error'}`);
    }
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

    // Priority 1: Check for explicit dynamic mapping
    if (element.isDynamic && element.dynamicSource) {
        const column = fieldMapping[element.dynamicSource];
        if (column && rowData[column]) {
            const value = rowData[column];
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                return value;
            }
        }
    }

    // Priority 2: Check if imageUrl contains {{field}} pattern
    if (src.includes('{{')) {
        return replaceDynamicFields(src, rowData, fieldMapping);
    }

    // Priority 3: Fallback - Check element name for field mapping
    const elementName = element.name.toLowerCase().replace(/\s+/g, '');
    for (const [field, column] of Object.entries(fieldMapping)) {
        const normalizedField = field.toLowerCase().replace(/\s+/g, '');
        if (elementName === normalizedField || elementName.includes(normalizedField)) {
            const value = rowData[column];
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                return value;
            }
        }
    }

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

    // 2. Iterate and Render Elements
    // We use Promise.all to load images in parallel
    await Promise.all(sortedElements.map(async (el) => {
        // Only process visible elements
        if (el.visible === false) return;

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

        if (fabricObject) {
            canvas.add(fabricObject);
        }
    }));

    // 3. Final Render (Crucial for Node)
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
