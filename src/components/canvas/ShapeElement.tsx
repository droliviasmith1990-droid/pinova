'use client';

import React, { useRef, useEffect } from 'react';
import { Rect, Circle, Line, Arrow, Group, Path } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { ShapeElement as ShapeElementType } from '@/types/editor';

interface ShapeElementComponentProps {
    element: ShapeElementType;
    isSelected: boolean;
    onSelect?: () => void;
    onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
    onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
    onTransformEnd?: (e: KonvaEventObject<Event>) => void;
}

export function ShapeElementComponent({
    element,
    isSelected,
    onSelect,
    onDragMove,
    onDragEnd,
    onTransformEnd
}: ShapeElementComponentProps) {
    const shapeRef = useRef<any>(null);

    const commonProps = {
        ref: shapeRef,
        x: element.x,
        y: element.y,
        rotation: element.rotation,
        opacity: element.opacity,
        draggable: !element.locked,
        onClick: onSelect,
        onTap: onSelect,
        onDragMove,
        onDragEnd,
        onTransformEnd,
        id: element.id,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
    };

    switch (element.shapeType) {
        case 'rect':
            return (
                <Rect
                    {...commonProps}
                    width={element.width}
                    height={element.height}
                    cornerRadius={element.cornerRadius || 0}
                />
            );

        case 'circle':
            return (
                <Circle
                    {...commonProps}
                    x={element.x + element.width / 2}
                    y={element.y + element.height / 2}
                    radius={Math.min(element.width, element.height) / 2}
                />
            );

        case 'line':
            const linePoints = element.points || [0, 0, element.width, 0];
            return (
                <Line
                    {...commonProps}
                    points={linePoints}
                    lineCap="round"
                    lineJoin="round"
                />
            );

        case 'arrow':
            const arrowPoints = element.points || [0, element.height / 2, element.width, element.height / 2];
            return (
                <Arrow
                    {...commonProps}
                    points={arrowPoints}
                    pointerLength={10}
                    pointerWidth={10}
                    lineCap="round"
                    lineJoin="round"
                />
            );

        case 'path':
            // Use effect to cache complex paths for better performance
            useEffect(() => {
                if (shapeRef.current && element.name?.includes('Merged Path')) {
                    shapeRef.current.cache();
                }
            }, [element.pathData]);

            return (
                <Path
                    {...commonProps}
                    data={element.pathData || ''}
                    lineCap={element.strokeLineCap || 'butt'}
                    lineJoin={element.strokeLineJoin || 'miter'}
                    dash={element.strokeDashArray}
                />
            );

        default:
            return null;
    }
}
