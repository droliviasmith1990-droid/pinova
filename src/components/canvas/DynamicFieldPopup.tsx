'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { Element } from '@/types/editor';
import { generateUniqueName } from '@/lib/utils/nameValidation';

interface DynamicFieldPopupProps {
    isOpen: boolean;
    onClose: () => void;
    currentFieldName: string | undefined;
    isDynamic: boolean;
    elementType: 'image' | 'text';
    elements: Element[];
    onSave: (fieldName: string, isDynamic: boolean) => void;
}

/**
 * Popup for configuring dynamic field settings on an element
 * Allows setting custom field names and toggling dynamic mode
 */
export function DynamicFieldPopup({
    isOpen,
    onClose,
    currentFieldName,
    isDynamic,
    elementType,
    elements,
    onSave,
}: DynamicFieldPopupProps) {
    // Use props directly for initial state, update via interaction only
    const [fieldName, setFieldName] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize state only once when popup opens (using ref to track)
    const shouldInitialize = isOpen && !initialized;
    if (shouldInitialize) {
        // This is synchronous and runs during render, avoiding useEffect setState
        setFieldName(currentFieldName || '');
        setEnabled(isDynamic);
        setInitialized(true);
    }
    
    // Reset initialized flag when popup closes
    if (!isOpen && initialized) {
        setInitialized(false);
    }
    
    // Focus input when popup opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return undefined;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return undefined;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const placeholder = elementType === 'image' ? 'e.g. ProductImage' : 'e.g. ProductName';

    const handleSave = () => {
        // Generate unique field name if empty and enabled
        let finalFieldName = fieldName.trim();
        if (enabled && !finalFieldName) {
            // Use the utility to get a truly unique field name
            const unique = generateUniqueName(elements, elementType);
            finalFieldName = unique.fieldName;
        }
        onSave(finalFieldName, enabled);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

const SUGGESTED_FIELDS = ['Brand', 'Title', 'Description', 'Price', 'Discount', 'Url', 'CallToAction'];

    return (
        <div
            ref={popupRef}
            className="absolute top-full left-0 mt-3 bg-white/95 backdrop-blur-xl rounded-xl shadow-creative-xl border border-white/50 p-4 z-1010 w-72 animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm tracking-tight">
                    <Zap size={16} className="text-purple-500 fill-purple-100" />
                    Dynamic Link
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100/80 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-4 py-3 border-b border-gray-100/50">
                <label htmlFor="dynamic-toggle" className="text-sm font-medium text-gray-700">
                    Enable Variable
                </label>
                <button
                    id="dynamic-toggle"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative w-11 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-200 ${
                        enabled ? 'bg-purple-500 shadow-md' : 'bg-gray-200'
                    }`}
                >
                    <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>

            {/* Field Name Input */}
            <div className={`transition-all duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                <label htmlFor="field-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Variable Name
                </label>
                <input
                    ref={inputRef}
                    id="field-name"
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 focus:bg-white transition-all placeholder:text-gray-400 font-medium text-gray-800"
                    disabled={!enabled}
                />
                
                {/* Suggestions */}
                {enabled && (
                    <div className="mt-3">
                         <span className="text-[10px] text-gray-400 font-medium mb-1.5 block">SUGGESTIONS</span>
                         <div className="flex flex-wrap gap-1.5">
                            {SUGGESTED_FIELDS.map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => setFieldName(suggestion)}
                                    className="px-2 py-1 text-xs rounded-md bg-gray-100/80 text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:scale-105 active:scale-95 transition-all border border-transparent hover:border-purple-100 font-medium"
                                >
                                    {suggestion}
                                </button>
                            ))}
                         </div>
                    </div>
                )}

                <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                    Maps to <code className="text-purple-600 bg-purple-50 px-1 py-0.5 rounded font-mono">{fieldName || '...'}</code> column in your spreadsheet.
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100/50">
                <button
                    onClick={onClose}
                    className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100/50 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 text-xs font-bold bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-lg shadow-creative-md hover:shadow-creative-lg hover:scale-105 active:scale-95 transition-all"
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
}
