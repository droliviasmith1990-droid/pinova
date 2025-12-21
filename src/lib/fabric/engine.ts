import * as fabric from 'fabric';
import { Element, TextElement, ImageElement, ShapeElement, FrameElement } from '@/types/editor';
import { convertToFabricStyles } from '@/lib/text/characterStyles';
import { getImageCache } from '@/lib/canvas/ImagePreloadCache';

export interface RenderConfig {
    width: number;
    height: number;
    backgroundColor?: string;
    interactive?: boolean;
}

export interface FieldMapping {
    [templateField: string]: string;
}

// --- Helper Functions ---

function createErrorPlaceholder(width: number = 200, height: number = 200): fabric.Group {
    const rect = new fabric.Rect({ width, height, fill: '#fee2e2', stroke: '#dc2626', strokeWidth: 3 });
    const text = new fabric.Text('⚠ Image Failed', {
        fontSize: Math.min(width, height) * 0.08, fontFamily: 'Arial', fill: '#dc2626',
        originX: 'center', originY: 'center', left: width / 2, top: height / 2,
    });
    return new fabric.Group([rect, text], { width, height });
}

async function loadImageToCanvas(url: string, options: Partial<fabric.ImageProps> = {}): Promise<fabric.FabricObject> {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!url) return createErrorPlaceholder(options.width as number, options.height as number);

    const tryLoad = async (urlToTry: string) => {
        const img = await fabric.FabricImage.fromURL(urlToTry, { crossOrigin: 'anonymous', ...options });
        if (!img || !img.width) throw new Error('Invalid image');
        return img;
    };

    // OPTIMIZATION: Check image cache first (for batch rendering)
    if (isBrowser) {
        const cache = getImageCache();
        const cachedImage = cache.get(url);
        if (cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0) {
            try {
                // Create fabric image from cached HTMLImageElement
                const img = new fabric.FabricImage(cachedImage, { ...options });
                // Ensure the image is properly initialized
                if (img && img.width && img.width > 0) {
                    return img;
                }
            } catch (error) {
                console.warn(`[Engine] Failed to create FabricImage from cache for ${url.substring(0, 60)}:`, error);
                // Fall through to normal loading
            }
        }
    }

    // Node/Server Logic - fetch images directly (no CORS restrictions on server)
    if (!isBrowser) {
        try {
            // Handle proxy URLs on server - extract the original URL and fetch directly
            // Server doesn't have CORS restrictions, so we can fetch external images directly
            let fetchUrl = url;
            if (url.startsWith('/api/proxy-image')) {
                // Extract the original URL from the proxy URL
                const urlParams = new URLSearchParams(url.split('?')[1] || '');
                const originalUrl = urlParams.get('url');
                if (originalUrl) {
                    fetchUrl = decodeURIComponent(originalUrl);
                }
            }
            
            // Add browser-like headers to bypass CDN restrictions (403 errors)
            // NOTE: Removing specific Referer as some CDNs (like Midjourney) block hotlinking if Referer is present but not allow-listed
            // Adding Sec-Fetch headers to simulate a real browser image request
            const response = await fetch(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error text');
                console.warn(`[Engine] Image fetch failed (${response.status} ${response.statusText}): ${fetchUrl} - ${errorText.substring(0, 100)}`);
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:${response.headers.get('content-type') || 'image/png'};base64,${base64}`;
            return await tryLoad(dataUrl);
        } catch (error) {
            console.error(`[Engine] Server image load failed for ${url.substring(0, 60)}:`, error);
            return createErrorPlaceholder(options.width as number, options.height as number);
        }
    }

    // Browser Proxy Logic
    // IMPORTANT: If URL is already a proxy URL or data URL, use it directly - no double-proxying!
    if (url.startsWith('/api/proxy-image') || url.startsWith('data:')) {
        try { return await tryLoad(url); }
        catch { return createErrorPlaceholder(options.width as number, options.height as number); }
    }
    
    const knownCorsBlockedDomains = ['s3.tebi.io', 'tebi.io', 'amazonaws.com'];
    const needsProxy = knownCorsBlockedDomains.some(d => url.includes(d));

    if (needsProxy) {
        try { return await tryLoad(`/api/proxy-image?url=${encodeURIComponent(url)}`); }
        catch { /* Retry direct below */ }
    }

    try { return await tryLoad(url); }
    catch {
        try { return await tryLoad(`/api/proxy-image?url=${encodeURIComponent(url)}`); }
        catch { return createErrorPlaceholder(options.width as number, options.height as number); }
    }
}

function replaceDynamicFields(text: string, rowData: Record<string, string>, fieldMapping: FieldMapping): string {
    let result = text;
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
        matches.forEach((match) => {
            const fieldName = match.replace(/\{\{|\}\}/g, '').trim();
            const csvColumn = fieldMapping[fieldName];
            if (csvColumn && rowData[csvColumn] !== undefined) result = result.replace(match, rowData[csvColumn]);
            else result = result.replace(match, '');
        });
    }
    return result;
}

function getDynamicImageUrl(element: ImageElement, rowData: Record<string, string>, fieldMapping: FieldMapping): string {
    const src = element.imageUrl || '';
    
    // For Canva backgrounds, use proxy but avoid double-encoding
    if (element.isCanvaBackground && src) {
        // If src is already a proxy URL, return as-is
        if (src.startsWith('/api/proxy-image')) {
            return src;
        }
        // If src is a data URL, return as-is (no proxy needed)
        if (src.startsWith('data:')) {
            return src;
        }
        // Otherwise, proxy the URL (encoding only if not already encoded)
        // Check if URL appears to already be encoded (contains %XX patterns)
        const needsEncoding = !src.includes('%3A') && !src.includes('%2F');
        return `/api/proxy-image?url=${needsEncoding ? encodeURIComponent(src) : src}`;
    }

    if (element.isDynamic && element.dynamicSource) {
        const col = fieldMapping[element.dynamicSource];
        if (col && rowData[col]) return rowData[col];
        if (rowData[element.dynamicSource]) return rowData[element.dynamicSource];
    }
    if (src.includes('{{')) return replaceDynamicFields(src, rowData, fieldMapping);
    return src;
}

/**
 * Apply text transformation (uppercase, lowercase, capitalize)
 * Phase 1 Typography Enhancement
 */
function applyTextTransform(
    text: string,
    transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | undefined
): string {
    if (!transform || transform === 'none') return text;
    
    switch (transform) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'capitalize':
            // Capitalize first letter of each word
            return text.replace(/\b\w/g, (char) => char.toUpperCase());
        default:
            return text;
    }
}

// --- Fabric Object Creation ---
async function createFabricObject(
    el: Element,
    config: RenderConfig,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): Promise<fabric.FabricObject | null> {
    if (!el.visible) return null;

    const commonOptions = {
        left: el.x, top: el.y, angle: el.rotation || 0, opacity: el.opacity ?? 1,
        selectable: config.interactive && !el.locked,
        evented: config.interactive && !el.locked,
    };

    let fabricObject: fabric.FabricObject | null = null;

    if (el.type === 'text') {
        const textEl = el as TextElement;
        let text = textEl.text;
        
        // Step 1: Replace dynamic fields first (e.g., {{name}} -> "John Smith")
        if (rowData && Object.keys(rowData).length > 0) {
            text = replaceDynamicFields(text, rowData, fieldMapping);
        }
        
        // Step 2: Apply text transform AFTER field substitution (Phase 1)
        text = applyTextTransform(text, textEl.textTransform);

        // Build textbox WITHOUT position - position is set conditionally
        const textbox = new fabric.Textbox(text, {
            width: textEl.width,
            fontSize: textEl.fontSize || 16,
            fontFamily: textEl.fontFamily || 'Arial',
            // Hollow text: transparent fill, otherwise use specified fill
            fill: textEl.hollowText ? 'transparent' : (textEl.fill || '#000000'), 
            textAlign: textEl.align || 'left',
            lineHeight: textEl.lineHeight || 1.2,
            charSpacing: (textEl.letterSpacing || 0) * 10,
            // Phase 1: Use fontWeight property (100-900), fallback to fontStyle for backward compatibility
            fontWeight: textEl.fontWeight || (textEl.fontStyle?.includes('bold') ? 'bold' : 'normal'),
            fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
            underline: textEl.textDecoration === 'underline',
            linethrough: textEl.textDecoration === 'line-through',
        });

        if (textEl.shadowColor) {
            textbox.shadow = new fabric.Shadow({
                color: textEl.shadowColor, blur: textEl.shadowBlur || 0,
                offsetX: textEl.shadowOffsetX || 0, offsetY: textEl.shadowOffsetY || 0,
            });
        }
        // Apply stroke/outline (required for hollow text, optional otherwise)
        if (textEl.stroke || textEl.hollowText) {
            // For hollow text, use the fill color as stroke if no stroke specified
            textbox.stroke = textEl.stroke || textEl.fill || '#000000';
            textbox.strokeWidth = textEl.strokeWidth || (textEl.hollowText ? 2 : 1);
        }

        // Phase 2: Apply character-level styles for rich text
        if (textEl.richTextEnabled && textEl.characterStyles && textEl.characterStyles.length > 0) {
            const styles = convertToFabricStyles(text, textEl.characterStyles);
            textbox.set('styles', styles);
        }

        // Phase 1: Text background with padding support
        if (textEl.backgroundEnabled) {
            const padding = textEl.backgroundPadding || 0;
            
            // For Group: textbox uses relative position (0,0)
            // The Group provides the absolute position via commonOptions
            textbox.set('left', 0);
            textbox.set('top', 0);
            
            const bgRect = new fabric.Rect({
                width: textEl.width + padding * 2,
                height: textEl.height + padding * 2,
                left: -padding,
                top: -padding,
                fill: textEl.backgroundColor,
                rx: textEl.backgroundCornerRadius || 0, ry: textEl.backgroundCornerRadius || 0,
            });
            fabricObject = new fabric.Group([bgRect, textbox], { ...commonOptions });
        } else {
            // Standalone textbox: apply position from commonOptions
            textbox.set(commonOptions);
            fabricObject = textbox;
        }

    }
    else if (el.type === 'image') {
        const imageEl = el as ImageElement;
        const src = getDynamicImageUrl(imageEl, rowData, fieldMapping);
        
        console.log(`[Render] Image ${imageEl.name}: URL resolved to:`, {
            isDynamic: imageEl.isDynamic,
            dynamicSource: imageEl.dynamicSource,
            imageUrl: imageEl.imageUrl?.substring(0, 50),
            resolvedSrc: src?.substring(0, 50),
            hasUrl: !!src
        });
        
        if (src) {
            console.log(`[Render] Loading image from: ${src.substring(0, 80)}...`);
            const img = await loadImageToCanvas(src, {});
            console.log(`[Render] Image loaded successfully: ${imageEl.name} (${img.width}x${img.height})`);
            
            // Get natural image dimensions
            const naturalWidth = img.width || 100;
            const naturalHeight = img.height || 100;
            
            // Get target dimensions from template
            const targetWidth = imageEl.width || naturalWidth;
            const targetHeight = imageEl.height || naturalHeight;
            
            // Determine fit mode:
            // - For dynamic images: default to 'contain' to show full image without cropping
            // - For static images: use configured fitMode or 'fill'
            const fitMode = imageEl.fitMode || (imageEl.isDynamic ? 'contain' : 'fill');
            
            console.log(`[Render] Fit mode: ${fitMode}, target: ${targetWidth}x${targetHeight}, natural: ${naturalWidth}x${naturalHeight}`);
            
            if (fitMode === 'fill') {
                // FILL MODE: Stretch image to exactly match template dimensions
                // No clipPath needed - just scale independently
                const scaleX = targetWidth / naturalWidth;
                const scaleY = targetHeight / naturalHeight;
                
                img.set({
                    left: imageEl.x,
                    top: imageEl.y,
                    scaleX: scaleX,
                    scaleY: scaleY,
                    angle: imageEl.rotation || 0,
                    opacity: imageEl.opacity ?? 1,
                    originX: 'left',
                    originY: 'top',
                });
                
                console.log(`[Render] Applied FILL: scaleX=${scaleX.toFixed(3)}, scaleY=${scaleY.toFixed(3)}, pos=(${imageEl.x}, ${imageEl.y})`);
                
            } else if (fitMode === 'cover') {
                // COVER MODE: Scale uniformly to cover, then clip overflow
                // Use larger scale to ensure full coverage
                const scale = Math.max(targetWidth / naturalWidth, targetHeight / naturalHeight);
                
                // Calculate how much of the scaled image fits in target frame
                const scaledWidth = naturalWidth * scale;
                const scaledHeight = naturalHeight * scale;
                
                // Center the excess on both axes
                const offsetX = (scaledWidth - targetWidth) / 2;
                const offsetY = (scaledHeight - targetHeight) / 2;
                
                img.set({
                    // Adjust position to account for clipping offset
                    left: imageEl.x - offsetX,
                    top: imageEl.y - offsetY,
                    scaleX: scale,
                    scaleY: scale,
                    angle: imageEl.rotation || 0,
                    opacity: imageEl.opacity ?? 1,
                    originX: 'left',
                    originY: 'top',
                    // Use absolutePositioned clipPath so it clips in canvas coordinates
                    clipPath: new fabric.Rect({
                        left: imageEl.x,
                        top: imageEl.y,
                        width: targetWidth,
                        height: targetHeight,
                        absolutePositioned: true,  // CRITICAL: Clip in canvas space, not image space
                    }),
                });
                
                console.log(`[Render] Applied COVER: scale=${scale.toFixed(3)}, offset=(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
                console.log(`[Render] COVER position calc: element(${imageEl.x}, ${imageEl.y}) - offset(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) = fabric(${img.left}, ${img.top})`);
                
            } else if (fitMode === 'contain') {
                // CONTAIN MODE: Scale uniformly to fit within frame
                const scale = Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight);
                
                // Center the image within the target frame
                const scaledWidth = naturalWidth * scale;
                const scaledHeight = naturalHeight * scale;
                const offsetX = (targetWidth - scaledWidth) / 2;
                const offsetY = (targetHeight - scaledHeight) / 2;
                
                img.set({
                    left: imageEl.x + offsetX,
                    top: imageEl.y + offsetY,
                    scaleX: scale,
                    scaleY: scale,
                    angle: imageEl.rotation || 0,
                    opacity: imageEl.opacity ?? 1,
                    originX: 'left',
                    originY: 'top',
                });
                
                console.log(`[Render] Applied CONTAIN: scale=${scale.toFixed(3)}, centered with offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
            }
            
            // Apply corner radius if specified (only for fill/contain, cover uses clipPath already)
            if (imageEl.cornerRadius && fitMode !== 'cover') {
                img.clipPath = new fabric.Rect({
                    left: imageEl.x,
                    top: imageEl.y,
                    width: targetWidth,
                    height: targetHeight,
                    rx: imageEl.cornerRadius,
                    ry: imageEl.cornerRadius,
                    absolutePositioned: true,
                });
            }
            
            fabricObject = img;
        } else {
            // Placeholder for empty image
            console.warn(`[Render] No URL for image ${imageEl.name}, creating placeholder`);
            fabricObject = new fabric.Rect({
                ...commonOptions, width: imageEl.width || 200, height: imageEl.height || 200,
                fill: '#f3f4f6', stroke: '#d1d5db', strokeWidth: 2, strokeDashArray: [8, 4]
            });
        }
    }
    else if (el.type === 'shape') {
        const shapeEl = el as ShapeElement;
        if (shapeEl.shapeType === 'rect') fabricObject = new fabric.Rect({ ...commonOptions, width: shapeEl.width, height: shapeEl.height, fill: shapeEl.fill, stroke: shapeEl.stroke, strokeWidth: shapeEl.strokeWidth, rx: shapeEl.cornerRadius, ry: shapeEl.cornerRadius });
        else if (shapeEl.shapeType === 'circle') fabricObject = new fabric.Circle({ ...commonOptions, radius: (shapeEl.width || 0) / 2, fill: shapeEl.fill, stroke: shapeEl.stroke, strokeWidth: shapeEl.strokeWidth });
        else if (shapeEl.shapeType === 'line') fabricObject = new fabric.Line(shapeEl.points as [number, number, number, number] || [0, 0, shapeEl.width, 0], { ...commonOptions, stroke: shapeEl.stroke, strokeWidth: shapeEl.strokeWidth });
        else if (shapeEl.shapeType === 'path') {
            // BUG-SVG-003 FIX: Validate pathData exists and is not empty
            if (!shapeEl.pathData || shapeEl.pathData.trim() === '') {
                console.warn(`[RenderEngine] Skipping path with empty data: ${el.name} (ID: ${el.id})`);
                return null;
            }

            // Handle 'none' fill - convert to null for Fabric.js transparency
            const pathFill = shapeEl.fill === 'none' ? null : (shapeEl.fill || '#000000');
            const pathStroke = shapeEl.stroke === 'none' ? null : (shapeEl.stroke || null);
            const pathStrokeWidth = shapeEl.strokeWidth || 0;

            // If no fill AND no stroke, default to black fill so path is visible
            const finalFill = (!pathFill && !pathStroke) ? '#000000' : pathFill;

            fabricObject = new fabric.Path(shapeEl.pathData, {
                angle: el.rotation || 0,
                opacity: el.opacity ?? 1,
                selectable: !el.locked,
                evented: !el.locked,
                fill: finalFill,
                stroke: pathStroke,
                strokeWidth: pathStrokeWidth
            });

            // CENTERING FIX: Set left/top to element.x/y directly
            // Element x/y contains the final centered position
            if (el.x !== 0 || el.y !== 0) {
                fabricObject.set({
                    left: el.x || 0,
                    top: el.y || 0
                });
            }
        }
    }
    else if (el.type === 'frame') {
        const frameEl = el as FrameElement;
        fabricObject = new fabric.Rect({
            ...commonOptions, width: frameEl.width, height: frameEl.height,
            fill: frameEl.fill || 'rgba(0,0,0,0.05)', stroke: frameEl.stroke || '#cccccc',
            strokeWidth: frameEl.strokeWidth || 1, strokeDashArray: [5, 5],
            rx: frameEl.cornerRadius, ry: frameEl.cornerRadius,
        });
    }

    if (fabricObject) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fabricObject as any).elementId = el.id;
    }
    return fabricObject;
}

/**
 * ✅ INCREMENTAL RENDERER (v2.0)
 * - Preserves existing canvas objects and their positions
 * - Only adds NEW elements
 * - Only removes DELETED elements
 * - Never destroys unchanged elements
 */
export async function renderTemplate(
    canvas: fabric.StaticCanvas | fabric.Canvas,
    elements: Element[],
    config: RenderConfig,
    rowData: Record<string, string> = {},
    fieldMapping: FieldMapping = {}
): Promise<void> {

    // Safety: Check if canvas is disposed
    if (!canvas.getElement()) return;

    // 🔍 DEBUG: Canvas state before render
    console.log('[Render] 🎯 Canvas state BEFORE render:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        viewportTransform: canvas.viewportTransform,
        backgroundColor: canvas.backgroundColor,
    });

    // 🔍 DEBUG: Element positions from template
    console.log('[Render] 📐 Elements from template (original positions):', elements.map(el => ({
        name: el.name,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
    })));

    // 1. BUILD INDEX of existing canvas objects by elementId
    const existingObjectsMap = new Map<string, fabric.FabricObject>();
    canvas.getObjects().forEach(obj => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (obj as any).elementId;
        if (id) existingObjectsMap.set(id, obj);
    });

    // 2. BUILD SET of incoming element IDs
    const incomingIds = new Set(elements.map(el => el.id));

    // 3. IDENTIFY NEW elements (in store but not on canvas)
    const newElements = elements.filter(el => !existingObjectsMap.has(el.id));

    // 4. IDENTIFY DELETED elements (on canvas but not in store)
    const deletedIds: string[] = [];
    existingObjectsMap.forEach((_, id) => {
        if (!incomingIds.has(id)) deletedIds.push(id);
    });

    // DEBUG LOGGING
    console.log(`[Render] Existing: ${existingObjectsMap.size}, Incoming: ${elements.length}, New: ${newElements.length}, Deleted: ${deletedIds.length}`);

    // 5. REMOVE deleted objects
    deletedIds.forEach(id => {
        const obj = existingObjectsMap.get(id);
        if (obj) canvas.remove(obj);
    });


    // 6. ADD new objects sorted by zIndex (ascending = lower zIndex added first = bottom of stack)
    // IMPORTANT: We use pure z-index sorting. The Layers panel is the source of truth for layer order.
    // isCanvaBackground is just metadata - actual render order is determined by zIndex.
    const sortedNewElements = [...newElements].sort((a, b) => a.zIndex - b.zIndex);
    
    console.log(`[Render] ✅ Sorted element order (by zIndex ascending):`,
        sortedNewElements.map(el => `${el.name} (z:${el.zIndex})`).join(' → '));

    console.log(`[Render] About to add ${sortedNewElements.length} new elements:`, 
        sortedNewElements.map(el => `${el.name} (${el.type})`));

    for (const el of sortedNewElements) {
        console.log(`[Render] Creating fabric object for: ${el.name} (${el.type}, id: ${el.id})`);
        console.log(`[Render] 📍 Template position for ${el.name}: x=${el.x}, y=${el.y}`);
        
        const fabricObj = await createFabricObject(el, config, rowData, fieldMapping);
        
        if (fabricObj) {
            // 🔍 DEBUG: Compare template Y vs Fabric Y
            console.log(`[Render] 🎯 Position comparison for ${el.name}:`, {
                'Template Y': el.y,
                'Fabric top': fabricObj.top,
                'Difference': (fabricObj.top || 0) - el.y,
                'Template X': el.x,
                'Fabric left': fabricObj.left,
                'ScaleX': fabricObj.scaleX,
                'ScaleY': fabricObj.scaleY,
            });
            
            canvas.add(fabricObj);
            console.log(`[Render] ✅ Added element: ${el.name} (${el.type})`);
        } else {
            console.warn(`[Render] ❌ Failed to create fabric object for: ${el.name} (${el.type})`);
        }
    }

    console.log(`[Render] Final canvas object count: ${canvas.getObjects().length}`);
    
    // 🔍 DEBUG: Final positions on canvas
    console.log('[Render] 📊 Final object positions on canvas:', canvas.getObjects().map(obj => ({
        name: (obj as any).name || 'unnamed',
        type: (obj as any).type,
        top: obj.top,
        left: obj.left,
        width: obj.width,
        height: obj.height,
    })));

    // 7. UPDATE canvas dimensions and background (safe, doesn't affect objects)
    canvas.setDimensions({ width: config.width, height: config.height });
    if (config.backgroundColor) canvas.backgroundColor = config.backgroundColor;

    canvas.renderAll();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToDataURL(canvas: fabric.StaticCanvas | fabric.Canvas, options: any = {}) {
    return canvas.toDataURL(options);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportToBlob(canvas: fabric.StaticCanvas | fabric.Canvas, options: any = {}) {
    // Default to PNG if not specified
    const format = options.format || 'png';
    const quality = options.quality || 1;
    const multiplier = options.multiplier || 1;
    
    // For JPEG, we need to ensure background color is set (no transparency)
    if (format === 'jpeg' && !canvas.backgroundColor) {
        canvas.backgroundColor = '#ffffff';
    }
    
    const dataUrl = canvas.toDataURL({
        format,
        quality,
        multiplier,
        enableRetinaScaling: true
    });
    
    const response = await fetch(dataUrl);
    return response.blob();
}
