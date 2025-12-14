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
const isNode = typeof window === 'undefined';

// ============================================
// Universal Image Loader Helper
// ============================================

/**
 * Check if a URL is external (cross-origin) and needs proxy routing.
 * Returns false for data URLs, relative URLs, and same-origin URLs.
 */
function isExternalUrl(urlStr: string): boolean {
    if (!urlStr || urlStr.startsWith('data:')) return false;

    try {
        const parsed = new URL(urlStr, isNode ? undefined : window.location.origin);

        // In browser, compare with window.location.origin
        if (!isNode && typeof window !== 'undefined') {
            return parsed.origin !== window.location.origin;
        }

        // In Node, all http(s) URLs are considered "external" (handled separately)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        // If URL parsing fails, assume it's a relative/local URL
        return false;
    }
}

/**
 * Handles loading images in both Browser (Client) and Node.js (Server) environments.
 * 
 * Problem: Browsers enforce strict CORS policies for images drawn onto a canvas.
 * Even if an image loads visually, using it in Fabric can "taint" the canvas,
 * causing toDataURL() exports to fail or blocking the load entirely.
 * 
 * Solution:
 * - Browser + External URL: Route through /api/proxy-image to bypass CORS
 * - Node.js: Fetch buffer manually and convert to Base64 Data URL
 */
async function loadImageToCanvas(
    url: string,
    options: Partial<fabric.ImageProps> = {}
): Promise<fabric.FabricImage> {
    try {
        let loadUrl = url;

        if (isNode) {
            // Node.js Environment: Fetch buffer -> Base64
            // This bypasses node-canvas limitations with external HTTP resources
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const contentType = response.headers.get('content-type') || 'image/png';
            loadUrl = `data:${contentType};base64,${base64}`;
        } else if (isExternalUrl(url)) {
            // Browser + External URL: Route through proxy to bypass CORS
            // The proxy fetches the image server-side and serves it from same origin
            loadUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        }
        // else: Browser + same-origin URL or data URL - use directly

        // Fabric v6 load from URL logic
        // returns a Promise that resolves to the image instance
        const img = await fabric.FabricImage.fromURL(loadUrl, {
            crossOrigin: 'anonymous', // Crucial for CORS in browser
            ...options
        });

        return img;

    } catch (error) {
        console.error(`[SharedEngine] Error loading image (${url}):`, error);
        // Return an empty image to prevent crash
        return new fabric.FabricImage(new Image());
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
