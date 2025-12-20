'use client';

import React, { useState, useMemo } from 'react';
import { Lock, Copy, Trash2, MoreHorizontal, AlertTriangle, Zap } from 'lucide-react';
import { Element } from '@/types/editor';
import { isNameDuplicate } from '@/lib/utils/nameValidation';
import { DynamicFieldPopup } from './DynamicFieldPopup';

interface ElementToolbarProps {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    zoom: number;
    isLocked: boolean;
    elementName: string;
    elementId: string;
    elementType: 'image' | 'text' | 'shape';
    isDynamic: boolean;
    dynamicFieldName?: string;
    elements: Element[];
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onMore: () => void;
    onRename: (newName: string) => void;
    onDynamicChange: (fieldName: string, isDynamic: boolean) => void;
}

/**
 * Floating action toolbar shown above selected element
 * Canva-style design with polished visuals and animations
 * Positioned 100px from top of viewport
 */
export function ElementToolbar({
    x,
    y,
    width,
    height,
    visible,
    zoom,
    isLocked,
    elementName,
    elementId,
    elementType,
    isDynamic,
    dynamicFieldName,
    elements,
    onToggleLock,
    onDuplicate,
    onDelete,
    onMore,
    onRename,
    onDynamicChange,
}: ElementToolbarProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(elementName);
    const [showDynamicPopup, setShowDynamicPopup] = useState(false);
    const [lastElementId, setLastElementId] = useState(elementId);

    // Sync editValue when a different element is selected
    // This prevents stale name from showing when switching elements
    if (lastElementId !== elementId) {
        setLastElementId(elementId);
        setEditValue(elementName);
        setIsEditing(false);
        setShowDynamicPopup(false);
    }

    // Check for duplicate using useMemo (inline calculation, no useEffect)
    const isDuplicateName = useMemo(() => {
        if (!isEditing || editValue.trim() === elementName) return false;
        return isNameDuplicate(editValue.trim(), elements, elementId);
    }, [isEditing, editValue, elementName, elements, elementId]);

    if (!visible) return null;

    // Position toolbar BELOW element for better UX (doesn't obscure element)
    const toolbarHeight = 44; // Approximate toolbar height
    const gap = 24; // Gap between toolbar and element (doubled from 12)
    
    // Use actual element height (passed from EditorCanvas)
    const elementHeight = height || 100; // Fallback if height not provided
    
    // Position BELOW the element
    const calculatedTop = (y + elementHeight) * zoom + gap;
    
    // If toolbar would go off the bottom (past 85% of viewport), position above instead
    const shouldPositionAbove = calculatedTop > window.innerHeight * 0.85;
    const yPos = shouldPositionAbove 
        ? Math.max(10, (y * zoom) - toolbarHeight - gap)
        : calculatedTop;
    
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${(x + width / 2) * zoom}px`,
        top: `${yPos}px`,
        transform: 'translateX(-50%)',
        zIndex: 1001,
        animation: 'fadeIn 150ms ease-out',
    };


    const buttonClass = `
        w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-200 ease-out
        hover:bg-gray-100/80 active:scale-95
        text-gray-600 hover:text-gray-900
    `;

    const lockedButtonClass = `
        w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-200 ease-out
        active:scale-95
        ${isLocked
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-200'
            : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
        }
    `;

    const dynamicButtonClass = `
        w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-200 ease-out
        active:scale-95
        ${isDynamic
            ? 'bg-purple-50 text-purple-600 hover:bg-purple-100 ring-1 ring-purple-200'
            : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
        }
    `;

    const deleteButtonClass = `
        w-9 h-9 rounded-lg flex items-center justify-center
        transition-all duration-200 ease-out
        active:scale-95
        text-gray-600 hover:bg-red-50 hover:text-red-600 hover:ring-1 hover:ring-red-200
    `;

    const handleStartEdit = () => {
        setEditValue(elementName);
        setIsEditing(true);
    };

    const handleFinishEdit = () => {
        // Block save if name is duplicate - revert to original
        if (isDuplicateName) {
            setEditValue(elementName);
            setIsEditing(false);
            return;
        }
        
        if (editValue.trim() && editValue !== elementName) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishEdit();
        } else if (e.key === 'Escape') {
            setEditValue(elementName);
            setIsEditing(false);
        }
    };

    // Only show dynamic button for image and text elements
    const showDynamicButton = elementType === 'image' || elementType === 'text';

    return (
        <div style={style}>
            <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-creative-lg border border-white/50 flex items-center gap-1.5 p-1.5 relative ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                {/* Rename Input */}
                {isEditing ? (
                    <div className="relative">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleFinishEdit}
                            onKeyDown={handleKeyDown}
                            className={`h-8 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 min-w-[120px] shadow-sm transition-all ${
                                isDuplicateName 
                                    ? 'border-2 border-amber-400 focus:ring-amber-400 bg-amber-50' 
                                    : 'border border-blue-200 focus:ring-blue-500 bg-white'
                            }`}
                            autoFocus
                        />
                        {isDuplicateName && (
                            <div className="absolute -top-10 left-0 flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1.5 rounded-lg border border-amber-200 whitespace-nowrap shadow-sm">
                                <AlertTriangle size={12} />
                                Name already exists
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleStartEdit}
                        className="h-9 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100/80 rounded-lg transition-colors border border-transparent hover:border-gray-200/60 truncate max-w-[150px]"
                        title="Click to rename"
                    >
                        {elementName}
                    </button>
                )}

                <div className="w-px h-5 bg-gray-200 mx-0.5" />

                {/* Dynamic Data Button - Only for image/text */}
                {showDynamicButton && (
                    <div className="relative">
                        <button
                            onClick={() => setShowDynamicPopup(!showDynamicPopup)}
                            className={dynamicButtonClass}
                            title={isDynamic ? `Dynamic: ${dynamicFieldName}` : "Make dynamic"}
                            aria-label="Configure dynamic field"
                            aria-pressed={isDynamic}
                        >
                            <Zap size={18} strokeWidth={isDynamic ? 2.5 : 2} className={isDynamic ? "fill-purple-100" : ""} />
                        </button>
                        
                        <DynamicFieldPopup
                            isOpen={showDynamicPopup}
                            onClose={() => setShowDynamicPopup(false)}
                            currentFieldName={dynamicFieldName}
                            isDynamic={isDynamic}
                            elementType={elementType as 'image' | 'text'}
                            elements={elements}
                            onSave={onDynamicChange}
                        />
                    </div>
                )}

                {/* Lock/Unlock */}
                <button
                    onClick={onToggleLock}
                    className={lockedButtonClass}
                    title={isLocked ? "Unlock" : "Lock"}
                    aria-label={isLocked ? "Unlock element" : "Lock element"}
                    aria-pressed={isLocked}
                >
                    <Lock size={18} strokeWidth={isLocked ? 2.5 : 2} className={isLocked ? "fill-blue-100" : ""} />
                </button>

                {/* Duplicate */}
                <button
                    onClick={onDuplicate}
                    className={buttonClass}
                    title="Duplicate"
                    aria-label="Duplicate element"
                >
                    <Copy size={18} strokeWidth={2} />
                </button>

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className={deleteButtonClass}
                    title="Delete"
                    aria-label="Delete element"
                >
                    <Trash2 size={18} strokeWidth={2} />
                </button>

                {/* More Options */}
                <button
                    onClick={onMore}
                    className={buttonClass}
                    title="More options"
                    aria-label="Show more options"
                    aria-haspopup="menu"
                >
                    <MoreHorizontal size={18} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
