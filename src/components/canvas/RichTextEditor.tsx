'use client';

/**
 * RichTextEditor Component
 * 
 * Modal overlay for rich text editing with per-character formatting.
 * Opens when user double-clicks a text element in rich text mode.
 * 
 * @module components/canvas/RichTextEditor
 */

import React, { memo, useEffect, useRef, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { TextElement } from '@/types/editor';
import { useRichTextEditor } from '@/hooks/useRichTextEditor';
import { TextStyleToolbar } from '@/components/ui/TextStyleToolbar';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface RichTextEditorProps {
    /** The text element being edited */
    element: TextElement;
    /** Whether the editor is open */
    isOpen: boolean;
    /** Position for the editor modal */
    position: { x: number; y: number };
    /** Callback when editor is closed */
    onClose: () => void;
    /** Callback to update element properties */
    onUpdate: (updates: Partial<TextElement>) => void;
    /** Zoom level for positioning */
    zoom?: number;
}

// ============================================
// Component
// ============================================

export const RichTextEditor = memo(function RichTextEditor({
    element,
    isOpen,
    position,
    onClose,
    onUpdate,
    zoom = 1,
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Use the rich text editor hook
    const {
        localText,
        selection,
        handleTextChange,
        handleSelectionChange,
        toggleBold,
        toggleItalic,
        toggleUnderline,
        toggleStrikethrough,
        setTextColor,
        setFontSize,
        clearFormatting,
        isBold,
        isItalic,
        isUnderlined,
        isStrikethrough,
        currentColor,
        currentFontSize,
        announcement,
        commit,
        cancel,
        hasChanges,
    } = useRichTextEditor({
        element,
        onUpdate,
    });
    
    // Focus textarea on open
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
            // Select all text initially
            textareaRef.current.select();
        }
    }, [isOpen]);
    
    // Handle selection changes in textarea
    const handleSelect = useCallback(() => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            handleSelectionChange(start, end);
        }
    }, [handleSelectionChange]);
    
    // Handle text input
    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleTextChange(e.target.value);
    }, [handleTextChange]);
    
    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Escape to close
        if (e.key === 'Escape') {
            cancel();
            onClose();
            return;
        }
        
        // Enter with Ctrl/Cmd to save and close
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commit();
            onClose();
            return;
        }
        
        // Style shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    toggleBold();
                    break;
                case 'i':
                    e.preventDefault();
                    toggleItalic();
                    break;
                case 'u':
                    e.preventDefault();
                    toggleUnderline();
                    break;
            }
        }
    }, [cancel, commit, onClose, toggleBold, toggleItalic, toggleUnderline]);
    
    // Handle apply button
    const handleApply = useCallback(() => {
        commit();
        onClose();
    }, [commit, onClose]);
    
    // Handle cancel button
    const handleCancel = useCallback(() => {
        cancel();
        onClose();
    }, [cancel, onClose]);
    
    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
                // Don't close if clicking on the toolbar color picker etc.
                const target = e.target as HTMLElement;
                if (target.closest('[data-rich-text-toolbar]')) return;
                
                if (hasChanges) {
                    // Auto-save on click outside
                    commit();
                }
                onClose();
            }
        };
        
        if (isOpen) {
            // Delay to prevent immediate close on the same click that opened
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, hasChanges, commit, onClose]);
    
    if (!isOpen) return null;
    
    // Calculate position (ensure it stays in viewport)
    const editorStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(position.x * zoom, window.innerWidth - 400),
        top: Math.min(position.y * zoom + 50, window.innerHeight - 300),
        zIndex: 100,
    };
    
    return (
        <div
            ref={editorRef}
            style={editorStyle}
            className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-creative-2xl border border-white/50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-label="Rich Text Editor"
            aria-modal="true"
        >
            {/* Screen reader announcements (Bug #8 Fix) */}
            <div role="status" aria-live="polite" className="sr-only">
                {announcement}
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-gray-100/50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Edit Content</span>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 border-dashed animate-pulse">
                            Unsaved
                        </span>
                    )}
                    <button
                        onClick={handleCancel}
                        className="p-1.5 rounded-lg hover:bg-gray-200/50 text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Cancel"
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
            
            {/* Toolbar */}
            <div className="p-2 border-b border-gray-100" data-rich-text-toolbar>
                <TextStyleToolbar
                    isBold={isBold}
                    isItalic={isItalic}
                    isUnderlined={isUnderlined}
                    isStrikethrough={isStrikethrough}
                    currentColor={currentColor}
                    currentFontSize={currentFontSize}
                    hasSelection={!selection.isCollapsed}
                    onBoldClick={toggleBold}
                    onItalicClick={toggleItalic}
                    onUnderlineClick={toggleUnderline}
                    onStrikethroughClick={toggleStrikethrough}
                    onColorChange={setTextColor}
                    onFontSizeChange={setFontSize}
                    onClearFormatting={clearFormatting}
                />
            </div>
            
            {/* Text Area */}
            <div className="p-3">
                <textarea
                    ref={textareaRef}
                    value={localText}
                    onChange={handleInput}
                    onSelect={handleSelect}
                    onKeyUp={handleSelect}
                    onClick={handleSelect}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        'w-80 h-32 p-3 text-base border border-gray-200 rounded-lg resize-none',
                        'focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none',
                        'font-[inherit]'
                    )}
                    style={{
                        fontFamily: element.fontFamily,
                        fontSize: `${element.fontSize || 16}px`,
                    }}
                    placeholder="Enter your text..."
                    aria-label="Text content"
                />
                
                {/* Selection Info */}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                        {selection.isCollapsed
                            ? `Cursor at ${selection.start}`
                            : `Selected: ${selection.start}-${selection.end} (${selection.end - selection.start} chars)`}
                    </span>
                    <span>{localText.length} characters</span>
                </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-t border-gray-100/50">
                 {/* Keyboard Hints */}
                 <div className="text-[10px] text-gray-400 font-medium flex items-center gap-3">
                    <span title="Bold"><kbd className="font-sans px-1 bg-white border border-gray-200 rounded shadow-sm text-gray-500">Ctrl+B</kbd></span>
                    <span title="Italic"><kbd className="font-sans px-1 bg-white border border-gray-200 rounded shadow-sm text-gray-500">Ctrl+I</kbd></span>
                 </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-linear-to-br from-blue-600 to-indigo-600 text-white rounded-lg shadow-creative-sm hover:shadow-creative-md hover:scale-105 active:scale-95 transition-all"
                    >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
});

export default RichTextEditor;
