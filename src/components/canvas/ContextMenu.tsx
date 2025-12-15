'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSelectionStore } from '@/stores/selectionStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useEditorStore } from '@/stores/editorStore'; // Keep for layer/alignment operations
import {
    Copy, Palette, ClipboardPaste, CopyPlus, Trash2,
    Lock, Unlock, Layers,
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical,
    ChevronRight, ArrowUpFromLine, ArrowDownFromLine, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
    x: number;
    y: number;
    isOpen: boolean;
    onClose: () => void;
}

interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    hasSubmenu?: boolean;
    isSubmenuTrigger?: boolean;
    onMouseEnter?: () => void;
}

const MenuItem = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    disabled = false,
    hasSubmenu = false,
    onMouseEnter
}: MenuItemProps) => (
    <button
        className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed group relative",
            disabled && "opacity-50"
        )}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={onMouseEnter}
    >
        <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-500" />
            <span>{label}</span>
        </div>
        {hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-400" />}
        {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
    </button>
);

export function ContextMenu({ x, y, isOpen, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

    // Selection from selectionStore
    const selectedIds = useSelectionStore((s) => s.selectedIds);
    const selectedId = selectedIds[0] || null;

    // Elements from elementsStore
    const elements = useElementsStore((s) => s.elements);
    const deleteElement = useElementsStore((s) => s.deleteElement);
    const duplicateElement = useElementsStore((s) => s.duplicateElement);
    const lockElement = useElementsStore((s) => s.lockElement);

    // Keep clipboard, layer, and alignment in editorStore for now
    const {
        clipboard, styleClipboard,
        copyElement, pasteElement, copyStyle, pasteStyle,
        moveElementForward, moveElementBackward, moveElementToFront, moveElementToBack,
        alignElement
    } = useEditorStore();

    const selectedElement = selectedId ? elements.find(el => el.id === selectedId) : null;
    const isLocked = selectedElement?.locked;
    const hasSelection = !!selectedElement;
    const canPaste = !!clipboard;
    const canPasteStyle = !!styleClipboard && selectedElement?.type === 'text';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Adjust position to keep within viewport
    // Simple logic: if x + width > window.innerWidth, shift left. 
    // Assuming menu width ~220px
    const adjustedX = x + 220 > window.innerWidth ? x - 220 : x;
    const adjustedY = y + 300 > window.innerHeight ? y - 300 : y;

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    // MenuItem moved outside

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-56 select-none"
            style={{ top: adjustedY, left: adjustedX }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Clipboard Actions */}
            <MenuItem
                icon={Copy}
                label="Copy"
                shortcut="Ctrl+C"
                disabled={!hasSelection}
                onClick={() => handleAction(copyElement)}
            />
            <MenuItem
                icon={Palette}
                label="Copy style"
                shortcut="Ctrl+Alt+C"
                disabled={!hasSelection || selectedElement?.type !== 'text'}
                onClick={() => handleAction(copyStyle)}
            />
            {canPasteStyle && (
                <MenuItem
                    icon={Palette}
                    label="Paste style"
                    disabled={!hasSelection || selectedElement?.type !== 'text'}
                    onClick={() => handleAction(pasteStyle)}
                />
            )}
            <MenuItem
                icon={ClipboardPaste}
                label="Paste"
                shortcut="Ctrl+V"
                disabled={!canPaste}
                onClick={() => handleAction(pasteElement)}
            />
            <MenuItem
                icon={CopyPlus}
                label="Duplicate"
                shortcut="Ctrl+D"
                disabled={!hasSelection}
                onClick={() => handleAction(() => selectedId && duplicateElement(selectedId))}
            />
            <MenuItem
                icon={Trash2}
                label="Delete"
                shortcut="Del"
                disabled={!hasSelection}
                onClick={() => handleAction(() => selectedId && deleteElement(selectedId))}
            />

            <div className="h-px bg-gray-100 my-1" />

            {/* State Actions */}
            <MenuItem
                icon={isLocked ? Unlock : Lock}
                label={isLocked ? "Unlock" : "Lock"}
                shortcut="Alt+Shift+L"
                disabled={!hasSelection}
                onClick={() => handleAction(() => selectedId && lockElement(selectedId, !isLocked))}
            />

            <div className="h-px bg-gray-100 my-1" />

            {/* Layer Submenu */}
            <div
                className="relative"
                onMouseEnter={() => setHoveredSubmenu('layer')}
                onMouseLeave={() => setHoveredSubmenu(null)}
            >
                <MenuItem
                    icon={Layers}
                    label="Layer"
                    hasSubmenu
                    disabled={!hasSelection}
                />

                {hoveredSubmenu === 'layer' && hasSelection && (
                    <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        <MenuItem
                            icon={ArrowUp}
                            label="Bring forward"
                            shortcut="Ctrl+]"
                            onClick={() => handleAction(() => selectedId && moveElementForward(selectedId))}
                        />
                        <MenuItem
                            icon={ArrowUpFromLine}
                            label="Bring to front"
                            shortcut="Ctrl+Alt+]"
                            onClick={() => handleAction(() => selectedId && moveElementToFront(selectedId))}
                        />
                        <MenuItem
                            icon={ArrowDown}
                            label="Send backward"
                            shortcut="Ctrl+["
                            onClick={() => handleAction(() => selectedId && moveElementBackward(selectedId))}
                        />
                        <MenuItem
                            icon={ArrowDownFromLine}
                            label="Send to back"
                            shortcut="Ctrl+Alt+["
                            onClick={() => handleAction(() => selectedId && moveElementToBack(selectedId))}
                        />
                    </div>
                )}
            </div>

            {/* Align Submenu */}
            <div
                className="relative"
                onMouseEnter={() => setHoveredSubmenu('align')}
                onMouseLeave={() => setHoveredSubmenu(null)}
            >
                <MenuItem
                    icon={AlignLeft}
                    label="Align to page"
                    hasSubmenu
                    disabled={!hasSelection}
                />

                {hoveredSubmenu === 'align' && hasSelection && (
                    <div className="absolute left-full bottom-0 ml-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        <MenuItem
                            icon={AlignLeft}
                            label="Left"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'left'))}
                        />
                        <MenuItem
                            icon={AlignCenter}
                            label="Center"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'center'))}
                        />
                        <MenuItem
                            icon={AlignRight}
                            label="Right"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'right'))}
                        />
                        <div className="h-px bg-gray-100 my-1" />
                        <MenuItem
                            icon={AlignStartVertical}
                            label="Top"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'top'))}
                        />
                        <MenuItem
                            icon={AlignCenter}
                            label="Middle"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'middle'))}
                        />
                        <MenuItem
                            icon={AlignEndVertical}
                            label="Bottom"
                            onClick={() => handleAction(() => selectedId && alignElement(selectedId, 'bottom'))}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
