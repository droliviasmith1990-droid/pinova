/**
 * Server-Side Rendering Engine for API
 * 
 * Uses fabric/node for Node.js server-side canvas operations.
 * This module is specifically for the /api/v1/generate endpoint.
 * 
 * IMPORTANT: Fonts must be registered BEFORE creating canvas objects.
 * Custom fonts are bundled via next.config.ts outputFileTracingIncludes.
 */

import { StaticCanvas, Rect, FabricImage, Textbox, Circle, Path, Shadow, Group } from 'fabric/node';
import { Element, TextElement, ImageElement, ShapeElement, FrameElement } from '@/types/editor';
import * as path from 'path';
import * as fs from 'fs';

// Use require for canvas to avoid TypeScript type errors
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerFont } = require('canvas');

// Types
export interface RenderConfig {
    width: number;
    height: number;
    backgroundColor?: string;
}

export interface FieldMapping {
    [templateField: string]: string;
}

// Debug flag - enabled for debugging API issues
const DEBUG = true; // Temporarily enabled for debugging

// Track registered fonts to avoid duplicate registration
const registeredFonts = new Set<string>();

/**
 * Register fonts from the bundled fonts directory
 * Must be called before creating any canvas/text objects
 */
function initializeFonts(): void {
    // Try multiple possible paths for the fonts directory
    // Vercel serverless functions have different paths than local dev
    const possiblePaths = [
        path.join(process.cwd(), 'public', 'fonts'),  // Local development
        path.join(process.cwd(), '.next', 'server', 'public', 'fonts'),  // Vercel bundled
        '/var/task/public/fonts',  // Vercel Lambda path
        '/var/task/.next/server/public/fonts', // Alternative Vercel path
    ];

    let fontsDir: string | null = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            fontsDir = p;
            console.log(`[ServerEngine] Found fonts directory: ${p}`);
            break;
        }
    }

    if (!fontsDir) {
        console.warn('[ServerEngine] No fonts directory found, using system fonts only');
        return;
    }

    // Font family mapping: filename -> family name
    const fontMapping: Record<string, string> = {
        'Roboto-Regular.ttf': 'Roboto',
        'Roboto-Bold.ttf': 'Roboto',
        'OpenSans-Regular.ttf': 'Open Sans',
        'OpenSans-Bold.ttf': 'Open Sans',
        'Poppins-Regular.ttf': 'Poppins',
        'Poppins-Bold.ttf': 'Poppins',
        'Montserrat-Regular.ttf': 'Montserrat',
        'Montserrat-Bold.ttf': 'Montserrat',
        'Inter-Regular.ttf': 'Inter',
        'Inter-Bold.ttf': 'Inter',
    };

    try {
        const files = fs.readdirSync(fontsDir);
        for (const file of files) {
            if (!file.endsWith('.ttf') && !file.endsWith('.otf')) continue;
            
            const fontPath = path.join(fontsDir, file);
            const familyName = fontMapping[file] || file.replace(/[-_](Regular|Bold|Italic)?\.(ttf|otf)$/i, '');
            const weight = file.toLowerCase().includes('bold') ? 'bold' : 'normal';
            const style = file.toLowerCase().includes('italic') ? 'italic' : 'normal';
            
            const fontKey = `${familyName}-${weight}-${style}`;
            if (registeredFonts.has(fontKey)) continue;
            
            try {
                registerFont(fontPath, {
                    family: familyName,
                    weight: weight,
                    style: style,
                });
                registeredFonts.add(fontKey);
                console.log(`[ServerEngine] Registered font: ${familyName} (${weight}, ${style})`);
            } catch (err) {
                console.error(`[ServerEngine] Failed to register font ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('[ServerEngine] Error reading fonts directory:', err);
    }
}

// Initialize fonts on module load
initializeFonts();

/**
 * Get font with fallback - returns original font if registered, otherwise fallback
 */
function getServerSafeFont(fontFamily: string): string {
    // Check if font is registered
    const baseFamily = fontFamily.split(',')[0].trim().replace(/["']/g, '');
    if (registeredFonts.has(`${baseFamily}-normal-normal`) || 
        registeredFonts.has(`${baseFamily}-bold-normal`)) {
        console.log(`[ServerEngine] Using registered font: "${baseFamily}"`);
        return baseFamily;
    }
    
    // Fallback to system fonts
    const fallbacks: Record<string, string> = {
        'Roboto': 'sans-serif',
        'Open Sans': 'sans-serif',
        'Poppins': 'sans-serif',
        'Montserrat': 'sans-serif',
        'Inter': 'sans-serif',
        'Arial': 'sans-serif',
        'Helvetica': 'sans-serif',
    };
    
    for (const [key, value] of Object.entries(fallbacks)) {
        if (baseFamily.toLowerCase().includes(key.toLowerCase())) {
            console.log(`[ServerEngine] Font fallback: "${fontFamily}" -> "${value}"`);
            return value;
        }
    }
    
    console.log(`[ServerEngine] Font fallback: "${fontFamily}" -> "sans-serif" (default)`);
    return 'sans-serif';
}

/**
 * Replace dynamic fields in text with values from row data
 */
function replaceDynamicFields(text: string, rowData: Record<string, string>, fieldMapping: FieldMapping): string {
    let result = text;
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
        matches.forEach((match) => {
            const fieldName = match.replace(/\{\{|\}\}/g, '').trim();
            const csvColumn = fieldMapping[fieldName];
            if (csvColumn && rowData[csvColumn] !== undefined) {
                result = result.replace(match, rowData[csvColumn]);
            } else if (rowData[fieldName] !== undefined) {
                // Direct match without mapping
                result = result.replace(match, rowData[fieldName]);
            } else {
                result = result.replace(match, '');
            }
        });
    }
    return result;
}

/**
 * Get dynamic image URL from element and row data
 */
function getDynamicImageUrl(element: ImageElement, rowData: Record<string, string>, fieldMapping: FieldMapping): string {
    const src = element.imageUrl || '';
    
    if (element.isDynamic && element.dynamicSource) {
        const col = fieldMapping[element.dynamicSource];
        if (col && rowData[col]) return rowData[col];
        if (rowData[element.dynamicSource]) return rowData[element.dynamicSource];
    }
    
    if (src.includes('{{')) {
        return replaceDynamicFields(src, rowData, fieldMapping);
    }
    
    return src;
}

/**
 * Load image from URL (server-side)
 */
async function loadImageServer(url: string): Promise<FabricImage | null> {
    if (!url) return null;
    
    try {
        // Decode proxy URL if present
        let fetchUrl = url;
        if (url.startsWith('/api/proxy-image')) {
            const urlParams = new URLSearchParams(url.split('?')[1] || '');
            const originalUrl = urlParams.get('url');
            if (originalUrl) {
                fetchUrl = decodeURIComponent(originalUrl);
            }
        }
        
        // Fetch image data
        const response = await fetch(fetchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*',
            },
        });
        
        if (!response.ok) {
            console.error(`[ServerEngine] Failed to fetch image: ${response.status} - ${fetchUrl.substring(0, 80)}`);
            return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        // Create FabricImage from data URL
        const img = await FabricImage.fromURL(dataUrl);
        return img;
    } catch (error) {
        console.error(`[ServerEngine] Image load error:`, error);
        return null;
    }
}

/**
 * Apply text transformation
 */
function applyTextTransform(text: string, transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'): string {
    if (!transform || transform === 'none') return text;
    switch (transform) {
        case 'uppercase': return text.toUpperCase();
        case 'lowercase': return text.toLowerCase();
        case 'capitalize': return text.replace(/\b\w/g, (c) => c.toUpperCase());
        default: return text;
    }
}

/**
 * Render a single element to the canvas
 */
async function renderElement(
    canvas: StaticCanvas,
    el: Element,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): Promise<void> {
    if (!el.visible) return;

    const commonOptions = {
        left: el.x,
        top: el.y,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
    };

    if (el.type === 'text') {
        const textEl = el as TextElement;
        let text = textEl.text;
        
        console.log(`[ServerEngine] TEXT: name="${el.name}", original="${text?.substring(0, 50)}"`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log(`[ServerEngine] TEXT: isDynamic=${'isDynamic' in textEl ? (textEl as any).isDynamic : false}`);
        console.log(`[ServerEngine] TEXT: fieldMapping=`, fieldMapping);
        console.log(`[ServerEngine] TEXT: rowData keys=`, Object.keys(rowData));
        
        // Replace dynamic fields
        text = replaceDynamicFields(text, rowData, fieldMapping);
        text = applyTextTransform(text, textEl.textTransform);
        
        console.log(`[ServerEngine] TEXT: final text="${text?.substring(0, 50)}"`);
        console.log(`[ServerEngine] TEXT: position x=${el.x}, y=${el.y}, width=${textEl.width}`);
        console.log(`[ServerEngine] TEXT: font=${textEl.fontFamily}, size=${textEl.fontSize}, fill=${textEl.fill}`);

        const textbox = new Textbox(text, {
            ...commonOptions,
            width: textEl.width,
            fontSize: textEl.fontSize || 16,
            fontFamily: getServerSafeFont(textEl.fontFamily || 'Arial'),
            fill: textEl.hollowText ? 'transparent' : (textEl.fill || '#000000'),
            textAlign: textEl.align || 'left',
            lineHeight: textEl.lineHeight || 1.2,
            charSpacing: (textEl.letterSpacing || 0) * 10,
            fontWeight: textEl.fontWeight || (textEl.fontStyle?.includes('bold') ? 'bold' : 'normal'),
            fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
            underline: textEl.textDecoration === 'underline',
            linethrough: textEl.textDecoration === 'line-through',
        });

        if (textEl.shadowColor) {
            textbox.shadow = new Shadow({
                color: textEl.shadowColor,
                blur: textEl.shadowBlur || 0,
                offsetX: textEl.shadowOffsetX || 0,
                offsetY: textEl.shadowOffsetY || 0,
            });
        }

        if (textEl.stroke || textEl.hollowText) {
            textbox.stroke = textEl.stroke || textEl.fill || '#000000';
            textbox.strokeWidth = textEl.strokeWidth || (textEl.hollowText ? 2 : 1);
        }

        // Handle background
        if (textEl.backgroundEnabled) {
            const padding = textEl.backgroundPadding || 0;
            textbox.set({ left: 0, top: 0 });
            
            const bgRect = new Rect({
                width: textEl.width + padding * 2,
                height: textEl.height + padding * 2,
                left: -padding,
                top: -padding,
                fill: textEl.backgroundColor,
                rx: textEl.backgroundCornerRadius || 0,
                ry: textEl.backgroundCornerRadius || 0,
            });
            
            const group = new Group([bgRect, textbox], commonOptions);
            canvas.add(group);
            console.log(`[ServerEngine] TEXT: Added text group with background`);
        } else {
            canvas.add(textbox);
            console.log(`[ServerEngine] TEXT: Added textbox to canvas`);
        }
    }
    else if (el.type === 'image') {
        const imageEl = el as ImageElement;
        
        console.log(`[ServerEngine] IMAGE: name="${el.name}", isDynamic=${imageEl.isDynamic}`);
        console.log(`[ServerEngine] IMAGE: dynamicSource="${imageEl.dynamicSource}", imageUrl="${imageEl.imageUrl?.substring(0, 60)}"`);
        
        const src = getDynamicImageUrl(imageEl, rowData, fieldMapping);
        
        console.log(`[ServerEngine] IMAGE: Resolved URL="${src?.substring(0, 100)}"`);
        
        const img = await loadImageServer(src);
        
        if (img) {
            const targetWidth = imageEl.width || img.width || 200;
            const targetHeight = imageEl.height || img.height || 200;
            const fitMode = imageEl.fitMode || (imageEl.isDynamic ? 'contain' : 'fill');
            
            const naturalWidth = img.width || 100;
            const naturalHeight = img.height || 100;
            
            console.log(`[ServerEngine] IMAGE: Loaded successfully, natural=${naturalWidth}x${naturalHeight}, target=${targetWidth}x${targetHeight}, fitMode=${fitMode}`);
            
            if (fitMode === 'fill') {
                img.set({
                    ...commonOptions,
                    scaleX: targetWidth / naturalWidth,
                    scaleY: targetHeight / naturalHeight,
                });
            } else if (fitMode === 'cover') {
                const scale = Math.max(targetWidth / naturalWidth, targetHeight / naturalHeight);
                const offsetX = ((naturalWidth * scale) - targetWidth) / 2;
                const offsetY = ((naturalHeight * scale) - targetHeight) / 2;
                
                img.set({
                    left: el.x - offsetX,
                    top: el.y - offsetY,
                    scaleX: scale,
                    scaleY: scale,
                    angle: el.rotation || 0,
                    opacity: el.opacity ?? 1,
                    clipPath: new Rect({
                        left: el.x,
                        top: el.y,
                        width: targetWidth,
                        height: targetHeight,
                        absolutePositioned: true,
                    }),
                });
            } else { // contain
                const scale = Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight);
                const offsetX = (targetWidth - (naturalWidth * scale)) / 2;
                const offsetY = (targetHeight - (naturalHeight * scale)) / 2;
                
                img.set({
                    left: el.x + offsetX,
                    top: el.y + offsetY,
                    scaleX: scale,
                    scaleY: scale,
                    angle: el.rotation || 0,
                    opacity: el.opacity ?? 1,
                });
            }
            
            canvas.add(img);
            console.log(`[ServerEngine] IMAGE: Added to canvas at (${img.left}, ${img.top})`);
        } else {
            console.error(`[ServerEngine] IMAGE: FAILED to load "${el.name}" from ${src?.substring(0, 80)}`);
            // Placeholder for failed image
            const placeholder = new Rect({
                ...commonOptions,
                width: imageEl.width || 200,
                height: imageEl.height || 200,
                fill: '#fee2e2',
                stroke: '#dc2626',
                strokeWidth: 2,
            });
            canvas.add(placeholder);
        }
    }
    else if (el.type === 'shape') {
        const shapeEl = el as ShapeElement;
        
        if (shapeEl.shapeType === 'rect') {
            const rect = new Rect({
                ...commonOptions,
                width: shapeEl.width,
                height: shapeEl.height,
                fill: shapeEl.fill,
                stroke: shapeEl.stroke,
                strokeWidth: shapeEl.strokeWidth,
                rx: shapeEl.cornerRadius,
                ry: shapeEl.cornerRadius,
            });
            canvas.add(rect);
        }
        else if (shapeEl.shapeType === 'circle') {
            const circle = new Circle({
                ...commonOptions,
                radius: (shapeEl.width || 0) / 2,
                fill: shapeEl.fill,
                stroke: shapeEl.stroke,
                strokeWidth: shapeEl.strokeWidth,
            });
            canvas.add(circle);
        }
        else if (shapeEl.shapeType === 'path' && shapeEl.pathData) {
            const pathFill = shapeEl.fill === 'none' ? null : shapeEl.fill;
            const pathStroke = shapeEl.stroke === 'none' ? null : shapeEl.stroke;
            
            const path = new Path(shapeEl.pathData, {
                ...commonOptions,
                fill: pathFill || '#000000',
                stroke: pathStroke,
                strokeWidth: shapeEl.strokeWidth || 0,
            });
            canvas.add(path);
        }
    }
    else if (el.type === 'frame') {
        const frameEl = el as FrameElement;
        const frame = new Rect({
            ...commonOptions,
            width: frameEl.width,
            height: frameEl.height,
            fill: frameEl.fill || 'rgba(0,0,0,0.05)',
            stroke: frameEl.stroke || '#cccccc',
            strokeWidth: frameEl.strokeWidth || 1,
            strokeDashArray: [5, 5],
            rx: frameEl.cornerRadius,
            ry: frameEl.cornerRadius,
        });
        canvas.add(frame);
    }
}

/**
 * Render template to canvas (server-side version)
 */
export async function renderTemplateServer(
    canvas: StaticCanvas,
    elements: Element[],
    config: RenderConfig,
    rowData: Record<string, string> = {},
    fieldMapping: FieldMapping = {}
): Promise<void> {
    // Set background color
    if (config.backgroundColor) {
        canvas.backgroundColor = config.backgroundColor;
    }
    
    // Sort elements by zIndex (lower first = bottom of stack)
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    
    if (DEBUG) {
        console.log(`[ServerEngine] Rendering ${sortedElements.length} elements`);
    }
    
    // Render each element
    for (const el of sortedElements) {
        await renderElement(canvas, el, rowData, fieldMapping);
    }
    
    // Render all
    canvas.renderAll();
}
