'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Command, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Delete, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutGroup {
    title: string;
    shortcuts: {
        keys: string[];
        description: string;
    }[];
}

const shortcutGroups: ShortcutGroup[] = [
    {
        title: 'General',
        shortcuts: [
            { keys: ['Ctrl', 'S'], description: 'Save template' },
            { keys: ['Ctrl', 'Z'], description: 'Undo' },
            { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
            { keys: ['Ctrl', 'N'], description: 'New template' },
            { keys: ['?'], description: 'Show keyboard shortcuts' },
        ],
    },
    {
        title: 'Canvas',
        shortcuts: [
            { keys: ['Space'], description: 'Hold to pan canvas' },
            { keys: ['Scroll'], description: 'Zoom in/out' },
            { keys: ['Ctrl', '0'], description: 'Reset zoom to fit' },
            { keys: ['Ctrl', '+'], description: 'Zoom in' },
            { keys: ['Ctrl', '-'], description: 'Zoom out' },
        ],
    },
    {
        title: 'Elements',
        shortcuts: [
            { keys: ['Delete'], description: 'Delete selected element' },
            { keys: ['Backspace'], description: 'Delete selected element' },
            { keys: ['Ctrl', 'D'], description: 'Duplicate element' },
            { keys: ['Ctrl', 'C'], description: 'Copy element' },
            { keys: ['Ctrl', 'V'], description: 'Paste element' },
            { keys: ['Escape'], description: 'Deselect all' },
        ],
    },
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['↑', '↓', '←', '→'], description: 'Move element by 1px' },
            { keys: ['Shift', '↑', '↓', '←', '→'], description: 'Move element by 10px' },
        ],
    },
];

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function KeyBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-gray-100 border border-gray-300 rounded-md text-xs font-medium text-gray-700 shadow-sm">
            {children}
        </span>
    );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    // Handle escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Command className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
                            <p className="text-sm text-gray-500">Speed up your workflow</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 max-h-[calc(85vh-80px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {shortcutGroups.map((group) => (
                            <div key={group.title} className="space-y-3">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {group.title}
                                </h3>
                                <div className="space-y-2">
                                    {group.shortcuts.map((shortcut, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-sm text-gray-700">{shortcut.description}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, keyIdx) => (
                                                    <React.Fragment key={keyIdx}>
                                                        <KeyBadge>{key}</KeyBadge>
                                                        {keyIdx < shortcut.keys.length - 1 && (
                                                            <span className="text-gray-400 text-xs">+</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Tip */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Press</span>
                            <KeyBadge>?</KeyBadge>
                            <span>anytime to show this panel</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Hook to manage keyboard shortcuts modal
export function useKeyboardShortcutsModal() {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Listen for '?' key to open modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                toggle();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);

    return { isOpen, open, close, toggle };
}
