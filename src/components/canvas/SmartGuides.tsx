'use client';

import React from 'react';
import { Line, Text, Group, Circle } from 'react-konva';
import { Guide } from '@/types/editor';

interface SmartGuidesProps {
    guides: Guide[];
    zoom: number;
    canvasWidth: number;
    canvasHeight: number;
}

/**
 * Smart Guides Component
 * Renders enhanced snapping guides with distance measurements,
 * equal spacing indicators, and alignment suggestions
 */
export function SmartGuides({ guides, zoom, canvasWidth, canvasHeight }: SmartGuidesProps) {
    return (
        <>
            {guides.map((guide, index) => {
                // Generate a unique key even if guide properties are undefined
                const key = `guide-${guide.type || 'unknown'}-${guide.position ?? 0}-${guide.guideType || 'snap'}-${index}`;

                // Determine guide color based on type
                const guideColor =
                    guide.guideType === 'spacing' ? '#10B981' : // Green for equal spacing
                        guide.guideType === 'alignment' ? '#8B5CF6' : // Purple for alignment
                            guide.guideType === 'distance' ? '#3B82F6' : // Blue for distance
                                '#FF6B9D'; // Pink for snap (default)

                const strokeWidth = 1 / zoom;
                const dashPattern = guide.guideType === 'spacing' ? [8 / zoom, 4 / zoom] : [4 / zoom, 4 / zoom];

                return (
                    <Group key={key}>
                        {/* Main guide line */}
                        <Line
                            points={guide.points}
                            stroke={guideColor}
                            strokeWidth={strokeWidth}
                            dash={dashPattern}
                            listening={false}
                            opacity={0.8}
                        />

                        {/* Distance label or equal spacing indicator */}
                        {guide.metadata?.label && (
                            <>
                                {guide.metadata.isEqualSpacing ? (
                                    // Equal spacing indicator - show "=" symbol
                                    <Group>
                                        <Circle
                                            x={guide.type === 'vertical' ? guide.position : canvasWidth / 2}
                                            y={guide.type === 'horizontal' ? guide.position : canvasHeight / 2}
                                            radius={12 / zoom}
                                            fill="#10B981"
                                            opacity={0.9}
                                            listening={false}
                                        />
                                        <Text
                                            x={guide.type === 'vertical' ? guide.position - 8 / zoom : canvasWidth / 2 - 8 / zoom}
                                            y={guide.type === 'horizontal' ? guide.position - 8 / zoom : canvasHeight / 2 - 8 / zoom}
                                            text="="
                                            fontSize={14 / zoom}
                                            fill="white"
                                            fontStyle="bold"
                                            listening={false}
                                        />
                                    </Group>
                                ) : guide.metadata.distance !== undefined ? (
                                    // Distance measurement label
                                    <Group>
                                        {/* Background for label */}
                                        <Text
                                            x={guide.type === 'vertical' ? guide.position + 5 / zoom : guide.points[0] + 5 / zoom}
                                            y={guide.type === 'horizontal' ? guide.position - 20 / zoom : guide.points[1] + 5 / zoom}
                                            text={guide.metadata.label}
                                            fontSize={11 / zoom}
                                            fill="white"
                                            padding={4 / zoom}
                                            align="center"
                                            verticalAlign="middle"
                                            listening={false}
                                            shadowColor="rgba(0,0,0,0.3)"
                                            shadowBlur={2 / zoom}
                                            shadowOffsetX={1 / zoom}
                                            shadowOffsetY={1 / zoom}
                                        />
                                        {/* Foreground text */}
                                        <Text
                                            x={guide.type === 'vertical' ? guide.position + 5 / zoom : guide.points[0] + 5 / zoom}
                                            y={guide.type === 'horizontal' ? guide.position - 20 / zoom : guide.points[1] + 5 / zoom}
                                            text={guide.metadata.label}
                                            fontSize={11 / zoom}
                                            fill={guideColor}
                                            padding={4 / zoom}
                                            align="center"
                                            verticalAlign="middle"
                                            fontStyle="bold"
                                            listening={false}
                                        />
                                    </Group>
                                ) : null}
                            </>
                        )}

                        {/* Alignment suggestion arrows (if alignment type) */}
                        {guide.guideType === 'alignment' && (
                            <Group>
                                <Circle
                                    x={guide.type === 'vertical' ? guide.position : canvasWidth / 2}
                                    y={guide.type === 'horizontal' ? guide.position : 50}
                                    radius={4 / zoom}
                                    fill={guideColor}
                                    listening={false}
                                />
                            </Group>
                        )}
                    </Group>
                );
            })}
        </>
    );
}
