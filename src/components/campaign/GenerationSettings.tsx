'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, RefreshCw, Zap, Image as ImageIcon, Gauge, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationSettings, DEFAULT_GENERATION_SETTINGS } from '@/lib/rendering/clientPinGenerator';

interface GenerationSettingsProps {
    settings: GenerationSettings;
    onChange: (settings: GenerationSettings) => void;
    disabled?: boolean;
}

const QUALITY_OPTIONS = [
    {
        value: 'draft',
        label: 'Normal (1x)',
        description: 'Standard resolution, fastest generation',
        icon: Zap
    },
    {
        value: 'normal',
        label: 'High (2x)',
        description: 'Retina quality, good for web',
        icon: ImageIcon
    },
    {
        value: 'high',
        label: 'Ultra (3x)',
        description: 'Best for Pinterest visibility',
        icon: Gauge
    },
    {
        value: 'ultra',
        label: 'Max (4x)',
        description: 'Maximum detailed quality',
        icon: Layers
    },
] as const;

export function GenerationSettingsPanel({ settings, onChange, disabled }: GenerationSettingsProps) {
    const [isOpen, setIsOpen] = useState(true);

    const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(e.target.value);
        if (!isNaN(size)) {
            onChange({ ...settings, batchSize: size });
        }
    };

    const handleQualityChange = (quality: GenerationSettings['quality']) => {
        onChange({ ...settings, quality });
    };

    const handlePauseToggle = () => {
        onChange({ ...settings, pauseEnabled: !settings.pauseEnabled });
    };

    const handleReset = () => {
        onChange(DEFAULT_GENERATION_SETTINGS);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <span className="block font-semibold text-gray-900">Generation Settings</span>
                        <span className="text-xs text-gray-500">Configure output quality and performance</span>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Content */}
            {isOpen && (
                <div className="p-5 space-y-6">
                    {/* Batch Size */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-900">
                                    Batch Size
                                </label>
                                <p className="text-xs text-gray-500">
                                    Pins generated simultaneously
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold font-mono">
                                {settings.batchSize}
                            </span>
                        </div>

                        <div className="relative pt-1">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="1"
                                value={settings.batchSize}
                                onChange={handleBatchSizeChange}
                                disabled={disabled}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                                <span>1</span>
                                <span>5</span>
                                <span>10</span>
                                <span>15</span>
                                <span>20</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Quality */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                            Output Quality
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {QUALITY_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = settings.quality === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleQualityChange(option.value)}
                                        disabled={disabled}
                                        className={cn(
                                            "relative flex items-center p-3 rounded-lg border-2 transition-all duration-200 group text-left outline-none focus:ring-2 focus:ring-blue-500/20",
                                            isSelected
                                                ? "border-blue-600 bg-blue-50/50"
                                                : "border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200",
                                            disabled && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-md mr-3 transition-colors",
                                            isSelected ? "bg-blue-100 text-blue-600" : "bg-white text-gray-400 group-hover:text-gray-600"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={cn("font-semibold text-sm", isSelected ? "text-blue-900" : "text-gray-900")}>
                                                    {option.label}
                                                </span>
                                            </div>
                                            <p className={cn("text-xs mt-0.5", isSelected ? "text-blue-700" : "text-gray-500")}>
                                                {option.description}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute right-3 w-2 h-2 rounded-full bg-blue-600 shadow-sm ring-4 ring-blue-100" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between">
                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            disabled={disabled}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 -ml-2 rounded-md hover:bg-gray-100",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reset Defaults
                        </button>

                        {/* Pause Toggle */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-700">Pause/Resume</span>
                            <button
                                onClick={handlePauseToggle}
                                disabled={disabled}
                                className={cn(
                                    "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                                    settings.pauseEnabled ? "bg-blue-600" : "bg-gray-200",
                                    disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 transform",
                                        settings.pauseEnabled ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
