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
import * as os from 'os';
import { calculateFitFontSize, AutoFitConfig } from '../canvas/textUtils';

// CRITICAL: Configure FontConfig for serverless environment (Vercel)
// Without this, you get: "Fontconfig error: Cannot load default config file"
// This causes custom fonts to render as box characters

// Point FontConfig to our custom config file in project root
if (!process.env.FONTCONFIG_FILE) {
    process.env.FONTCONFIG_FILE = path.resolve(process.cwd(), 'fonts.conf');
}

// Force use of FontConfig backend
if (!process.env.PANGOCAIRO_BACKEND) {
    process.env.PANGOCAIRO_BACKEND = 'fontconfig';
}

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

// Debug flag - set to false in production for performance
const DEBUG = false;

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
                console.log(`[ServerEngine:Check:Reg] Registered font: ${familyName} (${weight}, ${style}) from ${file}`);
            } catch (err) {
                console.error(`[ServerEngine:Error:Reg] Failed to register font ${file}:`, err);
            }
        }
    } catch (err) {
        console.error('[ServerEngine] Error reading fonts directory:', err);
    }
}

// Initialize fonts on module load
initializeFonts();



/**
 * Download a Google Font from the official GitHub repository (raw content)
 * Fallback strategy for serverless environments where local files are missing
 */
async function downloadGoogleFont(family: string, weight: string = 'normal', style: string = 'normal'): Promise<boolean> {
    const fontKey = `${family}-${weight}-${style}`;
    if (registeredFonts.has(fontKey)) return true;

    // Map common font names to Google Fonts GitHub directory names (usually lowercase, no spaces)
    // Most follow the pattern: "Open Sans" -> "opensans"
    const repoName = family.toLowerCase().replace(/\s+/g, '');
    
    // Map usage weights to filename patterns
    // This is a heuristic; actual filenames vary but this covers 90% of cases in OFL
    let filenamePart = '-Regular';
    if (weight === 'bold') filenamePart = '-Bold';
    else if (weight === '300') filenamePart = '-Light';
    else if (weight === '500') filenamePart = '-Medium';
    else if (weight === '700') filenamePart = '-Bold';
    else if (weight === '900') filenamePart = '-Black';
    else if (weight === '100') filenamePart = '-Thin';
    
    if (style === 'italic') {
        if (filenamePart === '-Regular') filenamePart = '-Italic';
        else filenamePart += 'Italic';
    }

    // Construct common filename variants to try
    // Google Fonts repo structure: ofl/fontname/FontName-Variant.ttf
    const familyPascalCase = family.replace(/\s+/g, ''); // "Open Sans" -> "OpenSans"
    const possibleFilenames = [
        `${familyPascalCase}${filenamePart}.ttf`,       // OpenSans-Regular.ttf
        `${family}${filenamePart}.ttf`,                   // Open Sans-Regular.ttf
        `${repoName}${filenamePart}.ttf`                  // opensans-Regular.ttf
    ];

    const baseUrl = `https://github.com/google/fonts/raw/main/ofl/${repoName}`;

    console.log(`[ServerEngine:Font] Attempting dynamic download for ${family} (${weight}, ${style})...`);

    // Try to find a valid URL
    for (const filename of possibleFilenames) {
        const url = `${baseUrl}/${filename}`;
        try {
            const success = await loadFontFromUrl(url, family);
            if (success) {
                console.log(`[ServerEngine:Font] SUCCESS: Downloaded ${family} from ${url}`);
                
                // CRITICAL: Register specific weight/style mapping
                // loadFontFromUrl registers as 'normal'/'normal' by default if we don't handle it
                // We need to ensure the system knows this specific requested weight is now available
                registeredFonts.add(fontKey);
                return true;
            }
        } catch (e) {
            // Continue to next filename variant
        }
    }

    console.warn(`[ServerEngine:Font] FAILED to download ${family}. Tried variants: ${possibleFilenames.join(', ')}`);
    return false;
}

/**
 * Get font with fallback - returns original font if registered, otherwise fallback
 * ENHANCED: Attempts dynamic download if font is missing
 */
async function getServerSafeFont(fontFamily: string, weight: string = 'normal', style: string = 'normal'): Promise<string> {
    // Check if font is registered
    const baseFamily = fontFamily.split(',')[0].trim().replace(/["']/g, '');
    
    // Check for bundled/registered fonts
    // Normalize weight/style to match registration keys
    const normWeight = weight === '700' || weight === 'bold' ? 'bold' : 'normal';
    const normStyle = style === 'italic' ? 'italic' : 'normal';
    
    const specificKey = `${baseFamily}-${normWeight}-${normStyle}`;
    const genericKey = `${baseFamily}-normal-normal`;

    if (registeredFonts.has(specificKey)) return baseFamily;
    if (registeredFonts.has(genericKey)) {
        // If we have regular but need bold, we can usually let OS/Canvas synthesize it, 
        // OR we should try to download the bold version
        if (normWeight === 'bold' && !registeredFonts.has(`${baseFamily}-bold-normal`)) {
             console.log(`[ServerEngine] Have Regular for "${baseFamily}", attempting to fetch Bold...`);
             // Fall through to download logic
        } else {
             return baseFamily;
        }
    }
    
    // Check for fonts loaded from URLs (pattern: familyName-url)
    if (registeredFonts.has(`${baseFamily}-url`)) {
        return baseFamily;
    }

    // [NEW] Attempt Dynamic Download
    // Only try for likely standard fonts (not system ones)
    const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'sans-serif', 'serif'];
    if (!systemFonts.includes(baseFamily)) {
        const downloaded = await downloadGoogleFont(baseFamily, normWeight, normStyle);
        if (downloaded) return baseFamily;
        
        // If bold failed, try downloading regular as fallback
        if (normWeight !== 'normal') {
             const downloadedReg = await downloadGoogleFont(baseFamily, 'normal', normStyle);
             if (downloadedReg) return baseFamily;
        }
    }
    
    // Fallback to system fonts logic...
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
 * Download and register a font from URL for server-side rendering
 * @param fontUrl - URL to TTF/OTF font file
 * @param familyName - Font family name to register as
 * @returns True if font was loaded successfully
 */
async function loadFontFromUrl(fontUrl: string, familyName: string): Promise<boolean> {
    const fontKey = `${familyName}-url`;
    
    // Skip if already registered
    if (registeredFonts.has(fontKey)) {
        console.log(`[ServerEngine] Font already loaded from URL: ${familyName}`);
        return true;
    }
    
    try {
        console.log(`[ServerEngine] Downloading font from URL: ${familyName} (${fontUrl})`);
        
        // Download font file
        const response = await fetch(fontUrl);
        if (!response.ok) {
            console.error(`[ServerEngine] Failed to download font: HTTP ${response.status}`);
            return false;
        }
        
        const buffer = await response.arrayBuffer();
        
        // Determine file extension from URL or content-type
        let extension = 'ttf';
        if (fontUrl.includes('.otf')) extension = 'otf';
        else if (fontUrl.includes('.woff2')) extension = 'woff2';
        else if (fontUrl.includes('.woff')) extension = 'woff';
        
        // Write to temp file (registerFont requires file path)
        // Use os.tmpdir() for cross-platform support (Windows/Linux/Vercel)
        const tempPath = path.join(os.tmpdir(), `font_${Date.now()}_${familyName.replace(/\s+/g, '_')}.${extension}`);
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        
        // Register font with node-canvas
        // IMPORTANT: Specify weight and style for proper glyph rendering
        // Extract basic weight/style from filename if possible to hint registerFont
        let weightStr = 'normal';
        let styleStr = 'normal';
        
        const lowerUrl = fontUrl.toLowerCase();
        if (lowerUrl.includes('bold')) weightStr = 'bold';
        if (lowerUrl.includes('italic')) styleStr = 'italic';

        registerFont(tempPath, { 
            family: familyName,
            weight: weightStr,
            style: styleStr
        });
        registeredFonts.add(fontKey);
        
        console.log(`[ServerEngine:Check:Net] Successfully loaded font from URL: ${familyName}`);
        return true;
    } catch (error) {
        console.error(`[ServerEngine] Failed to load font from URL:`, error);
        return false;
    }
}

/**
 * Extract unique font families from template elements
 */
function extractFontsFromElements(elements: Element[]): string[] {
    const fonts = new Set<string>();
    for (const el of elements) {
        if (el.type === 'text') {
            const textEl = el as TextElement;
            if (textEl.fontFamily) {
                // Get base family name (without fallbacks)
                const baseFamily = textEl.fontFamily.split(',')[0].trim().replace(/["']/g, '');
                fonts.add(baseFamily);
            }
        }
    }
    return Array.from(fonts);
}

// Cache for font URLs fetched from Supabase
const fontUrlCache = new Map<string, string>();

/**
 * Load custom fonts from Supabase for template elements
 * Fetches font URLs from database and registers them with node-canvas
 * 
 * @param elements - Template elements to extract fonts from
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 */
export async function loadCustomFontsForTemplate(
    elements: Element[],
    supabaseUrl: string,
    supabaseKey: string
): Promise<void> {
    const fontFamilies = extractFontsFromElements(elements);
    
    if (fontFamilies.length === 0) {
        console.log('[ServerEngine] No fonts to load from template');
        return;
    }
    
    console.log(`[ServerEngine] Loading custom fonts: ${fontFamilies.join(', ')}`);
    
    // Find fonts that aren't already registered
    const fontsToLoad = fontFamilies.filter(family => {
        const fontKey = `${family}-url`;
        return !registeredFonts.has(fontKey) && 
               !registeredFonts.has(`${family}-normal-normal`) &&
               !registeredFonts.has(`${family}-bold-normal`);
    });
    
    if (fontsToLoad.length === 0) {
        console.log('[ServerEngine] All fonts already registered');
        return;
    }
    
    // Fetch font URLs from Supabase
    for (const family of fontsToLoad) {
        // Check cache first
        if (fontUrlCache.has(family)) {
            const cachedUrl = fontUrlCache.get(family)!;
            await loadFontFromUrl(cachedUrl, family);
            continue;
        }
        
        try {
            // Query Supabase for font by family name
            const response = await fetch(
                `${supabaseUrl}/rest/v1/custom_fonts?family=eq.${encodeURIComponent(family)}&select=family,file_url`,
                {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                    }
                }
            );
            
            if (!response.ok) {
                console.warn(`[ServerEngine] Failed to fetch font from DB: ${family}`);
                continue;
            }
            
            const fonts = await response.json();
            
            if (fonts && fonts.length > 0 && fonts[0].file_url) {
                const fontUrl = fonts[0].file_url;
                fontUrlCache.set(family, fontUrl);
                await loadFontFromUrl(fontUrl, family);
            } else {
                console.log(`[ServerEngine] Font not found in DB: ${family} (will use fallback)`);
            }
        } catch (error) {
            console.error(`[ServerEngine] Error fetching font ${family}:`, error);
        }
    }
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
    
    console.log(`[ServerEngine] getDynamicImageUrl for "${element.name}": isDynamic=${element.isDynamic}, dynamicSource="${element.dynamicSource}", imageUrl="${src?.substring(0, 60)}"`);
    
    if (element.isDynamic && element.dynamicSource) {
        const col = fieldMapping[element.dynamicSource];
        console.log(`[ServerEngine]   Mapped column: "${element.dynamicSource}" -> "${col}", value in rowData: "${rowData[col]?.substring(0, 60) || 'NOT FOUND'}"`);
        if (col && rowData[col]) {
            console.log(`[ServerEngine]   Using mapped value from rowData[${col}]`);
            return rowData[col];
        }
        if (rowData[element.dynamicSource]) {
            console.log(`[ServerEngine]   Using direct value from rowData[${element.dynamicSource}]`);
            return rowData[element.dynamicSource];
        }
        console.warn(`[ServerEngine]   Dynamic source "${element.dynamicSource}" not found in rowData! Available keys: ${Object.keys(rowData).join(', ')}`);
    }
    
    if (src.includes('{{')) {
        const resolved = replaceDynamicFields(src, rowData, fieldMapping);
        console.log(`[ServerEngine]   Replaced template fields: "${resolved.substring(0, 60)}"`);
        return resolved;
    }
    
    console.log(`[ServerEngine]   Using static imageUrl: "${src.substring(0, 60)}"`);
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
 * Calculate optimal font size to fit text within container (server-side)
 * Uses Fabric.js Textbox for ACCURATE measurement - same as client-side
 * Binary search finds the LARGEST font that fits within container height
 * 
 * Enhancements:
 * - 15px internal padding on all sides for visual breathing room
 * - Lower default maxFontSize (48px) for better visual consistency across pins
 */
/**
 * Local calculateFitFontSizeServer removed - imported from ../canvas/textUtils
 */

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

        // Load custom font from URL if available (for server-side rendering)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fontUrl = (textEl as any).fontUrl;
        if (fontUrl && textEl.fontFamily) {
            console.log(`[ServerEngine] TEXT: Loading custom font from URL: ${textEl.fontFamily}`);
            await loadFontFromUrl(fontUrl, textEl.fontFamily);
        }

        // CRITICAL: Get safe font FIRST, use same font for measurement AND rendering
        // [UPDATE] Await the font resolution since it might involve a download
        const fontWeight = textEl.fontWeight || (textEl.fontStyle?.includes('bold') ? 'bold' : 'normal');
        const fontStyle = textEl.fontStyle?.includes('italic') ? 'italic' : 'normal';
        
        const safeFontFamily = await getServerSafeFont(textEl.fontFamily || 'Arial', String(fontWeight), fontStyle);
        
        // Calculate font size - use auto-fit if enabled
        let fontSize = textEl.fontSize || 16;
        
        // DEBUG: Log autoFitText status
        console.log(`[ServerEngine] TEXT: autoFitText=${textEl.autoFitText}, width=${textEl.width}, height=${textEl.height}`);
        
        if (textEl.autoFitText && text && textEl.width && textEl.height) {
            const config: AutoFitConfig = {
                containerWidth: textEl.width,
                containerHeight: textEl.height,
                minFontSize: textEl.minFontSize || 8,
                maxFontSize: textEl.maxFontSize || 48,
                padding: textEl.autoFitPadding ?? 15
            };
            
            // Log font being used for calc to catch mismatches
            console.log(`[ServerEngine:Diagnostic] AutoFit Calculation: Font "${safeFontFamily}" (REQ: "${textEl.fontFamily}")`);

            const measureHeight = (size: number): number => {
                const testTextbox = new Textbox(text, {
                    width: config.containerWidth - (config.padding * 2),
                    fontSize: size,
                    fontFamily: safeFontFamily,
                    fontWeight: textEl.fontWeight || 400,
                    lineHeight: textEl.lineHeight || 1.2,
                    charSpacing: (textEl.letterSpacing || 0) * 10,
                });
                return testTextbox.height || 0;
            };

            fontSize = calculateFitFontSize(text, config, measureHeight);
            console.log(`[ServerEngine] TEXT: Auto-fit font size calculated: ${fontSize} (original: ${textEl.fontSize}, max: ${textEl.maxFontSize || 48})`);
        }

        const textbox = new Textbox(text, {
            ...commonOptions,
            width: textEl.width,
            fontSize: fontSize,
            fontFamily: safeFontFamily,  // Use SAME font as measurement
            fill: textEl.hollowText ? 'transparent' : (textEl.fill || '#000000'),
            textAlign: textEl.align || 'left',
            lineHeight: textEl.lineHeight || 1.2,
            charSpacing: (textEl.letterSpacing || 0) * 10,
            // Font weight: For custom fonts, use native weight from font file (don't synthetic weight)
            // For other fonts, use fontWeight property (100-900), fallback to fontStyle for backward compatibility
            fontWeight: textEl.fontProvider === 'custom' ? 'normal' : (textEl.fontWeight || (textEl.fontStyle?.includes('bold') ? 'bold' : 'normal')),
            fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
            underline: textEl.textDecoration === 'underline',
            linethrough: textEl.textDecoration === 'line-through',
            // NOTE: splitByGrapheme removed to prevent ugly mid-word breaks like "CHI-CKEN"
            // Word-boundary wrapping is preferred for marketing text
        });
        // NOTE: clipPath removed - it caused display issues with Fabric.js 6.x\n        // The calculateFitFontSizeServer function already ensures text fits within container

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
