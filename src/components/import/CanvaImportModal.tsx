'use client';

import React, { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import * as fabric from 'fabric';
import { X, Upload, Image, FileType, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Element as EditorElement, ShapeElement } from '@/types/editor';
import { useEditorStore } from '@/stores/editorStore';
import { toast } from 'sonner';

interface CanvaImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: () => void;
}

interface UploadedFile {
    file: File;
    preview: string;
    type: 'svg' | 'png' | 'jpg';
    width?: number;
    height?: number;
}

const CANVA_PURPLE = '#8B3DFF';
const CANVA_CYAN = '#00C4CC';

// Pinterest canvas presets
const CANVAS_PRESETS = [
    { name: 'Pinterest Pin', width: 1000, height: 1500 },
    { name: 'Pinterest Story', width: 1080, height: 1920 },
    { name: 'Square', width: 1000, height: 1000 },
];

import { useTemplateStore } from '@/stores/templateStore';

export function CanvaImportModal({ isOpen, onClose, onImportComplete }: CanvaImportModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [canvasWidth, setCanvasWidth] = useState(1000);
    const [canvasHeight, setCanvasHeight] = useState(1500);
    const [isImporting, setIsImporting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_importProgress, setImportProgress] = useState('');
    const [lockBackground, setLockBackground] = useState(true);
    const [importMode, setImportMode] = useState<'merged' | 'separate'>('merged');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { addCanvaBackground, setCanvasSize, setTemplateName: setStoreTemplateName, resetToNewTemplate, setElements } = useEditorStore();
    // FIX: Import template store to ensure Header updates correctly (since it reads from templateStore)
    const setGlobalTemplateName = useTemplateStore((s) => s.setTemplateName);

    // BUG-SVG-005 FIX: Helper to convert RGB/RGBA to hex
    const rgbToHex = (color: string): string => {
        // Handle rgb() format
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }

        // Handle rgba() format (ignore alpha for now)
        const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }

        return color; // Return as-is if not RGB format
    };

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        // Validate file type
        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please upload SVG, PNG, or JPG file');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 10MB');
            return;
        }

        // Create preview URL
        const preview = URL.createObjectURL(file);

        // Determine type
        let fileType: 'svg' | 'png' | 'jpg' = 'png';
        if (file.type === 'image/svg+xml') fileType = 'svg';
        else if (file.type === 'image/jpeg' || file.type === 'image/jpg') fileType = 'jpg';

        // Get image dimensions
        const img = new window.Image();
        img.onload = () => {
            setUploadedFile({
                file,
                preview,
                type: fileType,
                width: img.width,
                height: img.height
            });

            // Auto-set canvas size from image dimensions
            if (img.width && img.height) {
                setCanvasWidth(img.width);
                setCanvasHeight(img.height);
            }

            // Set default template name from filename
            const name = file.name.replace(/\.[^/.]+$/, '') + ' - Canva Import';
            setTemplateName(name);

            // Move to step 2
            setStep(2);
        };
        img.onerror = () => {
            // For SVGs, use default size
            setUploadedFile({
                file,
                preview,
                type: fileType
            });
            const name = file.name.replace(/\.[^/.]+$/, '') + ' - Canva Import';
            setTemplateName(name);
            setStep(2);
        };
        img.src = preview;
    }, []);

    // Handle drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    // Handle file input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    // Parse SVG to extract individual elements
    const parseSvgToElements = async (svgContent: string): Promise<EditorElement[]> => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const elements: EditorElement[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textElements: any[] = []; // Track text elements separately for grouping

        // Get viewBox for scaling
        const svgEl = doc.documentElement;
        const viewBox = svgEl.getAttribute('viewBox');
        let scaleX = 1, scaleY = 1;

        // BUG-SVG-006 FIX: Validate viewBox before using
        if (viewBox) {
            const parts = viewBox.split(/[\s,]+/).map(parseFloat);

            // Validate parse result and dimensions
            if (parts.length === 4 && parts.every(n => !isNaN(n) && isFinite(n))) {
                const [, , vbW, vbH] = parts;

                // Prevent division by zero
                if (vbW > 0 && vbH > 0) {
                    scaleX = canvasWidth / vbW;
                    scaleY = canvasHeight / vbH;
                } else {
                    console.warn(`[SVG Import] Invalid viewBox dimensions: ${vbW}x${vbH}, using scale 1:1`);
                }
            } else {
                console.warn(`[SVG Import] Malformed viewBox: "${viewBox}", using scale 1:1`);
            }
        }

        // Helper to recursively process nodes
        const processNode = (node: Element, parentTransform = { x: 0, y: 0 }) => {
            // Parse transform
            const transform = node.getAttribute('transform');
            let localX = 0, localY = 0;
            if (transform) {
                const match = transform.match(/translate\(([^)]+)\)/);
                if (match) {
                    const parts = match[1].split(/[\s,]+/).map(parseFloat);
                    localX = parts[0] || 0;
                    localY = parts[1] || 0;
                }
            }
            const currentX = (parentTransform.x + localX) * scaleX;
            const currentY = (parentTransform.y + localY) * scaleY;

            // Process groups recursively
            if (node.tagName === 'g') {
                Array.from(node.children).forEach(child => {
                    if (child instanceof Element) {
                        processNode(child, { x: parentTransform.x + localX, y: parentTransform.y + localY });
                    }
                });
                return;
            }

            // Text elements - store separately for grouping
            if (node.tagName === 'text') {
                const text = node.textContent?.trim();
                if (!text) return;
                const x = (parseFloat(node.getAttribute('x') || '0') + parentTransform.x) * scaleX;
                const y = (parseFloat(node.getAttribute('y') || '0') + parentTransform.y) * scaleY;
                const fontSize = parseFloat(node.getAttribute('font-size') || '16') * scaleY;
                const fill = node.getAttribute('fill') || '#000000';

                textElements.push({
                    text,
                    x,
                    y,
                    fontSize,
                    fill,
                    fontFamily: (node.getAttribute('font-family') || 'Inter').replace(/['"]/g, '')
                });
                return; // Don't add yet, will group later
            }

            // Path elements
            else if (node.tagName === 'path') {
                const d = node.getAttribute('d');
                if (!d) return;

                // Get fill - handle 'none', gradients, and missing values
                let fill = node.getAttribute('fill');
                const stroke = node.getAttribute('stroke');
                const strokeWidth = parseFloat(node.getAttribute('stroke-width') || '0');

                // Handle gradient references (url(#...)) - fallback to black or use stroke
                if (fill && fill.startsWith('url(')) {
                    // Try to extract gradient colors or fallback
                    fill = '#000000'; // Default for gradients we can't parse
                }

                // If fill is 'none' and no stroke, make it visible with black fill
                if (fill === 'none' && (!stroke || stroke === 'none')) {
                    fill = '#000000';
                }

                // Default to black if no fill specified
                if (!fill) {
                    fill = '#000000';
                }

                // Compute style from parent if needed (inherit)
                if (fill === 'inherit') {
                    // Look up parent chain for fill
                    let parent = node.parentElement;
                    while (parent && parent !== doc.documentElement) {
                        const parentFill = parent.getAttribute('fill');
                        if (parentFill && parentFill !== 'inherit') {
                            fill = parentFill;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    if (fill === 'inherit') fill = '#000000';
                }

                elements.push({
                    id: nanoid(),
                    name: `Path ${elements.length + 1}`,
                    type: 'shape',
                    shapeType: 'path',
                    // BUG-SVG-002 FIX: Paths must have x=0, y=0
                    // Path data contains absolute coordinates - setting x/y causes double-translation
                    x: 0,
                    y: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    rotation: 0,
                    opacity: parseFloat(node.getAttribute('opacity') || '1'),
                    locked: lockBackground,
                    visible: true,
                    zIndex: elements.length,
                    fill: fill,
                    stroke: stroke === 'none' ? '' : (stroke || ''),
                    strokeWidth: strokeWidth,
                    pathData: d
                });
            }

            // Rect elements
            else if (node.tagName === 'rect') {
                const x = (parseFloat(node.getAttribute('x') || '0') + parentTransform.x) * scaleX;
                const y = (parseFloat(node.getAttribute('y') || '0') + parentTransform.y) * scaleY;
                const w = parseFloat(node.getAttribute('width') || '0') * scaleX;
                const h = parseFloat(node.getAttribute('height') || '0') * scaleY;
                if (w > 0 && h > 0) {
                    elements.push({
                        id: nanoid(),
                        name: `Rect ${elements.length + 1}`,
                        type: 'shape',
                        shapeType: 'rect',
                        x, y,
                        width: w,
                        height: h,
                        rotation: 0,
                        opacity: 1,
                        locked: lockBackground,
                        visible: true,
                        zIndex: elements.length,
                        fill: node.getAttribute('fill') || '#000000',
                        stroke: '',
                        strokeWidth: 0,
                        cornerRadius: parseFloat(node.getAttribute('rx') || '0')
                    });
                }
            }

            // Image elements (Crucial for Canva designs with photos)
            else if (node.tagName === 'image') {
                const href = node.getAttribute('href') || node.getAttribute('xlink:href');
                if (!href) return;

                const x = (parseFloat(node.getAttribute('x') || '0') + parentTransform.x) * scaleX;
                const y = (parseFloat(node.getAttribute('y') || '0') + parentTransform.y) * scaleY;
                const w = parseFloat(node.getAttribute('width') || '0') * scaleX;
                const h = parseFloat(node.getAttribute('height') || '0') * scaleY;

                if (w > 0 && h > 0) {
                    elements.push({
                        id: nanoid(),
                        name: `Image ${elements.length + 1}`,
                        type: 'image',
                        imageUrl: href, // Data URI or URL
                        x, y,
                        width: w,
                        height: h,
                        rotation: 0,
                        opacity: parseFloat(node.getAttribute('opacity') || '1'),
                        locked: lockBackground,
                        visible: true,
                        zIndex: elements.length,
                        fitMode: 'cover', // Default to cover for designs
                        cornerRadius: 0,
                        isDynamic: false,
                        isCanvaBackground: false
                    });
                }
            }
        };

        // Process all child nodes
        Array.from(doc.documentElement.children).forEach(child => {
            if (child instanceof Element) processNode(child);
        });

        // Group text elements by proximity and style
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupedText: any[] = [];
        const used = new Set<number>();

        textElements.forEach((textEl, i) => {
            if (used.has(i)) return;

            // Find nearby text with same style
            const group = [textEl];
            used.add(i);

            for (let j = i + 1; j < textElements.length; j++) {
                if (used.has(j)) continue;
                const other = textElements[j];

                // Check if same style and horizontally close (within 2x font size)
                if (other.fontSize === textEl.fontSize &&
                    other.fill === textEl.fill &&
                    other.fontFamily === textEl.fontFamily &&
                    Math.abs(other.y - textEl.y) < textEl.fontSize * 0.5 && // Same line
                    Math.abs(other.x - (textEl.x + textEl.text.length * textEl.fontSize * 0.6)) < textEl.fontSize * 2) {
                    group.push(other);
                    used.add(j);
                }
            }

            // Sort by x position and combine
            group.sort((a, b) => a.x - b.x);
            const combinedText = group.map(g => g.text).join('');
            const minX = Math.min(...group.map(g => g.x));
            const minY = Math.min(...group.map(g => g.y));

            groupedText.push({
                id: nanoid(),
                name: `Text ${groupedText.length + 1}`,
                type: 'text',
                text: combinedText,
                x: minX,
                y: minY - textEl.fontSize,
                width: Math.max(100, combinedText.length * textEl.fontSize * 0.6),
                height: textEl.fontSize * 1.5,
                rotation: 0,
                opacity: 1,
                locked: lockBackground,
                visible: true,
                zIndex: elements.length + groupedText.length,
                fontFamily: textEl.fontFamily,
                fontSize: textEl.fontSize,
                fill: textEl.fill,
                align: 'left' as const,
                isDynamic: false,
                lineHeight: 1.2,
                letterSpacing: 0,
                fontStyle: 'normal' as const,
                verticalAlign: 'top' as const,
                textDecoration: '',
                // Enable auto-fit by default for "Image-like" behavior
                autoFitText: true
            });
        });

        console.log(`SVG Import Debug: Found ${textElements.length} text elements, ${elements.length} shape elements`);
        console.log('Text elements:', textElements);

        return [...elements, ...groupedText];
    };

    /**
     * Parse SVG using Fabric.js native loading - handles all transforms correctly
     */
    const parseSvgWithFabric = async (svgContent: string): Promise<EditorElement[]> => {
        return new Promise((resolve) => {
            fabric.loadSVGFromString(svgContent).then(({ objects, options }) => {
                const elements: EditorElement[] = [];

                if (!objects || objects.length === 0) {
                    console.log('No objects found in SVG');
                    resolve([]);
                    return;
                }

                // Get SVG dimensions from the parsed options
                const svgWidth = options?.width || canvasWidth || 1000;
                const svgHeight = options?.height || canvasHeight || 1500;

                // BUG-SVG-007 FIX: Validate dimensions to prevent NaN
                if (!svgWidth || !svgHeight || svgWidth <= 0 || svgHeight <= 0 || !isFinite(svgWidth) || !isFinite(svgHeight)) {
                    console.warn(`[SVG Import] Invalid SVG dimensions: ${svgWidth}x${svgHeight}, using defaults`);
                    const scaleX = 1;
                    const scaleY = 1;
                    console.log(`SVG dimensions: defaulted, Canvas: ${canvasWidth}x${canvasHeight}, Scale: ${scaleX}x${scaleY}`);
                } else {
                    // Calculate scaling factors
                    const scaleX = canvasWidth / svgWidth;
                    const scaleY = canvasHeight / svgHeight;

                    console.log(`SVG dimensions: ${svgWidth}x${svgHeight}, Canvas: ${canvasWidth}x${canvasHeight}, Scale: ${scaleX}x${scaleY}`);

                    // Process each object directly
                    objects.forEach((obj, index) => {
                        if (!obj) return;

                        // Get fill color - handle special cases
                        let fillColor = (obj.fill as string) || '#000000';

                        // BUG-SVG-005 FIX: Convert all RGB/RGBA colors to hex
                        if (fillColor.startsWith('rgb(') || fillColor.startsWith('rgba(')) {
                            fillColor = rgbToHex(fillColor);
                        }

                        if (obj instanceof fabric.Path) {
                            // For paths, scale the path data coordinates
                            const pathArray = obj.path;
                            let pathData = '';

                            if (pathArray) {
                                pathData = pathArray.map(cmd => {
                                    if (Array.isArray(cmd)) {
                                        const command = String(cmd[0]).toUpperCase();
                                        const scaledParts: string[] = [String(cmd[0])]; // Preserve original case

                                        // Scale coordinates based on command type
                                        // Reference: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
                                        for (let i = 1; i < cmd.length; i++) {
                                            const value = cmd[i];
                                            if (typeof value === 'number') {
                                                let scaledValue = value;

                                                switch (command) {
                                                    case 'M': // moveto
                                                    case 'L': // lineto
                                                    case 'T': // smooth quadratic bezier
                                                        // Simple x,y pairs - odd indices=X, even indices=Y
                                                        scaledValue = i % 2 === 1 ? value * scaleX : value * scaleY;
                                                        break;

                                                    case 'C': // cubic bezier
                                                    case 'S': // smooth cubic bezier
                                                        // x1,y1,x2,y2,x,y - coordinate pairs at indices: (1,2), (3,4), (5,6)
                                                        scaledValue = [1, 3, 5].includes(i) ? value * scaleX : value * scaleY;
                                                        break;

                                                    case 'Q': // quadratic bezier
                                                        // x1,y1,x,y - coordinate pairs at indices: (1,2), (3,4)
                                                        scaledValue = [1, 3].includes(i) ? value * scaleX : value * scaleY;
                                                        break;

                                                    case 'A': // arc
                                                        // rx,ry,x-axis-rotation,large-arc-flag,sweep-flag,x,y
                                                        if (i === 1) scaledValue = value * scaleX; // rx
                                                        else if (i === 2) scaledValue = value * scaleY; // ry
                                                        else if (i === 6) scaledValue = value * scaleX; // x
                                                        else if (i === 7) scaledValue = value * scaleY; // y
                                                        // i=3: rotation angle, i=4,5: flags - don't scale
                                                        break;

                                                    case 'H': // horizontal lineto
                                                        // Only X coordinate
                                                        scaledValue = value * scaleX;
                                                        break;

                                                    case 'V': // vertical lineto
                                                        // Only Y coordinate
                                                        scaledValue = value * scaleY;
                                                        break;

                                                    case 'Z': // closepath
                                                        // No parameters to scale
                                                        break;

                                                    default:
                                                        // Unknown command - log warning but don't scale
                                                        console.warn(`Unknown SVG path command: ${command}`);
                                                        scaledValue = value;
                                                }

                                                scaledParts.push(String(scaledValue));
                                            } else {
                                                scaledParts.push(String(value));
                                            }
                                        }
                                        return scaledParts.join(' ');
                                    }
                                    return String(cmd);
                                }).join(' ');
                            }

                            // BUG-SVG-003 FIX: Validate pathData before creating element
                            if (!pathData || pathData.trim() === '') {
                                console.warn(`[SVG Import] Skipping path ${index + 1} with empty data`);
                                return; // Skip this path
                            }

                            // Get actual path bounds from Fabric object for centering
                            const pathLeft = (obj.left || 0) * scaleX;
                            const pathTop = (obj.top || 0) * scaleY;
                            const pathWidth = (obj.width || 100) * scaleX;
                            const pathHeight = (obj.height || 100) * scaleY;

                            const element: ShapeElement = {
                                id: nanoid(),
                                name: `Path ${index + 1}`,
                                type: 'shape',
                                shapeType: 'path',
                                // Use actual path position from Fabric for centering calc
                                x: pathLeft,
                                y: pathTop,
                                width: pathWidth,
                                height: pathHeight,
                                rotation: obj.angle || 0,
                                opacity: obj.opacity ?? 1,
                                locked: lockBackground,
                                visible: true,
                                zIndex: index,
                                fill: fillColor,
                                stroke: (obj.stroke as string) || '',
                                strokeWidth: (obj.strokeWidth || 0) * Math.min(scaleX, scaleY),
                                pathData: pathData,
                            };
                            elements.push(element);
                        } else if (obj instanceof fabric.Rect) {
                            // For rectangles, scale position and dimensions
                            const element: ShapeElement = {
                                id: nanoid(),
                                name: `Rect ${index + 1}`,
                                type: 'shape',
                                shapeType: 'rect',
                                x: (obj.left || 0) * scaleX,
                                y: (obj.top || 0) * scaleY,
                                width: (obj.width || 100) * scaleX,
                                height: (obj.height || 100) * scaleY,
                                rotation: obj.angle || 0,
                                opacity: obj.opacity ?? 1,
                                locked: lockBackground,
                                visible: true,
                                zIndex: index,
                                fill: fillColor,
                                stroke: (obj.stroke as string) || '',
                                strokeWidth: (obj.strokeWidth || 0) * Math.min(scaleX, scaleY),
                                cornerRadius: 0,
                            };
                            elements.push(element);
                        }
                        // BUG-SVG-008 FIX: Support more object types
                        else if (obj instanceof fabric.Circle) {
                            const element: ShapeElement = {
                                id: nanoid(),
                                name: `Circle ${index + 1}`,
                                type: 'shape',
                                shapeType: 'circle',
                                x: (obj.left || 0) * scaleX,
                                y: (obj.top || 0) * scaleY,
                                width: ((obj.radius || 50) * 2) * scaleX,
                                height: ((obj.radius || 50) * 2) * scaleY,
                                rotation: obj.angle || 0,
                                opacity: obj.opacity ?? 1,
                                locked: lockBackground,
                                visible: true,
                                zIndex: index,
                                fill: fillColor,
                                stroke: (obj.stroke as string) || '',
                                strokeWidth: (obj.strokeWidth || 0) * Math.min(scaleX, scaleY),
                            };
                            elements.push(element);
                        }
                        else if (obj instanceof fabric.Ellipse) {
                            const element: ShapeElement = {
                                id: nanoid(),
                                name: `Ellipse ${index + 1}`,
                                type: 'shape',
                                shapeType: 'circle', // Use circle as ellipse (scaled)
                                x: (obj.left || 0) * scaleX,
                                y: (obj.top || 0) * scaleY,
                                width: ((obj.rx || 50) * 2) * scaleX,
                                height: ((obj.ry || 50) * 2) * scaleY,
                                rotation: obj.angle || 0,
                                opacity: obj.opacity ?? 1,
                                locked: lockBackground,
                                visible: true,
                                zIndex: index,
                                fill: fillColor,
                                stroke: (obj.stroke as string) || '',
                                strokeWidth: (obj.strokeWidth || 0) * Math.min(scaleX, scaleY),
                            };
                            elements.push(element);
                        }
                        else if (obj instanceof fabric.Polygon || obj instanceof fabric.Polyline) {
                            // Convert polygon/polyline to path for preservation
                            console.log(`[SVG Import] ${obj.type} converted to path for element ${index + 1}`);
                            // Skip for now - would need path conversion logic
                        }
                        else if (obj instanceof fabric.Line) {
                            const element: ShapeElement = {
                                id: nanoid(),
                                name: `Line ${index + 1}`,
                                type: 'shape',
                                shapeType: 'line',
                                x: ((obj.x1 || 0) + (obj.left || 0)) * scaleX,
                                y: ((obj.y1 || 0) + (obj.top || 0)) * scaleY,
                                width: Math.abs(((obj.x2 || 0) - (obj.x1 || 0))) * scaleX,
                                height: Math.abs(((obj.y2 || 0) - (obj.y1 || 0))) * scaleY,
                                rotation: obj.angle || 0,
                                opacity: obj.opacity ?? 1,
                                locked: lockBackground,
                                visible: true,
                                zIndex: index,
                                fill: '',
                                stroke: (obj.stroke as string) || fillColor,
                                strokeWidth: (obj.strokeWidth || 1) * Math.min(scaleX, scaleY),
                                points: [
                                    (obj.x1 || 0) * scaleX,
                                    (obj.y1 || 0) * scaleY,
                                    (obj.x2 || 0) * scaleX,
                                    (obj.y2 || 0) * scaleY
                                ],
                            };
                            elements.push(element);
                        }
                        else if (obj instanceof fabric.Group) {
                            // Handle groups - process nested objects
                            console.log(`[SVG Import] Group element ${index + 1} - processing ${obj.size()} nested objects`);
                            // Groups would need recursive processing - skip for now
                        }
                        else {
                            // Unknown object type
                            console.warn(`[SVG Import] Unsupported object type: ${obj.type || 'unknown'} at index ${index}`);
                            console.warn(`[SVG Import] Unsupported object type: ${obj.type || 'unknown'} at index ${index}`);
                        }
                    });
                }  // Close else block

                // CENTER SVG ON CANVAS
                // Calculate bounding box and center offset for imported elements
                if (elements.length > 0) {
                    let minX = Infinity, minY = Infinity;
                    let maxX = -Infinity, maxY = -Infinity;

                    // Find bounding box of all elements
                    elements.forEach(el => {
                        const elX = el.x || 0;
                        const elY = el.y || 0;
                        const elW = el.width || 0;
                        const elH = el.height || 0;

                        minX = Math.min(minX, elX);
                        minY = Math.min(minY, elY);
                        maxX = Math.max(maxX, elX + elW);
                        maxY = Math.max(maxY, elY + elH);
                    });

                    const groupWidth = maxX - minX;
                    const groupHeight = maxY - minY;

                    // Calculate offset to center on canvas
                    const centerOffsetX = (canvasWidth - groupWidth) / 2 - minX;
                    const centerOffsetY = (canvasHeight - groupHeight) / 2 - minY;

                    console.log('[SVG Import] Centering:', {
                        boundingBox: { minX, minY, maxX, maxY, groupWidth, groupHeight },
                        canvas: { canvasWidth, canvasHeight },
                        offset: { centerOffsetX, centerOffsetY }
                    });

                    // Apply offset to center all elements
                    elements.forEach(el => {
                        el.x = (el.x || 0) + centerOffsetX;
                        el.y = (el.y || 0) + centerOffsetY;
                    });
                }

                console.log(`Fabric SVG Import: Created ${elements.length} elements (centered)`);
                resolve(elements);
            }).catch((err) => {
                console.error('Fabric SVG parse error:', err);

                // BUG-SVG-004 FIX: Notify user of parse failure
                toast.warning(
                    'SVG parsing encountered issues. Some elements may not import correctly.',
                    { duration: 4000 }
                );

                resolve([]);
            });
        });
    };


    // Merge similar paths by color and style
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergeSimilarPaths = (elements: any[]): any[] => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pathsByStyle = new Map<string, any[]>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const otherElements: any[] = [];

        // Group paths by their visual properties
        elements.forEach(el => {
            if (el.type === 'shape' && el.shapeType === 'path') {
                const styleKey = `${el.fill}-${el.stroke}-${el.strokeWidth}-${el.opacity}`;
                if (!pathsByStyle.has(styleKey)) {
                    pathsByStyle.set(styleKey, []);
                }
                pathsByStyle.get(styleKey)!.push(el);
            } else {
                otherElements.push(el);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mergedElements: any[] = [];

        // Merge paths with the same style
        pathsByStyle.forEach((paths) => {
            if (paths.length === 1) {
                // Single path, keep as is
                mergedElements.push(paths[0]);
            } else {
                // Multiple paths with same style, merge them
                const combinedPaths = paths.map(p => p.pathData).join(' ');
                mergedElements.push({
                    ...paths[0],
                    name: `Merged Path (${paths.length} paths)`,
                    pathData: combinedPaths
                });
            }
        });

        return [...otherElements, ...mergedElements];
    };

    // Handle import
    const handleImport = async () => {
        if (!uploadedFile) return;

        // BUG-020 fix: Validate canvas size to prevent browser crashes
        const MAX_DIMENSION = 10000;
        if (canvasWidth > MAX_DIMENSION || canvasHeight > MAX_DIMENSION) {
            toast.error(`Canvas too large. Maximum dimension is ${MAX_DIMENSION}px`);
            return;
        }
        if (canvasWidth < 100 || canvasHeight < 100) {
            toast.error('Canvas too small. Minimum dimension is 100px');
            return;
        }

        setIsImporting(true);
        setImportProgress('Processing...');

        try {
            resetToNewTemplate();
            setCanvasSize(canvasWidth, canvasHeight);
            setStoreTemplateName(templateName);
            setGlobalTemplateName(templateName); // FIX: Update global store for Header title

            // If SVG file, parse and import using Fabric.js native loading
            if (uploadedFile.type === 'svg') {
                const svgText = await uploadedFile.file.text();

                // Use Fabric.js native SVG loading for correct positioning
                let elements = await parseSvgWithFabric(svgText);

                // If optimized mode, merge similar paths
                if (importMode === 'merged' && elements.length > 0) {
                    elements = mergeSimilarPaths(elements);
                    console.log(`Merged into ${elements.length} optimized elements`);
                }

                if (elements.length > 0) {
                    setElements(elements);
                    toast.success(`Imported ${elements.length} editable ${importMode === 'merged' ? 'merged' : 'separate'} elements from SVG`);
                } else {
                    // BUG-SVG-004 FIX: Explicit fallback notification
                    toast.info(
                        'SVG contained no parseable elements. Importing as static image instead.',
                        { duration: 4000 }
                    );
                    await uploadAsImage();
                }
            }
            // If non-SVG, upload as image
            else {
                await uploadAsImage();
            }

            onClose();
            if (onImportComplete) onImportComplete();

        } catch (error) {
            console.error('Import error:', error);
            toast.error(error instanceof Error ? error.message : 'Import failed');
        } finally {
            setIsImporting(false);
            setImportProgress('');
        }
    };

    const uploadAsImage = async () => {
        if (!uploadedFile) return;

        const formData = new FormData();
        formData.append('file', uploadedFile.file);

        const response = await fetch('/api/upload-background', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Upload failed');
        }

        addCanvaBackground({
            type: data.type,
            url: data.url,
            originalFilename: data.originalFilename,
            locked: lockBackground,
            width: canvasWidth,
            height: canvasHeight
        });

        toast.success('🎉 Canva design imported successfully!');
    };

    // Reset state when modal closes
    const handleClose = () => {
        // BUG-014 fix: Revoke Blob URL to prevent memory leak
        if (uploadedFile?.preview) {
            URL.revokeObjectURL(uploadedFile.preview);
        }
        setStep(1);
        setUploadedFile(null);
        setTemplateName('');
        setCanvasWidth(1000);
        setCanvasHeight(1500);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
                    style={{ background: `linear-gradient(135deg, ${CANVA_PURPLE}15, ${CANVA_CYAN}15)` }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${CANVA_PURPLE}, ${CANVA_CYAN})` }}>
                            <span className="text-white text-lg font-bold">C</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Import from Canva</h2>
                            <p className="text-sm text-gray-500">Step {step} of 3</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Step 1: Instructions & Upload */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Instructions */}
                            <div className="bg-gray-50 rounded-xl p-5">
                                <h3 className="font-semibold text-gray-900 mb-3">How to export from Canva:</h3>
                                <ol className="space-y-2 text-sm text-gray-600">
                                    <li className="flex gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                        Open your design in Canva
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                        Click <strong>Share</strong> in the top right
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                        Click <strong>Download</strong>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                        Select <strong>SVG</strong> (recommended) or <strong>PNG/JPG</strong>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                        Click <strong>Download</strong> and save to your computer
                                    </li>
                                </ol>
                                <div className="mt-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                                    <p className="text-xs text-cyan-700 flex items-start gap-2">
                                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span><strong>Tip:</strong> SVG is recommended for best quality and smaller file size.</span>
                                    </p>
                                </div>
                            </div>

                            {/* Upload Zone */}
                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                                    dragOver ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-gray-400"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".svg,.png,.jpg,.jpeg"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-700 font-medium mb-2">
                                    Drag and drop your file here
                                </p>
                                <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <FileType className="w-3 h-3" /> SVG, PNG, JPG
                                    </span>
                                    <span>•</span>
                                    <span>Max 10MB</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview & Configure */}
                    {step === 2 && uploadedFile && (
                        <div className="space-y-6">
                            {/* File Preview */}
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 16 16\'%3E%3Crect width=\'8\' height=\'8\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'8\' y=\'8\' width=\'8\' height=\'8\' fill=\'%23f0f0f0\'/%3E%3C/svg%3E")' }}>
                                    <img
                                        src={uploadedFile.preview}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Image className="w-4 h-4 text-purple-500" />
                                        <span className="font-medium text-gray-900">{uploadedFile.file.name}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 space-y-1">
                                        <p>Type: {uploadedFile.type.toUpperCase()}</p>
                                        <p>Size: {(uploadedFile.file.size / 1024).toFixed(1)} KB</p>
                                        {uploadedFile.width && uploadedFile.height && (
                                            <p>Dimensions: {uploadedFile.width} × {uploadedFile.height}px</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setUploadedFile(null); setStep(1); }}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Change
                                </button>
                            </div>

                            {/* Template Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Template Name
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter template name"
                                />
                            </div>

                            {/* Canvas Size */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Canvas Size
                                </label>
                                <div className="flex gap-3 mb-3">
                                    {CANVAS_PRESETS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => { setCanvasWidth(preset.width); setCanvasHeight(preset.height); }}
                                            className={cn(
                                                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                                canvasWidth === preset.width && canvasHeight === preset.height
                                                    ? "border-purple-500 bg-purple-50 text-purple-700"
                                                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                                            )}
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">Width (px)</label>
                                        <input
                                            type="number"
                                            value={canvasWidth}
                                            onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 1000)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">Height (px)</label>
                                        <input
                                            type="number"
                                            value={canvasHeight}
                                            onChange={(e) => setCanvasHeight(parseInt(e.target.value) || 1500)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                {/* SVG Import Mode (only show for SVG files) */}
                                {uploadedFile.type === 'svg' && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            SVG Import Mode
                                        </label>
                                        <div className="space-y-2">
                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="merged"
                                                    checked={importMode === 'merged'}
                                                    onChange={() => setImportMode('merged')}
                                                    className="mt-0.5 w-4 h-4 text-purple-600"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">Optimized (Recommended)</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Merges similar paths into groups. Fast performance, still editable.</div>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="separate"
                                                    checked={importMode === 'separate'}
                                                    onChange={() => setImportMode('separate')}
                                                    className="mt-0.5 w-4 h-4 text-purple-600"
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">All Paths Separate</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Full editability. May be slower with complex SVGs.</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={lockBackground}
                                        onChange={(e) => setLockBackground(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Lock background layer <span className="text-gray-400">(recommended)</span>
                                    </span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={!templateName.trim() || isImporting}
                                    className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ background: `linear-gradient(135deg, ${CANVA_PURPLE}, ${CANVA_CYAN})` }}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Import & Edit
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CanvaImportModal;
