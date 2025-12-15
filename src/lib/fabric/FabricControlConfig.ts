/**
 * Canva-Style Fabric.js Control Configuration
 * Customizes selection appearance with purple borders, white circular handles,
 * and professional styling matching Canva's interface.
 */

import * as fabric from 'fabric';

// Canva-style colors
export const SELECTION_COLORS = {
    // Active selection (clicked)
    activeBorder: '#8B5CF6',      // Vivid purple
    activeHandle: '#FFFFFF',       // White fill
    activeHandleBorder: '#8B5CF6', // Purple border

    // Hover preview (mouse over)
    hoverBorder: '#C4B5FD',        // Light purple/lavender

    // Rotate handle
    rotateBorder: '#8B5CF6',
    rotateBackground: '#FFFFFF',
};

// Handle sizes
export const CONTROL_SIZES = {
    cornerSize: 12,           // Corner handle diameter
    transparentCorners: false,
    borderWidth: 3,           // Selection border thickness
    padding: 0,               // Padding around selection
};

/**
 * Apply Canva-style controls to all Fabric objects
 * Call this once when canvas is initialized
 */
export function applyCanvaStyleControls(canvas: fabric.Canvas) {
    // Set default object controls styling on prototype (for NEW objects)
    fabric.FabricObject.prototype.set({
        // Selection border
        borderColor: SELECTION_COLORS.activeBorder,
        borderScaleFactor: CONTROL_SIZES.borderWidth,

        // Corner handles
        cornerColor: SELECTION_COLORS.activeHandle,
        cornerStrokeColor: SELECTION_COLORS.activeHandleBorder,
        cornerSize: CONTROL_SIZES.cornerSize,
        cornerStyle: 'circle',  // Circular handles like Canva
        transparentCorners: CONTROL_SIZES.transparentCorners,

        // Padding
        padding: CONTROL_SIZES.padding,
    });

    // Custom control rendering for better appearance
    const renderCircleControl = (
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: unknown,
        fabricObject: fabric.FabricObject
    ) => {
        const size = fabricObject.cornerSize || CONTROL_SIZES.cornerSize;
        ctx.save();
        ctx.fillStyle = SELECTION_COLORS.activeHandle;
        ctx.strokeStyle = SELECTION_COLORS.activeHandleBorder;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    };

    // Apply custom render to all control types (with safety check)
    const prototypeControls = fabric.FabricObject.prototype.controls;
    if (prototypeControls) {
        const controlKeys = ['tl', 'tr', 'bl', 'br', 'mt', 'mb', 'ml', 'mr'];
        controlKeys.forEach(key => {
            const control = prototypeControls[key];
            if (control) {
                control.render = renderCircleControl;
            }
        });

        // Custom rotation control (outside element, with icon)
        const mtr = prototypeControls.mtr;
        if (mtr) {
            // Position rotation handle outside the element
            mtr.offsetY = -30;
            mtr.cursorStyle = 'crosshair';
            mtr.render = (
                ctx: CanvasRenderingContext2D,
                left: number,
                top: number,
                _styleOverride: unknown,
                fabricObject: fabric.FabricObject
            ) => {
                const size = (fabricObject.cornerSize || CONTROL_SIZES.cornerSize) + 4;
                ctx.save();
                ctx.fillStyle = SELECTION_COLORS.rotateBackground;
                ctx.strokeStyle = SELECTION_COLORS.rotateBorder;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                // Draw rotation arrow icon
                ctx.strokeStyle = SELECTION_COLORS.rotateBorder;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(left, top, size / 4, -Math.PI * 0.7, Math.PI * 0.5);
                ctx.stroke();

                // Arrow head
                ctx.beginPath();
                ctx.moveTo(left + size / 6, top - size / 6);
                ctx.lineTo(left + size / 4, top - size / 8);
                ctx.lineTo(left + size / 5, top);
                ctx.stroke();

                ctx.restore();
            };
        }
    }

    // Also apply to EXISTING objects on canvas
    canvas.getObjects().forEach(obj => {
        obj.set({
            borderColor: SELECTION_COLORS.activeBorder,
            borderScaleFactor: CONTROL_SIZES.borderWidth,
            cornerColor: SELECTION_COLORS.activeHandle,
            cornerStrokeColor: SELECTION_COLORS.activeHandleBorder,
            cornerSize: CONTROL_SIZES.cornerSize,
            cornerStyle: 'circle',
            transparentCorners: CONTROL_SIZES.transparentCorners,
            padding: CONTROL_SIZES.padding,
        });
        obj.setCoords();
    });

    // Force re-render
    canvas.requestRenderAll();

    console.log('[FabricControlConfig] Applied Canva-style controls to', canvas.getObjects().length, 'existing objects');
}

/**
 * Apply hover styling to an object (light preview border)
 */
export function applyHoverStyle(obj: fabric.FabricObject) {
    obj.set({
        borderColor: SELECTION_COLORS.hoverBorder,
        borderScaleFactor: 2,
        hasControls: false,  // No handles on hover, just border
    });
    obj.setCoords();
}

/**
 * Apply full selection styling to an object (thick border + all handles)
 */
export function applySelectedStyle(obj: fabric.FabricObject) {
    obj.set({
        borderColor: SELECTION_COLORS.activeBorder,
        borderScaleFactor: CONTROL_SIZES.borderWidth,
        hasControls: true,  // Show all 8 handles
    });
    obj.setCoords();
}

/**
 * Reset object to normal state (no special styling)
 */
export function clearSelectionStyle(obj: fabric.FabricObject) {
    obj.set({
        borderColor: SELECTION_COLORS.activeBorder,
        borderScaleFactor: CONTROL_SIZES.borderWidth,
        hasControls: true,
    });
    obj.setCoords();
}
