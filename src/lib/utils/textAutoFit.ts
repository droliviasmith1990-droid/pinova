/**
 * Optimized Text Auto-Fit Utility
 * Calculates optimal font size to fit text within a bounding box
 * Uses shared canvas to prevent garbage collection churn
 */

export interface AutoFitOptions {
    text: string;
    maxFontSize: number;
    minFontSize?: number;
    width: number;
    height: number;
    fontFamily: string;
    lineHeight: number;
    letterSpacing?: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    fontStyle?: string; // e.g., 'normal', 'bold', 'italic', 'bold italic'
}

// [OPTIMIZATION] Reuse a single canvas instance to prevent garbage collection churn
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D | null {
    if (typeof window === 'undefined') return null;
    if (!sharedCanvas) {
        sharedCanvas = document.createElement('canvas');
        sharedCtx = sharedCanvas.getContext('2d', { alpha: false }); // Optimize for text measurement
    }
    return sharedCtx;
}

/**
 * Calculate the optimal font size that fits text in the given box
 * Uses binary search for efficient calculation
 */
export function calculateAutoFitSize(options: AutoFitOptions): number {
    const {
        text,
        maxFontSize,
        minFontSize = 8,
        width,
        height,
        fontFamily,
        lineHeight,
        letterSpacing = 0,
        fontStyle = 'normal'
    } = options;

    // Empty text defaults to max size
    if (!text || text.trim() === '') {
        return maxFontSize;
    }

    const ctx = getContext();
    if (!ctx) return maxFontSize;

    // [OPTIMIZATION] Fast Check: If minFontSize doesn't fit, don't search
    if (!textFitsInBox(ctx, text, minFontSize, width, height, fontFamily, lineHeight, letterSpacing, fontStyle)) {
        return minFontSize;
    }

    let low = minFontSize;
    let high = maxFontSize;
    let bestFit = minFontSize;

    // Binary search for optimal size
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);

        if (textFitsInBox(ctx, text, mid, width, height, fontFamily, lineHeight, letterSpacing, fontStyle)) {
            bestFit = mid;
            low = mid + 1; // Try larger
        } else {
            high = mid - 1; // Try smaller
        }
    }

    return bestFit;
}

/**
 * Check if text fits within the given box at specified font size
 * [OPTIMIZATION] Quick width check for single words to avoid unnecessary wrapping calculations
 */
function textFitsInBox(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    maxWidth: number,
    maxHeight: number,
    fontFamily: string,
    lineHeight: number,
    letterSpacing: number,
    fontStyle: string
): boolean {
    ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

    // Split text into words
    const words = text.split(' ');

    // [OPTIMIZATION] Quick width check: if any single word is too wide, fail fast
    for (const word of words) {
        const wordWidth = ctx.measureText(word).width + (letterSpacing * word.length);
        if (wordWidth > maxWidth) return false;
    }

    // Count lines using optimized loop (no array allocations)
    let lines = 1;
    let currentLineWidth = 0;
    const spaceWidth = ctx.measureText(' ').width + letterSpacing;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = ctx.measureText(word).width + (letterSpacing * word.length);

        if (currentLineWidth + wordWidth <= maxWidth) {
            currentLineWidth += wordWidth + spaceWidth;
        } else {
            lines++;
            currentLineWidth = wordWidth + spaceWidth;
        }
    }

    // Check if total height fits
    const totalHeight = lines * (fontSize * lineHeight);
    return totalHeight <= maxHeight;
}

/**
 * Measure text dimensions at a specific font size
 */
export function measureText(
    text: string,
    fontSize: number,
    fontFamily: string,
    lineHeight: number,
    maxWidth: number,
    letterSpacing: number = 0
): { width: number; height: number; lines: number } {
    const ctx = getContext();
    if (!ctx) return { width: 0, height: 0, lines: 0 };

    ctx.font = `${fontSize}px ${fontFamily}`;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let maxLineWidth = 0;

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        const textWidth = metrics.width + (letterSpacing * testLine.length);

        if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            const lineMetrics = ctx.measureText(currentLine);
            maxLineWidth = Math.max(maxLineWidth, lineMetrics.width);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
        const lineMetrics = ctx.measureText(currentLine);
        maxLineWidth = Math.max(maxLineWidth, lineMetrics.width);
    }

    return {
        width: maxLineWidth,
        height: lines.length * fontSize * lineHeight,
        lines: lines.length
    };
}

/**
 * Cache for auto-fit calculations to improve performance
 * Uses LRU eviction strategy
 */
class AutoFitCache {
    private cache = new Map<string, number>();
    private maxSize = 100;

    getCacheKey(options: AutoFitOptions): string {
        const align = options.align ?? 'left';
        return `${options.text}-${options.width}-${options.height}-${options.maxFontSize}-${options.fontFamily}-${align}`;
    }

    get(options: AutoFitOptions): number | undefined {
        const key = this.getCacheKey(options);
        const value = this.cache.get(key);
        if (value !== undefined) {
            // LRU: move to end
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(options: AutoFitOptions, size: number): void {
        const key = this.getCacheKey(options);

        // Clear oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, size);
    }

    clear(): void {
        this.cache.clear();
    }
}

export const autoFitCache = new AutoFitCache();

/**
 * Calculate auto-fit size with caching
 */
export function calculateAutoFitSizeCached(options: AutoFitOptions): number {
    const cached = autoFitCache.get(options);
    if (cached !== undefined) {
        return cached;
    }

    const size = calculateAutoFitSize(options);
    autoFitCache.set(options, size);
    return size;
}
