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
        if (viewBox) {
            const [, , vbW, vbH] = viewBox.split(/[\s,]+/).map(parseFloat);
            scaleX = canvasWidth / vbW;
            scaleY = canvasHeight / vbH;
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
                    x: currentX,
                    y: currentY,
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
                const svgWidth = options?.width || canvasWidth;
                const svgHeight = options?.height || canvasHeight;

                // Calculate scaling factors
                const scaleX = canvasWidth / svgWidth;
                const scaleY = canvasHeight / svgHeight;
                const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

                console.log(`SVG dimensions: ${svgWidth}x${svgHeight}, Canvas: ${canvasWidth}x${canvasHeight}, Scale: ${scale}`);

                // Create a group from all objects to get proper positioning
                const validObjects = objects.filter(obj => obj !== null) as fabric.FabricObject[];
                const group = new fabric.Group(validObjects, {
                    left: 0,
                    top: 0,
                });

                // Scale the group
                group.scaleX = scaleX;
                group.scaleY = scaleY;

                // Ungroup to get individual scaled objects
                const ungroupedObjects = group.getObjects();

                // Calculate absolute positions for each object
                ungroupedObjects.forEach((obj, index) => {
                    if (!obj) return;

                    // Get the absolute position of the object within the scaled group
                    const matrix = obj.calcTransformMatrix();
                    const point = fabric.util.transformPoint(
                        new fabric.Point(0, 0),
                        matrix
                    );

                    // Apply group scaling to get final position
                    const finalLeft = (obj.left || 0) * scaleX + (group.width! / 2) * (scaleX - 1) + canvasWidth / 2 - (svgWidth * scaleX) / 2;
                    const finalTop = (obj.top || 0) * scaleY + (group.height! / 2) * (scaleY - 1) + canvasHeight / 2 - (svgHeight * scaleY) / 2;

                    // Get scaled dimensions
                    const bounds = obj.getBoundingRect();
                    const scaledWidth = bounds.width * scaleX;
                    const scaledHeight = bounds.height * scaleY;

                    // Get the path data if it's a path
                    let pathData = '';
                    if (obj instanceof fabric.Path) {
                        // Create a copy with scaling applied and get the path string
                        const pathArray = obj.path;
                        if (pathArray) {
                            pathData = pathArray.map(cmd => {
                                if (Array.isArray(cmd)) {
                                    // Scale the numeric values in the path command
                                    const command = String(cmd[0]);
                                    const scaledParts: string[] = [command];
                                    for (let i = 1; i < cmd.length; i++) {
                                        const value = cmd[i];
                                        if (typeof value === 'number') {
                                            // Scale X values (odd indices) and Y values (even indices)
                                            const scaledValue = i % 2 === 1 ? value * scaleX : value * scaleY;
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
                    }

                    // Get fill color - handle special cases
                    let fillColor = (obj.fill as string) || '#000000';
                    if (fillColor === 'rgb(0, 0, 0)' || fillColor === 'rgb(0,0,0)') {
                        fillColor = '#000000';
                    }

                    const element: ShapeElement = {
                        id: nanoid(),
                        name: `Element ${index + 1}`,
                        type: 'shape',
                        shapeType: obj instanceof fabric.Path ? 'path' : (obj instanceof fabric.Rect ? 'rect' : 'path'),
                        x: finalLeft,
                        y: finalTop,
                        width: scaledWidth,
                        height: scaledHeight,
                        rotation: obj.angle || 0,
                        opacity: obj.opacity ?? 1,
                        locked: lockBackground,
                        visible: true,
                        zIndex: index,
                        fill: fillColor,
                        stroke: (obj.stroke as string) || '',
                        strokeWidth: (obj.strokeWidth || 0) * scale,
                        pathData: pathData,
                    };
                    elements.push(element);
                });

                console.log(`Fabric SVG Import: Created ${elements.length} elements`);
                resolve(elements);
            }).catch((err) => {
                console.error('Fabric SVG parse error:', err);
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
                    // Fallback to image if no elements found
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
