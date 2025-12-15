'use client';

import React from 'react';
import { RotateCcw, Lock, Copy, Trash2, MoreHorizontal } from 'lucide-react';

interface ElementToolbarProps {
    x: number;
    y: number;
    width: number;
    visible: boolean;
    zoom: number;
    isLocked: boolean;
    onRotate: () => void;
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onMore: () => void;
}

/**
 * Floating action toolbar shown above selected element
 * Like Canva's toolbar with Rotate, Lock, Duplicate, Delete, More
 */
export function ElementToolbar({
    x,
    y,
    width,
    visible,
    zoom,
    isLocked,
    onRotate,
    onToggleLock,
    onDuplicate,
    onDelete,
    onMore,
}: ElementToolbarProps) {
    if (!visible) return null;

    // Position toolbar centered above element, 15px gap
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${(x + width / 2) * zoom}px`,
        top: `${(y - 50) * zoom}px`,
        transform: 'translateX(-50%)',
        zIndex: 1001,
    };

    const buttonClass = `
        p-2 rounded-lg hover:bg-gray-100 transition-colors
        text-gray-600 hover:text-gray-900
    `;

    return (
        <div style={style} className="animate-fade-in">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex items-center gap-1 px-1 py-1">
                {/* Rotate */}
                <button
                    onClick={onRotate}
                    className={buttonClass}
                    title="Rotate"
                >
                    <RotateCcw size={18} />
                </button>

                {/* Lock/Unlock */}
                <button
                    onClick={onToggleLock}
                    className={`${buttonClass} ${isLocked ? 'bg-purple-100 text-purple-600' : ''}`}
                    title={isLocked ? "Unlock" : "Lock"}
                >
                    <Lock size={18} />
                </button>

                {/* Duplicate */}
                <button
                    onClick={onDuplicate}
                    className={buttonClass}
                    title="Duplicate"
                >
                    <Copy size={18} />
                </button>

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className={`${buttonClass} hover:bg-red-50 hover:text-red-600`}
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>

                {/* More Options */}
                <button
                    onClick={onMore}
                    className={buttonClass}
                    title="More options"
                >
                    <MoreHorizontal size={18} />
                </button>
            </div>
        </div>
    );
}
