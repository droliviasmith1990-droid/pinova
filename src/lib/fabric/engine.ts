import * as fabric from 'fabric';
import { Element, TextElement, ImageElement, ShapeElement, FrameElement } from '@/types/editor';

// ============================================
// Types
// ============================================
export interface RenderConfig {
    width: number;
    height: number;
    backgroundColor?: string;
    interactive?: boolean; // ✅ NEW: Enable selection for Editor
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
 * Creates a VISIBLE RED placeholder for failed images.
 * Makes it immediately obvious when an image fails to load.
 */
function createErrorPlaceholder(width: number = 200, height: number = 200): fabric.Group {
    const rect = new fabric.Rect({
        width: width,
        height: height,
        fill: '#fee2e2', // Light red background
        stroke: '#dc2626', // Red border
        strokeWidth: 3,
    });
    const text = new fabric.Text('⚠ Image Failed', {
        fontSize: Math.min(width, height) * 0.08,
        fontFamily: 'Arial',
        fill: '#dc2626', // Red text
        originX: 'center',
        originY: 'center',
        left: width / 2,
        top: height / 2,
    });
    console.error('[Engine] Created visible ERROR placeholder for failed image');
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
    // CRITICAL: Detect domains that are KNOWN to lack CORS headers
    // These must use proxy FIRST to prevent canvas taint!
    const knownCorsBlockedDomains = [
        's3.tebi.io',
        'tebi.io',
        's3.amazonaws.com', // Some S3 buckets
    ];

    let urlDomain = '';
    try {
        urlDomain = new URL(url).hostname;
    } catch { /* ignore */ }

    const needsProxyFirst = knownCorsBlockedDomains.some(domain => urlDomain.includes(domain));

    if (needsProxyFirst) {
        // PROACTIVE PROXY: Route CORS-blocked domains through proxy FIRST
        // This prevents canvas taint from failed CORS attempts
        console.log('[Engine] CORS-blocked domain detected, using proxy directly:', urlDomain);
        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            const img = await tryLoad(proxyUrl);
            console.log('[Engine] Proxy load SUCCESS (proactive):', img.width, 'x', img.height);
            return img;
        } catch (proxyError) {
            console.warn('[Engine] Proxy failed, attempting direct load as fallback...', proxyError);

            // ✅ BUG #7 FIX: Fallback to direct load
            try {
                const img = await tryLoad(url);
                console.log('[Engine] Direct load SUCCESS (after proxy fail):', img.width, 'x', img.height);
                return img;
            } catch (directError) {
                console.error('[Engine] Both proxy and direct failed:', directError);
                const placeholder = createErrorPlaceholder(
                    typeof options.width === 'number' ? options.width : 200,
                    typeof options.height === 'number' ? options.height : 200
                );
                if (options.left) placeholder.set({ left: options.left });
                if (options.top) placeholder.set({ top: options.top });
                return placeholder;
            }
        }
    }

    // STRATEGY 1: Try DIRECT load first (optimistic - for CDNs with CORS)
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

    // CRITICAL: Canva background images need proxy for CORS bypass
    // This must run FIRST before any other checks (matches clientPinGenerator.ts logic)
    if (element.isCanvaBackground && src) {
        debug('Canva background detected - using proxy');
        return `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }

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

    // Priority 3.5: NUMBER-BASED fuzzy matching
    // Matches "Image 2" → "product_image_2" by extracting numbers
    const cleanName = normalizedName.replace(/[^a-z0-9]/g, ''); // Remove ALL non-alphanumeric
    const nameNumbers = cleanName.match(/\d+/g); // Extract numbers from element name

    if (nameNumbers && cleanName.includes('image')) {
        for (const [csvColumn, value] of Object.entries(rowData)) {
            if (!value || (!value.startsWith('http') && !value.startsWith('data:'))) {
                continue;
            }

            const cleanColumn = csvColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
            const columnNumbers = cleanColumn.match(/\d+/g);

            // Match if both contain "image" (or "img") and the same number
            if ((cleanColumn.includes('image') || cleanColumn.includes('img')) && columnNumbers) {
                if (nameNumbers[0] === columnNumbers[0]) {
                    debug(`Number-based match [${csvColumn}] (num=${nameNumbers[0]}):`, value.substring(0, 60));
                    return value;
                }
            }
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

    // Sort elements by zIndex, with special handling for Background elements
    // Background elements should ALWAYS render at the bottom, regardless of their zIndex
    const sortedElements = [...elements].sort((a, b) => {
        const aIsBackground = a.name?.toLowerCase().includes('background') ?? false;
        const bIsBackground = b.name?.toLowerCase().includes('background') ?? false;

        // Backgrounds always go first (bottom of stack)
        if (aIsBackground && !bIsBackground) return -1;
        if (!aIsBackground && bIsBackground) return 1;

        // If both are backgrounds or both are not, sort by zIndex
        return a.zIndex - b.zIndex;
    });

    // Debug: Log the sorted order
    if (typeof window !== 'undefined') {
        console.log('[Engine] Element render order:', sortedElements.map(e => ({
            name: e.name,
            zIndex: e.zIndex,
            type: e.type
        })));
    }

    // 2. Create all fabric objects in parallel (for speed)
    // BUT we'll add them to canvas in order AFTER all are created (for correct z-index)
    const fabricObjectPromises = sortedElements.map(async (el, index): Promise<{ index: number; obj: fabric.FabricObject | null }> => {
        // Only process visible elements
        if (el.visible === false) return { index, obj: null };

        let fabricObject: fabric.FabricObject | null = null;

        // ✅ INTERACTIVE MODE: Set selectable/evented based on config
        const commonOptions = {
            left: el.x,
            top: el.y,
            angle: el.rotation || 0,
            opacity: el.opacity ?? 1,
            selectable: config.interactive && !el.locked, // ✅ Enable for Editor
            evented: config.interactive && !el.locked,     // ✅ Enable for Editor
        };

        switch (el.type) {
            case 'text': {
                const textEl = el as TextElement;

                // Resolve dynamic text
                let text = textEl.text;

                // ✅ Replace fields if we have data (generation OR preview mode)
                if (rowData && Object.keys(rowData).length > 0) {
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

                // Background box for text
                if (textEl.backgroundEnabled) {
                    const group = new fabric.Group([
                        new fabric.Rect({
                            width: textEl.width,
                            height: textEl.height,
                            fill: textEl.backgroundColor || '#FFFFFF',
                            rx: textEl.backgroundCornerRadius || 8,
                            ry: textEl.backgroundCornerRadius || 8,
                        }),
                        textbox,
                    ], {
                        left: textEl.x,
                        top: textEl.y,
                        angle: textEl.rotation || 0,
                        opacity: textEl.opacity,
                        selectable: config.interactive && !textEl.locked,
                        evented: config.interactive && !textEl.locked,
                    });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (group as any).elementId = el.id;
                    return { index, obj: group };
                }

                fabricObject = textbox;
                break;
            }

            case 'image': {
                const imageEl = el as ImageElement;
                const imageSrc = getDynamicImageUrl(imageEl, rowData, fieldMapping);

                // Debug: Log image element details
                const isBrowser = typeof window !== 'undefined';
                if (isBrowser) {
                    console.log(`[Engine] Rendering image element:`, {
                        name: imageEl.name,
                        x: imageEl.x,
                        y: imageEl.y,
                        width: imageEl.width,
                        height: imageEl.height,
                        zIndex: imageEl.zIndex,
                        imageSrc: imageSrc?.substring(0, 60) + '...',
                    });
                }

                if (imageSrc) {
                    const img = await loadImageToCanvas(imageSrc, commonOptions);

                    // Scale logic: Fabric images use scaleX/Y, editor uses width/height
                    let scaleX = 1, scaleY = 1;
                    if (img.width && imageEl.width) {
                        scaleX = imageEl.width / img.width;
                        img.scaleX = scaleX;
                    }
                    if (img.height && imageEl.height) {
                        scaleY = imageEl.height / img.height;
                        img.scaleY = scaleY;
                    }

                    // Corner radius via clipPath
                    if (imageEl.cornerRadius && imageEl.cornerRadius > 0) {
                        const clipRect = new fabric.Rect({
                            width: img.width || imageEl.width,
                            height: img.height || imageEl.height,
                            rx: imageEl.cornerRadius / scaleX,
                            ry: imageEl.cornerRadius / scaleY,
                            originX: 'center',
                            originY: 'center',
                        });
                        img.set({ clipPath: clipRect });
                    }

                    // Debug: Log final image properties
                    if (isBrowser) {
                        console.log(`[Engine] Image rendered:`, {
                            name: imageEl.name,
                            imgWidth: img.width,
                            imgHeight: img.height,
                            targetWidth: imageEl.width,
                            targetHeight: imageEl.height,
                            scaleX,
                            scaleY,
                            finalWidth: (img.width || 0) * scaleX,
                            finalHeight: (img.height || 0) * scaleY,
                            left: commonOptions.left,
                            top: commonOptions.top,
                        });
                    }

                    fabricObject = img;
                } else {
                    if (isBrowser) {
                        console.warn(`[Engine] No image source for element:`, imageEl.name);
                    }
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

            // ✅ BUG #6 FIX: Frame Support
            case 'frame': {
                const frameEl = el as FrameElement;

                fabricObject = new fabric.Rect({
                    ...commonOptions,
                    width: frameEl.width,
                    height: frameEl.height,
                    fill: frameEl.fill || 'rgba(0, 0, 0, 0.05)',
                    stroke: frameEl.stroke || '#cccccc',
                    strokeWidth: frameEl.strokeWidth || 1,
                    strokeDashArray: [5, 5], // Dashed border for frames
                    rx: frameEl.cornerRadius || 0,
                    ry: frameEl.cornerRadius || 0,
                });

                // Note: Actual layout logic handles child positions in store
                // Frame visualization is just the container box here
                break;
            }
        }

        if (fabricObject) {
            // ✅ Attach element ID for event handling in Editor
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fabricObject as any).elementId = el.id;
        }

        return { index, obj: fabricObject };
    });

    // Wait for all objects to be created
    const results = await Promise.all(fabricObjectPromises);

    // 3. Add objects to canvas IN ORDER (crucial for correct z-index)
    // Sort by original index to maintain z-order
    let addedCount = 0;
    results
        .sort((a, b) => a.index - b.index)
        .forEach(({ obj }) => {
            if (obj) {
                canvas.add(obj);
                addedCount++;
            }
        });

    // 4. Debug: Log canvas state before render
    if (typeof window !== 'undefined') {
        const objects = canvas.getObjects();
        console.log('[Engine] Canvas state before render:', {
            objectCount: objects.length,
            addedCount,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            objects: objects.map((obj, i) => ({
                index: i,
                type: obj.type,
                left: obj.left,
                top: obj.top,
                width: obj.width,
                height: obj.height,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                visible: obj.visible,
                opacity: obj.opacity,
            }))
        });
    }

    // 5. Final Render (Crucial for Node)
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
