'use client';

import React from 'react';

interface DimensionBadgeProps {
    width: number;
    height: number;
    x: number;
    y: number;
    visible: boolean;
    zoom: number;
}

/**
 * Live dimension display badge shown during element resize
 * Shows "w: X h: Y" format on dark background like Canva
 */
export function DimensionBadge({ width, height, x, y, visible, zoom }: DimensionBadgeProps) {
    if (!visible) return null;

    // Position badge centered above the element
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${x * zoom}px`,
        top: `${(y - 30) * zoom}px`,
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'none',
    };

    return (
        <div style={style} className="animate-fade-in">
            <div className="bg-gray-900 text-white text-xs font-mono px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2">
                <span className="text-purple-300">w:</span>
                <span className="font-semibold">{Math.round(width)}</span>
                <span className="text-purple-300">h:</span>
                <span className="font-semibold">{Math.round(height)}</span>
            </div>
        </div>
    );
}
