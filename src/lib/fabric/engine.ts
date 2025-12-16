import * as fabric from 'fabric';
import { Element, TextElement, ImageElement, ShapeElement, FrameElement } from '@/types/editor';

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

    // Node/Server Logic
    if (!isBrowser) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:${response.headers.get('content-type') || 'image/png'};base64,${base64}`;
            return await tryLoad(dataUrl);
        } catch { return createErrorPlaceholder(options.width as number, options.height as number); }
    }

    // Browser Proxy Logic
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
    if (element.isCanvaBackground && src) return `/api/proxy-image?url=${encodeURIComponent(src)}`;

    if (element.isDynamic && element.dynamicSource) {
        const col = fieldMapping[element.dynamicSource];
        if (col && rowData[col]) return rowData[col];
        if (rowData[element.dynamicSource]) return rowData[element.dynamicSource];
    }
    if (src.includes('{{')) return replaceDynamicFields(src, rowData, fieldMapping);
    return src;
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
        if (rowData && Object.keys(rowData).length > 0) text = replaceDynamicFields(text, rowData, fieldMapping);

        const textbox = new fabric.Textbox(text, {
            ...commonOptions,
            width: textEl.width, fontSize: textEl.fontSize, fontFamily: textEl.fontFamily,
            fill: textEl.fill, textAlign: textEl.align, lineHeight: textEl.lineHeight,
            charSpacing: (textEl.letterSpacing || 0) * 10,
            fontWeight: textEl.fontStyle?.includes('bold') ? 'bold' : 'normal',
            fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
            underline: textEl.textDecoration === 'underline',
            linethrough: textEl.textDecoration === 'line-through',
            splitByGrapheme: true,
        });

        if (textEl.shadowColor) {
            textbox.shadow = new fabric.Shadow({
                color: textEl.shadowColor, blur: textEl.shadowBlur || 0,
                offsetX: textEl.shadowOffsetX || 0, offsetY: textEl.shadowOffsetY || 0,
            });
        }
        if (textEl.stroke) {
            textbox.stroke = textEl.stroke; textbox.strokeWidth = textEl.strokeWidth || 1;
        }

        if (textEl.backgroundEnabled) {
            const bgRect = new fabric.Rect({
                width: textEl.width, height: textEl.height,
                fill: textEl.backgroundColor,
                rx: textEl.backgroundCornerRadius, ry: textEl.backgroundCornerRadius,
            });
            fabricObject = new fabric.Group([bgRect, textbox], { ...commonOptions });
        } else {
            fabricObject = textbox;
        }
    }
    else if (el.type === 'image') {
        const imageEl = el as ImageElement;
        const src = getDynamicImageUrl(imageEl, rowData, fieldMapping);
        if (src) {
            const img = await loadImageToCanvas(src, commonOptions);
            if (img.width && imageEl.width) {
                img.scaleX = imageEl.width / img.width;
                img.scaleY = imageEl.height / img.height;
            }
            if (imageEl.cornerRadius) {
                img.clipPath = new fabric.Rect({
                    width: img.width, height: img.height,
                    rx: imageEl.cornerRadius / (img.scaleX || 1),
                    ry: imageEl.cornerRadius / (img.scaleY || 1),
                    originX: 'center', originY: 'center',
                });
            }
            fabricObject = img;
        } else {
            // Placeholder for empty image
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
            // Handle 'none' fill - convert to null for Fabric.js transparency
            const pathFill = shapeEl.fill === 'none' ? null : (shapeEl.fill || '#000000');
            const pathStroke = shapeEl.stroke === 'none' ? null : (shapeEl.stroke || null);
            const pathStrokeWidth = shapeEl.strokeWidth || 0;

            // If no fill AND no stroke, default to black fill so path is visible
            const finalFill = (!pathFill && !pathStroke) ? '#000000' : pathFill;

            fabricObject = new fabric.Path(shapeEl.pathData || '', {
                ...commonOptions,
                fill: finalFill,
                stroke: pathStroke,
                strokeWidth: pathStrokeWidth
            });
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

    // 6. ADD new objects (sort by zIndex first for correct layering)
    const sortedNewElements = [...newElements].sort((a, b) => {
        const aBg = a.name?.toLowerCase().includes('background');
        const bBg = b.name?.toLowerCase().includes('background');
        if (aBg && !bBg) return -1;
        if (!aBg && bBg) return 1;
        return a.zIndex - b.zIndex;
    });

    for (const el of sortedNewElements) {
        const fabricObj = await createFabricObject(el, config, rowData, fieldMapping);
        if (fabricObj) {
            canvas.add(fabricObj);
            console.log(`[Render] Added new element: ${el.id}`);
        }
    }

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
    const dataUrl = exportToDataURL(canvas, options);
    const response = await fetch(dataUrl);
    return response.blob();
}
