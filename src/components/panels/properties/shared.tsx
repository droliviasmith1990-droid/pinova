'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Property Input - numeric input with label
export function PropertyInput({
    label,
    value,
    onChange
}: {
    label: string;
    value: number;
    onChange: (val: number) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-gray-500 w-5">{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-150"
            />
        </div>
    );
}

// Style Button - for effect selection
export function StyleButton({
    label,
    isActive,
    onClick,
    preview
}: {
    label: string;
    isActive: boolean;
    onClick: () => void;
    preview: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150",
                isActive
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
        >
            <div className="text-base font-medium">{preview}</div>
            <span className="text-[10px] text-gray-500">{label}</span>
        </button>
    );
}

// Accordion - collapsible section
export function Accordion({
    title,
    enabled,
    children
}: {
    title: string;
    enabled?: boolean;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={cn("border border-gray-200 rounded-lg overflow-hidden", !enabled && "opacity-50")}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
            >
                <span className="text-xs font-medium text-gray-700">{title}</span>
                {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {isOpen && <div className="p-3">{children}</div>}
        </div>
    );
}

// Slider Row - slider with label and value display
export function SliderRow({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    onDone
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    onDone: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-16">{label}</label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseUp={onDone}
                onTouchEnd={onDone}
                className="flex-1 accent-blue-600"
            />
            <span className="text-sm text-gray-600 w-8 text-right">{value}</span>
        </div>
    );
}

// Section Header
export function SectionHeader({ title }: { title: string }) {
    return (
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {title}
        </h3>
    );
}
