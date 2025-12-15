'use client';

import React from 'react';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import {
    Magnet,
    Square,
    AlignCenter,
    Ruler,
    Grid3X3,
    Eye,
    Sparkles,
    RotateCcw,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    indent?: boolean;
}

function Toggle({ label, checked, onChange, disabled, icon, indent }: ToggleProps) {
    return (
        <label
            className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                ${indent ? 'ml-6' : ''}`}
        >
            <div className="flex items-center gap-2">
                {icon && <span className="text-gray-500">{icon}</span>}
                <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                    ${checked ? 'bg-pink-500' : 'bg-gray-300'}
                    ${disabled ? 'cursor-not-allowed' : ''}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                        ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
            </button>
        </label>
    );
}

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    unit?: string;
}

function Slider({ label, value, min, max, onChange, disabled, unit = 'px' }: SliderProps) {
    return (
        <div className={`py-2 px-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-xs text-gray-500">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
        </div>
    );
}

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-3 px-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-pink-500">{icon}</span>
                    <span className="font-medium text-sm text-gray-800">{title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
            </button>
            {isOpen && <div className="pb-2">{children}</div>}
        </div>
    );
}

export function SnappingControlsPanel() {
    const store = useSnappingSettingsStore();

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-72 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Magnet size={18} className="text-pink-500" />
                    <span className="font-semibold text-gray-800">Snapping Controls</span>
                </div>
                <button
                    onClick={() => store.resetToDefaults()}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Reset to Defaults"
                >
                    <RotateCcw size={14} className="text-gray-500" />
                </button>
            </div>

            {/* Master Toggle */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <Toggle
                    label="Magnetic Snapping"
                    checked={store.magneticSnapping}
                    onChange={store.setMagneticSnapping}
                    icon={<Magnet size={16} />}
                />
            </div>

            {/* Presets */}
            <div className="px-3 py-3 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Presets</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {(['beginner', 'precision', 'freeform', 'professional'] as const).map((preset) => (
                        <button
                            key={preset}
                            onClick={() => store.applyPreset(preset)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 
                                     hover:border-pink-300 hover:bg-pink-50 transition-colors capitalize"
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            {/* Object Snapping */}
            <Section title="Object Snapping" icon={<Square size={16} />}>
                <Toggle
                    label="Snap to Objects"
                    checked={store.snapToObjects}
                    onChange={store.setSnapToObjects}
                    disabled={!store.magneticSnapping}
                />
                <Toggle
                    label="Object Edges"
                    checked={store.objectEdges}
                    onChange={store.setObjectEdges}
                    disabled={!store.magneticSnapping || !store.snapToObjects}
                    indent
                />
                <Toggle
                    label="Object Centers"
                    checked={store.objectCenters}
                    onChange={store.setObjectCenters}
                    disabled={!store.magneticSnapping || !store.snapToObjects}
                    indent
                />
                <Toggle
                    label="Equal Spacing"
                    checked={store.equalSpacing}
                    onChange={store.setEqualSpacing}
                    disabled={!store.magneticSnapping || !store.snapToObjects}
                    indent
                />
            </Section>

            {/* Canvas Boundaries */}
            <Section title="Canvas Boundaries" icon={<AlignCenter size={16} />} defaultOpen={false}>
                <Toggle
                    label="Snap to Boundaries"
                    checked={store.snapToBoundaries}
                    onChange={store.setSnapToBoundaries}
                    disabled={!store.magneticSnapping}
                />
                <Toggle
                    label="Boundary Indicators"
                    checked={store.boundaryIndicators}
                    onChange={store.setBoundaryIndicators}
                    disabled={!store.magneticSnapping || !store.snapToBoundaries}
                    indent
                />
                <Toggle
                    label="Prevent Off-Canvas"
                    checked={store.preventOffCanvas}
                    onChange={store.setPreventOffCanvas}
                />
            </Section>

            {/* Guides & Grid */}
            <Section title="Guides & Grid" icon={<Grid3X3 size={16} />} defaultOpen={false}>
                <Toggle
                    label="Show Guide Lines"
                    checked={store.showGuideLines}
                    onChange={store.setShowGuideLines}
                />
                <Toggle
                    label="Canvas Center Lines"
                    checked={store.canvasCenterLines}
                    onChange={store.setCanvasCenterLines}
                    disabled={!store.magneticSnapping}
                    indent
                />
                <Toggle
                    label="Grid Snapping"
                    checked={store.gridSnapping}
                    onChange={store.setGridSnapping}
                    disabled={!store.magneticSnapping}
                />
                {store.gridSnapping && (
                    <Slider
                        label="Grid Size"
                        value={store.gridSize}
                        min={4}
                        max={32}
                        onChange={store.setGridSize}
                        disabled={!store.magneticSnapping || !store.gridSnapping}
                    />
                )}
                <Toggle
                    label="Smart Guides"
                    checked={store.smartGuides}
                    onChange={store.setSmartGuides}
                    disabled={!store.magneticSnapping}
                />
            </Section>

            {/* Magnetic Strength (SIMPLIFIED) */}
            <Section title="Magnetic Snapping" icon={<Ruler size={16} />} defaultOpen={true}>
                <Slider
                    label="Snap Distance"
                    value={store.magneticSnapThreshold}
                    min={1}
                    max={15}
                    onChange={store.setMagneticSnapThreshold}
                    disabled={!store.magneticSnapping}
                />
                <div className="px-3 py-1 text-xs text-gray-500 mb-2">
                    Auto-snap when within {store.magneticSnapThreshold}px of alignment
                </div>
                <div className="px-3 py-2">
                    <span className="text-sm text-gray-700">Snap Strength</span>
                    <div className="flex gap-1 mt-1">
                        {(['weak', 'medium', 'strong'] as const).map((strength) => (
                            <button
                                key={strength}
                                onClick={() => store.setMagneticStrength(strength)}
                                disabled={!store.magneticSnapping}
                                className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors capitalize
                                    ${store.magneticStrength === strength
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                    ${!store.magneticSnapping ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {strength}
                            </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {store.magneticStrength === 'strong' && 'Instant snap (recommended)'}
                        {store.magneticStrength === 'medium' && 'Quick smooth animation'}
                        {store.magneticStrength === 'weak' && 'Gentle glide to position'}
                    </div>
                </div>
            </Section>

            {/* Visual Feedback */}
            <Section title="Visual Feedback" icon={<Eye size={16} />} defaultOpen={false}>
                <Toggle
                    label="Distance Indicators"
                    checked={store.distanceIndicators}
                    onChange={store.setDistanceIndicators}
                />
                <Toggle
                    label="Guide Animations"
                    checked={store.guideAnimations}
                    onChange={store.setGuideAnimations}
                />
                <Toggle
                    label="Snap Celebrations"
                    checked={store.snapCelebrations}
                    onChange={store.setSnapCelebrations}
                    icon={<Sparkles size={14} />}
                />
                <Toggle
                    label="Multi-Line Guides"
                    checked={store.multiLineGuides}
                    onChange={store.setMultiLineGuides}
                />
                <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Guide Color</span>
                        <input
                            type="color"
                            value={store.guideColor}
                            onChange={(e) => store.setGuideColor(e.target.value)}
                            className="w-8 h-6 rounded border border-gray-200 cursor-pointer"
                        />
                    </div>
                </div>
            </Section>

            {/* Collision & Spacing (NEW) */}
            <Section title="Collision & Spacing" icon={<Square size={16} />} defaultOpen={true}>
                <Toggle
                    label="Prevent Overlap"
                    checked={store.preventOverlap}
                    onChange={store.setPreventOverlap}
                />
                <Toggle
                    label="Auto-Push Elements"
                    checked={store.autoPushElements}
                    onChange={store.setAutoPushElements}
                    disabled={!store.preventOverlap}
                    indent
                />
                <Toggle
                    label="Collision Indicators"
                    checked={store.collisionIndicators}
                    onChange={store.setCollisionIndicators}
                    disabled={!store.preventOverlap}
                    indent
                />
                <Slider
                    label="Minimum Spacing"
                    value={store.minimumSpacing}
                    min={0}
                    max={50}
                    onChange={store.setMinimumSpacing}
                    disabled={!store.preventOverlap}
                />
                <div className="px-3 py-2">
                    <span className="text-sm text-gray-700">Collision Mode</span>
                    <div className="flex gap-1 mt-1">
                        {(['block', 'push', 'freeform'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => store.setCollisionMode(mode)}
                                disabled={!store.preventOverlap}
                                className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors capitalize
                                    ${store.collisionMode === mode
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                    ${!store.preventOverlap ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Keyboard Shortcuts */}
            <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500">
                <div className="font-medium text-gray-600 mb-1">Keyboard Shortcuts</div>
                <div className="space-y-0.5">
                    <div><kbd className="px-1 bg-gray-200 rounded">Shift</kbd> Disable snapping</div>
                    <div><kbd className="px-1 bg-gray-200 rounded">Alt</kbd> 10px boundary offset</div>
                </div>
            </div>
        </div>
    );
}
