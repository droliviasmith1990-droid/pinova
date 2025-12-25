/**
 * Shared Text Utilities
 * 
 * Centralizes text measurement and auto-fit logic to ensure consistency
 * between client-side (Fabric.js) and server-side (node-canvas/fabric).
 */

export interface AutoFitConfig {
    containerWidth: number;
    containerHeight: number;
    minFontSize: number;
    maxFontSize: number;
    padding: number;
}

export type TextMeasurementCallback = (fontSize: number) => number;

/**
 * Calculate the optimal font size to fit text within a container
 * 
 * Uses a binary search approach to find the largest font size that fits
 * within the container height, respecting the width constraint.
 * 
 * @param text The text to fit
 * @param config Configuration for constraints (width, height, min/max size, padding)
 * @param measureHeightFn Callback function that returns the height of the text at a given font size
 * @returns The optimal font size
 */
export function calculateFitFontSize(
    text: string,
    config: AutoFitConfig,
    measureHeightFn: TextMeasurementCallback
): number {
    if (!text || !config.containerWidth || !config.containerHeight) {
        return 16;
    }

    // Apply internal padding - text should not touch container edges
    const paddedWidth = config.containerWidth - (config.padding * 2);
    const paddedHeight = config.containerHeight - (config.padding * 2);

    // Ensure padded dimensions are positive
    if (paddedWidth <= 0 || paddedHeight <= 0) return config.minFontSize;

    // Additional safety margin on padded height to prevent slight overflows
    const safePaddedHeight = paddedHeight - 5;

    let low = config.minFontSize;
    let high = config.maxFontSize;
    let optimalSize = config.minFontSize;

    // Binary search: find the LARGEST font size that fits
    for (let i = 0; i < 15; i++) {
        const testSize = Math.floor((low + high) / 2);
        const textHeight = measureHeightFn(testSize);

        if (textHeight <= safePaddedHeight) {
            // Text fits! Try larger
            optimalSize = testSize;
            low = testSize + 1;
        } else {
            // Text doesn't fit, try smaller
            high = testSize - 1;
        }

        if (low > high) break;
    }

    // Optional: Verification step could be added here if we passed a verification callback
    
    return Math.max(config.minFontSize, Math.min(optimalSize, config.maxFontSize));
}
