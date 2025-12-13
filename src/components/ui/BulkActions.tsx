'use client';

import React from 'react';
import { X, Trash2, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Selection Action Bar
// ============================================
interface SelectionActionBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDeleteSelected: () => void;
    isDeleting?: boolean;
}

export function SelectionActionBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onDeleteSelected,
    isDeleting = false,
}: SelectionActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
                {/* Selected count */}
                <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">{selectedCount} selected</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {selectedCount < totalCount ? (
                        <button
                            onClick={onSelectAll}
                            className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Select All ({totalCount})
                        </button>
                    ) : (
                        <button
                            onClick={onDeselectAll}
                            className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Deselect All
                        </button>
                    )}

                    <button
                        onClick={onDeleteSelected}
                        disabled={isDeleting}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg font-medium text-sm transition-colors",
                            isDeleting ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
                        )}
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                    </button>
                </div>

                {/* Close button */}
                <button
                    onClick={onDeselectAll}
                    className="ml-2 p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Clear selection"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// Delete Confirmation Modal
// ============================================
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    count: number;
    previewImages?: string[];
    isDeleting?: boolean;
    deleteProgress?: { current: number; total: number };
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    count,
    previewImages = [],
    isDeleting = false,
    deleteProgress,
}: DeleteConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Delete {count} Pin{count > 1 ? 's' : ''}?
                    </h3>
                    <p className="text-gray-500">
                        Are you sure you want to delete {count} selected pin{count > 1 ? 's' : ''}?
                        This action cannot be undone.
                    </p>
                </div>

                {/* Preview thumbnails */}
                {previewImages.length > 0 && (
                    <div className="px-6 pb-4">
                        <div className="flex justify-center gap-2">
                            {previewImages.slice(0, 4).map((url, i) => (
                                <div
                                    key={i}
                                    className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                                >
                                    <img
                                        src={url}
                                        alt={`Preview ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                            {count > 4 && (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-500">
                                        +{count - 4}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Delete progress */}
                {isDeleting && deleteProgress && (
                    <div className="px-6 pb-4">
                        <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Deleting pins...</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {deleteProgress.current} / {deleteProgress.total}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all duration-200"
                                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-2 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className={cn(
                            "flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors",
                            isDeleting ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"
                        )}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium transition-colors",
                            isDeleting ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
                        )}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete Pins
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Selection Checkbox Component
// ============================================
interface SelectionCheckboxProps {
    isSelected: boolean;
    onChange: (selected: boolean) => void;
    isVisible?: boolean;
    className?: string;
}

export function SelectionCheckbox({
    isSelected,
    onChange,
    isVisible = false,
    className
}: SelectionCheckboxProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onChange(!isSelected);
            }}
            className={cn(
                "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150",
                isSelected
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white/80 border-gray-300 hover:border-blue-400",
                !isVisible && !isSelected && "opacity-0 group-hover:opacity-100",
                className
            )}
            aria-label={isSelected ? "Deselect pin" : "Select pin"}
        >
            {isSelected && (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </button>
    );
}
