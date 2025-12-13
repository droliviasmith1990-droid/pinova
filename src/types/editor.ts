// Element types for the Pinterest Template Editor

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
    // Dynamic field - now supports any field name (text1, text2, etc.)
    isDynamic: boolean;
    dynamicField?: string;
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
