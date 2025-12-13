'use client';

import React, { useEffect, useRef } from 'react';
import { Text, Group, Rect, TextPath } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { TextElement, DEFAULT_DUMMY_DATA } from '@/types/editor';
import { useEditorStore } from '@/stores/editorStore';
import { calculateAutoFitSizeCached } from '@/lib/utils/textAutoFit';

interface TextElementComponentProps {
    element: TextElement;
    isSelected: boolean;
    onSelect: () => void;
    onDblClick?: () => void;
    onDragMove: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: KonvaEventObject<Event>) => void;
}

export function TextElementComponent({
    element,
    isSelected,
    onSelect,
    onDblClick,
    onDragMove,
    onDragEnd,
    onTransformEnd
}: TextElementComponentProps) {
    // Separate refs for Text and TextPath - required because their types are incompatible
    const textRef = useRef<Konva.Text>(null);
    const textPathRef = useRef<Konva.TextPath>(null);
    const previewMode = useEditorStore((s) => s.previewMode);

    // Get display text based on dynamic mode
    const getDisplayText = () => {
        if (!element.isDynamic || !element.dynamicField) {
            return element.text;
        }

        if (previewMode) {
            const dummyData = DEFAULT_DUMMY_DATA as unknown as Record<string, string>;
            return dummyData[element.dynamicField] || `[${element.dynamicField}]`;
        }

        return `{{${element.dynamicField}}}`;
    };

    const displayText = getDisplayText();

    // HIGH-QUALITY TEXT RENDERING SETTINGS
    const highQualityTextProps = {
        strokeScaleEnabled: false,
        perfectDrawEnabled: true,
        shadowForStrokeEnabled: false,
        hitStrokeWidth: 0,
    };

    // Calculate curve data if enabled
    let curveData = '';
    if (element.curvedEnabled) {
        const width = element.width;
        const curveHeight = (element.curvedPower || 0) * 2;
        curveData = `M 0, ${curveHeight} Q ${width / 2}, ${-curveHeight} ${width}, ${curveHeight}`;
    }

    // Calculate auto-fit font size if enabled
    let autoFitFontSize = element.fontSize;
    if (element.autoFitText && displayText) {
        const padding = element.backgroundEnabled ? (element.backgroundPadding || 16) : 0;
        const availableWidth = Math.max(1, element.width - padding * 2);
        const availableHeight = Math.max(1, element.height - padding * 2);

        // Use cached auto-fit calculation for performance
        autoFitFontSize = calculateAutoFitSizeCached({
            text: displayText,
            maxFontSize: element.fontSize,
            minFontSize: 8,
            width: availableWidth,
            height: availableHeight,
            fontFamily: element.fontFamily,
            lineHeight: element.lineHeight,
            letterSpacing: element.letterSpacing,
            fontStyle: element.fontStyle
        });
    }

    // Common text props
    const textProps = {
        id: element.id, // ID on the text node itself for transformer? No, transformer targets the Group if background is on.
        // Actually, if background is on, the Group gets the ID/Transform props.
        // If background is off, the Text node gets them.

        text: displayText,
        fontSize: element.autoFitText ? autoFitFontSize : element.fontSize,
        fontFamily: element.fontFamily,
        fontStyle: element.fontStyle,
        fill: element.fill,
        align: element.align,
        verticalAlign: element.verticalAlign,
        width: element.width,
        wrap: 'word' as const,
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing,
        textDecoration: element.textDecoration,

        // Effects
        shadowColor: element.shadowColor,
        shadowBlur: element.shadowBlur,
        shadowOffsetX: element.shadowOffsetX,
        shadowOffsetY: element.shadowOffsetY,
        shadowOpacity: element.shadowOpacity,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,

        ...highQualityTextProps,
        // Specific for TextPath
        ...(element.curvedEnabled ? {
            data: curveData,
            align: 'center' as const
        } : {})
    };

    // Update text ref for proper sizing
    useEffect(() => {
        const ref = element.curvedEnabled ? textPathRef.current : textRef.current;
        if (ref) {
            ref.getLayer()?.batchDraw();
        }
    }, [element, element.curvedEnabled]);

    const renderTextNode = (isGroupChild: boolean) => {
        // Border Box Model logic
        const padding = isGroupChild ? (element.backgroundPadding || 16) : 0;
        const textAreaWidth = Math.max(1, element.width - padding * 2);
        const textAreaHeight = Math.max(1, element.height - padding * 2);

        const commonProps = {
            ...textProps,
            // Size text to available area
            width: textAreaWidth,
            height: textAreaHeight,

            // Improved Outline Rendering: Draw fill over stroke for clean outer border
            strokeWidth: (element.strokeWidth || 0) * 2,
            fillAfterStrokeEnabled: true,

            // If it's a child of a group, positions are relative to group (padding offset)
            x: isGroupChild ? padding : element.x,
            y: isGroupChild ? padding : element.y,

            // Only attach event listeners to the root node
            draggable: !isGroupChild && !element.locked,
            rotation: isGroupChild ? 0 : element.rotation,
            opacity: isGroupChild ? 1 : element.opacity, // Opacity handled by group if exists

            // Events only if NOT in a group (Group handles them otherwise)
            ...(isGroupChild ? {} : {
                onClick: onSelect,
                onTap: onSelect,
                onDblClick: onDblClick,
                onDragMove: onDragMove,
                onDragEnd: onDragEnd,
                onTransformEnd: onTransformEnd,
                id: element.id
            })
        };

        if (element.curvedEnabled) {
            return <TextPath ref={textPathRef} {...commonProps} />;
        }
        return <Text ref={textRef} {...commonProps} />;
    };

    if (element.backgroundEnabled) {
        // Border Box Model: element.width/height IS the Group/Rect size
        const totalWidth = element.width;
        const totalHeight = element.height;

        return (
            <Group
                id={element.id}
                x={element.x}
                y={element.y}
                width={totalWidth}
                height={totalHeight}
                rotation={element.rotation}
                opacity={element.opacity}
                draggable={!element.locked}
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={onDblClick}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
                onTransformEnd={onTransformEnd}
            >
                <Rect
                    width={totalWidth}
                    height={totalHeight}
                    fill={element.backgroundColor || '#FFFFFF'}
                    cornerRadius={element.backgroundCornerRadius || 8}
                    perfectDrawEnabled={true}
                // Apply shadow to the BOX if enabled? No, user likely wants text shadow.
                // But if they want a card shadow? 
                // Current schema puts shadow on "element", which is mapped to the Text node in `textProps`.
                // We'll keep shadow on text for now as per `textProps`.
                />
                {renderTextNode(true)}
            </Group>
        );
    }

    return renderTextNode(false);
}
