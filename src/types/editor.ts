// Element types for the Pinterest Template Editor

// ============================================
// PHASE 2: Character-Level Formatting Types
// ============================================

/**
 * Character-level style definition for rich text
 * 
 * Enables per-character styling within text elements.
 * Uses absolute indices (0-based) across the entire text including newlines.
 * 
 * @example
 * // Text: "CREAMY BAKED MUSHROOM"
 * // Style "BAKED" (chars 7-11) as bold and red:
 * { id: 'style-1', start: 7, end: 11, fill: '#FF0000', fontWeight: 700 }
 */
export interface CharacterStyle {
    /** Unique ID for React keys and reference */
    id: string;
    /** Start index (inclusive, 0-based absolute position) */
    start: number;
    /** End index (inclusive, 0-based absolute position) */
    end: number;
    
    // Style properties (undefined = inherit from element defaults)
    /** Text color */
    fill?: string;
    /** Font weight (100-900) */
    fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    /** Font size in pixels */
    fontSize?: number;
    /** Font style (normal or italic) */
    fontStyle?: 'normal' | 'italic';
    /** Text decoration (underline, strikethrough, or none) */
    textDecoration?: 'underline' | 'line-through' | 'none';
    /** Background/highlight color */
    backgroundColor?: string;
}

/**
 * Text selection state for rich text editor
 * Tracks cursor position or selected range
 */
export interface TextSelection {
    /** Start index of selection (0-based) */
    start: number;
    /** End index of selection (0-based) */
    end: number;
    /** True if start === end (cursor position, no text selected) */
    isCollapsed: boolean;
}

/**
 * Fabric.js styles object structure for per-character styling
 * 
 * Fabric.js uses line-relative indices, so we need to convert
 * from absolute indices when syncing to canvas.
 * 
 * @example
 * // For text "HELLO\nWORLD" with "LO W" styled:
 * {
 *   0: { 3: { fill: 'red' }, 4: { fill: 'red' } },  // "LO" on line 0
 *   1: { 0: { fill: 'red' } }                        // "W" on line 1
 * }
 */
export interface FabricTextStyles {
    [lineIndex: number]: {
        [charIndex: number]: {
            fill?: string;
            fontWeight?: string | number;
            fontSize?: number;
            fontStyle?: string;
            textDecoration?: string;
            textBackgroundColor?: string;
        };
    };
}

// ============================================
// Core Element Types
// ============================================

export interface BaseElement {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    locked: boolean;
    visible: boolean;
    zIndex: number;
}

export interface TextElement extends BaseElement {
    type: 'text';
    text: string;
    fontFamily: string;
    fontSize: number;
    fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
    fill: string;
    align: 'left' | 'center' | 'right' | 'justify';
    verticalAlign: 'top' | 'middle' | 'bottom';
    lineHeight: number;
    letterSpacing: number;
    textDecoration: '' | 'underline' | 'line-through';
    // Effects
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    /** Hollow text - transparent fill with stroke outline */
    hollowText?: boolean;
    // Background box
    backgroundEnabled?: boolean;
    backgroundColor?: string;
    backgroundCornerRadius?: number;
    backgroundPadding?: number;
    // Curved text
    curvedEnabled?: boolean;
    curvedPower?: number;
    // Auto-fit text - shrink/grow font to fit box
    autoFitText?: boolean;
    /** Maximum font size when auto-fit is enabled (caps the upper limit) */
    maxFontSize?: number;
    /** Minimum font size when auto-fit is enabled (floors the lower limit) */
    minFontSize?: number;
    /** Internal padding for auto-fit text (prevents text from touching container edges) */
    autoFitPadding?: number;
    // Dynamic field - now supports any field name (text1, text2, etc.)
    isDynamic: boolean;
    dynamicField?: string;
    /** Preview text - shown on canvas for visualization while keeping placeholder stored */
    previewText?: string;

    
    // Typography enhancements (Phase 1)
    /** Text case transformation */
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    /** Font weight (100-900), separate from fontStyle */
    fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    /** Font provider for tracking source */
    fontProvider?: 'system' | 'google' | 'custom';
    /** Font file URL for server-side rendering (custom fonts) */
    fontUrl?: string;
    
    // Rich text enhancements (Phase 2)
    /** Enable rich text mode with per-character styling */
    richTextEnabled?: boolean;
    /** Array of character styles (only used when richTextEnabled is true) */
    characterStyles?: CharacterStyle[];
}

export interface ImageElement extends BaseElement {
    type: 'image';
    imageUrl?: string;
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;
    fitMode: 'cover' | 'contain' | 'fill';
    cornerRadius: number;
    filters?: {
        brightness?: number;
        contrast?: number;
        saturation?: number;
        blur?: number;
    };
    // Dynamic source - now supports any field name (image1, image2, etc.)
    isDynamic: boolean;
    dynamicSource?: string;
    // Flag for Canva imported background images (participates in layer ordering)
    isCanvaBackground?: boolean;
    originalFilename?: string;
}

export interface ShapeElement extends BaseElement {
    type: 'shape';
    shapeType: 'rect' | 'circle' | 'line' | 'arrow' | 'path';
    fill: string;
    stroke: string;
    strokeWidth: number;
    // For lines and arrows
    points?: number[]; // [x1, y1, x2, y2] relative to element position
    // For rect
    cornerRadius?: number;
    // For SVG paths
    pathData?: string;
    // Advanced stroke properties
    strokeLineCap?: 'butt' | 'round' | 'square';
    strokeLineJoin?: 'miter' | 'round' | 'bevel';
    strokeDashArray?: number[];
}

// Frame element for auto-layout containers (Flexbox-like)
export interface FrameElement extends BaseElement {
    type: 'frame';
    // Layout properties
    layoutDirection: 'horizontal' | 'vertical';
    layoutGap: number;
    layoutPadding: number;
    layoutAlign: 'start' | 'center' | 'end' | 'stretch';
    // Visual properties
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
    // Children element IDs (for grouping)
    childIds: string[];
}

export type Element = TextElement | ImageElement | ShapeElement | FrameElement;

export interface Guide {
    type: 'vertical' | 'horizontal';
    position: number;
    points: number[];
    // Enhanced guide types for professional snapping
    guideType?: 'snap' | 'distance' | 'spacing' | 'alignment';
    metadata?: {
        distance?: number;           // Distance in pixels between elements
        connectedElements?: string[]; // IDs of elements this guide connects
        label?: string;               // Display label (e.g., "24px", "=")
        isEqualSpacing?: boolean;     // True if showing equal spacing indicator
    };
}

export interface CanvasSize {
    width: number;
    height: number;
}

// Dynamic field metadata
export interface TemplateField {
    name: string;       // e.g., "text1", "image2"
    type: 'text' | 'image';
    layerName: string;  // Display name, e.g., "Image 1"
    elementId: string;  // ID of the associated element
    required: boolean;
}

// Background image for Canva imports


export interface Template {
    id: string;
    name: string;
    canvas_size: CanvasSize;
    background_color: string;
    elements: Element[];
    dynamic_fields?: TemplateField[];  // Dynamic fields metadata

    source?: 'native' | 'canva_import'; // Template origin
    thumbnail_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DummyData {
    title: string;
    subtitle: string;
    description: string;
    price: string;
    image: string;
    logo: string;
}

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1500;

export const DEFAULT_DUMMY_DATA: DummyData = {
    title: 'Amazing Recipe: How to Make Perfect Chocolate Cake',
    subtitle: 'Quick and easy dessert for any occasion',
    description: 'Follow this step-by-step guide to create the most delicious chocolate cake you\'ve ever tasted. Perfect for birthdays and celebrations!',
    price: '$29.99',
    image: 'https://picsum.photos/seed/pinterest1/800/1200',
    logo: 'https://picsum.photos/seed/logo1/200/200'
};
