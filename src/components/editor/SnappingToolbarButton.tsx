'use client';

import React, { useState } from 'react';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { SnappingControlsPanel } from './SnappingControlsPanel';
import { Magnet } from 'lucide-react';

export function SnappingToolbarButton() {
    const [isOpen, setIsOpen] = useState(false);
    const magneticSnapping = useSnappingSettingsStore((s) => s.magneticSnapping);
    const setMagneticSnapping = useSnappingSettingsStore((s) => s.setMagneticSnapping);

    return (
        <div className="relative">
            {/* Main Button */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setMagneticSnapping(!magneticSnapping)}
                    className={`p-2 rounded-lg transition-colors ${magneticSnapping
                            ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    title={magneticSnapping ? 'Snapping On' : 'Snapping Off'}
                >
                    <Magnet size={18} />
                </button>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Snapping Settings"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400">
                        <path fill="currentColor" d="M2 4l4 4 4-4z" />
                    </svg>
                </button>
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 z-50">
                        <SnappingControlsPanel />
                    </div>
                </>
            )}
        </div>
    );
}
