'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export function useKeyboardShortcuts() {
    const selectedIds = useEditorStore((s) => s.selectedIds);
    const elements = useEditorStore((s) => s.elements);
    const updateElement = useEditorStore((s) => s.updateElement);
    const deleteElement = useEditorStore((s) => s.deleteElement);
    const duplicateElement = useEditorStore((s) => s.duplicateElement);
    const selectElement = useEditorStore((s) => s.selectElement);
    const undo = useEditorStore((s) => s.undo);
    const redo = useEditorStore((s) => s.redo);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    const copyElement = useEditorStore((s) => s.copyElement);
    const pasteElement = useEditorStore((s) => s.pasteElement);
    const copyStyle = useEditorStore((s) => s.copyStyle);
    const pasteStyle = useEditorStore((s) => s.pasteStyle);
    const lockElement = useEditorStore((s) => s.lockElement);

    // Get first selected element ID for convenience
    const selectedId = selectedIds[0] || null;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
                // Allow Escape key even in inputs
                if (e.key !== 'Escape') {
                    return;
                }
            }

            const isMeta = e.ctrlKey || e.metaKey;

            // Escape - Deselect
            if (e.key === 'Escape') {
                e.preventDefault();
                selectElement(null);
                return;
            }

            // Undo - Ctrl/Cmd + Z
            if (isMeta && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }

            // Redo - Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
            if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
                e.preventDefault();
                redo();
                return;
            }

            // Delete - Delete or Backspace (delete all selected)
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
                e.preventDefault();
                selectedIds.forEach(id => deleteElement(id));
                return;
            }

            // Duplicate - Ctrl/Cmd + D
            if (isMeta && e.key === 'd' && selectedId) {
                e.preventDefault();
                duplicateElement(selectedId);
                return;
            }

            // Copy - Ctrl/Cmd + C
            if (isMeta && e.key === 'c' && !e.altKey && selectedId) {
                e.preventDefault();
                copyElement();
                return;
            }

            // Paste - Ctrl/Cmd + V
            if (isMeta && e.key === 'v' && !e.altKey) {
                e.preventDefault();
                pasteElement();
                return;
            }

            // Copy Style - Ctrl/Cmd + Alt + C
            if (isMeta && e.altKey && (e.key === 'c' || e.key === 'C') && selectedId) {
                e.preventDefault();
                copyStyle();
                return;
            }

            // Paste Style - Ctrl/Cmd + Alt + V
            if (isMeta && e.altKey && (e.key === 'v' || e.key === 'V') && selectedId) {
                e.preventDefault();
                pasteStyle();
                return;
            }

            // Lock/Unlock - Alt + Shift + L
            if (e.altKey && e.shiftKey && (e.key === 'l' || e.key === 'L') && selectedId) {
                e.preventDefault();
                const element = elements.find(el => el.id === selectedId);
                if (element) {
                    lockElement(selectedId, !element.locked);
                }
                return;
            }

            // Arrow key nudging (move all selected elements)
            if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();

                const step = e.shiftKey ? 10 : 1;
                let delta: { x?: number; y?: number } = {};

                switch (e.key) {
                    case 'ArrowUp':
                        delta = { y: -step };
                        break;
                    case 'ArrowDown':
                        delta = { y: step };
                        break;
                    case 'ArrowLeft':
                        delta = { x: -step };
                        break;
                    case 'ArrowRight':
                        delta = { x: step };
                        break;
                }

                selectedIds.forEach(id => {
                    const element = elements.find((el) => el.id === id);
                    if (element && !element.locked) {
                        updateElement(id, {
                            x: element.x + (delta.x || 0),
                            y: element.y + (delta.y || 0)
                        });
                    }
                });
                pushHistory();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, selectedId, elements, undo, redo, deleteElement, duplicateElement, updateElement, pushHistory, selectElement, copyElement, pasteElement, copyStyle, pasteStyle, lockElement]);
}
