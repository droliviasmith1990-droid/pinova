import Konva from 'konva';
import { Element, TextElement, ImageElement, CanvasSize } from '@/types/editor';

// Debug logging - only enabled in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

// ============================================
// Types
// ============================================
export interface GenerationSettings {
    batchSize: number;
    quality: 'draft' | 'normal' | 'high' | 'ultra';
    pauseEnabled: boolean;
}

export interface FieldMapping {
    [templateField: string]: string; // templateField -> csvColumn
}

export interface PinData {
    rowIndex: number;
    data: Record<string, string>;
}

export interface GeneratedPin {
    rowIndex: number;
    dataUrl: string;
    blob: Blob;
    fileName: string;
}

export interface GenerationProgress {
    current: number;
    total: number;
    percentage: number;
    status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
    currentPin?: GeneratedPin;
    errors: Array<{ rowIndex: number; error: string }>;
}

// Quality to pixel ratio mapping
const QUALITY_MAP: Record<GenerationSettings['quality'], number> = {
    draft: 1,
    normal: 2,
    high: 3,
    ultra: 4,
};

// ============================================
// Image Cache with LRU eviction (optimized)
// ============================================
const MAX_CACHE_SIZE = 50; // Reduced from 100 to prevent OOM on large batches
const imageCache = new Map<string, HTMLImageElement>();

// ============================================
// Singleton Container & Stage (Performance Optimization)
// Prevents DOM thrashing by reusing container/stage across renders
// ============================================
let sharedContainer: HTMLDivElement | null = null;
let sharedStage: Konva.Stage | null = null;
let sharedLayer: Konva.Layer | null = null;

function getOrCreateRenderContext(canvasSize: CanvasSize): { stage: Konva.Stage; layer: Konva.Layer } {
    // Create container once
    if (!sharedContainer) {
        sharedContainer = document.createElement('div');
        sharedContainer.style.position = 'absolute';
        sharedContainer.style.left = '-9999px';
        sharedContainer.style.top = '-9999px';
        sharedContainer.style.visibility = 'hidden';
        document.body.appendChild(sharedContainer);
        log('[renderPin] Created singleton container');
    }

    // Create or resize stage
    if (!sharedStage) {
        sharedStage = new Konva.Stage({
            container: sharedContainer,
            width: canvasSize.width,
            height: canvasSize.height,
        });
        sharedLayer = new Konva.Layer();
        sharedStage.add(sharedLayer);
        log('[renderPin] Created singleton stage');
    } else {
        // Resize if canvas size changed
        if (sharedStage.width() !== canvasSize.width || sharedStage.height() !== canvasSize.height) {
            sharedStage.width(canvasSize.width);
            sharedStage.height(canvasSize.height);
        }
    }

    // Clear layer for fresh render (much faster than recreating)
    sharedLayer!.destroyChildren();

    return { stage: sharedStage, layer: sharedLayer! };
}

// Call this when generation is complete to free resources
export function destroyRenderContext(): void {
    if (sharedStage) {
        sharedStage.destroy();
        sharedStage = null;
        sharedLayer = null;
        log('[renderPin] Destroyed singleton stage');
    }
    if (sharedContainer && sharedContainer.parentNode) {
        document.body.removeChild(sharedContainer);
        sharedContainer = null;
        log('[renderPin] Destroyed singleton container');
    }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
    // Check cache first
    if (imageCache.has(src)) {
        // LRU: Refresh key position by deleting and re-adding (moves to end)
        const img = imageCache.get(src)!;
        imageCache.delete(src);
        imageCache.set(src, img);
        return img;
    }

    // Evict oldest entry if cache is full
    if (imageCache.size >= MAX_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value;
        if (firstKey) imageCache.delete(firstKey);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

export function clearImageCache(): void {
    imageCache.clear();
}

// ============================================
// Replace Dynamic Fields in Text
// ============================================
function replaceDynamicFields(
    text: string,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): string {
    let result = text;

    // Replace {{field}} patterns with actual values
    // BUG-018 fix: Use broader regex to match fields with spaces, hyphens, unicode
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
        matches.forEach((match) => {
            const fieldName = match.replace(/\{\{|\}\}/g, '').trim();
            const csvColumn = fieldMapping[fieldName];
            if (csvColumn && rowData[csvColumn] !== undefined) {
                result = result.replace(match, rowData[csvColumn]);
            } else {
                // BUG-019 fix: Replace missing fields with empty string instead of leaving {{field}} visible
                result = result.replace(match, '');
            }
        });
    }

    return result;
}

// ============================================
// Get Dynamic Image URL
// ============================================
function getDynamicImageUrl(
    element: ImageElement,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping
): string {
    // Check if imageUrl contains {{field}} pattern
    const src = element.imageUrl || '';

    log('[getDynamicImageUrl] Processing element:', {
        name: element.name,
        isDynamic: element.isDynamic,
        dynamicSource: element.dynamicSource,
        imageUrl: src?.substring(0, 50) + '...',
    });
    log('[getDynamicImageUrl] Field mapping:', fieldMapping);
    log('[getDynamicImageUrl] Row data keys:', Object.keys(rowData));

    // For Canva background images, use proxy to bypass CORS
    if (element.isCanvaBackground && src) {
        log('[getDynamicImageUrl] Canva background - using proxy');
        return `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }

    // Priority 1: Check for explicit dynamic mapping
    if (element.isDynamic && element.dynamicSource) {
        log('[getDynamicImageUrl] Priority 1: isDynamic with dynamicSource:', element.dynamicSource);
        const column = fieldMapping[element.dynamicSource];
        log('[getDynamicImageUrl] Mapped to column:', column);
        if (column && rowData[column]) {
            const value = rowData[column];
            log('[getDynamicImageUrl] Column value:', value?.substring(0, 50) + '...');
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                log('[getDynamicImageUrl] → Returning Priority 1 URL');
                return value;
            }
        }
    }

    // Priority 2: Check if imageUrl contains {{field}} pattern
    if (src.includes('{{')) {
        log('[getDynamicImageUrl] Priority 2: Found {{}} pattern in src');
        const result = replaceDynamicFields(src, rowData, fieldMapping);
        log('[getDynamicImageUrl] → Returning Priority 2 URL:', result?.substring(0, 50) + '...');
        return result;
    }

    // Priority 3: Fallback - Check element name for field mapping
    // Normalize element name by removing spaces and converting to lowercase
    const elementName = element.name.toLowerCase().replace(/\s+/g, '');
    log('[getDynamicImageUrl] Priority 3: Normalized element name:', elementName);

    for (const [field, column] of Object.entries(fieldMapping)) {
        const normalizedField = field.toLowerCase().replace(/\s+/g, '');
        log('[getDynamicImageUrl] Checking field:', field, '→ normalized:', normalizedField);

        // Check for exact match or if element name contains the normalized field
        if (elementName === normalizedField || elementName.includes(normalizedField)) {
            const value = rowData[column];
            log('[getDynamicImageUrl] Match found! Column:', column, 'Value:', value?.substring(0, 50) + '...');
            if (value && (value.startsWith('http') || value.startsWith('data:'))) {
                log('[getDynamicImageUrl] → Returning Priority 3 URL for field:', field);
                return value;
            }
        }
    }

    log('[getDynamicImageUrl] No dynamic URL found, returning original src');
    return src;
}

// ============================================
// Render Single Pin
// ============================================
export async function renderPin(
    elements: Element[],
    canvasSize: CanvasSize,
    backgroundColor: string,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping,
    quality: GenerationSettings['quality']
): Promise<{ dataUrl: string; blob: Blob }> {
    const pixelRatio = QUALITY_MAP[quality];

    // Debug logging
    log('[renderPin] Starting render with:');
    log('[renderPin] Canvas size:', canvasSize.width, 'x', canvasSize.height);
    log('[renderPin] Field mapping:', fieldMapping);
    log('[renderPin] Row data keys:', Object.keys(rowData));
    log('[renderPin] Elements count:', elements.length);

    // Log all image elements for debugging
    const imageElements = elements.filter(e => e.type === 'image');
    log('[renderPin] === IMAGE ELEMENTS DEBUG ===');
    imageElements.forEach((el, idx) => {
        const imgEl = el as ImageElement;
        log(`[renderPin] Image #${idx}:`, {
            name: imgEl.name,
            isDynamic: imgEl.isDynamic,
            dynamicSource: imgEl.dynamicSource,
            isCanvaBackground: imgEl.isCanvaBackground,
            hasImageUrl: !!imgEl.imageUrl
        });
    });
    log('[renderPin] === END IMAGE ELEMENTS DEBUG ===');

    // PERFORMANCE: Reuse singleton container/stage
    const { stage, layer } = getOrCreateRenderContext(canvasSize);

    // Add background color
    const bg = new Konva.Rect({
        x: 0,
        y: 0,
        width: canvasSize.width,
        height: canvasSize.height,
        fill: backgroundColor,
    });
    layer.add(bg);

    // Sort elements by zIndex
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    // Render each element
    for (const element of sortedElements) {
        if (!element.visible) continue;

        if (element.type === 'text') {
            const textEl = element as TextElement;

            // Step 1: Start with original text
            let text = textEl.text;

            // Step 2: Check for isDynamic and dynamicField property
            if (textEl.isDynamic && textEl.dynamicField) {
                log('[renderPin] Dynamic field found:', textEl.dynamicField);
                const csvColumn = fieldMapping[textEl.dynamicField];
                log('[renderPin] Mapped to CSV column:', csvColumn);
                if (csvColumn && rowData[csvColumn] !== undefined) {
                    text = rowData[csvColumn];
                    log('[renderPin] Replaced with:', text);
                }
            }

            // Step 3: Also check for {{field}} patterns in text
            text = replaceDynamicFields(text, rowData, fieldMapping);

            // Step 4: If still no replacement, try matching by element name
            if (text === textEl.text) {
                const elementName = textEl.name.toLowerCase();
                for (const [field, column] of Object.entries(fieldMapping)) {
                    if (elementName.includes(field.toLowerCase()) || field.toLowerCase().includes(elementName)) {
                        if (rowData[column] !== undefined) {
                            text = rowData[column];
                            log('[renderPin] Matched by name:', elementName, '->', column, '=', text);
                            break;
                        }
                    }
                }
            }

            log('[renderPin] Final text for', textEl.name, ':', text);

            const konvaText = new Konva.Text({
                x: textEl.x,
                y: textEl.y,
                width: textEl.width,
                height: textEl.height,
                text,
                fontSize: textEl.fontSize,
                fontFamily: textEl.fontFamily,
                fontStyle: textEl.fontStyle === 'bold' ? 'bold' : textEl.fontStyle === 'italic' ? 'italic' : 'normal',
                fill: textEl.fill,
                align: textEl.align,
                verticalAlign: textEl.verticalAlign,
                lineHeight: textEl.lineHeight,
                letterSpacing: textEl.letterSpacing,
                opacity: textEl.opacity,
                rotation: textEl.rotation,
            });

            // Add text shadow if enabled
            if (textEl.shadowColor && textEl.shadowBlur) {
                konvaText.shadowColor(textEl.shadowColor);
                konvaText.shadowBlur(textEl.shadowBlur);
                konvaText.shadowOffsetX(textEl.shadowOffsetX || 0);
                konvaText.shadowOffsetY(textEl.shadowOffsetY || 0);
                konvaText.shadowOpacity(textEl.shadowOpacity || 1);
            }

            // Add stroke if enabled
            if (textEl.stroke && textEl.strokeWidth) {
                konvaText.stroke(textEl.stroke);
                konvaText.strokeWidth(textEl.strokeWidth);
            }

            layer.add(konvaText);
        } else if (element.type === 'image') {
            const imageEl = element as ImageElement;
            const imageSrc = getDynamicImageUrl(imageEl, rowData, fieldMapping);

            if (imageSrc) {
                try {
                    const img = await loadImage(imageSrc);
                    const konvaImage = new Konva.Image({
                        x: imageEl.x,
                        y: imageEl.y,
                        width: imageEl.width,
                        height: imageEl.height,
                        image: img,
                        rotation: imageEl.rotation,
                        opacity: imageEl.opacity,
                    });

                    // Apply corner radius if set
                    if (imageEl.cornerRadius) {
                        konvaImage.cornerRadius(imageEl.cornerRadius);
                    }

                    layer.add(konvaImage);
                } catch (error) {
                    console.warn(`Failed to load image: ${imageSrc}`, error);
                    // Add placeholder rectangle
                    const placeholder = new Konva.Rect({
                        x: imageEl.x,
                        y: imageEl.y,
                        width: imageEl.width,
                        height: imageEl.height,
                        fill: '#f3f4f6',
                        stroke: '#d1d5db',
                        strokeWidth: 1,
                    });
                    layer.add(placeholder);
                }
            }
        }
        // Note: ShapeElement support can be added later if the Element type is extended
    }

    // Draw layer
    layer.draw();

    // Export with quality settings
    const dataUrl = stage.toDataURL({
        pixelRatio,
        mimeType: 'image/png',
    });

    // Convert to blob
    const blob = await dataUrlToBlob(dataUrl);

    // NOTE: Don't destroy stage here - it's reused (singleton pattern)

    return { dataUrl, blob };
}

// ============================================
// Data URL to Blob
// ============================================
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
}

// ============================================
// Generate Pins in Batches
// ============================================
export async function* generatePinsBatch(
    elements: Element[],
    canvasSize: CanvasSize,
    backgroundColor: string,
    csvData: Record<string, string>[],
    fieldMapping: FieldMapping,
    settings: GenerationSettings,
    startIndex: number = 0,
    onProgress?: (progress: GenerationProgress) => void
): AsyncGenerator<GeneratedPin, void, boolean | undefined> {
    const total = csvData.length;
    const errors: Array<{ rowIndex: number; error: string }> = [];
    let current = startIndex;

    while (current < total) {
        // Process batch
        const batchEnd = Math.min(current + settings.batchSize, total);
        const batchPromises: Promise<GeneratedPin | null>[] = [];

        for (let i = current; i < batchEnd; i++) {
            const rowData = csvData[i];
            const rowIndex = i;

            batchPromises.push(
                renderPin(elements, canvasSize, backgroundColor, rowData, fieldMapping, settings.quality)
                    .then(({ dataUrl, blob }) => ({
                        rowIndex,
                        dataUrl,
                        blob,
                        fileName: `pin-${rowIndex + 1}.png`,
                    }))
                    .catch((error) => {
                        errors.push({ rowIndex, error: error.message });
                        return null;
                    })
            );
        }

        // Wait for batch to complete
        const results = await Promise.all(batchPromises);

        for (const result of results) {
            if (result) {
                current++;

                // Update progress
                if (onProgress) {
                    onProgress({
                        current,
                        total,
                        percentage: Math.round((current / total) * 100),
                        status: 'generating',
                        currentPin: result,
                        errors,
                    });
                }

                // Check if pause was requested
                const shouldContinue = yield result;
                if (shouldContinue === false) {
                    // Pause requested
                    if (onProgress) {
                        onProgress({
                            current,
                            total,
                            percentage: Math.round((current / total) * 100),
                            status: 'paused',
                            errors,
                        });
                    }
                    // Clean up render context on pause
                    destroyRenderContext();
                    return;
                }
            } else {
                current++;
            }
        }

        // Small delay between batches to prevent UI freeze
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clean up render context when completed
    destroyRenderContext();

    // Completed
    if (onProgress) {
        onProgress({
            current: total,
            total,
            percentage: 100,
            status: 'completed',
            errors,
        });
    }
}

// ============================================
// Default Settings
// ============================================
export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
    batchSize: 10,
    quality: 'draft',
    pauseEnabled: true,
};
