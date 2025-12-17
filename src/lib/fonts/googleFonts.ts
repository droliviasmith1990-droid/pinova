/**
 * Google Fonts Integration Library
 * 
 * Provides a curated list of popular Google Fonts with utilities for:
 * - Loading fonts dynamically
 * - Checking font availability
 * - Getting available weights for each font
 * 
 * Uses a curated list instead of the full Google Fonts API to avoid
 * requiring an API key while covering 90%+ of use cases.
 */

/** Font weight number to name mapping */
export const FONT_WEIGHT_NAMES: Record<number, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semibold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black',
};

/** Google Font definition */
export interface GoogleFont {
    family: string;
    category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
    weights: number[];
}

/** Curated list of popular Google Fonts */
export const GOOGLE_FONTS: GoogleFont[] = [
    // Sans-serif (most popular)
    { family: 'Inter', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900] },
    { family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
    { family: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900] },
    { family: 'Montserrat', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Nunito', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Raleway', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Work Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'Outfit', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
    { family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700] },
    { family: 'Source Sans Pro', category: 'sans-serif', weights: [200, 300, 400, 600, 700, 900] },
    
    // Serif
    { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900] },
    { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900] },
    { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700] },
    { family: 'PT Serif', category: 'serif', weights: [400, 700] },
    { family: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
    { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700] },
    
    // Display
    { family: 'Bebas Neue', category: 'display', weights: [400] },
    { family: 'Oswald', category: 'display', weights: [200, 300, 400, 500, 600, 700] },
    { family: 'Anton', category: 'display', weights: [400] },
    { family: 'Permanent Marker', category: 'display', weights: [400] },
    { family: 'Abril Fatface', category: 'display', weights: [400] },
    
    // Handwriting
    { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700] },
    { family: 'Pacifico', category: 'handwriting', weights: [400] },
    { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700] },
    { family: 'Great Vibes', category: 'handwriting', weights: [400] },
    
    // Monospace
    { family: 'Roboto Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700] },
    { family: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700] },
    { family: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800] },
];

/** System fonts available on most devices */
export const SYSTEM_FONTS: GoogleFont[] = [
    { family: 'Arial', category: 'sans-serif', weights: [400, 700] },
    { family: 'Helvetica', category: 'sans-serif', weights: [300, 400, 700] },
    { family: 'Georgia', category: 'serif', weights: [400, 700] },
    { family: 'Times New Roman', category: 'serif', weights: [400, 700] },
    { family: 'Verdana', category: 'sans-serif', weights: [400, 700] },
    { family: 'Courier New', category: 'monospace', weights: [400, 700] },
    { family: 'Comic Sans MS', category: 'handwriting', weights: [400, 700] },
    { family: 'Impact', category: 'display', weights: [400] },
];

/** Track which fonts have been loaded */
const loadedFonts = new Set<string>();

/**
 * Check if a Google Font is already loaded
 */
export function isGoogleFontLoaded(family: string): boolean {
    return loadedFonts.has(family);
}

/**
 * Load a Google Font by injecting a <link> tag
 * @param family - Font family name
 * @param weights - Array of font weights to load (default: all available)
 * @returns Promise that resolves when font is loaded
 */
export async function loadGoogleFont(
    family: string,
    weights?: number[]
): Promise<void> {
    // Skip if already loaded
    if (loadedFonts.has(family)) {
        return Promise.resolve();
    }

    // Find font definition
    const fontDef = GOOGLE_FONTS.find(f => f.family === family);
    if (!fontDef) {
        console.warn(`[GoogleFonts] Font "${family}" not found in curated list`);
        return Promise.resolve();
    }

    // Use specified weights or all available
    const weightsToLoad = weights || fontDef.weights;
    const weightString = weightsToLoad.join(';');

    // Create Google Fonts URL
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightString}&display=swap`;

    // Check if link already exists
    const existingLink = document.querySelector(`link[href*="${encodeURIComponent(family)}"]`);
    if (existingLink) {
        loadedFonts.add(family);
        return Promise.resolve();
    }

    // Create and inject link
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        
        link.onload = () => {
            loadedFonts.add(family);
            console.log(`[GoogleFonts] Loaded: ${family}`);
            resolve();
        };
        
        link.onerror = () => {
            console.error(`[GoogleFonts] Failed to load: ${family}`);
            reject(new Error(`Failed to load font: ${family}`));
        };

        document.head.appendChild(link);
    });
}

/**
 * Get available weights for a font family
 */
export function getAvailableWeights(family: string): number[] {
    const googleFont = GOOGLE_FONTS.find(f => f.family === family);
    if (googleFont) return googleFont.weights;
    
    const systemFont = SYSTEM_FONTS.find(f => f.family === family);
    if (systemFont) return systemFont.weights;
    
    // Default weights for unknown fonts
    return [400, 700];
}

/**
 * Get all fonts grouped by category
 */
export function getFontsByCategory(): Record<string, GoogleFont[]> {
    const allFonts = [...GOOGLE_FONTS];
    return allFonts.reduce((acc, font) => {
        const category = font.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(font);
        return acc;
    }, {} as Record<string, GoogleFont[]>);
}

/**
 * Search fonts by name
 */
export function searchFonts(query: string): GoogleFont[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return GOOGLE_FONTS;
    
    return GOOGLE_FONTS.filter(font => 
        font.family.toLowerCase().includes(normalizedQuery)
    );
}

/**
 * Get font provider type
 */
export function getFontProvider(family: string): 'system' | 'google' | 'custom' {
    if (SYSTEM_FONTS.some(f => f.family === family)) return 'system';
    if (GOOGLE_FONTS.some(f => f.family === family)) return 'google';
    return 'custom';
}
